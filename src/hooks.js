import shallowEqual from 'shallowequal'
import { getCurrentFiber,schedule_work } from './reconcile'

const Hook = function() {
    this.state = {}
    this.next = null
}

export let getHook = getCurrentFiberHook()

export function useReducer(reducer,initState) {
    const [hook,fiber] = getHook()
    const effect = action => {
        let newState = reducer(hook.state,action)
        // 目前没有优先级
        // 优先级默认为react里的Sync 即同步调用
        if(shallowEqual(newState,hook.state)) {
            hook.state = newState
            schedule_work(fiber)
        }
    }
    return [initState,effect]
}

export function useEffect(fn,deps) {
    const [hook,fiber] = getHook()
    const oldDeps = hook[1]
    if(shallowEqual(oldDeps,deps)) {
        hook[1] = deps
        hook[0] = fn
        fiber.hooks.effect.push(fn)
    }
}

export function getCurrentFiberHook() {
    const currentFiber = getCurrentFiber()
    let hooks = currentFiber.hooks ? currentFiber.hooks : (currentFiber.hooks = { hookList: new Hook(),effect: [],layout: [] })
    let beforeHook = hooks.hookList
    return () => {
        return [beforeHook.next || (beforeHook.next = new Hook()),currentFiber]
    }
}


export function reComputeHook() {
    getHook = getCurrentFiberHook()
}