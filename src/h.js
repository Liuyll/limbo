export function h(type,attrs,...original_children) {
    let { 
        key = null,
        ref = null,
        ...props
    } = attrs

    const children = []

    original_children.forEach((child) => {
        if(typeof child === 'string' || typeof child === 'number') {
            children.push(createTextNode(child))
        } else {
            const vnode = child
            children.push(vnode)
        }
    })

    if(children.length) props.children = children.length === 1 ? children[0] : children
    return {
        key,
        ref,
        props,
        type
    }
}

export function createTextNode(text) {
    return {
        type: 'text',
        value: text
    }
}