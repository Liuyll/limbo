export default {
    input: 'src/index',
    output: [
        { name: 'limbo', file: 'lib/limbo.js', format: 'cjs', sourcemap: true },
        { name: 'limbo', file: 'lib/limbo.esm.js', format: 'umd', sourcemap: true }
    ]
}