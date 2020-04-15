import { isPrimitive,isArray } from './helper/utils'

export function h(type,attrs,...raw_children) {
    let { 
        key = null,
        ref = null,
        name = null,
        ...props
    } = attrs

    if(name) type.name = name
    const children = normalizeChildren(raw_children)

    if(children.length) props.children = children.length === 1 ? children[0] : children
    return {
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
        value: text
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



