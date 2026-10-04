const path = require('node:path');
const fs = require('node:fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const config = JSON.parse(fs.readFileSync('./extension-project.json', 'utf8'));
module.exports = (_, argv) => {
  const production = argv.mode === 'production';
  return {
    mode: production ? 'production' : 'development',
    entry: production ? './src/index.tsx' : './dev/main.tsx',
    output: {path: path.resolve(__dirname, production ? 'dist/resources' : 'dist/preview'), filename: production ? `extension-${config.name}.js` : 'preview.js', clean: true},
    devtool: false,
    resolve: {extensions: ['.tsx', '.ts', '.js']},
    module: {rules: [
      {test: /\.tsx?$/, exclude: /node_modules/, use: {loader: 'ts-loader', options: {transpileOnly: true, compilerOptions: {noEmit: false, jsx: config.hostContract.jsxMode === 'automatic' ? 'react-jsx' : 'react'}}}},
      {test: /\.css$/, use: ['style-loader', 'css-loader']}
    ]},
    externals: production ? Object.fromEntries(config.hostContract.globals.map(name => [name === 'React' ? 'react' : name === 'ReactDOM' ? 'react-dom' : 'react/jsx-runtime', name])) : {},
    optimization: {splitChunks: false, runtimeChunk: false, moduleIds: 'deterministic'},
    plugins: [new webpack.optimize.LimitChunkCountPlugin({maxChunks: 1}), ...(production ? [
      {apply(compiler) {compiler.hooks.done.tap('ModuleEvidence', stats => {
        const json = stats.toJson({all: false, modules: true, nestedModules: true, errors: true});
        fs.writeFileSync(path.resolve(__dirname, 'dist/build-modules.json'), JSON.stringify(json, null, 2));
      });}}
    ] : [new HtmlWebpackPlugin({template: './dev/index.html'})])]
  };
};
