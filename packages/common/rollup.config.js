import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default {
  input: './src/index.ts',
  output: {
    dir: './lib',
    format: 'cjs',
    preserveModules: true,
    preserveModulesRoot: 'src'
  },
  external: ['next'],
  plugins: [nodeResolve(), commonjs(), json(), typescript()]
}
