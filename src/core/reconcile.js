import { scheduleTask,shouldYield,planWork, ANY } from './schedule'
import { createFiber,getParentElementFiber,HostFiber,setCurrentFiber,Hook } from '../fiber'
import { reComputeHook, getCurrentCalledEffect } from '../hooks'
export { getCurrentFiber } from '../fiber'
import { SCU,insertElement,deleteElement,isFn,setRef, replaceElement } from '../helper/tools'
import { mountElement, updateElement, setTextContent } from '../dom'
import { __LIMBO_SUSPENSE } from '../core/symbol'
// import * as cp from 'checkpromise'

const DELETE    = 0b00000001
const UPDATE    = 0b00000010
// TODO: Array diff LIS优化
const REPLACE   = 0b00000100
const ADD       = 0b00001000
const NOWORK    = 0b00010000
const SUSPENSE  = 0b00100000

function createFiberRoot(vnode,mountDom,done) {
    // return new FiberRoot(node,props,done)
    return {
        node: mountDom,
        done,
        props: {
            children: vnode
        },
        tag: HostFiber,
        RootFiber: true
    }
}

const additionalRenderTasks = []
const needRecoverSuspenseMap = new Map()
const suspenseMap = new Map()
const updateQueue = []

let commitQueue = []
let currentCommitRoot
let currentExecuteWorkUnit

function render(vnode,mountDom,cb) {
    const fiberRoot = createFiberRoot(vnode,mountDom,cb)
    scheduleWorkOnFiber(fiberRoot)
}

function scheduleWorkOnFiber(fiber, force) {
    const priority = fiber.__priority || ANY
    if(force) updateQueue.push(fiber)
    // 避免重复加入更新队列
    else !fiber.dirty && updateQueue.push(fiber) && (fiber.dirty = true)
    scheduleTask(runWorkLoop, priority)
}

function runWorkLoop(dopast) {
    // debugger
    if(!currentExecuteWorkUnit) currentExecuteWorkUnit = updateQueue.shift()
    // fiber level task
    currentExecuteWorkUnit = performUnitWork(currentExecuteWorkUnit, dopast)

    // time finish but task isn't finish
    if(currentExecuteWorkUnit && !dopast) {
        return runWorkLoop.bind(null)
    } 
    while(additionalRenderTasks.length) {
        const task = additionalRenderTasks.shift()
        task()
    }
    if(updateQueue.length) return runWorkLoop.bind(null)
    if(currentCommitRoot) {
        flushCommitQueue(currentCommitRoot)
    }
    return null
}

function performUnitWork(currentExecuteWorkUnit, dopast) {
    while(currentExecuteWorkUnit && (!shouldYield() || dopast)) {
        try {
            currentExecuteWorkUnit = reconcile(currentExecuteWorkUnit)
        } catch(err) {
            // TODO: Error Boundary
            // eslint-disable-next-line
            console.log(err)
            break
        }
    }
    return currentExecuteWorkUnit
}

function reconcile(currentFiber) {
    if(
        currentFiber.__type === __LIMBO_SUSPENSE && 
        needRecoverSuspenseMap.get(currentFiber.__suspenseFlag) &&
        currentFiber.props.children &&
        !currentFiber.props.children.__suspense_fallback
    ) {
        return completeUnitWork(currentFiber)
    }
    currentFiber.parentElementFiber = getParentElementFiber(currentFiber)
    let next
    let suspenseChildCommitQueue = null
    let suspense
    if((suspense = findAdjacencySuspense(currentFiber))) {
        const flag = suspense.__suspenseFlag
        if(!(suspenseChildCommitQueue = suspenseMap.get(flag))) {
            const suspenseQueue = []
            suspenseChildCommitQueue = suspenseQueue
            suspenseMap.set(flag, suspenseQueue)
        } else suspenseChildCommitQueue = suspenseMap.get(flag)
    } 
    next = beginWork(currentFiber,suspenseChildCommitQueue)
    
    if(!next) {
        next = completeUnitWork(currentFiber)
    }
    return next
}

