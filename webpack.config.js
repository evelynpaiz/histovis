const path = require('path');

module.exports = {
    entry: {
        "histovis": [path.resolve(__dirname, 'src/main.js')]
    },
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: '[name].js',
        library: 'histovis',
        libraryTarget: 'umd'
    },
  devServer: {
    publicPath: '/dist/'
  },
};
