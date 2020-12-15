import shallowEqual from 'shallowequal'

export function SCU(oldProps,newProps) {
    return !shallowEqual(oldProps,newProps)
}

export function deleteElement(target) {
    const parentElementNode = target.parentElementFiber.node
    parentElementNode.removeChild(target.node)
}

export function insertElement(target) {
    const node = target.node
    const parentElementFiber = target.parentElementFiber
    const parentNode = parentElementFiber ? parentElementFiber.node : target.mountDom

    const insertPoint = target.insertPoint ? target.insertPoint : null
    let lastPoint = insertPoint ? insertPoint.sibling : null
    if(lastPoint) lastPoint = lastPoint.node
    if(lastPoint === node) lastPoint = null

    parentNode.insertBefore(node,lastPoint)
}

export function replaceElement(target) {
    const node = target.node
    const parentElementFiber = target.parentElementFiber
    const parentNode = parentElementFiber ? parentElementFiber.node : target.mountDom

    const curIndex = target.childIndex
    parentNode.insertBefore(node, parentNode.childNodes[curIndex + 1])
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
    isFn(ref) ? ref(dom) : (ref && (ref.current = dom))
}

export function isFn(t) {
    return typeof t === 'function'
}

export function getComponentName(type) {
    return type.name
}