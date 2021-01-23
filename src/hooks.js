import { shallowEqual } from './helper/tools'
import { scheduleWorkOnFiber } from './core/reconcile'
import { getCurrentFiber } from './fiber'

const Hook = function() {
    this.state = null
    this.next = null
    this.deps = null
    // effect index
    this.effect = null,
    this.clear = null
    this.init = true
}

let getHook

function useState(initState) {
    const reducer = useCallback((curState,newValue) => {
        if(typeof newValue != 'function') {
            return newValue
        } else {
            const fn = newValue
            return fn(curState)
        }
    }, [])

    return useReducer(reducer,initState)
}

function useReducer(reducer,initState) {
    const [hook,fiber] = getHook()
    const effect = useCallback(action => {
        let newState = reducer(hook.state,action)
        if(!shallowEqual(newState,hook.state)) {
            hook.state = newState
            scheduleWorkOnFiber(fiber)
        }
    }, [reducer])

    initHook(hook,(hook) => {
        if(typeof initState === 'function') initState = initState()
        hook.state = initState
    })
    return [hook.state,effect]
}

function useCallback(fn, deps) {
    return useMemo(() => fn, deps)
}

function useEffect(fn,deps,isLayout = false) {
    const [hook,fiber] = getHook()
    const oldDeps = hook.deps
    // debugger
    if(!shallowEqual(oldDeps,deps)) {
        hook.deps = deps
        hook.cb = fn
        const commitHook = fiber.hooks[isLayout ? 'layout' : 'effect']
        if(hook.effect != null) {
            commitHook[hook.effect].effect = fn
        } else {
            commitHook.push({ effect: fn })
            hook.effect = commitHook.length - 1
        }
        commitHook[hook.effect].call = true
    }
}

function getCurrentCalledEffect(hooks) {
    return hooks.filter(hook => {
        if(hook.call) {
            hook.call = false
            return true
        }
        return false
    })
}

function useAction(fn,deps) {
    const [hook] = getHook()
    const oldDeps = hook.deps
    if(!shallowEqual(oldDeps,deps)) {
        hook.deps = deps
        fn()
    }
}

function useRef(init) {
    return useMemo(() => ({ current: init }),[])
}

function useMemo(cb,deps) {
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

function getCurrentFiberHook() {
    const currentFiber = getCurrentFiber()
    let hooks = currentFiber.hooks ? currentFiber.hooks : (currentFiber.hooks = { hookList: new Hook(),effect: [],layout: [] })
    let beforeHook = hooks.hookList
    return () => {
        if(!beforeHook.next) beforeHook.next = new Hook()
        beforeHook = beforeHook.next
        const currentHook = beforeHook
        return [currentHook, currentFiber]
    }
}

function useContext(context,selector = (v) => v) {
    // eslint-disable-next-line
    const [_,forceUpdate] = useReducer(_c => _c + 1,0)
    const val = useRef(selector(context.value))

    useLayoutEffect(() => {
        let subFn = (newValue) => {
            if(selector(newValue) === val.current) return 
            val.current = newValue
            forceUpdate()
        } 
        context.add(subFn)
        return context.deleteSub(subFn)
    },[])

    return val.current
}

function useLayoutEffect(fn,deps) {
    useEffect(fn,deps,true)
}

function reComputeHook() {
    getHook = getCurrentFiberHook()
}

function setInitState(hook) {
    hook.init = false
}

function initHook(hook,cb) {
    if(hook.init) {
        setInitState(hook)
        cb(hook)
        return true
    }
    return false
}

export {
    useState,
    useEffect,
    useCallback,
    useReducer,
    useRef,
    useMemo,
    useAction,
    useContext,
    useLayoutEffect
}

export {
    reComputeHook,
    setInitState,
    initHook,
    getCurrentFiberHook,
    getCurrentCalledEffect,
}
