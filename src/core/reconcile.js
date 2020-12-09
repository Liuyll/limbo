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
let currentExecuteWorkUnit

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
    if(!currentExecuteWorkUnit) currentExecuteWorkUnit = updateQueue.shift()

    // fiber level task
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

    // 当前时间片用完,但任务还未执行完
    // 把任务继续加入调度,等待恢复
    if(currentExecuteWorkUnit && !dopast) {
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

function reconcileText(newFiber,oldFiber) {
    if(newFiber.type !== 'text' || oldFiber.type !== 'text') throw Error('reconcileText must be text type.')
    if(newFiber.value !== oldFiber.Value) setTextContent(oldFiber, newFiber.value)
    newFiber.effect = NOWORK
}

function reconcileChildren(fiber,children) {
    // if(fiber.type === 'text') return reconcileText(fiber)
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
            oldChild.effect = DELETE
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
                newChild.replaced = reUseFiber
            } else {
                newChild.effect = UPDATE
                newChild = { ...reUseFiber,...newChild }
                newChild.oldProps = reUseFiber.props 
                if(reUseFiber.type === 'text' && newChild.type === 'text') reconcileText(newChild, reUseFiber)
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

    if(!fiber.dirty && SCU(oldProps,newProps)) {
        return 
    }

    setCurrentFiber(fiber)
    reComputeHook()

    const build = fiber.type
    const children = build(newProps)

    reconcileChildren(fiber,children)
}

function updateHost(elementFiber) {
    if(!elementFiber.node) {
        mountElement(elementFiber)
    }

    // 插入位置是第一个dom父节点的最后
    let parentElementFiber = elementFiber.parentElementFiber || {}
    elementFiber.insertPoint = parentElementFiber.last || null
    parentElementFiber.last = elementFiber
    elementFiber.node.last = null 

    // debugger
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
    const { effect,hooks,ref,replaced } = fiber

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
        deleteElement(fiber)
        insertElement(replaced)
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
            if(child) {
                if(Array.isArray(child)) {
                    child.forEach((c,y1) => {
                        kidsKeyMap[keyMapKeyFactory(2,y1,c.key)] = c
                    })
                }
                kidsKeyMap[keyMapKeyFactory(1,y,child.key)] = child
            }
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
