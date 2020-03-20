import shallowEqual from 'shallowequal'
import { getCurrentFiber,schedule_work } from './reconcile'

const Hook = function() {
    this.state = null
    this.next = null
    this.deps = null
    this.effect = null
    this.clear = null
    this.init = true
}

export let getHook = getCurrentFiberHook()

export function useState(initState) {
    const reducer = (curState,newValue) => {
        if(typeof newValue != 'function') {
            return newValue
        } else {
            let fn = newValue
            return fn(curState)
        }
    }

    return useReducer(reducer,initState)
}

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
    initHook(hook,(hook) => hook.state = initState)
    return [initState,effect]
}

export function useEffect(fn,deps,isLayout = false) {
    const [hook,fiber] = getHook()
    const oldDeps = hook.deps
    if(shallowEqual(oldDeps,deps)) {
        hook.deps = deps
        hook.cb = fn
        fiber.hooks[isLayout ? 'layout' : 'effect'].push(fn)
    }
}

export function useDef(init) {
    return useMemo(() => ({ current: init }),[])
}

export function useMemo(cb,deps) {
    const [hook] = getHook()
    if(!initHook(hook,(hook) => {
        hook.state = cb()
        hook.deps = deps
    })) {
        if(shallowEqual(deps,hook.deps)) return hook.state
        else return (hook.state = cb())
    } 
    return hook.state 
}

export function getCurrentFiberHook() {
    const currentFiber = getCurrentFiber()
    let hooks = currentFiber.hooks ? currentFiber.hooks : (currentFiber.hooks = { hookList: new Hook(),effect: [],layout: [] })
    let beforeHook = hooks.hookList
    return () => {
        return [beforeHook.next || (beforeHook.next = new Hook()),currentFiber]
    }
}

export function useLayoutEffect(fn,deps) {
    useEffect(fn,deps,true)
}

export function reComputeHook() {
    getHook = getCurrentFiberHook()
}

export function setInitState(hook) {
    hook.init = false
}

export function initHook(hook,cb) {
    if(hook.init) {
        setInitState(hook)
        cb(hook)
        return true
    }
    return false
}