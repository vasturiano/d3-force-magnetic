import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
    plugins: [
        nodeResolve({
            jsnext: true,
            main: true
        }),
        babel()
    ]
};