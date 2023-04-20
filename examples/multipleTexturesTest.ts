/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-20 10:53:47
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-20 13:52:38
 * @FilePath: \webgpu\WebGPU_Demo\examples\multipleTextures.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { mat4, vec3 } from "gl-matrix";
import { CreateAnimation, CreateGPUBuffer, CreateTransforms, CreateViewProjection, GetTexture, InitGPU } from "../src/utils";
const createCamera = require('3d-view-controls');

const Shader = (li: any) => {
    // 光源设置 li: Light
    li.ambientIntensity =
        li.ambientIntensity == undefined ? "0.2" : li.ambientIntensity;
    li.diffuseIntensity =
        li.diffuseIntensity == undefined ? "0.8" : li.diffuseIntensity;
    li.specularIntensity =
        li.specularIntensity == undefined ? "0.4" : li.specularIntensity;
    li.shininess = li.shininess == undefined ? "30.0" : li.shininess;
    li.specularColor =
        li.specularColor == undefined ? "(1.0, 1.0, 1.0)" : li.specularColor;
    li.isPhong = li.isPhong == undefined ? "0" : li.isPhong;
    li.isTwoSideLighting =
        li.isTwoSideLighting == undefined ? "1" : li.isTwoSideLighting;

    // 顶点着色器
    const vertex = `
        // 常量
        struct Uniforms {
            viewProjectionMatrix: mat4x4<f32>,
            modelMatrix: mat4x4<f32>,
            normalMatrix: mat4x4<f32>,
        };
        @binding(0) @group(0) var<uniform> uniforms: Uniforms;
        
        // 接受参数
        struct Input {
            @location(0) position: vec4<f32>,
            @location(1) normal: vec4<f32>,
            @location(2) uv: vec2<f32>
        };

        // 输出坐标位置和让片元着色器获得的属性
        struct Output {
            @builtin(position) Position: vec4<f32>,
            @location(0) vPosition: vec4<f32>,
            @location(1) vNormal: vec4<f32>,
            @location(2) vUV: vec2<f32>,
        };

        // 顶点着色器 
        @vertex
        fn main(input: Input) -> Output {
            var output: Output;
            let mPosition:vec4<f32> = uniforms.modelMatrix * input.position; 
            // 存储属性，并返回坐标
            output.vPosition = mPosition;                  
            output.vNormal =  uniforms.normalMatrix*input.normal;
            output.Position = uniforms.viewProjectionMatrix * mPosition;     
            output.vUV = input.uv;          
            return output;
        }
    `;

    // 片元着色器
    const fragment = `
        // 设置常量 
        struct Uniforms {
            lightPosition: vec4<f32>,
            eyePosition: vec4<f32>,
        };
        @binding(1) @group(0) var<uniform> uniforms: Uniforms;
        // 纹理属性
        @binding(2) @group(0) var textureSampler: sampler;
        @binding(3) @group(0) var textureData: texture_2d<f32>;
        
        // 获取顶点着色器传递的属性
        struct Input {
            @location(0) vPosition: vec4<f32>,
            @location(1) vNormal: vec4<f32>,
            @location(2) vUV: vec2<f32>,
        };

        // 片元着色器
        @fragment
        fn main(input: Input) -> @location(0) vec4<f32> {
            // 获取纹理
            let textureColor:vec3<f32> = (textureSample(textureData, textureSampler, input.vUV)).rgb;
            // 法向量
            let N:vec3<f32> = normalize(input.vNormal.xyz);                
            // 光照
            let L:vec3<f32> = normalize(uniforms.lightPosition.xyz - input.vPosition.xyz);     
            // 视角
            let V:vec3<f32> = normalize(uniforms.eyePosition.xyz - input.vPosition.xyz);          
            let H:vec3<f32> = normalize(L + V);
            let twoSide:i32 = ${li.isTwoSideLighting};
            var diffuse:f32 = ${li.diffuseIntensity} * max(dot(N, L), 0.0);
            if(twoSide == 1){
                diffuse = diffuse + ${li.diffuseIntensity} * max(dot(-N, L), 0.0);
            } 
            var specular:f32;
            var isp:i32 = ${li.isPhong};
            if(isp == 1){                   
                specular = ${li.specularIntensity} * pow(max(dot(V, reflect(-L, N)),0.0), ${li.shininess});
                if(twoSide == 1) {
                    specular = specular + ${li.specularIntensity} * pow(max(dot(V, reflect(-L, -N)),0.0), ${li.shininess});
                }
            } else {
                specular = ${li.specularIntensity} * pow(max(dot(N, H),0.0), ${li.shininess});
                if(twoSide == 1){                     
                    specular = specular + ${li.specularIntensity} * pow(max(dot(-N, H),0.0), ${li.shininess});
                }
            }               
            let ambient:f32 = ${li.ambientIntensity};               
            let finalColor:vec3<f32> = textureColor * (ambient + diffuse) + vec3<f32>${li.specularColor}*specular; 
            
            // return vec4<f32>(textureColor, 1.0);
            return vec4<f32>(finalColor, 1.0);
        }
    `;

    return {
        vertex,
        fragment,
    };
};

// 坐标
const vertexData = new Float32Array([
    // front
    -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1,

    // right
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1,

    // back
    -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1,

    // left
    -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, 1, -1, -1, -1, -1, -1, -1, 1,

    // top
    -1, 1, 1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, -1, -1, 1, 1,

    // bottom
    -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
]);

