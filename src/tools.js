import shallowEqual from 'shallowequal'
import { getNearestElementFiber } from './fiber'

export function SCU(oldProps,newProps) {
    return shallowEqual(oldProps,newProps)
}

export function deleteElement(target) {
    const parentElementNode = target.parentElementFiber.node
    parentElementNode.removeChild(target.node)
}

export function insertElement(target) {
    const parentElementFiber = target.parentElementNode
    const nearestElementFiber = getNearestElementFiber(target)

    if(target.type !== 'text') {
        // target不是文本节点,直接利用last来插入
        const insertPoint = target.insertPoint ? target.insertPoint : null
        const lastPoint = insertPoint ? insertPoint.sibling : null
        if(lastPoint) {
            parentElementFiber.node.insertBefore(target.node,lastPoint ? lastPoint : parentElementFiber.firstChild)
        }
    }
    
    else {
        const parentElementNode = parentElementFiber.node
        const parentNearestElementNode = nearestElementFiber && nearestElementFiber.node
        parentElementNode.insertBefore(target,parentNearestElementNode)
    }
}

export function cleanRef(fiber) {
    if(!fiber) return
    
    for(const kid of fiber.kids) {
        const ref = kid.ref
        setRef(ref,null)
        cleanRef(kid.kids)
    }
}

export function setRef(ref,dom) {
    isFn(ref) ? ref(dom) : (ref.current = dom)
}

export function isFn(t) {
    return typeof t === 'function'
}