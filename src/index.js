import { h } from './h'
import { render } from './core/reconcile'
import { Suspense } from './component/suspense.jsx'

import {
    useState,
    useEffect,
    useAction,
    useRef,
    useReducer,
    useMemo,
    useLayoutEffect,
    useContext
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
    useContext
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
    useReducer
}

export {
    Suspense
}

export default limbo