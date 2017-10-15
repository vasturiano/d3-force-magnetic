import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
    input: 'src/index.js',
    output: [
        {
            format: 'umd',
            name: 'd3',
            file: 'dist/d3-force-magnetic.js',
            sourcemap: true
        },
        {
            format: 'es',
            file: 'dist/d3-force-magnetic.mjs'
        }
    ],
    plugins: [
        nodeResolve(),
        babel({
            presets: [
                ["es2015", { "modules": false }]
            ],
            plugins: ["external-helpers"],
            babelrc: false
        })
    ]
};