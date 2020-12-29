export let current_fiber = null
export const HostFiber = 0
export const Hook = 1

export function createFiber(vnode,op) {
    return { ...vnode,tag: vnode.tag || typeof vnode.type === 'function' ? Hook : HostFiber,effect: op }
}

export function getParentElementFiber(fiber) {
    if(!fiber.parent) return null
    fiber = fiber.parent
    while(fiber && fiber.tag === Hook) {
        fiber = fiber.parent
    }
    return fiber
}

export function getClosetFiberFromNode(fiber) {
    const parentFiber = getParentElementFiber(fiber)
    return parentFiber
}


export function getNearestSiblingElementFiber(fiber) {
    const rawFiber = fiber
    fiber = fiber.parent && fiber.parent.child
    while(fiber && fiber.sibling) {
        fiber = fiber.sibling
    }
    return rawFiber === fiber ? null : fiber
}

export function getCurrentFiber() {
    return current_fiber
}

export function setCurrentFiber(fiber) {
    current_fiber = fiber
}

export function cloneFiber(fiber, effect) {
    const newFiber = {}
    newFiber.effect = effect
    newFiber.dirty = fiber.dirty
}
