import babel from '@babel/core'
import { h } from '../h'

/**
 * 将jsx template转化为limbo vd
 * @param {*} template 
 */
const transformJsx2Vd = (template) => {
    const ret = babel.transformSync(template, {
        plugins: [[
            "@babel/plugin-transform-react-jsx",
            {
                "pragma": "h"
            }
        ]],
    })
    
    const code = `return ${ret.code}`
    return new Function('h', code)(h)
}

export default transformJsx2Vd

