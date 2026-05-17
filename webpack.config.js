const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './src/main.tsx',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',
      clean: true,
      publicPath: '/',
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.svg',
      }),
      new Dotenv({
        safe: false,
        silent: true,
      }),
    ],

    devServer: {
      port: 3000,
      host: '0.0.0.0',
      hot: true,
      historyApiFallback: true,
      allowedHosts: ['workspace.hedej.lge.com', 'localhost'],
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      ],
      client: {
        webSocketURL: 'auto://0.0.0.0:0/ws',
      },
    },

    devtool: isDev ? 'eval-source-map' : 'source-map',

    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },
  };
};
