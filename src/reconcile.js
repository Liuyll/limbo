import { scheduleTask,shouldYield,planWork } from './schedule'
import { createFiber,getParentElementFiber,HostFiber,setCurrentFiber,Hook } from './fiber'
import { reComputeHook } from './hooks'
export { getCurrentFiber } from './fiber'
import { SCU,insertElement,deleteElement,isFn } from './tools'
import { mountElement,updateElement } from './dom'

const DELETE  = 0b00000001
const UPDATE  = 0b00000010
// TODO: REPLACE flag 参考react reconcileChildArray placeChild函数
// 这里不做实现,因为不做Array diff
const REPLACE = 0b00000100 // eslint-disable-line
const ADD     = 0b00001000

function createFiberRoot(tag,node,props,done) {
    this.tag = tag
    this.map_dom_node = node
    this.props = props
    this.done_cb = done
}

// 不采取workInProgress的双fiber tree策略
// 而是采取更新队列策略
// 如果你熟悉源码的话,应该知道双fiber 策略只是为了Error Boundary回滚
let updateQueue = []

// 提交队列
// 用于commit phase
let commitQueue = []

let prevCommit
let current_execute_work_slice

export function render(vnode,mountDom,cb) {
    const fiberRoot = createFiberRoot(HostFiber,mountDom,{ children: vnode },cb)
    schedule_work(fiberRoot)
}

export function schedule_work(fiber) {
    updateQueue.push(fiber)
    scheduleTask(reconcileWork)
}

function reconcileWork(canExecute) {
    if(!current_execute_work_slice) current_execute_work_slice = updateQueue.shift()

    // fiber level task
    while(current_execute_work_slice && (!shouldYield() || canExecute)) {
        try {
            // reconcile 可能执行多次
            // 而commit 完全同步,只会执行一次
            // reconcile 会触发Willxxx 生命周期
            // 所以在未来v17里,Willxxx 必将被废弃
            reconcile(current_execute_work_slice)
        } catch {
            // react 在这里执行了Error Boundary的逻辑
            break
        }
    }
    // 当前时间片用完,但任务还未执行完
    // 把任务继续加入调度,等待恢复
    if(current_execute_work_slice && canExecute) {
        // 等待恢复
        return current_execute_work_slice.bind(null)
    }
    // TODO: commit 
    if(prevCommit) {
        let commit_origin = prevCommit
        beforeCommit(commit_origin)
    }
    return null
}

// reconcile 保证每个父节点被访问两次
// 这是为了Context的实现
function reconcile(currentFiber) {
    currentFiber.parentElementFiber = getParentElementFiber(currentFiber)
    currentFiber.tag == HostFiber ? updateHost(currentFiber) : updateFiber(currentFiber)
    currentFiber.oldProps = currentFiber.props

    if(currentFiber.child) return currentFiber.child

    while(currentFiber) {
        prevCommit = currentFiber
        if(currentFiber.sibling) return currentFiber.sibling
        currentFiber = currentFiber.parentNode
    }
}

// 更新Fiber节点
function updateFiber(fiber) {
    const oldProps = fiber.oldProps
    const newProps = fiber.props
    
    // 这里进行SCU是防止调度过程中的props改变
    // getDerivedStateFromProps 就是在调度过程中提供的api

    if(!fiber.dirty && !SCU(oldProps,newProps)) {
        return 
    }

    setCurrentFiber(fiber)
    // 重计算当前fiber的hook链表
    reComputeHook()
    let build = fiber.type

    // 这就是willXXX出现的问题
    // 当恢复该fiber reconcile后,又要重新那几个生命周期
    let children = build(newProps)

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
    elementFiber.insertPosition = parentElementFiber.last || null
    // 动态建立last链
    parentElementFiber.last = elementFiber
    
    // 已经是父dom的末尾
    elementFiber.node.last = null 

    reconcileChildren(elementFiber,elementFiber.props.children)
}

function reconcileChildren(fiber,children) {
    const oldFibers = fiber.kids || {}
    const newFibers = (fiber.kids = hashKids(children))

    const reused = {}
    // 我们以oldFiber为参考,创建新的newFiber
    // 不同的mini react可能有不同的diff策略
    for(let child in oldFibers) {
        const oldChild = oldFibers[child]
        const newChild = newFibers[child]

        if(oldChild && newChild && oldChild.type === newChild.type) {
            reused[child] = oldFibers
        } else {
            oldFibers.effect = DELETE
            commitQueue.push(oldFibers)
        }  

        let prevFiber = null

        for(let child in newFibers) {
            let newChild = newFibers[child]
            let reUseFiber = reused[newChild]

            if(reUseFiber) {
                newChild.effect = UPDATE

                newChild = { ...reUseFiber,...newChild }
                newChild.lastProps = reUseFiber.props
            } else {
                newChild = createFiber(newChild,ADD)
            }

            newFibers[child] = newChild
            // child -> parent链在这里动态构建
            // react里flag为 return 
            // 这里每个child 都会反指回parent
            newChild.parent = fiber

            if(prevFiber) {
                prevFiber.sibling = newChild
            } else {
                // 这里重置了fiber.child 
                // 丢失了children数组,而转化为fiber 链表形式

                fiber.child = newChild
            }
            prevFiber = newChild
        }
        if(prevFiber) prevFiber.sibling = null

        // diff flag
        // 在DFS时加速更新
        fiber.dirty = false
    }
}

// phase2 commit 
function beforeCommit(fiberRoot) {
    commitQueue.forEach((work) => commit(work))
    fiberRoot.done && fiberRoot.done_cb()
    reset()

    function reset() {
        commitQueue = []
        prevCommit = null
        setCurrentFiber(null)
    }
}

function commit(fiber) {
    const { effect,hooks } = fiber

    if(fiber.tag === Hook) {
        if(hooks) {
            hooks.layout.forEach(clearPrevEffect)
            hooks.layout.forEach(executeEffectCb)
            hooks.layout = []
            planWork(() => {
                hooks.effect.forEach(clearPrevEffect)
                hooks.effect.forEach(executeEffectCb)
                hooks.effect = []
            })
        } 
    }

    if(effect === DELETE) {
        deleteElement(fiber)
    } else if(effect === UPDATE) {
        updateElement(fiber,false)
    } else if(effect === ADD) {
        insertElement(fiber)
    }
}

// 这里涉及到diff的具体实现
// 未来会实现
function hashKids() {
    return {}
}

function executeEffectCb(effectState) {
    const effect = effectState.effect
    const clear = effect()
    // 清理函数
    if(isFn(clear)) effectState.clear = clear
}

function clearPrevEffect(effectState) {
    const { clear } = effectState
    clear && clear()
}
