import { h } from './h'
import { render } from './core/reconcile'
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

export default limbo