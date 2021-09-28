/* eslint-disable */

const { parse } = require('../packages/limbo-template-parser/lib')
const { transformJsx2Vd } = require('../lib/limbo')

const template = `
    <div test test1="qwe"> 
        sdf 
        <span>qwe</span>
    </div>
`

const ret = parse(template)
const vd = transformJsx2Vd(template)
debugger;
console.log(vd)
// console.log(ret, '\n ss', ret.children[1].children[0])