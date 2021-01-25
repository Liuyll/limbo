import { terser } from 'rollup-plugin-terser'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'

export default {
    input: 'src/index',
    output: [
        { name: 'limbo', file: 'lib/limbo.js', format: 'cjs', sourcemap: true, exports: 'named' },
        { name: 'limbo', file: 'lib/limbo.esm.js', format: 'umd', sourcemap: true, exports: 'named' },
        { name: 'limbo', file: 'lib/limbo.min.js', format: 'cjs', plugins: [terser()], sourcemap: false, exports: 'named' }
    ],
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**'
        })
    ]
}