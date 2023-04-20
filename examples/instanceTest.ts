/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-20 08:48:26
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-20 09:58:22
 * @FilePath: \webgpu\WebGPU_Demo\examples\instance.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { mat4, vec3 } from "gl-matrix";
import { CreateAnimation, CreateGPUBuffer, CreateGPUBufferUint, CreateViewProjection } from "../src/utils";

const nx = 10;
const ny = 10;
const ni = nx * ny;

const shader = `
    struct Uniforms {
        mvpMatrix : array<mat4x4<f32>,${ni}>,
    };

    @binding(0) @group(0) var<uniform> uniforms : Uniforms;

    struct Output {
        @builtin(position) Position : vec4<f32>,
        @location(0) vCoord : vec2<f32>,
    };

    @vertex
    fn vs_main(
        @builtin(instance_index) instanceIdx : u32, 
        @location(0) pos: vec4<f32>, 
        @location(1) coord : vec2<f32>,
    ) -> Output {
        var output: Output;
        output.Position = uniforms.mvpMatrix[instanceIdx] * pos;
        output.vCoord = coord;
        return output;
    }

    @fragment
    fn fs_main(
        in: Output
    ) -> @location(0) vec4<f32> {
        
        let coord = in.vCoord;

        let r = dot(coord, coord);

        if (r > 0.95) {
            discard;
        }

        return vec4<f32>(1.0,0.0,0.0,1.0);
    }
`;

const vertexData = new Float32Array([
    -1,-1,1,-1,-1, // vertex a, index 0
    1,-1,1,1,-1, // vertex b, index 1
    1,1,1,1,1, // vertex c, index 2
    -1,1,1,-1,1, // vertex d, index 3
]);

const indexData = new Uint32Array([
    0, 1, 2, 
    2, 3, 0
]);

const instanceTest = async () => {
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

    const vertexBuffer = CreateGPUBuffer(device, vertexData);
    const indexBuffer = CreateGPUBufferUint(device, indexData);
    const queue = device.queue;
    const numberOfVertices = indexData.length;

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                    minBindingSize: 4 * 16,
                },
            },
        ],
    });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    });

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code: shader,
            }),
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 4 * 5,
                    attributes: [
                        {
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0,
                        },
                        {
                            shaderLocation: 1,
                            format: "float32x2",
                            offset: 12,
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
            cullMode: "back",
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less",
        },
    });

    const matrixSize = 4 * 16;
    const uniformBufferSize = ni * matrixSize;

    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                },
            },
        ],
    });

    const vp = CreateViewProjection(canvas.width / canvas.height);
    const projectMatrix = vp.projectionMatrix;

    const modelMat = new Array(ni);
    const mvpMatricesData = new Float32Array(16 * ni);

    let i = 0;
    for (let x = 0; x < nx; x++) {
        for (let y = 0; y < ny; y++) {
            modelMat[i] = mat4.create();
            mat4.translate(
                modelMat[i],
                modelMat[i],
                vec3.fromValues((x - nx / 2 + 0.5) * 2, (y - ny / 2 + 0.5) * 2, 0)
            );
            i++;
        }
    }

    const viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -16));
    const tmpMat = mat4.create();

    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPassDescription = {
        colorAttachments: [
            {
                view: undefined,
                clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
                loadOp: "clear",
                storeOp: "store",
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    } as any;
    let rotation = vec3.fromValues(0, 0, 0);
    function draw() {
        let m = 0,
            i = 0;
        for (let x = 0; x < nx; x++) {
            for (let y = 0; y < ny; y++) {
                mat4.rotate(
                    tmpMat,
                    modelMat[i],
                    1,
                    vec3.fromValues(
                        Math.sin(0.5 * 2 * rotation[0]),
                        Math.cos(0.5 * 2 * rotation[1]),
                        Math.sin(2 * rotation[2]) * Math.cos(2 * rotation[2])
                    )
                );
                mat4.multiply(tmpMat, viewMatrix, tmpMat);
                mat4.multiply(tmpMat, vp.projectionMatrix, tmpMat);

                mvpMatricesData.set(tmpMat, m);
                i++;
                m += 16;
            }
        }

        device.queue.writeBuffer(
            uniformBuffer,
            0,
            mvpMatricesData.buffer,
            mvpMatricesData.byteOffset,
            mvpMatricesData.byteLength
        );

        renderPassDescription.colorAttachments[0].view = context
            .getCurrentTexture()
            .createView();

        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(
            renderPassDescription
        );

        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, uniformBindGroup);
        renderPass.setVertexBuffer(0, vertexBuffer);
        // renderPass.setVertexBuffer(1, coordBuffer);
        renderPass.setIndexBuffer(indexBuffer, "uint32");
        renderPass.drawIndexed(numberOfVertices, ni);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    CreateAnimation(draw, rotation, true);
};

instanceTest();
export default instanceTest;