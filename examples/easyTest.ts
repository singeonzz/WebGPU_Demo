/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-23 14:35:41
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-23 17:14:17
 * @FilePath: \webgpu\WebGPU_Demo\examples\easyTest.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { CreateGPUBuffer, InitGPU } from "../src/utils";
import { calcLine } from "../src/utils/bezier";
import nodeVert from "./shaders/node.vert.wgsl";
import nodeFrag from "./shaders/node.frag.wgsl";
import edgeVert from "./shaders/edge.vert.wgsl";
import edgeFrag from "./shaders/edge.frag.wgsl";


const easyTest = async () => {
    const gpu = await InitGPU();

    const device = gpu.device;

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                    minBindingSize: 3 * 4,
                },
            },
        ],
    });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    });

    // 基础管线
    const pipelineDesc = {
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code: nodeVert,
            }),
            entryPoint: "vert_main",
            buffers: [
                {
                    // vertex buffer
                    arrayStride: 4 * 4,
                    stepMode: "vertex",
                    attributes: [
                        {
                            // vertex positions
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x2",
                        },
                        {
                            // vertex colors
                            shaderLocation: 1,
                            offset: 2 * 4,
                            format: "float32x2",
                        },
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({
                code: nodeFrag,
            }),
            entryPoint: "frag_main",
            targets: [
                {
                    format: gpu.format,
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
            frontFace: "ccw",
            cullMode: "none",
        },
        // // 深度模板
        // depthStencil: {
        //     format: "depth24plus",
        //     depthWriteEnabled: true,
        //     depthCompare: "less",
        // },
    };

    // 管线
    // @ts-ignore
    const pipeline = device.createRenderPipeline({
        ...pipelineDesc,
        layout: pipelineLayout,
    });

    const vertexData = new Float32Array([
        -0.1, -0.1, 0, 0, 0.1, -0.1, 1, 0, -0.1, 0.1, 0, 1,

        -0.1, 0.1, 0, 1, 0.1, -0.1, 1, 0, 0.1, 0.1, 1, 1,
    ]);

    const vertexBuffer = CreateGPUBuffer(device, vertexData);

    // 绘制个数
    const numTriangles = 10;
    // uniform属性
    // debugger
    const uniformBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
    const alignedUniformBytes = Math.ceil(uniformBytes / 256) * 256;
    const alignedUniformFloats =
        alignedUniformBytes / Float32Array.BYTES_PER_ELEMENT;
    // 创建unifromBuffer
    const uniformBuffer = device.createBuffer({
        size: numTriangles * alignedUniformBytes,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    // 创建Data
    const uniformBufferData = new Float32Array(
        numTriangles * alignedUniformFloats
    );

    const bindGroups = new Array(numTriangles);

    const NodePositions = new Array(numTriangles);
    // 保存偏移量
    for (let i = 0; i < numTriangles; ++i) {
        let x = 0.9 * 2 * (Math.random() - 0.5); // offsetX
        let y = 0.9 * 2 * (Math.random() - 0.5); // offsetY

        uniformBufferData[alignedUniformFloats * i + 0] = 0.2; // scale
        uniformBufferData[alignedUniformFloats * i + 1] = x;
        uniformBufferData[alignedUniformFloats * i + 2] = y;

        NodePositions[i] = {
            x,
            y,
        };

        bindGroups[i] = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: uniformBuffer,
                        offset: i * alignedUniformBytes,
                        size: 3 * Float32Array.BYTES_PER_ELEMENT,
                    },
                },
            ],
        });
    }


    const edgeData = [];

    for (let i = 0; i < numTriangles - 1; i++) {

        let ct = {
            x: (NodePositions[i].x + NodePositions[i+1].x) / 2,
            y: (NodePositions[i].y + NodePositions[i+1].y) / 2,
        }

        edgeData.push(...calcLine(
            NodePositions[i],
            ct,
            NodePositions[i+1],
            0.005,
            2
        )) 
        // edgeData.push(
        //     NodePositions[i].x, 
        //     NodePositions[i].y,
        //     NodePositions[i + 1].x, 
        //     NodePositions[i + 1].y,
        // )

    }

    const vertexEdgeData = new Float32Array(edgeData)
    const numberOfVertices = vertexEdgeData.length / 4;
    
    // console.log(vertexEdgeData)
    // console.log(numberOfVertices)

    const vertexEdgeBuffer = CreateGPUBuffer(device, vertexEdgeData);

    const pipelineEdge = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({
                code: edgeVert,
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
                code: edgeFrag,
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
            // topology: "line-list",
            frontFace: "ccw",
            cullMode: "none",
        },
    });

    const maxMappingLength =
        (14 * 1024 * 1024) / Float32Array.BYTES_PER_ELEMENT;
    for (
        let offset = 0;
        offset < uniformBufferData.length;
        offset += maxMappingLength
    ) {
        const uploadCount = Math.min(
            uniformBufferData.length - offset,
            maxMappingLength
        );

        device.queue.writeBuffer(
            uniformBuffer,
            offset * Float32Array.BYTES_PER_ELEMENT,
            uniformBufferData.buffer,
            uniformBufferData.byteOffset,
            uploadCount * Float32Array.BYTES_PER_ELEMENT
        );
    }

    function configure() {
        function recordRenderPass(
            passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder
        ) {
            passEncoder.setPipeline(pipeline);

            passEncoder.setVertexBuffer(0, vertexBuffer);

            for (let i = 0; i < numTriangles; ++i) {
                passEncoder.setBindGroup(0, bindGroups[i]);

                passEncoder.draw(6);
            }
        }

        let startTime: number | undefined = undefined;

        // const depthTexture = device.createTexture({
        //     size: [gpu.canvas.width, gpu.canvas.height, 1],
        //     format: "depth24plus",
        //     usage: GPUTextureUsage.RENDER_ATTACHMENT,
        // });

        const renderPassDescriptor = {
            colorAttachments: [
                {
                    view: undefined, // Assigned later
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
            // depthStencilAttachment: {
            //     view: depthTexture.createView(),
            //     depthClearValue: 1.0,
            //     depthLoadOp: "clear",
            //     depthStoreOp: "store",
            // },
        } as any;

        return function doDraw(timestamp: number) {
            if (startTime === undefined) {
                startTime = timestamp;
            }

            let textureView = gpu.context.getCurrentTexture().createView();
            renderPassDescriptor.colorAttachments[0].view = textureView;

            const commandEncoder = device.createCommandEncoder();
            const passEncoder =
                commandEncoder.beginRenderPass(renderPassDescriptor);

            recordRenderPass(passEncoder);

            passEncoder.setPipeline(pipelineEdge);
            passEncoder.setVertexBuffer(0, vertexEdgeBuffer);
            // passEncoder.draw(numberOfVertices * 2);
            for(let i = 0; i< numTriangles-1; i++)
                passEncoder.draw(4, 1, 4 * i);


            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
        };
    }

    let doDraw = configure();

    function frame(timestamp: number) {
        doDraw(timestamp);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

easyTest();

export default easyTest;
