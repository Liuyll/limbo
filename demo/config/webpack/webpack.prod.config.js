const merge = require('webpack-merge')
const COMMON_CONFIG = require('./webpack.base.config')
const UglifyPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack')

const PRODUCTION_CONFIG = {
    mode: 'production',
    plugins: [
        new UglifyPlugin(),
        new webpack.NamedChunksPlugin()
    ]
}

module.exports = merge(COMMON_CONFIG,PRODUCTION_CONFIG)