const path = require('path');

module.exports = {
    entry: {
        "three": [path.resolve(__dirname, 'src/three.js')],
        "photogrammetric-camera": [path.resolve(__dirname, 'src/photogrammetric-camera.js')],
        "three-additional": [path.resolve(__dirname, 'src/three-additional.js')],
        "itowns": [path.resolve(__dirname, 'src/itowns.js')],
        "cluster": [path.resolve(__dirname, 'src/cluster.js')]
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
