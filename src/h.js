import { HostFiber, Hook } from './fiber'
import { isPrimitive,isArray } from './helper/utils'
import { __LIMBO_SUSPENSE } from './core/symbol'

const __LIMBO_COMPONENT = Symbol('vnode')

/** @jsxRuntime classic */
/**
 * limbo 支持classic jsx转化
 * eg: 
 * in:
 * const profile = (
    <div>
        <img src="avatar.png" className="profile" />
        <h3>{[user.firstName, user.lastName].join(" ")}</h3>
    </div>
   );
   ---------------->
   out:
   const profile = React.createElement(
    "div",
    null,
    React.createElement("img", { src: "avatar.png", className: "profile" }),
    React.createElement("h3", null, [user.firstName, user.lastName].join(" "))
   );
 */
function createElement(type,data,...children) {
    const patchFlag = children.length 
        ? typeof children[children - 1] === 'number' ? children[children.length - 1] : null 
        : null
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

    // avoid use name as prop
    if(name && typeof type !== 'string') type.name = name
    children = normalizeChildren(children)

    if(children.length) props.children = children.length === 1 ? children[0] : children
    if(children.type === 'text') props.children = children

    let __type = __LIMBO_COMPONENT
    const additionalProp = {}

    if(__suspense_container) additionalProp.__suspense_container = true
    if(typeof type === 'function' && type.prototype && type.prototype.constructor.name === 'Suspense') {
        __type = __LIMBO_SUSPENSE
        if(!fallback) throw new Error('Suspense must get fallback prop!')
        fallback.__suspense_fallback = true
        additionalProp.pendings = new Map()
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
        ... patchFlag ? { patchFlag } : {},
        ...additionalProp
    }
}

function createBlock(type,data,...children) {
    data = {
        ...data,
        __block: true,
        tag: Hook
    }
    return createElement(type, data, children)
}

function cloneElement(node,props) {
    const newProps = Object.assign({},node.props,props)
    return {
        ...node,
        props: newProps
    }
}

function createTextNode(text) {
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


export {
    createElement as h,
    createBlock,
    __LIMBO_COMPONENT,
    createTextNode,
    cloneElement,
}
