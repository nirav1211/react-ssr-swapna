const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');



const common = {
  rules: [
    {
      test: /\.(js)$/,
      exclude: /node_modules/,
      use: 'babel-loader'
    },
    {
      test: /\.(css|scss)$/,
      use: [
        // Creates `style` nodes from JS strings
        // 'style-loader',
        MiniCssExtractPlugin.loader,
        // Translates CSS into CommonJS
        'css-loader',
        // Compiles Sass to CSS
        'sass-loader',
      ],
    },
    {
      test: /\.(png|svg|jpg|jpeg|gif|pdf|mp4)$/,
      use: [{
        loader: 'url-loader',
        options: {
          limit: 8192,
          outputPath: '../client_build/static/media/',
          publicPath: process.env.IS_DEV_SERVER ? '/static/media/' : '/s/static/media/'
        },
      }],
    },
    {
      test: /\.(woff|woff2|eot|ttf|otf|flac|wav)$/,
      loader: 'file-loader',
      options: {
        outputPath: '../client_build/static/fonts/',
        publicPath: process.env.IS_DEV_SERVER ? '/static/fonts/' : '/s/static/fonts/'
      }
    },
  ],
};


const optimization = {
  splitChunks: {
    chunks: 'async',
    minSize: 20000,
    maxSize: 244000,
    minChunks: 1,
    cacheGroups: {
      default: false,
      vendors: false,
      // vendor chunk
      vendor: {
        // sync + async chunks
        chunks: 'all',
        name: 'vendor',
        // import file path containing node_modules
        test: /node_modules/,
        priority: 20,
      },
      // common chunk
      common: {
        name: 'common',
        minChunks: 2,
        chunks: 'async',
        priority: 10,
        reuseExistingChunk: true,
        enforce: true
      },
    },
  },
}


const clientPlugins = [
  // to generate index.html also
  new HtmlWebPackPlugin({
    template: './public/index.html',
    favicon: './public/favicon.ico',
    filename: './index.html',
  }),

  // generate separate files for css and insert them using link tags
  new MiniCssExtractPlugin(),

]

const commonPlugins = [
  // environment files
  new Dotenv({
    path: process.env.NODE_ENV === "development" ?
      './src/env/.development' : './src/env/.production',
  }),
]

const serverPlugins = [
  // add server plugins here
]

const clientConfig = {
  entry: './client/index.js',
  output: {
    path: path.resolve(__dirname, 'client_build'),
    // filename: 'client_bundle.js',
    filename: '[name].bundle.js',
    publicPath: process.env.IS_DEV_SERVER ? '/' : '/s/'
  },
  module: common,
  devtool: process.env.NODE_ENV === 'development' ? 'inline-source-map' : false,
  devServer: {
    publicPath: '/', // path to bundle
    historyApiFallback: true,
    port: 3000,
    hot: true,
    inline: true,
    contentBase: './client_build/',
  },
  optimization: optimization,
  plugins: [...commonPlugins, ...clientPlugins],

};

const serverConfig = {
  entry: './server/index.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    path: path.resolve(__dirname, 'server_build'),
    filename: 'server_bundle.js',
    publicPath: '/'
  },
  module: common,
  devtool: process.env.NODE_ENV === 'development' ? 'inline-source-map' : false,
  plugins: [...commonPlugins, ...serverPlugins],
};

module.exports = [clientConfig, serverConfig];