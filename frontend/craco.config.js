const webpack = require("webpack");
const path = require("path");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fallbacks
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        stream: require.resolve("stream-browserify"),
        crypto: require.resolve("crypto-browserify"),
        util: require.resolve("util"),
        buffer: require.resolve("buffer"),
        process: false, // Disable process fallback
      };

      // Plugins
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.DefinePlugin({
          "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
          "process.browser": true,
        }),
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
        }),
      ];

      // Ignore the process/browser import
      webpackConfig.module.rules.push({
        test: /\.(mjs|js)$/,
        resolve: {
          fullySpecified: false,
        },
      });

      return webpackConfig;
    },
  },
};
