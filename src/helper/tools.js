import { Hook } from '../fiber'
import { planWork } from '../core/schedule'

const _shallowEqual = function (objA, objB, compare, compareContext) {
    var ret = compare ? compare.call(compareContext, objA, objB) : void 0
  
    if (ret !== void 0) {
        return !!ret
    }
  
    if (objA === objB) {
        return true
    }
  
    if (typeof objA !== "object" || !objA || typeof objB !== "object" || !objB) {
        return false
    }
  
    var keysA = Object.keys(objA)
    var keysB = Object.keys(objB)
  
    if (keysA.length !== keysB.length) {
        return false
    }
  
    var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB)
  
    // Test for A's keys different from B.
    for (var idx = 0; idx < keysA.length; idx++) {
        var key = keysA[idx]
  
        if (!bHasOwnProperty(key)) {
            return false
        }
  
        var valueA = objA[key]
        var valueB = objB[key]
  
        ret = compare ? compare.call(compareContext, valueA, valueB, key) : void 0
  
        if (ret === false || (ret === void 0 && valueA !== valueB)) {
            return false
        }
    }
  
    return true
}
  

export const shallowEqual = (o, n) => {
    if(o === undefined && n === undefined) return false
    return _shallowEqual(o, n)
}

export function SCU(oldProps,newProps) {
    return !shallowEqual(oldProps,newProps)
}

export function deleteElement(target) {
    const parentElementNode = target.parentElementFiber.node
    let removeHost = target
    while(removeHost && removeHost.tag === Hook) removeHost = removeHost.child
    removeHost && parentElementNode.removeChild(removeHost.node)
    if(target.hooks) {
        target.hooks.effect.forEach(hook => hook.clear && planWork(hook.clear()))
        target.hooks.layout.forEach(hook => hook.clear && hook.clear())
    }
}

export function insertElement(target) {
    const node = target.node
    const parentElementFiber = target.parentElementFiber
    const parentNode = parentElementFiber ? parentElementFiber.node : target.mountDom

    const insertPoint = target.insertPoint ? target.insertPoint : null
    let lastPoint = insertPoint ? insertPoint.node.nextSibling : null

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