function beginWork(currentFiber, additionalCommitQueue) {
    let ignoreChildUpdate, fatalError
    try{
        ignoreChildUpdate = currentFiber.tag == HostFiber ? updateHost(currentFiber) : updateFiber(currentFiber)
    } catch(err) { 
        if(isPromise(err)) {
            const suspense = findAdjacencySuspense(currentFiber)

            if(!suspense) throw Error('maybe need Suspense Wrap Component!')
            if(!suspense.fallback) throw Error('Suspense must get fallback prop!')
            if(suspense.pendings.get(err)) {
                suspense.pendings.get(err).push(currentFiber)
            } else suspense.pendings.set(err, [currentFiber])

            // dirty
            if(currentFiber.dirty) currentFiber.dirty = false
            currentFiber.uncompleted = true
            
            const { fallback } = suspense
            if(!needRecoverSuspenseMap.get(suspense.__suspenseFlag)) needRecoverSuspenseMap.set(suspense.__suspenseFlag, suspenseMap.get(suspense.__suspenseFlag))

            /**
             * !resuming1 && !resuming2 无需恢复
             * resuming1 && !resuming2 等待恢复
             * parse1 recover: resuming1 && resuming2 正在恢复
             * resuming1 && resuming2 == false 终止恢复
             * parse2 commit: resuming1 && resuming2 完成恢复
             */
            if(!suspense.__resuming1 && !suspense.__resuming2) {
                suspense.__resuming1 = true
                additionalRenderTasks.push(() => {
                    suspense.__children = suspense.props.children
                    suspense.props.children = fallback
                    const container = suspense.child
                    container.__resume_child = container.child
                    container.__resume_kids = container.kids
                    container.__resume_children = container.props.children
                    container.child = null
                    container.kids = null
                    
                    scheduleWorkOnFiber(suspense)
                })
            } else {
                if(suspense.__resuming2) {
                    suspense.__resuming2 = false
                    suspense.__resumeCommit = null
                    const container = suspense.child
                    container.child = container.__fallback_child
                    container.kids = container.__fallback_kids
                    container.props.children = container.__fallback_children
                }
            }

            const handleSuspenseResolve = () => {
                const getCurrentPromisePendingFibers = (future) => suspense.pendings.get(future)
                const getPromisePendingFibersCount = () => suspense.pendings.size

                if(err.__limbo_handing) return
                else err.__limbo_handing = true
                
                const resume = () => {
                    const currentHandleFibers = getCurrentPromisePendingFibers(err)
                    suspense.pendings.delete(err)
                   
                    if(!getPromisePendingFibersCount()) {  
                        suspense.__resuming2 = true
                        const container = suspense.child
                        const fallback = container.child
                        container.__fallback_child = container.child
                        container.__fallback_kids = container.kids
                        container.__fallback_children = container.props.children
                        fallback.effect = DELETE
                        suspense.__resumeCommit = fallback
                        container.kids = container.__resume_kids
                        container.child = container.__resume_child
                        container.props.children = container.__resume_children
                        suspense.props.children = suspense.__children
                        needRecoverSuspenseMap.delete(suspense.__suspenseFlag)
                        suspense.beforeCommit = () => {
                            delete suspense.beforeCommit
                            // 恢复成功
                            if(suspense.__resuming2) {
                                delete suspense.__resuming1
                                delete container.__resume_kids
                                delete container.__resume_children
                                delete container.__resume_child
                            }
                            delete suspense.__resuming2
                            delete suspense.__resumeQueue
                            delete container.__fallback_child
                            delete container.__fallback_kids
                            delete container.__fallback_children
                        }
                        suspense.afterCommit = () => {
                            delete suspense.afterCommit
                            delete suspense.__resumeCommit
                        }
                        scheduleWorkOnFiber(suspense)
                    } else {
                        currentHandleFibers.forEach(currentFiber => {
                            currentFiber.__skip_commit = true
                            currentFiber.beforeCommit = () => {
                                /**
                                 * slice(1) 去除本轮reconcile生成的suspenseMap头部元素
                                 * 此时的头部元素是中断的根fiber，它本来就位于commit队列，不要重复添加
                                 */
                                const currentReconcileCommits = suspenseMap.get(suspense.__suspenseFlag).slice(1)
                                const currentSuspenseCommits = needRecoverSuspenseMap.get(suspense.__suspenseFlag)
                                const resumePoint = currentSuspenseCommits.findIndex(fiber => fiber === currentFiber)
                                currentSuspenseCommits[resumePoint].uncompleted = false
                                currentSuspenseCommits.splice(resumePoint + 1, 0, ...currentReconcileCommits)
                                delete currentFiber.beforeCommit
                            }

                            // 如果在reconcile期间有其他恢复，加入调度栈等当前恢复执行完毕后调度
                            currentFiber.afterCommit = () => {
                                delete currentFiber.__skip_commit
                                delete currentFiber.afterCommit
                                suspense.__resumeQueue.shift()
                                CPS()
                            }
                            scheduleWorkOnFiber(currentFiber)
                        })
                    }
                }
                const CPS = () => {
                    if(!suspense.__resumeQueue.length) return
                    const task = suspense.__resumeQueue[0]
                    task()
                }

                if(!suspense.__resumeQueue || !suspense.__resumeQueue.length) {
                    if(!suspense.__resumeQueue) suspense.__resumeQueue = [resume]
                    else suspense.__resumeQueue.push(resume)
                    CPS()
                } else {
                    suspense.__resumeQueue.push(resume)
                }
            }

            const handleSuspenseCatch = (err) => {
                throw(err)
            } 

            err.then(
                _ => handleSuspenseResolve(),
                _ => handleSuspenseCatch()
            )
        } else {
            fatalError = err
        }
   
    } finally {
        /* 
            普通提交策略
            当前fiber为子节点添加effect
            当子节点进入reconcile时提交由父节点赋予的effect

            Suspense提交策略
            处于恢复状态的suspense会重新进入渲染，无需提交suspense本身
            但是需要提交fallback子节点
        */
        
        if(currentFiber.__type === __LIMBO_SUSPENSE) {
            if(!commitQueue.includes(currentFiber)) commitQueue.push(currentFiber)
        }
        else commitQueue.push(currentFiber)
        if(additionalCommitQueue && !currentFiber.__suspense_container && !findFallbackAncestor(currentFiber)) {
            // 多个additionCommitQueue
            if(Array.isArray(additionalCommitQueue[0])) additionalCommitQueue.forEach(queue => queue.push(currentFiber))
            else additionalCommitQueue.push(currentFiber)
        }
        if(fatalError) throw fatalError /* eslint-disable-line */
        /* eslint-disable */
        if(!ignoreChildUpdate) return null 
        if(currentFiber && currentFiber.child) return currentFiber.child 
        return null
        /* eslint-enable */
    }
}

