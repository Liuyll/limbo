const glob = require('glob')
const path = require('path')

function judgeMode(mode,dev,prod){
    mode === 'production' ? prod : dev
}

module.exports = {
    judgeMode
}