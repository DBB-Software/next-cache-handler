const path = require('node:path')

module.exports = {
  entry: './src/index.ts',
  target: 'node',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    clean: true
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  node: {
    global: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
}