// 法向量
const normalData = new Float32Array([
    // front
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

    // right
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    // back
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

    // left
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,

    // top
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

    // bottom
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
]);

// 纹理
const uvData = new Float32Array([
    //front
    0,
    1 / 2,
    1 / 3,
    1 / 2,
    1 / 3,
    1,
    1 / 3,
    1,
    0,
    1,
    0,
    1 / 2,

    //right
    1 / 3,
    1 / 2,
    2 / 3,
    1 / 2,
    2 / 3,
    1,
    2 / 3,
    1,
    1 / 3,
    1,
    1 / 3,
    1 / 2,

    //back
    2 / 3,
    1 / 2,
    1,
    1 / 2,
    1,
    1,
    1,
    1,
    2 / 3,
    1,
    2 / 3,
    1 / 2,

    //left
    0,
    0,
    1 / 3,
    0,
    1 / 3,
    1 / 2,
    1 / 3,
    1 / 2,
    0,
    1 / 2,
    0,
    0,

    //top
    1 / 3,
    0,
    2 / 3,
    0,
    2 / 3,
    1 / 2,
    2 / 3,
    1 / 2,
    1 / 3,
    1 / 2,
    1 / 3,
    0,

    //bottom
    2 / 3,
    0,
    1,
    0,
    1,
    1 / 2,
    1,
    1 / 2,
    2 / 3,
    1 / 2,
    2 / 3,
    0,
]);

const multipleTexturesTest = async () => {
    const isAnimation = false;
    const gpu = await InitGPU();
    const device = gpu.device;

    // 创建想对应的数据
    const numberOfVertices = vertexData.length / 3;
    const vertexBuffer = CreateGPUBuffer(device, vertexData);
    const normalBuffer = CreateGPUBuffer(device, normalData);
    const uvBuffer = CreateGPUBuffer(device, uvData);

    // 生成shader
    const shader = Shader({});

    const pipeline = device.createRenderPipeline({
        layout:'auto',
        vertex: {
            module: device.createShaderModule({                    
                code: shader.vertex
            }),
            entryPoint: "main",
            buffers:[
                {
                    arrayStride: 12,
                    attributes: [{
                        shaderLocation: 0,
                        format: "float32x3",
                        offset: 0
                    }]
                },
                {
                    arrayStride: 12,
                    attributes: [{
                        shaderLocation: 1,
                        format: "float32x3",
                        offset: 0
                    }]
                },
                {
                    arrayStride: 8,
                    attributes: [{
                        shaderLocation: 2,
                        format: "float32x2",
                        offset: 0
                    }]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule({                    
                code: shader.fragment
            }),
            entryPoint: "main",
            targets: [
                {
                    format: gpu.format as GPUTextureFormat
                }
            ]
        },
        primitive:{
            topology: "triangle-list",
        },
        depthStencil:{
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = CreateViewProjection(gpu.canvas.width/gpu.canvas.height);
    vpMatrix = vp.viewProjectionMatrix;

    // 添加相机;
    let rotation = vec3.fromValues(0, 0, 0);       
    var camera = createCamera(gpu.canvas, vp.cameraOption);
    let eyePosition = new Float32Array(vp.cameraOption.eye);
    let lightPosition = eyePosition;

    // 创建Uniform的Buffer
    const vertexUniformBuffer = device.createBuffer({
        size: 192,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const fragmentUniformBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    if(isAnimation){
        device.queue.writeBuffer(vertexUniformBuffer, 0, vp.viewProjectionMatrix as ArrayBuffer);
        device.queue.writeBuffer(fragmentUniformBuffer, 0, lightPosition);
        device.queue.writeBuffer(fragmentUniformBuffer, 16, eyePosition);
    }

    // 创建并获取纹理
    const ts = await GetTexture(device, 'multiple.png');

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: vertexUniformBuffer,
                    offset: 0,
                    size: 192
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: fragmentUniformBuffer,
                    offset: 0,
                    size: 32
                }
            },
            {
                binding: 2,
                resource: ts.sampler
            },
            {
                binding: 3,
                resource: ts.texture.createView()
            }         
        ]
    });

    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    const renderPassDescription = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
            loadOp:'clear',
            storeOp: 'store'
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthStoreOp: "store",
            depthLoadOp:'clear',
        }
    };
    
    function draw() {
        if(!isAnimation){
            if(camera.tick()){
                const pMatrix = vp.projectionMatrix;
                vMatrix = camera.matrix;
                mat4.multiply(vpMatrix, pMatrix, vMatrix);

                eyePosition = new Float32Array(camera.eye.flat());
                lightPosition = eyePosition;
                device.queue.writeBuffer(vertexUniformBuffer, 0, vpMatrix as ArrayBuffer);
                device.queue.writeBuffer(fragmentUniformBuffer, 0, eyePosition);
                device.queue.writeBuffer(fragmentUniformBuffer, 16, lightPosition);
            }
        }

        CreateTransforms(modelMatrix,[0,0,0], rotation);
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        device.queue.writeBuffer(vertexUniformBuffer, 64, modelMatrix as ArrayBuffer);
        device.queue.writeBuffer(vertexUniformBuffer, 128, normalMatrix as ArrayBuffer);

        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;
        
        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);

        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setVertexBuffer(1, normalBuffer);
        renderPass.setVertexBuffer(2, uvBuffer);
        renderPass.setBindGroup(0, uniformBindGroup);       
        renderPass.draw(numberOfVertices);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    CreateAnimation(draw, rotation, isAnimation);
};

multipleTexturesTest();
export default multipleTexturesTest;
