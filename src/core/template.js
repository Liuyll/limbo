import { parse } from '../../packages/limbo-template-parser/lib/index.js'
import { h } from '../h'

const resolveTemplate = (template) => {
    const root = parse(template)
    if(root.type === 'root') {
        root.type = 'node'
        root.tag = 'div'
        root.attributes = [{ name: 'id', value: 'top' }]
    }
    return resolveParsedNode(root)
}

const resolveParsedNode = (node) => {
    let { tag, children = [], type, attributes = [] } = node
    if(type === 'text') {
        tag = 'text'
        type = 'node'
    }
    if(type === 'node') return h(tag, attributes, children.map(child => resolveParsedNode(child)))
}

export {
    resolveTemplate
}