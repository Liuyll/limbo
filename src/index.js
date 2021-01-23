import { h } from './h'
import { render } from './core/reconcile'
import { Suspense } from './component/suspense'
import { createContext } from './component/context'
import KeepAlive from './component/keep-alive'
import { Fragment } from './component/fragment'

import {
    useState,
    useEffect,
    useAction,
    useRef,
    useReducer,
    useMemo,
    useLayoutEffect,
    useContext,
    useCallback
} from './hooks'

const limbo = {
    render,
    h,
    createElement: h,
    useState,
    useEffect,
    useAction,
    useRef,
    useReducer,
    useMemo,
    useLayoutEffect,
    useContext,
    useCallback,
    Fragment,
}

export {
    render,
    h,
    h as createElement,
    useState,
    useEffect,
    useAction,
    useRef,
    useMemo,
    useLayoutEffect,
    useContext,
    useReducer,
    useCallback
}

export {
    Suspense,
    KeepAlive,
    createContext,
    Fragment
}

export default limbo