function completeUnitWork(currentFiber) {
    while(currentFiber) {
        if(currentFiber.dirty === false && !currentCommitRoot) {
            currentCommitRoot = currentFiber
            return null
        }
        if(currentFiber.sibling) return currentFiber.sibling
        currentFiber = currentFiber.parent
    }
}

function restoreFiber(fiber) {
    if(fiber.restoring) {
        delete fiber.restoring
        fiber.uncompleted = false
        return true
    }
}

function updateFiber(fiber) {
    const oldProps = fiber.oldProps
    const newProps = fiber.props

    if(!fiber.dirty && !SCU(oldProps,newProps)) {
        if(!fiber.uncompleted) {
            fiber.effect = NOWORK
            return false
        }
        else restoreFiber(fiber)
    }

    setCurrentFiber(fiber)
    reComputeHook()
    const build = fiber.type
    const children = build(newProps)

    reconcileChildren(fiber,children)
    return true
}

function updateHost(elementFiber) {
    if(!elementFiber.node) {
        mountElement(elementFiber)
    }
    restoreFiber(elementFiber)

    // 插入位置是第一个dom父节点的最后
    let parentElementFiber = elementFiber.parentElementFiber || {}
    if(!elementFiber.insertPoint) {
        let parentLastHostFiber = parentElementFiber.last
        while(parentLastHostFiber && parentLastHostFiber.tag !== HostFiber) parentLastHostFiber = parentLastHostFiber.child
        elementFiber.insertPoint = parentLastHostFiber
    } 
    parentElementFiber.last = elementFiber
    elementFiber.node.last = null 

    reconcileChildren(elementFiber,elementFiber.props.children)
    return true
}

