const path = require('path');

module.exports = {
    entry: {
        "three": [path.resolve(__dirname, 'src/three.js')],
        "photogrammetricCamera": [path.resolve(__dirname, 'src/photogrammetric-camera.js')],
        "three-additional": [path.resolve(__dirname, 'src/three-additional.js')]
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
