import { scheduleTask,shouldYield,planWork, ANY } from './schedule'
import { createFiber,getParentElementFiber,HostFiber,setCurrentFiber,Hook } from '../fiber'
import { reComputeHook } from '../hooks'
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

export function render(vnode,mountDom,cb) {
    const fiberRoot = createFiberRoot(vnode,mountDom,cb)
    scheduleWorkOnFiber(fiberRoot)
}

export function scheduleWorkOnFiber(fiber, force) {
    const priority = fiber.__priority || ANY
    if(force) updateQueue.push(fiber)
    // 避免重复加入更新队列
    else !fiber.dirty && updateQueue.push(fiber) && (fiber.dirty = true)
    scheduleTask(runWorkLoop, priority)
}

function runWorkLoop(dopast) {
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
    if((suspense = findSuspenseAncestor(currentFiber))) {
        const flag = suspense.__suspenseFlag
        if(!(suspenseChildCommitQueue = suspenseMap.get(flag))) {
            const suspenseQueue = []
            suspenseChildCommitQueue = suspenseQueue
            suspenseMap.set(flag, suspenseQueue)
        }
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
            let suspense = currentFiber
            while(suspense && suspense.__type !== __LIMBO_SUSPENSE) {
                suspense = suspense.parent
            }
            
            if(!suspense) throw Error('maybe need Suspense Wrap Component!')
            if(!suspense.fallback) throw Error('Suspense must get fallback prop!')

            currentFiber.future = err
            currentFiber.uncompleted = true
            const { fallback } = suspense
            if(!needRecoverSuspenseMap.get(suspense.__suspenseFlag)) needRecoverSuspenseMap.set(suspense.__suspenseFlag, suspenseMap.get(suspense.__suspenseFlag))
            
            const suspenseChildren = suspense.props.children,
                containerKids = suspense.child.kids,
                containerChild = suspense.child.child

            additionalRenderTasks.push(() => {
                suspense.props.children = fallback
                const container = suspense.child
                container.child = null
                container.kids = null
                scheduleWorkOnFiber(suspense)
            })
    
            const handleSuspenseResolve = () => {
                const getCurrentPromisePendingFibers = (future) => needRecoverSuspenseMap.get(suspense.__suspenseFlag).filter(fiber => fiber.effect !== SUSPENSE && fiber.future === future)
                const getPromisePendingFibersCount = () => new Set(needRecoverSuspenseMap.get(suspense.__suspenseFlag).filter(fiber => fiber.effect !== SUSPENSE).map(f => f.future)).size

                if(err.__limbo_handing) return
                else err.__limbo_handing = true
                setTimeout(() => err.__limbo_handing = false)
                if(getPromisePendingFibersCount() === 1) {
                    const container = suspense.child
                    const fallback = container.child
                    fallback.effect = DELETE
                    commitQueue.push(fallback)
                    container.kids = containerKids
                    container.child = containerChild
                    getCurrentPromisePendingFibers(err).forEach(f => delete f.future)
                    needRecoverSuspenseMap.delete(suspense.__suspenseFlag)
                    suspense.props.children = suspenseChildren
                    scheduleWorkOnFiber(suspense)
                    
                } else {
                    currentFiber.end = () => {
                        const currentReconcileCommits = suspenseMap.get(suspense.__suspenseFlag).slice(1)
                        const currentSuspenseCommits = needRecoverSuspenseMap.get(suspense.__suspenseFlag)
                        const insert = currentSuspenseCommits.findIndex(fiber => fiber === currentFiber)
                        currentSuspenseCommits[insert].uncompleted = false
                        currentSuspenseCommits.splice(insert + 1, 0, ...currentReconcileCommits)
                        delete currentFiber.end
                        getCurrentPromisePendingFibers(err).forEach(f => delete f.future)
                    }
                    scheduleWorkOnFiber(currentFiber)
                }
            }

            err.then(
                _ => handleSuspenseResolve(),
                _ => handleSuspenseResolve()
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
    elementFiber.insertPoint = parentElementFiber.last || null
    parentElementFiber.last = elementFiber
    elementFiber.node.last = null 

    // debugger
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
    const newFibers = (fiber.kids = buildKeyMap(children))

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
    root.end && root.end()
    needRecoverSuspenseMap.forEach(suspenseChildQueue => {
        suspenseChildQueue.filter(fiber => !fiber.uncompleted).forEach(fiber => frozenSuspenseFiber(fiber))
    })
    commitQueue.forEach((work) => commit(work))
    root.done && root.done()
    resetOldCommit()
    resetSuspenseMap()
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
            hooks.layout.forEach(clearPrevEffect)
            hooks.layout.forEach(callEffect)
            planWork(() => {
                hooks.effect.forEach(clearPrevEffect)
                hooks.effect.forEach(callEffect)
            })
        } 
    } else if(effect === UPDATE) {
        updateElement(fiber, true)
    } else if(effect === ADD) {
        insertElement(fiber)
    } else if(effect === REPLACE) {
        replaceElement(fiber)
    }

    // update ref
    setRef(ref,fiber.node)
}

function findFallbackAncestor(currentFiber) {
    while(currentFiber && !currentFiber.__suspense_fallback) {
        currentFiber = currentFiber.parent
    }
    return currentFiber && currentFiber.__suspense_fallback ? currentFiber : null
}

function findSuspenseAncestor(currentFiber) {
    while(currentFiber && currentFiber.parent && currentFiber.parent.__type !== __LIMBO_SUSPENSE) {
        currentFiber = currentFiber.parent
    }
    if(!currentFiber.parent || currentFiber.parent.__type !== __LIMBO_SUSPENSE) return null
    return currentFiber.parent
}

function sameVnode(oldFiber,curFiber) {
    if(oldFiber.type !== curFiber.type) return false
    if(oldFiber.key !== curFiber.key) return false
    return true
}

function buildKeyMap(children) {
    let kidsKeyMap = {}
    if(Array.isArray(children)) {
        children.forEach((child,y) => {
            if(child) {
                if(Array.isArray(child)) {
                    child.forEach((c,y1) => {
                        kidsKeyMap[keyMapKeyFactory(2,y1,c.key)] = c
                        c.childIndex = y1
                    })
                }
                kidsKeyMap[keyMapKeyFactory(1,y,child.key)] = child
                child.childIndex = y
            }
        })
    } else kidsKeyMap[keyMapKeyFactory(0,0,children.key)] = children
    return kidsKeyMap
}

function markStableElements(target) {
    const _target = target.filter(f => f.childIndex).map(f => f.childIndex)
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

function keyMapKeyFactory(x,y,key) {
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