function reconcileText(newFiber,oldFiber) {
    if(newFiber.type !== 'text' || oldFiber.type !== 'text') throw Error('reconcileText must be text type.')
    if(newFiber.value !== oldFiber.Value) setTextContent(oldFiber, newFiber.value)
    if(!newFiber.effect) newFiber.effect = NOWORK
}

function reconcileChildren(fiber,children) {
    if(!children) return
    const oldFibers = fiber.kids || {}
    const newFibers = (fiber.kids = generateKidMarks(children))

    const reused = {}
    for(let child in oldFibers) {
        const oldChild = oldFibers[child]
        const newChild = newFibers[child]
        // avoid key same but different element
        if(oldChild && newChild && sameVnode(oldChild, newChild)) {
            reused[child] = oldChild
        } else {
            oldChild.effect = DELETE
            commitQueue.push(oldChild)
        }  
    }

    markStableElements(Object.values(reused))
    let prevFiber = null

    for(let child in newFibers) {
        let newChild = newFibers[child]
        let reUseFiber = reused[child]

        if(reUseFiber && sameVnode(newChild, reUseFiber)) {
            const newIndex = newChild.childIndex, oldIndex = reUseFiber.childIndex
            if(reUseFiber.effect === SUSPENSE) {
                newChild.effect = reUseFiber.uncommited_effect
                delete reUseFiber.uncommited_effect
                newChild.restoring = true
            } 
            else newChild.effect = UPDATE
            newChild = { ...reUseFiber,...newChild }
            newChild.oldProps = reUseFiber.props 
            if(newIndex !== oldIndex) {
                if(reUseFiber.__stable) {
                    delete reUseFiber.__stable
                } else {
                    newChild.effect = REPLACE
                    newChild.replaced = reUseFiber
                }
            }
            if(reUseFiber.type === 'text' && newChild.type === 'text') reconcileText(newChild, reUseFiber)
        } else {
            newChild = createFiber(newChild,ADD)
        }

        newFibers[child] = newChild
        newChild.parent = fiber

        if(prevFiber) {
            prevFiber.sibling = newChild
        } else {
            // 首个子节点为child
            fiber.child = newChild
        }
        prevFiber = newChild
    }
    if(prevFiber) prevFiber.sibling = null

    fiber.kids = newFibers
    // 只有更新节点dirty为true，其他全部为undefined
    fiber.dirty = fiber.dirty ? false : null
}

function frozenSuspenseFiber(fiber) {
    fiber.uncompleted = true
    fiber.uncommited_effect = fiber.effect
    fiber.effect = SUSPENSE
}

// phase2 commit 
function flushCommitQueue(root) {
    root.beforeCommit && root.beforeCommit()
    if(root.__skip_commit) {
        commitQueue.forEach(fiber => frozenSuspenseFiber(fiber))
    }
    needRecoverSuspenseMap.forEach(suspenseChildQueue => {
        // TODO: slice(1) 去除Suspense
        suspenseChildQueue.filter(fiber => !fiber.uncompleted).forEach(fiber => frozenSuspenseFiber(fiber))
    })

    if(root.__resumeCommit) commitQueue.unshift(root.__resumeCommit)
    commitQueue.forEach((work) => commit(work))
    root.done && root.done()
    resetOldCommit()
    resetSuspenseMap()
    root.afterCommit && root.afterCommit()
}

function resetSuspenseMap() {
    suspenseMap.clear()
    needRecoverSuspenseMap.forEach((queue, key, map) => {
        if(!queue.length) map.remove(key) 
    })
}

