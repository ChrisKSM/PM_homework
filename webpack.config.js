const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './src/main.tsx',

    output: {
      path: path.resolve(__dirname, 'build'),
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
      // public/ 폴더의 정적 파일(workspace_env.js 등)을 build/ 로 복사
      new CopyPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/index.html'],
            },
          },
        ],
      }),
    ],

    devServer: {
      port: 3000,
      host: '0.0.0.0',
      hot: true,
      historyApiFallback: true,
      allowedHosts: ['workspace.hedej.lge.com', 'localhost'],
      // public/ 폴더를 개발 서버에서도 정적 파일로 서빙 (workspace_env.js 포함)
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
      },
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
