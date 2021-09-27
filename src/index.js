import { h } from './h'
import { render } from './core/reconcile'
import { Suspense } from './component/suspense'
import { createContext } from './api/context'
import KeepAlive from './component/keep-alive'
import { Fragment } from './component/fragment'
import { resolveTemplate } from './core/template'

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
    resolveTemplate
}

export {
    Suspense,
    KeepAlive,
    Fragment
}

export {
    useState,
    useEffect,
    useAction,
    useRef,
    useMemo,
    useLayoutEffect,
    useContext,
    useReducer,
    useCallback,
    createContext
}

export default limbo