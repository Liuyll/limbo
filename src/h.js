import { HostFiber, Hook } from './fiber'
import { isPrimitive,isArray } from './helper/utils'
import { __LIMBO_SUSPENSE } from './core/symbol'

export const __LIMBO_COMPONENT = Symbol('vnode')
export function h(type,data,...children) {
    // 兼容ts-loader和babel-jsx-transform的不同
    if(!data) data = {}
    let { 
        key = null,
        ref = null,
        name = null,
        __test = null,
        ..._props
    } = data

    const {
        __suspense_container,
        fallback,
        boundary,
        ...props
    } = _props

    if(name === 'Fragment') type.tag = Hook
    if(name) type.name = name
    children = normalizeChildren(children)

    if(children.length) props.children = children.length === 1 ? children[0] : children
    if(children.type === 'text') props.children = children

    let __type = __LIMBO_COMPONENT
    const additionalProp = {}

    if(__suspense_container) additionalProp.__suspense_container = true
    if(typeof type === 'function' && type.prototype.constructor.name === 'Suspense') {
        __type = __LIMBO_SUSPENSE
        if(!fallback) throw new Error('Suspense must get fallback prop!')
        fallback.__suspense_fallback = true
        additionalProp.fallback = fallback
        additionalProp.boundary = boundary
        additionalProp.__suspenseFlag = Symbol('suspense')
    }
    return {
        __type,
        key,
        ref,
        props,
        type,
        __test,
        ...additionalProp
    }
}

export function cloneElement(node,props) {
    const newProps = Object.assign({},node.props,props)
    return {
        ...node,
        props: newProps
    }
}

export function createTextNode(text) {
    return {
        type: 'text',
        value: text,
        props: {},
        tag: HostFiber
    }
}

// 若使用 jsx-babel 无需下面两个函数
function normalizeChildren(c) {
    if(isPrimitive(c)) return createTextNode(c)
    else if(isArray(c)) {
        return flattenArray(c).map(sc => {
            return normalizeChildren(sc)
        })
    }
    else return c
}

function flattenArray(t) {
    return Array.prototype.concat.apply([],t)
}



