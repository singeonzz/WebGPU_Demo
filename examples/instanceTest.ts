/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-20 08:48:26
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-21 09:09:01
 * @FilePath: \webgpu\WebGPU_Demo\examples\instance.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { mat4, vec3 } from "gl-matrix";
import {
    CreateAnimation,
    CreateGPUBuffer,
    CreateGPUBufferUint,
    CreateViewProjection,
    GetTexture,
} from "../src/utils";

const nx = 2;
const ny = 2;
const ni = nx * ny;

const vertex = `
    struct Uniforms {
        mvpMatrix : array<mat4x4<f32>,${ni}>,
    };

    @binding(0) @group(0) var<uniform> uniforms : Uniforms;

    struct Output {
        @builtin(position) Position : vec4<f32>,
        @location(0) vCoord : vec2<f32>,
        @location(1) vUV : vec2<f32>
    };

    @vertex
    fn vs_main(
        @builtin(instance_index) instanceIdx : u32, 
        @location(0) pos: vec4<f32>, 
        @location(1) coord : vec2<f32>,
        @location(2) uv: vec2<f32>
    ) -> Output {
        var output: Output;
        output.Position = uniforms.mvpMatrix[instanceIdx] * pos;
        output.vCoord = coord;
        output.vUV = uv;
        return output;
    }
    `;

const fragment = `
    // 纹理属性
    @binding(1) @group(0) var textureSampler: sampler;
    @binding(2) @group(0) var textureData: texture_2d<f32>;

    struct Input {
        @location(0) vCoord : vec2<f32>,
        @location(1) vUV : vec2<f32>
    };

    @fragment
    fn fs_main(
        in: Input
    ) -> @location(0) vec4<f32> {
        
        // 获取纹理
        let textureColor:vec3<f32> = (textureSample(textureData, textureSampler, in.vUV)).rgb;

        let coord = in.vCoord;

        let r = dot(coord, coord);

        if (r > 0.95) {
            discard;
        }

        return vec4<f32>(textureColor,1.0);
        // return vec4<f32>(1.0, 0.0, 0.0, 1.0);
    }
`;

const vertexData = new Float32Array([
    -1,-1,1,  -1,-1,  0, 0, // vertex a, index 0

    1,-1,1,   1,-1,   1, 0, // vertex b, index 1
    
    1,1,1,    1,1,    1, 1, // vertex c, index 2

    -1,1,1,    -1,1,   0, 1, // vertex d, index 3
]);

const indexData = new Uint32Array([0, 1, 2, 2, 3, 0]);

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
    const numberOfVertices = indexData.length;

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code: vertex,
            }),
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 4 * 7,
                    attributes: [
                        {
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0,
                        }, // 点坐标
                        {
                            shaderLocation: 1,
                            format: "float32x2",
                            offset: 12,
                        }, // coord
                        {
                            shaderLocation: 2,
                            format: "float32x2",
                            offset: 20,
                        }, // 纹理
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({
                code: fragment,
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

    // 创建并获取纹理
    const ts = await GetTexture(device, "multiple.png");

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                },
            },
            {
                binding: 1,
                resource: ts.sampler
            },
            {
                binding: 2,
                resource: ts.texture.createView()
            }         
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
                vec3.fromValues(
                    (x - nx / 2 + 0.5) * 2,
                    (y - ny / 2 + 0.5) * 2,
                    0
                )
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
        renderPass.setIndexBuffer(indexBuffer, "uint32");
        renderPass.drawIndexed(numberOfVertices, ni);
        // renderPass.draw(numberOfVertices);

        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    CreateAnimation(draw, rotation, true);
};

instanceTest();
export default instanceTest;

// import { mat4, vec3 } from "gl-matrix";
// export const cubeVertexSize = 4 * 10; // Byte size of one cube vertex.
// export const cubePositionOffset = 0;
// export const cubeColorOffset = 4 * 4; // Byte offset of cube vertex color attribute.
// export const cubeUVOffset = 4 * 8;
// export const cubeVertexCount = 36;

// // prettier-ignore
// export const cubeVertexArray = new Float32Array([
//   // float4 position, float4 color, float2 uv,
//   1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
//   -1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
//   -1, -1, -1, 1, 0, 0, 0, 1,  0, 0,
//   1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
//   1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
//   -1, -1, -1, 1, 0, 0, 0, 1,  0, 0,

