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

function createFiberRoot(tag,node,props,done) {
    this.tag = tag
    this.map_dom_node = node
    this.props = props
    this.done_cb = done
}

let updateQueue = []

// commit phase
let commitQueue = []

let prevCommit

// cewu
// wip
let current_execute_work_unit

export function render(vnode,mountDom,cb) {
    const fiberRoot = createFiberRoot(HostFiber,mountDom,{ children: vnode },cb)
    scheduleWorkOnFiber(fiberRoot)
}

export function scheduleWorkOnFiber(fiber) {
    // 避免重复加入更新队列
    !fiber.dirty && updateQueue.push(fiber) && (fiber.dirty = true)
    scheduleTask(reconcileWork)
}

function reconcileWork(canExecute) {
    if(!current_execute_work_unit) current_execute_work_unit = updateQueue.shift()

    // fiber level task
    while(current_execute_work_unit && (!shouldYield() || canExecute)) {
        try {
            // async diff 
            // 类组件生命周期可能出现多次调用,慎用
            current_execute_work_unit = reconcile(current_execute_work_unit)
        } catch {
            // TODO: Error Boundary
            break
        }
    }
    // 当前时间片用完,但任务还未执行完
    // 把任务继续加入调度,等待恢复
    if(current_execute_work_unit && canExecute) {
        // 等待恢复
        return current_execute_work_unit.bind(null)
    }
    // TODO: commit 
    if(prevCommit) {
        let commit_origin = prevCommit
        flushCommitQueue(commit_origin)
    }
    return null
}

// reconcile 保证每个父节点被访问两次
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
    
    // 我们内置SCU以避免hooks的无效re-render开销
    if(!fiber.dirty && !SCU(oldProps,newProps)) {
        return 
    }

    setCurrentFiber(fiber)
    // 重计算当前fiber的hook链表
    reComputeHook()

    let build = fiber.type
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
    const newFibers = (fiber.kids = buildKeyMap(children))

    const reused = {}
    // 我们以oldFiber为参考,创建新的newFiber
    // 不同的框架可能有不同的diff策略
    for(let child in oldFibers) {
        const oldChild = oldFibers[child]
        const newChild = newFibers[child]

        // avoid key same but different element
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
                if(reUseFiber.type === 'text') {
                    if(reUseFiber.value !== newChild.value) {
                        setTextContent(reUseFiber,newChild.value)
                    }
                }
                else {
                    newChild.effect = UPDATE
                    newChild = { ...reUseFiber,...newChild }
                    newChild.lastProps = reUseFiber.props
                }       
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
                // 首个子节点为child
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
function flushCommitQueue(fiberRoot) {
    commitQueue.forEach((work) => commit(work))
    fiberRoot.done && fiberRoot.done_cb()
    resetOldCommit()

    function resetOldCommit() {
        commitQueue = []
        prevCommit = null
        setCurrentFiber(null)
    }
}

function commit(fiber) {
    const { effect,hooks,ref } = fiber

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

    // update
    setRef(ref,fiber.node)
}

function buildKeyMap(children) {
    let kidsKeyMap = {}
    if(children.pop) {
        children.forEach((child,y) => {
            if(child.pop) {
                child.forEach((c,y1) => {
                    kidsKeyMap[keyMapKeyFactory(2,y1,c.key)] = c
                })
            }
            kidsKeyMap[keyMapKeyFactory(1,y,child.key)] = child
        })
    } else kidsKeyMap[keyMapKeyFactory(0,0,children.key)] = children
    return kidsKeyMap
}

// children被拍平为一个最大不过二维的数组
// 你可以参考最长上升子序列 / 编辑距离 实现O(nlogn)复杂度的标准diff
// limbo没有实现考虑
function keyMapKeyFactory(x,y,key) {
    if(!y) return x + '.' + key
    if(!key) {
        if(!y) return x
        else return x + '.' + y
    }
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
