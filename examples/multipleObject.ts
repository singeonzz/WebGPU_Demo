/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-21 15:06:17
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-21 16:11:42
 * @FilePath: \webgpu\WebGPU_Demo\examples\multipleObject.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { mat4, vec3 } from "gl-matrix";
import {
    CreateAnimation,
    CreateGPUBuffer,
    CreateTransforms,
    CreateViewProjection,
    InitGPU,
} from "../src/utils";
import { Float32ArrayConcat, Peaks, Sinc } from "../src/utils/math";
import { SimpleSurfaceData } from "../src/utils/shape";
const createCamera = require("3d-view-controls");

const shader = `
    struct Uniforms {   
        view_project_mat : mat4x4<f32>,
        model_mat : mat4x4<f32>,           
        normal_mat : mat4x4<f32>,            
    };
    @binding(0) @group(0) var<uniform> uniforms : Uniforms;

    struct Input {
        @location(0) pos : vec4<f32>,
        @location(1) normal : vec4<f32>,
        @location(2) color : vec3<f32>,
    };

    struct Output {
        @builtin(position) position : vec4<f32>,
        @location(0) v_position : vec4<f32>,
        @location(1) v_normal : vec4<f32>,
        @location(2) v_color : vec3<f32>,
    };

    @vertex
    fn vs_main(in: Input) -> Output {    
        var output: Output;            
        let m_position:vec4<f32> = uniforms.model_mat * in.pos; 
        output.v_position = m_position;                  
        output.v_normal =  uniforms.normal_mat * in.normal;
        output.position = uniforms.view_project_mat * m_position;   
        output.v_color = in.color;            
        return output;
    }

    // fragment shader 

    struct FragUniforms {
        light_position : vec4<f32>,
        eye_position : vec4<f32>,
    };
    @binding(1) @group(0) var<uniform> frag_uniforms : FragUniforms;

    struct LightUniforms {
        specular_color : vec4<f32>,
        params: vec4<f32>, // ambient_intensity, diffuse_intensity, specular_intensity, specular_shininess
        param2: vec4<f32>, // is _two_side
    };
    @binding(2) @group(0) var<uniform> light_uniforms : LightUniforms;

    @fragment
    fn fs_main(in:Output) ->  @location(0) vec4<f32> {
        let N:vec3<f32> = normalize(in.v_normal.xyz);                
        let L:vec3<f32> = normalize(frag_uniforms.light_position.xyz - in.v_position.xyz);     
        let V:vec3<f32> = normalize(frag_uniforms.eye_position.xyz - in.v_position.xyz);          
        let H:vec3<f32> = normalize(L + V);

        // front side
        var diffuse:f32 = light_uniforms.params[1] * max(dot(N, L), 0.0);
        var specular: f32 = light_uniforms.params[2] * pow(max(dot(N, H),0.0), light_uniforms.params[3]);

        // back side
        if(i32(light_uniforms.param2[0]) == 1){
            diffuse = diffuse + light_uniforms.params[1] * max(dot(-N, L), 0.0);
            specular = specular +  light_uniforms.params[2] * pow(max(dot(-N, H),0.0), light_uniforms.params[3]);
        }

        let ambient:f32 = light_uniforms.params[0];               
        let final_color = in.v_color*(ambient + diffuse) + light_uniforms.specular_color.rgb * specular; 
        return vec4<f32>(final_color.rgb, 1.0);
    }
`;

// 创建物体
const CreateSurface = () => {
    const sincData = SimpleSurfaceData(
        Sinc,
        -8,
        8,
        -8,
        8,
        30,
        30,
        1,
        0.3,
        "jet",
        [-15, -1, -5]
    );

    const peaksData = SimpleSurfaceData(
        Peaks,
        -3,
        3,
        -3,
        3,
        51,
        51,
        1,
        0.1,
        "cool",
        [6, 0, -5]
    );

    let vertexData = Float32ArrayConcat(
        sincData?.vertexData!,
        peaksData?.vertexData!
    );
    let colorData = Float32ArrayConcat(
        sincData?.colorData!,
        peaksData?.colorData!
    );
    let normalData = Float32ArrayConcat(
        sincData?.normalData!,
        peaksData?.normalData!
    );

    // let vertexData = sincData!.vertexData;
    // let colorData = sincData!.colorData;
    // let normalData = sincData!.normalData;

    return {
        vertexData,
        colorData,
        normalData,
    };
};