//   1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
//   1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
//   1, -1, -1, 1,  1, 0, 0, 1,  0, 0,
//   1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
//   1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
//   1, -1, -1, 1,  1, 0, 0, 1,  0, 0,

//   -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
//   1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
//   1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
//   -1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
//   -1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
//   1, 1, -1, 1,   1, 1, 0, 1,  0, 0,

//   -1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
//   -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
//   -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
//   -1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
//   -1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
//   -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,

//   1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
//   -1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
//   -1, -1, 1, 1,  0, 0, 1, 1,  0, 0,
//   -1, -1, 1, 1,  0, 0, 1, 1,  0, 0,
//   1, -1, 1, 1,   1, 0, 1, 1,  1, 0,
//   1, 1, 1, 1,    1, 1, 1, 1,  1, 1,

//   1, -1, -1, 1,  1, 0, 0, 1,  1, 1,
//   -1, -1, -1, 1, 0, 0, 0, 1,  0, 1,
//   -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
//   1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
//   1, -1, -1, 1,  1, 0, 0, 1,  1, 1,
//   -1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
// ]);

// const vertex = `
//     struct Uniforms {
//         modelViewProjectionMatrix : array<mat4x4<f32>, 16>,
//     }
    
//     @binding(0) @group(0) var<uniform> uniforms : Uniforms;
    
//     struct VertexOutput {
//         @builtin(position) Position : vec4<f32>,
//         @location(0) fragUV : vec2<f32>,
//         @location(1) fragPosition: vec4<f32>,
//     }
    
//     @vertex
//     fn main(
//         @builtin(instance_index) instanceIdx : u32,
//         @location(0) position : vec4<f32>,
//         @location(1) uv : vec2<f32>
//     ) -> VertexOutput {
//         var output : VertexOutput;
//         output.Position = uniforms.modelViewProjectionMatrix[instanceIdx] * position;
//         output.fragUV = uv;
//         output.fragPosition = 0.5 * (position + vec4(1.0));
//         return output;
//     }
// `;

// const fragment = `
//     @fragment
//     fn main(
//         @location(0) fragUV: vec2<f32>,
//         @location(1) fragPosition: vec4<f32>
//     ) -> @location(0) vec4<f32> {
//         return fragPosition;
//     }
// `;

// const instance = async () => {
//     if (!navigator.gpu) {
//         throw new Error("Your current browser does not support WebGPU!");
//     }
//     const canvas = document.getElementById("canvas") as HTMLCanvasElement;
//     const div = document.getElementById("container") as HTMLElement;
//     canvas.width = div.offsetWidth;
//     canvas.height = div.offsetHeight;

//     const adapter = (await navigator.gpu.requestAdapter()) as GPUAdapter;
//     const device = (await adapter.requestDevice()) as GPUDevice;

//     const context = canvas.getContext("webgpu") as any;

//     canvas.width = canvas.clientWidth;
//     canvas.height = canvas.clientHeight;
//     const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

//     context.configure({
//         device,
//         format: presentationFormat,
//         alphaMode: "premultiplied",
//     });

//     // Create a vertex buffer from the cube data.
//     const verticesBuffer = device.createBuffer({
//         size: cubeVertexArray.byteLength,
//         usage: GPUBufferUsage.VERTEX,
//         mappedAtCreation: true,
//     });
//     new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
//     verticesBuffer.unmap();

//     const pipeline = device.createRenderPipeline({
//         layout: "auto",
//         vertex: {
//             module: device.createShaderModule({
//                 code: vertex,
//             }),
//             entryPoint: "main",
//             buffers: [
//                 {
//                     arrayStride: cubeVertexSize,
//                     attributes: [
//                         {
//                             // position
//                             shaderLocation: 0,
//                             offset: cubePositionOffset,
//                             format: "float32x4",
//                         },
//                         {
//                             // uv
//                             shaderLocation: 1,
//                             offset: cubeUVOffset,
//                             format: "float32x2",
//                         },
//                     ],
//                 },
//             ],
//         },
//         fragment: {
//             module: device.createShaderModule({
//                 code: fragment,
//             }),
//             entryPoint: "main",
//             targets: [
//                 {
//                     format: presentationFormat,
//                 },
//             ],
//         },
//         primitive: {
//             topology: "triangle-list",

//             // Backface culling since the cube is solid piece of geometry.
//             // Faces pointing away from the camera will be occluded by faces
//             // pointing toward the camera.
//             cullMode: "back",
//         },

