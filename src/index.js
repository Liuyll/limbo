import { h } from './h'
import { render } from './core/reconcile'
import {
    useState,
    useEffect
} from './hooks'

const limbo = {
    render,
    h,
    createElement: h,
    useState,
    useEffect,
}

export {
    render,
    h,
    h as createElement,
    useState,
    useEffect,
}

export default limbo