/* eslint-disable */

const { transform } = require('../packages/limbo-template-parser/lib')
const { transformJsx2Vd, resolveTemplate, createElement } = require('../lib/limbo')

const template = `
    <div test test1="qwe" l-bind:zxc="zx"><span >qwe</span></div>
`

// const ret = transform(template)
// console.log(ret.children[1].attributes)
// const vd = transformJsx2Vd(template)
const ast = resolveTemplate(template)
const d = 123
console.log(createElement('div', {id:'limbo-template-top'}, createElement('div', {class:d}, 'zzxx')).props.children)
// console.log(ast)
// console.log(vd)
// console.log(ret, '\n ss', ret.children[1].children[0])