/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-21 13:43:43
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-21 15:04:10
 * @FilePath: \webgpu\WebGPU_Demo\examples\bezierLine.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { CreateGPUBuffer, InitGPU } from "../src/utils";
import { create3DBezier } from "../src/utils/bezier";

const calcLine = (
    source = { x: 0.8, y: 0 },
    control = { x: 0, y: 0.5 },
    target = { x: -0.8, y: 0 }
) => {
    // 计算贝塞尔曲线坐标
    let normalizePath = create3DBezier(source, control, target, 20, 1.0);

    // 计算法向量
    let attrNormal: number[] = [],
        attrMiter: number[] = [],
        attrPoint: number[] | null = [];

    for (let i = 0, lens = normalizePath.length; i < lens; i++) {
        let x1, x2, y1, y2;
        if (i == lens - 1) {
            x2 = normalizePath[i][0];
            y2 = normalizePath[i][1];
            x1 = normalizePath[i - 1][0];
            y1 = normalizePath[i - 1][1];
        } else {
            x1 = normalizePath[i][0];
            y1 = normalizePath[i][1];
            x2 = normalizePath[i + 1][0];
            y2 = normalizePath[i + 1][1];
        }
        const dx = x2 - x1,
            dy = y2 - y1;
        let len = dx * dx + dy * dy,
            n1 = 0,
            n2 = 0;

        if (len) {
            len = 1 / Math.sqrt(len);
            n1 = -dy * len;
            n2 = dx * len;
        }

        let rx = i * 4;
        let item = normalizePath[i];

        // 用于计算矩阵的点
        attrPoint[rx] = item[0];
        attrPoint[rx + 1] = item[1];
        attrPoint[rx + 2] = item[0];
        attrPoint[rx + 3] = item[1];

        let norm = [n1, n2];
        let miter = -1;
        // 法向量
        attrNormal[rx] = norm[0];
        attrNormal[rx + 1] = norm[1];
        attrNormal[rx + 2] = norm[0];
        attrNormal[rx + 3] = norm[1];
        // 斜接
        let ry = i * 2;
        attrMiter[ry] = -miter;
        attrMiter[ry + 1] = miter;
    }

    let MatArray: any = [],
        width = 0.05;

    for (let i = 0, j = 0; i < attrPoint.length; i += 2, j += 1) {
        MatArray[i] =
            Math.ceil(
                (attrPoint[i] + attrNormal[i] * width * attrMiter[j]) * 1e3
            ) / 1e3;
        MatArray[i + 1] =
            Math.ceil(
                (attrPoint[i + 1] + attrNormal[i + 1] * width * attrMiter[j]) *
                    1e3
            ) / 1e3;
    }

    return MatArray;
};

// 顶点着色器
const vertex = `
    struct Output {
        @builtin(position) Position : vec4<f32>,
    }

    @vertex
    fn main(
        @location(0) pos: vec4<f32>
    ) -> Output {
        var output: Output;
        output.Position = pos;
        return output;
    }
`;

// 片元着色器
const fragment = `
    @fragment
    fn main() -> @location(0) vec4<f32> {
        return vec4<f32>(1.0, 0.0, 0.0, 1.0);
    }
`;

const bezierTest = async () => {
    const gpu = await InitGPU();
    const device = gpu.device;

    let vertexData = new Float32Array(calcLine());

    const numberOfVertices = vertexData.length / 2;
    const vertexBuffer = CreateGPUBuffer(device, vertexData);

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code: vertex,
            }),
            entryPoint: "main",
            buffers: [
                {
                    // vertex buffer
                    arrayStride: 2 * 4,
                    stepMode: "vertex",
                    attributes: [
                        {
                            // vertex positions
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x2",
                        },
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({
                code: fragment,
            }),
            entryPoint: "main",
            targets: [
                {
                    format: gpu.format,
                },
            ],
        },
        primitive: {
            topology: "triangle-strip",
            frontFace: "ccw",
            cullMode: "none",
        },
    });

    // CommandEncoder(命令编辑器)
    const commandEncoder = device.createCommandEncoder({});
    const renderPassDescriptor = {
        colorAttachments: [
            {
                // 指定要绘制到的渲染目标纹理
                view: gpu.context.getCurrentTexture().createView(),
                loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                // 指在执行各种指令之前要执行的处理。如果指定'clear',代表首先要清除指定的缓冲区
                loadOp: "clear",
                // 指定执行各种命令后如何处理缓冲区
                storeOp: "store",
            },
        ],
    } as any;
    // 加载命令
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(numberOfVertices);
    passEncoder.end();

    const commandBuffer = commandEncoder.finish();
    // 向GPU发出命令
    device.queue.submit([commandBuffer]);
};

bezierTest();

export default bezierTest;
