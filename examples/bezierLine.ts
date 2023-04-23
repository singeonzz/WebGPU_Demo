/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-21 13:43:43
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-23 15:25:54
 * @FilePath: \webgpu\WebGPU_Demo\examples\bezierLine.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { CreateGPUBuffer, InitGPU } from "../src/utils";
import { calcLine } from "../src/utils/bezier";


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
