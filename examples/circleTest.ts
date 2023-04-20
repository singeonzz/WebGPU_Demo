/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-20 08:47:42
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-20 09:11:05
 * @FilePath: \webgpu\WebGPU_Demo\examples\circleTest.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { CreateGPUBuffer } from "../src/utils";

const vertexData = new Float32Array([
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,

    -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
]);

const coordData = new Float32Array([
    -1, -1, 1, -1, -1, 1,

    -1, 1, 1, -1, 1, 1,
]);

const circleTest = async () => {
    if (!navigator.gpu) {
        throw new Error("Your current browser does not support WebGPU!");
    }

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const div = document.getElementById("container") as HTMLElement;
    canvas.width = div.offsetWidth;
    canvas.height = div.offsetHeight;

    const adapter = (await navigator.gpu.requestAdapter()) as GPUAdapter;
    const device = (await adapter.requestDevice()) as GPUDevice;
    const context = canvas.getContext("webgpu") as any;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: presentationFormat,
        alphaMode: "opaque", // or 'premultiplied'
    });

    const shader = `
            struct Output {
                @builtin(position) Position : vec4<f32>,
                @location(0) coord : vec2<f32>,
            }

            @vertex
            fn vs_main(
               @location(0) pos: vec4<f32>, @location(1) coord: vec2<f32>
            ) -> Output {
                var output: Output;
                output.Position = pos;
                output.coord = coord;
                return output;
            }

            @fragment
            fn fs_main(
                in: Output
            ) -> @location(0) vec4<f32> {
                
                let coord = in.coord;

                let r = dot(coord, coord);

                if (r > 0.95) {
                    discard;
                }

                return vec4<f32>(1.0, 0.0, 0.0, 1.0);
            }
        `;

    const vertexBuffer = CreateGPUBuffer(device, vertexData);
    const coordBuffer = CreateGPUBuffer(device, coordData);

    const queue = device.queue;

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code: shader,
            }),
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 2 * 4,
                    attributes: [
                        {
                            shaderLocation: 0,
                            format: "float32x2",
                            offset: 0,
                        },
                    ],
                },
                {
                    arrayStride: 2 * 4,
                    attributes: [
                        {
                            shaderLocation: 1,
                            format: "float32x2",
                            offset: 0,
                        },
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({
                code: shader,
            }),
            entryPoint: "fs_main",
            targets: [
                {
                    format: presentationFormat,
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
        },
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view: textureView,
                clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
                loadOp: "clear",
                storeOp: "store",
            },
        ],
    });
    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setVertexBuffer(1, coordBuffer);
    renderPass.draw(6);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
};

circleTest();
export default circleTest;