const multipleObject = async () => {
    const gpu = await InitGPU();
    const device = gpu.device;
    const isAnimation = false;
    let li: any = {};
    // define default parameters for th elight model
    li.ambientIntensity =
        li.ambientIntensity == undefined ? 0.1 : li.ambientIntensity;
    li.diffuseIntensity =
        li.diffuseIntensity == undefined ? 0.8 : li.diffuseIntensity;
    li.specularIntensity =
        li.specularIntensity == undefined ? 0.4 : li.specularIntensity;
    li.shininess = li.shininess == undefined ? 30.0 : li.shininess;
    li.specularColor =
        li.specularColor == undefined ? [1.0, 1.0, 1.0] : li.specularColor;
    li.isTwoSideLighting =
        li.isTwoSideLighting == undefined ? 1 : li.isTwoSideLighting;

    let { vertexData, colorData, normalData } = CreateSurface();
    // 创建GPUBuffer
    const numberOfVertices = vertexData.length / 3;
    const vertexBuffer = CreateGPUBuffer(device, vertexData);
    const colorBuffer = CreateGPUBuffer(device, colorData);
    const normalBuffer = CreateGPUBuffer(device, normalData);

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code: shader,
            }),
            entryPoint: "vs_main",
            buffers: [
                {
                    // pos
                    arrayStride: 12,
                    attributes: [
                        {
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0,
                        },
                    ],
                },
                {
                    // normal
                    arrayStride: 12,
                    attributes: [
                        {
                            shaderLocation: 1,
                            format: "float32x3",
                            offset: 0,
                        },
                    ],
                },
                {
                    // color
                    arrayStride: 12,
                    attributes: [
                        {
                            shaderLocation: 2,
                            format: "float32x3",
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
                    format: gpu.format as GPUTextureFormat,
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less",
        },
    });

    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = CreateViewProjection(gpu.canvas.width / gpu.canvas.height);
    vpMatrix = vp.viewProjectionMatrix;

    let rotation = vec3.fromValues(0, 0, 0);
    var camera = createCamera(gpu.canvas, vp.cameraOption);
    let eyePosition = new Float32Array(vp.cameraOption.eye);
    let lightPosition = eyePosition;

    const vertexUniformBuffer = device.createBuffer({
        size: 192,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const fragmentUniformBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    var lightParams = [] as any;
    lightParams.push([
        li.specularColor[0],
        li.specularColor[1],
        li.specularColor[2],
        1.0,
    ]);
    lightParams.push([
        li.ambientIntensity,
        li.diffuseIntensity,
        li.specularIntensity,
        li.shininess,
    ]);
    lightParams.push([li.isTwoSideLighting, 0, 0, 0]);

    const lightUniformBuffer = device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    if (isAnimation) {
        device.queue.writeBuffer(
            vertexUniformBuffer,
            0,
            vp.viewProjectionMatrix as ArrayBuffer
        );
        device.queue.writeBuffer(fragmentUniformBuffer, 0, lightPosition);
        device.queue.writeBuffer(fragmentUniformBuffer, 16, eyePosition);
    }
    device.queue.writeBuffer(
        lightUniformBuffer,
        0,
        new Float32Array(lightParams.flat())
    );

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: vertexUniformBuffer,
                    offset: 0,
                    size: 192,
                },
            },
            {
                binding: 1,
                resource: {
                    buffer: fragmentUniformBuffer,
                    offset: 0,
                    size: 32,
                },
            },
            {
                binding: 2,
                resource: {
                    buffer: lightUniformBuffer,
                    offset: 0,
                    size: 48,
                },
            },
        ],
    });

    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPassDescription = {
        colorAttachments: [
            {
                view: textureView,
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
            /*stencilClearValue: 0,
            stencilStoreOp: "store",          
            stencilLoadOp: 'clear'*/
        },
    };

    function draw() {
        if (!isAnimation) {
            if (camera.tick()) {
                const pMatrix = vp.projectionMatrix;
                vMatrix = camera.matrix;
                mat4.multiply(vpMatrix, pMatrix, vMatrix);

                eyePosition = new Float32Array(camera.eye.flat());
                lightPosition = eyePosition;
                device.queue.writeBuffer(
                    vertexUniformBuffer,
                    0,
                    vpMatrix as ArrayBuffer
                );
                device.queue.writeBuffer(fragmentUniformBuffer, 0, eyePosition);
                device.queue.writeBuffer(
                    fragmentUniformBuffer,
                    16,
                    lightPosition
                );
            }
        }

        CreateTransforms(modelMatrix, [0, 0, 0], rotation);
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        device.queue.writeBuffer(
            vertexUniformBuffer,
            64,
            modelMatrix as ArrayBuffer
        );
        device.queue.writeBuffer(
            vertexUniformBuffer,
            128,
            normalMatrix as ArrayBuffer
        );

        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;
        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(
            renderPassDescription as GPURenderPassDescriptor
        );

        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setVertexBuffer(1, normalBuffer);
        renderPass.setVertexBuffer(2, colorBuffer);
        renderPass.setBindGroup(0, uniformBindGroup);
        renderPass.draw(numberOfVertices);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    CreateAnimation(draw, rotation, isAnimation);
};

multipleObject();

export default multipleObject;
