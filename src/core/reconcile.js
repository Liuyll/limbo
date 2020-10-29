import { scheduleTask,shouldYield,planWork } from './schedule'
import { createFiber,getParentElementFiber,HostFiber,setCurrentFiber,Hook } from '../fiber'
import { reComputeHook } from '../hooks'
export { getCurrentFiber } from '../fiber'
import { SCU,insertElement,deleteElement,isFn,setRef } from '../helper/tools'
import { mountElement, updateElement, setTextContent } from '../dom'

const DELETE  = 0b00000001
const UPDATE  = 0b00000010
// TODO: REPLACE flag 参考react reconcileChildArray placeChild函数
// TODO: Array diff LIS优化
const REPLACE = 0b00000100 // eslint-disable-line
const ADD     = 0b00001000
const NOWORK  = 0b00010000 // eslint-disable-line

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

let updateQueue = []
let commitQueue = []
let prevCommit
let current_execute_work_unit

export function render(vnode,mountDom,cb) {
    const fiberRoot = createFiberRoot(vnode,mountDom,cb)
    scheduleWorkOnFiber(fiberRoot)
}

export function scheduleWorkOnFiber(fiber) {
    // 避免重复加入更新队列
    !fiber.dirty && updateQueue.push(fiber) && (fiber.dirty = true)
    scheduleTask(reconcileWork)
}

function reconcileWork(dopast) {
    if(!current_execute_work_unit) current_execute_work_unit = updateQueue.shift()

    // fiber level task
    while(current_execute_work_unit && (!shouldYield() || dopast)) {
        try {
            // async diff 
            // 类组件生命周期可能出现多次调用,慎用
            current_execute_work_unit = reconcile(current_execute_work_unit)
        } catch(err) {
            // TODO: Error Boundary
            // eslint-disable-next-line
            console.log(err)
            break
        }
    }

    // 当前时间片用完,但任务还未执行完
    // 把任务继续加入调度,等待恢复
    if(current_execute_work_unit && !dopast) {
        // 等待恢复
        return reconcileWork.bind(null)
    }
    // TODO: commit 
    if(prevCommit) {
        const fiberRoot = prevCommit
        flushCommitQueue(fiberRoot)
    }
    return null
}

function reconcile(currentFiber) {
    currentFiber.parentElementFiber = getParentElementFiber(currentFiber)
    currentFiber.tag == HostFiber ? updateHost(currentFiber) : updateFiber(currentFiber)
    commitQueue.push(currentFiber)
    if(currentFiber.child) return currentFiber.child
    
    while(currentFiber) {
        if(currentFiber.dirty === false && !prevCommit) {
            prevCommit = currentFiber
            return null
        }
        if(currentFiber.sibling) return currentFiber.sibling
        currentFiber = currentFiber.parent
    }
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
        if(oldChild && newChild && oldChild.type === newChild.type) {
            reused[child] = oldChild
        } else {
            oldFibers.effect = DELETE
            commitQueue.push(oldChild)
        }  
    }

    let prevFiber = null
    for(let child in newFibers) {
        let newChild = newFibers[child]
        let reUseFiber = reused[child]

        if(reUseFiber) {
            if(!sameVnode(reUseFiber,newChild)) {
                newChild.effect = REPLACE
            } else {
                newChild.effect = UPDATE
                newChild = { ...reUseFiber,...newChild }
                newChild.oldProps = reUseFiber.props 
                if(reUseFiber.type === 'text') {
                    if(reUseFiber.value !== newChild.value) {
                        if(newChild.value == null) newChild.value = ''
                        setTextContent(reUseFiber,newChild.value)
                    }
                    newChild.effect = NOWORK
                }
            }
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

    // 只有fiberRoot有bool值，其他为null
    fiber.dirty = fiber.dirty ? false : null
}

// 更新Fiber节点
function updateFiber(fiber) {
    const oldProps = fiber.oldProps
    const newProps = fiber.props
    
    // 我们内置SCU以避免hooks的无效re-render开销
    if(!fiber.dirty && SCU(oldProps,newProps)) {
        return 
    }

    setCurrentFiber(fiber)
    // 重计算当前fiber的hook链表
    reComputeHook()

    const build = fiber.type
    const children = build(newProps)
    if(children.type === 'text') {
        //
    }

    reconcileChildren(fiber,children)
}

// 更新真实的Dom节点
// HostFiber 绝对不可能有vnode fiber作为子节点
// 所以这里无需加速更新
function updateHost(elementFiber) {
    if(!elementFiber.node) {
        mountElement(elementFiber)
    }

    // 插入位置是第一个dom父节点的最后
    // 也就是insertBefore
    let parentElementFiber = elementFiber.parentElementFiber || {}
    elementFiber.insertPoint = parentElementFiber.last || null
    parentElementFiber.last = elementFiber
    elementFiber.node.last = null 

    reconcileChildren(elementFiber,elementFiber.props.children)
}

// phase2 commit 
function flushCommitQueue(fiberRoot) {
    commitQueue.forEach((work) => commit(work))
    fiberRoot.done && fiberRoot.done()
    resetOldCommit()

    function resetOldCommit() {
        commitQueue = []
        prevCommit = null
        setCurrentFiber(null)
    }
}

function commit(fiber) {
    const { effect,hooks,ref } = fiber

    if(effect === NOWORK) {
        //
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
        // debugger
        updateElement(fiber,true)
    } else if(effect === ADD) {
        insertElement(fiber)
    } else if(effect === REPLACE) {
        //
    }

    // update
    setRef(ref,fiber.node)
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
            if(Array.isArray(child)) {
                child.forEach((c,y1) => {
                    kidsKeyMap[keyMapKeyFactory(2,y1,c.key)] = c
                })
            }
            kidsKeyMap[keyMapKeyFactory(1,y,child.key)] = child
        })
    } else kidsKeyMap[keyMapKeyFactory(0,0,children.key)] = children
    return kidsKeyMap
}

function keyMapKeyFactory(x,y,key) {
    if(y == null) throw('Error: not order y')
    else if(key == null) {
        return x + '.' + y
    } else return x + '.' + y + '.' + key
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
