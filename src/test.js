const { parse } = require('../packages/limbo-template-parser/lib/index')

const template = `
    <div test test1="qwe"> 
        sdf 
        <span>qwe</span>
    </div>
`

const ret = parse(template)
console.log(ret, ret.children[1].attributes)