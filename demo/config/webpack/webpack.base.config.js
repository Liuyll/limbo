const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const resolveApp = require('./tools/path').resolveApp
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const tools = require('./tools/tools')

module.exports = {
    mode: 'development',
    entry: {
        index: path.resolve(__dirname,'../../src/index.jsx')
    },
    output: {
        path: path.resolve(__dirname,'../../build'),
        filename: this.mode === 'production' ? '[name].[contenthash:8].file.js' : '[name].[hash:8].file.js',
        chunkFilename: this.mode === 'production' ? '[name].[chunkhash:8].chunk.js' : '[name].[hash:8].chunk.js',
        publicPath: tools.judgeMode(this.mode,resolveApp('../../build'),'/'),
    },
    module: {
        rules: [
            {
                test: /\.(tsx|ts)$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env','@babel/preset-react'],
                            // 可开启装饰器,也可由ts开启
                            plugins: []
                        },
                        
                    },
                    'ts-loader'
                ]
            },
            {
                test: /\.css/,
                use: [MiniCssExtractPlugin.loader,'css-loader']
            },
            {
                test: /\.less/,
                use: [MiniCssExtractPlugin.loader,'css-loader','less-loader']
            },
            {
                test: /\.(js|jsx)$/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env','@babel/preset-react'],
                        // 可开启装饰器,也可由ts开启
                        plugins: []
                    }, 
                }]
            },
            {
                test: /\.(jpg|png)$/,
                use: [{
                    loader: 'url-loader'
                }],
                exclude: path.resolve(__dirname,'../../node_modules'),
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname,'../../src/index.html'),
            inject: true,
            filename: 'index.html'
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: resolveApp('../../build')
        })
    ],
    optimization: {
        minimizer: [
            // new TerserPlugin({
            //     test: /\.(tsx|jsx|ts|js)$/,
            //     exclude: /node_modules/,
            //     include: /src/,
            //     cache: true,
            // })
        ],
        // named way:runtime~${entryPoint}.js
        runtimeChunk: true,
        splitChunks: {
            cacheGroups: {
                vendors: {
                    test: /node_modules/,
                    chunks: 'initial',
                    name: 'vendor',
                    priority: 10
                },
                commons: {
                    test: /node_modules\/(react|react-dom|antd)/,
                    chunks: 'all',
                    name: 'commons',
                    priority: 20
                },
                default: {
                    test: '*',
                    name: 'default',
                    minChunks: 2,
                    priority: -20,
                    maxInitialRequests: 3,
                    reuseExistingChunk: true
                }
            }
        }
    },
    resolve: {
        alias: {
            '@Components': path.resolve(__dirname,'../../src/components')
        },
        extensions: ['.ts', '.tsx', '.js', 'jsx']
    }
}
