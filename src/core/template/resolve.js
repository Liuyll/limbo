import { transform, MergeType } from '../../../packages/limbo-template-parser/lib/esm'
import { renderCondTemplate } from './generateTemplateStr'

let hstr = 'createElement'
const setCreateElementStr = (s) => {
    hstr = s
}

const componentPat = /^[A-Z].*/
const resolveTemplate = (template) => {
    const root = transform(template)
    if(root.type === 'root') {
        root.type = 'node'
        root.tag = 'div'
        root.attributes = [{ name: 'id', value: "limbo-template-top" }]
    }
    return resolveParsedNode(root)
}

const handleIfMerge = (node) => {
    const { if: ifCond, elif: elifCond, else: elseCond } = node
    let condCompStr = `((props) => {`
    condCompStr += renderCondTemplate('if', ifCond.descriminat, resolveParsedNode(ifCond.comp)) // if
    if(elifCond) {
        elifCond.forEach((cond) => {
            condCompStr += renderCondTemplate('else if', cond.descriminat, resolveParsedNode(cond.comp)) // elif
        })
    }
    if(elseCond) condCompStr += renderCondTemplate('else', elseCond.descriminat, resolveParsedNode(elseCond.comp)) // else
    condCompStr += '}'

    condCompStr += `)()`
    return condCompStr
}

const handleForMerge = (node) => {
    const { forBody, forVal, forIdx, comp } = node
    const forCompStr = `${forBody}.map((${forVal}, ${forIdx ? forIdx : 'idx'}) => {
        return ${resolveParsedNode(comp)}
    })`

    return forCompStr
}

const resolveParsedNode = (node) => {
    if(!node) return

    let { type, attributes = {} } = node
    if(type === MergeType.IfMerge) {
        // handle l-cond
        return handleIfMerge(node)
    } else if(type === MergeType.ForMerge) {
        return handleForMerge(node)
    }

    // parser解析为数组
    if(Array.isArray(attributes)) {
        attributes = attributes.reduce((attrs, attr) => {
            attrs[attr.name] = attr.value
            return attrs
        }, {})
    }

    if(type === 'expression') return node.content
    if(type === 'text') return `\`${node.content}\``
    if(type === 'node') return compilerLimboASTToRender(node)
}

const resolveASTAttrToRenderParams = (attrs) => {
    let attrParams = '{'
    for(let attr of attrs) {
        let attrStr = `${attr.name}:`
        if(attr.dataKey) {
            // attr: value
            attrStr += attr.value
            // attr: 'value'
        } else attrStr += `'${attr.value}'`

        attrParams += attrStr + ','
    }

    if(attrParams.endsWith(',')) attrParams = attrParams.slice(0, -1)
    attrParams += '}'

    return attrParams
}

const compilerLimboASTToRender = (ast) => {
    let { attributes, tag, children = [] } = ast
    const paramsAttr = resolveASTAttrToRenderParams(attributes)

    if(!Array.isArray(children)) children = [children]

    children = children.map(child => resolveParsedNode(child))
    const childNodeStr = children.join(',')

    return `${hstr}(${componentPat.test(tag) ? tag : "'" + tag + "'"}, ${paramsAttr}, ${childNodeStr})`
}

export {
    resolveTemplate,
    setCreateElementStr
}