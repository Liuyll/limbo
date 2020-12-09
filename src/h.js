import { HostFiber } from './fiber'
import { isPrimitive,isArray } from './helper/utils'

const __LIMBO_COMPONENT = Symbol('vnode')
export function h(type,data,...children) {
    // 兼容ts-loader和babel-jsx-transform的不同
    if(!data) data = {}

    let { 
        key = null,
        ref = null,
        name = null,
        ...props
    } = data

    if(name) type.name = name
    children = normalizeChildren(children)
    // debugger

    if(children.length) props.children = children.length === 1 ? children[0] : children
    if(children.type === 'text') props.children = children

    return {
        __type: __LIMBO_COMPONENT,
        key,
        ref,
        props,
        type
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