function resetOldCommit() {
    commitQueue = []
    currentCommitRoot = null
    setCurrentFiber(null)
}

function commit(fiber) {
    const { effect,hooks,ref, uncompleted } = fiber
    if(uncompleted || effect === SUSPENSE) return

    if(effect === NOWORK) {
    } else if(effect === DELETE) {
        deleteElement(fiber)
    } else if(fiber.tag === Hook) {
        if(hooks) {
            const layoutHooks = getCurrentCalledEffect(hooks.layout)
            layoutHooks.forEach(clearPrevEffect)
            layoutHooks.forEach(callEffect)
            planWork(() => {
                const effectHooks = getCurrentCalledEffect(hooks.effect)
                effectHooks.forEach(clearPrevEffect)
                effectHooks.forEach(callEffect)
            })
        } 
    } else if(effect === UPDATE) {
        updateElement(fiber, true)
    } else if(effect === ADD) {
        insertElement(fiber)
    } else if(effect === REPLACE) {
        replaceElement(fiber)
    }

    if(Object.prototype.hasOwnProperty.call(fiber, 'uncommited_effect')) delete fiber.uncommited_effect
    // update ref
    setRef(ref,fiber.node)
}

function findFallbackAncestor(currentFiber) {
    while(currentFiber && !currentFiber.__suspense_fallback) {
        currentFiber = currentFiber.parent
    }
    return currentFiber && currentFiber.__suspense_fallback ? currentFiber : null
}

function findAdjacencySuspense(currentFiber) {
    while(currentFiber && currentFiber.__type !== __LIMBO_SUSPENSE) {
        currentFiber = currentFiber.parent
    }
    if(!currentFiber || currentFiber.__type !== __LIMBO_SUSPENSE) return null
    return currentFiber
}

function sameVnode(oldFiber,curFiber) {
    if(oldFiber.type !== curFiber.type) return false
    if(oldFiber.key !== curFiber.key) return false
    return true
}

function generateKidMarks(children) {
    let kidsKeyMap = {}
    if(Array.isArray(children)) {
        children.forEach((child,y) => {
            if(child) {
                if(Array.isArray(child)) {
                    child.forEach((c,y1) => {
                        kidsKeyMap[getChildUniqueKey(2,y1,c.key)] = c
                        c.childIndex = y1
                    })
                }
                kidsKeyMap[getChildUniqueKey(1,y,child.key)] = child
                child.childIndex = y
            }
        })
    } else kidsKeyMap[getChildUniqueKey(0,0,children.key)] = children
    return kidsKeyMap
}

function markStableElements(target) {
    // childIndex start: 1
    const _target = target.filter(f => f.childIndex).map(f => f.childIndex - 1)
    const stable = []
    if(_target.length) stable[0] = _target[0]
    for(let i = 0;i < _target.length; i++) {
        if(_target[i] > stable[stable.length - 1]) {
            stable[stable.length] = _target[i]
        } else {
            const replace = binaryQuery(stable, _target[i])
            if(_target[i] > stable[replace]) continue
            else if(stable[replace] === _target[i]) continue
            else if(replace === 0) stable[0] = _target[i]
            else stable[replace] = _target[i]
        }
    }
    stable.forEach(i => {
        target[i].__stable = true
    })
}

function binaryQuery(target, point) {
    let left = 0,
        right = target.length - 1
    while(left < right) {
        const mid = left + ((right - left) >> 1)
        if(target[mid] < point) left = mid + 1
        else if(target[mid] >= point) right = mid 
    }
    return left
}

function getChildUniqueKey(x,y,key) {
    if(y == undefined) throw('Error: not order y')
    else if(key == undefined) {
        return x + '.' + y
    } else return x + '..' + key
}

function callEffect(state) {
    const effect = state.effect
    const clear = effect()
    // 清理函数
    if(isFn(clear)) state.clear = clear
}

function clearPrevEffect(state) {
    const { clear } = state
    clear && clear()
}

function isPromise(target) {
    return target instanceof Promise && typeof target.then === 'function'
}

export {
    scheduleWorkOnFiber,
    render
}