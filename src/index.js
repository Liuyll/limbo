import { h } from './h'
import { render } from './core/reconcile'
import { Suspense } from './component/suspense'
import { createContext } from './api/context'
import KeepAlive from './component/keep-alive'
import { Fragment } from './component/fragment'
import { resolveTemplate } from './core/template/resolve'
import { transformJsx2Vd } from './debug'
import { parse } from '../packages/limbo-template-parser/lib/esm'

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

// limbo doms
export {
    render,
    h,
    h as createElement,
    resolveTemplate
}

// limbo components
export {
    Suspense,
    KeepAlive,
    Fragment
}

// limbo apis
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

// limbo debugs
export {
    transformJsx2Vd,
    parse
}

export default limbo