//         // Enable depth testing so that the fragment closest to the camera
//         // is rendered in front.
//         depthStencil: {
//             depthWriteEnabled: true,
//             depthCompare: "less",
//             format: "depth24plus",
//         },
//     });

//     const depthTexture = device.createTexture({
//         size: [canvas.width, canvas.height],
//         format: "depth24plus",
//         usage: GPUTextureUsage.RENDER_ATTACHMENT,
//     });

//     const xCount = 4;
//     const yCount = 4;
//     const numInstances = xCount * yCount;
//     const matrixFloatCount = 16; // 4x4 matrix
//     const matrixSize = 4 * matrixFloatCount;
//     const uniformBufferSize = numInstances * matrixSize;

//     // Allocate a buffer large enough to hold transforms for every
//     // instance.
//     const uniformBuffer = device.createBuffer({
//         size: uniformBufferSize,
//         usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
//     });

//     const uniformBindGroup = device.createBindGroup({
//         layout: pipeline.getBindGroupLayout(0),
//         entries: [
//             {
//                 binding: 0,
//                 resource: {
//                     buffer: uniformBuffer,
//                 },
//             },
//         ],
//     });

//     const aspect = canvas.width / canvas.height;
//     const projectionMatrix = mat4.create();
//     mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

//     const modelMatrices = new Array(numInstances);
//     const mvpMatricesData = new Float32Array(matrixFloatCount * numInstances);

//     const step = 4.0;

//     // Initialize the matrix data for every instance.
//     let m = 0;
//     for (let x = 0; x < xCount; x++) {
//         for (let y = 0; y < yCount; y++) {
//             modelMatrices[m] = mat4.create();
//             mat4.translate(
//                 modelMatrices[m],
//                 modelMatrices[m],
//                 vec3.fromValues(
//                     step * (x - xCount / 2 + 0.5),
//                     step * (y - yCount / 2 + 0.5),
//                     0
//                 )
//             );
//             m++;
//         }
//     }

//     const viewMatrix = mat4.create();
//     mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -12));

//     const tmpMat4 = mat4.create();

//     // Update the transformation matrix data for each instance.
//     function updateTransformationMatrix() {
//         const now = Date.now() / 1000;

//         let m = 0,
//             i = 0;
//         for (let x = 0; x < xCount; x++) {
//             for (let y = 0; y < yCount; y++) {
//                 mat4.rotate(
//                     tmpMat4,
//                     modelMatrices[i],
//                     1,
//                     vec3.fromValues(
//                         Math.sin((x + 0.5) * now),
//                         Math.cos((y + 0.5) * now),
//                         0
//                     )
//                 );

//                 mat4.multiply(tmpMat4, viewMatrix, tmpMat4);
//                 mat4.multiply(tmpMat4, projectionMatrix, tmpMat4);

//                 mvpMatricesData.set(tmpMat4, m);

//                 i++;
//                 m += matrixFloatCount;
//             }
//         }
//     }

//     const renderPassDescriptor = {
//         colorAttachments: [
//             {
//                 view: undefined, // Assigned later
//                 clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 },
//                 loadOp: "clear",
//                 storeOp: "store",
//             },
//         ],
//         depthStencilAttachment: {
//             view: depthTexture.createView(),

//             depthClearValue: 1.0,
//             depthLoadOp: "clear",
//             depthStoreOp: "store",
//         },
//     } as any;

//     function frame() {

//         // Update the matrix data.
//         updateTransformationMatrix();
//         device.queue.writeBuffer(
//             uniformBuffer,
//             0,
//             mvpMatricesData.buffer,
//             mvpMatricesData.byteOffset,
//             mvpMatricesData.byteLength
//         );

//         renderPassDescriptor.colorAttachments[0].view = context
//             .getCurrentTexture()
//             .createView();

//         const commandEncoder = device.createCommandEncoder();
//         const passEncoder =
//             commandEncoder.beginRenderPass(renderPassDescriptor);
//         passEncoder.setPipeline(pipeline);
//         passEncoder.setBindGroup(0, uniformBindGroup);
//         passEncoder.setVertexBuffer(0, verticesBuffer);
//         passEncoder.draw(cubeVertexCount, numInstances, 0, 0);
//         passEncoder.end();
//         device.queue.submit([commandEncoder.finish()]);

//         requestAnimationFrame(frame);
//     }
//     requestAnimationFrame(frame);
// };

// instance();

// export default instance();

