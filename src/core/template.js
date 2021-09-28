import { parse } from '../../packages/limbo-template-parser/lib/esm/index'
import { h } from '../h'

const resolveTemplate = (template) => {
    const root = parse(template)
    if(root.type === 'root') {
        root.type = 'node'
        root.tag = 'div'
        root.attributes = { id: "limbo-template-top" }
    }
    return resolveParsedNode(root)
}

const resolveParsedNode = (node) => {
    let { tag, children = [], type, attributes = {} } = node
    // parser解析为数组
    if(Array.isArray(attributes)) {
        attributes = attributes.reduce((attrs, attr) => {
            attrs[attr.name] = attr.value
            return attrs
        }, {})
    }
    if(type === 'text') return node.content

    if(!children.pop) children = [children]
    else children = children.map(child => resolveParsedNode(child))
    if(type === 'node') return h(tag, attributes, ...children)
}

export {
    resolveTemplate
}