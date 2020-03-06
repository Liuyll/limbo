export let current_fiber = null
export const HostFiber = 0
export const Hook = 1

export function createFiber(vnode,op) {
    return { ...vnode,tag: typeof vnode.type === 'function' ? Hook : HostFiber,op }
}

export function getParentElementFiber(fiber) {
    while(fiber.parent && fiber.parent.tag == Hook) {
        fiber = fiber.parent
    }
    return fiber
}

export function getClosetFiberFromNode(fiber) {
    const parentFiber = getParentElementFiber(fiber)
    return parentFiber
}

export function getNearestChildElementFiber(fiber) {
    while(fiber.child && fiber.child.tag == Hook) {
        fiber = fiber.child
    }
    return fiber
}

export function getCurrentFiber() {
    return current_fiber
}

export function setCurrentFiber(fiber) {
    current_fiber = fiber
}


