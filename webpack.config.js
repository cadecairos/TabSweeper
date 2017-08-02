const path = require('path');

module.exports = {
    entry: {
        sidebar: "./sidebar/js/main.js"
    },
    output: {
        path: path.resolve(__dirname, 'sidebar/js/dist'),
        filename: "[name].bundle.js"
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: "babel-loader",
                query: {
                    presets: [
                        "es2015"
                    ]
                }
            }
        ]
    },
    stats: {
        colors: true
    },
    devtool: "source-map",
    stats: "detailed"
};
