/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-19 13:39:16
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-20 09:46:49
 * @FilePath: \webgpu\WebGPU\examples\webpack.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
/* eslint-enable @typescript-eslint/no-var-requires */

const EXAMPLES = {
    triangleTest: {
        id: 'triangleTest',
        title: 'triangleTest',
    },
    circleTest: {
        id: 'circleTest',
        title: 'circleTest',
    },
    computeTest: {
        id: 'computeTest',
        title: 'computeTest',
    },
    instanceTest: {
        id: 'instanceTest',
        title: 'instanceTest',
    },
    animationTest: {
        id: 'animationTest',
        title: 'animationTest',
    },
    textureTest: {
        id: 'textureTest',
        title: 'textureTest',
    },
}

const entry = {}

const plugins = [
    new HtmlWebpackPlugin({
        filename: 'index.html',
        title: 'Examples',
        template: path.join(__dirname, 'templates', 'index.ejs'),
        pages: Object.keys(EXAMPLES).map(key => EXAMPLES[key]),
        chunks: [],
    }),
]

for (const key in EXAMPLES) {
    const example = EXAMPLES[key]

    entry[key] = `./${example.id}.ts`

    plugins.push(
        new HtmlWebpackPlugin({
            filename: `${example.id}.html`,
            title: `${example.title} Example`,
            chunks: ['commons', key],
            template: path.join(__dirname, 'templates', 'default.ejs'),
        }),
    )
}

module.exports = {
    mode: 'development',
    context: __dirname,
    entry,
    output: {
        filename: '[name].bundle.js',
    },
    devtool: 'source-map',
    // webpack es5导出
    target: ['web', 'es5'],
    resolve: {
        extensions: ['.ts', '.js', '.glsl', '.gefx'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.example.json',
                    // transpileOnly: true,
                },
            },
            {
                test: /\.(?:glsl|gexf)$/,
                exclude: /node_modules/,
                loader: 'raw-loader',
            },
            {
                test: /\.worker\.(c|m)?js$/i,
                use: [
                    {
                        loader: 'worker-loader',
                    },
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                        },
                    },
                ],
            },
        ],
    },
    plugins,
    optimization: {
        splitChunks: {
            chunks: 'initial',
            minChunks: 2,
            name: 'commons',
        },
    },
    devServer: {
        host: '0.0.0.0',
        open: 'http://localhost:8088',
        port: 8088,
    },
}
