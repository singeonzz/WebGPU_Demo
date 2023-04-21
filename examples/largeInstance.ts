import { CreateGPUBuffer, InitGPU } from "../src/utils";

const vertex = `
    // struct Time {
    //     value : f32,
    // }
    // @binding(0) @group(0) var<uniform> time : Time;

    struct Uniforms {
        scale: f32,
        offsetX: f32,
        offsetY: f32,
    }
    @binding(0) @group(0) var<uniform> uniforms: Uniforms;

    struct outPut {
        @builtin(position) Position: vec4<f32>,
        @location(0) vCoord: vec2<f32>
    }

    @vertex
    fn vert_main(
        @location(0) position: vec4<f32>,
        @location(1) coord: vec2<f32>,
    ) -> outPut {
        var xpos = position.x * uniforms.scale;
        var ypos = position.y * uniforms.scale;

        xpos = xpos + uniforms.offsetX;
        ypos = ypos + uniforms.offsetY;

        var output : outPut;
        output.vCoord = coord;
        output.Position = vec4(xpos, ypos, 0.0, 1.0);
        return output;
    }
`;

const fragment = `
    @fragment
    fn frag_main(
        @location(0) vCoord: vec2<f32>
    ) -> @location(0) vec4<f32> {
        let coord = vCoord;

        let r = dot(coord, coord);

        if (r > 0.95) {
            discard;
        }

        return vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

const largeInstance = async () => {
    const gpu = await InitGPU();
    const device = gpu.device;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

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
                code: vertex,
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
                code: fragment,
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
        // 深度模板
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
        -0.1, -0.1, -1, -1, 
        0.1, -0.1, 1, -1, 
        -0.1, 0.1, -1, 1,

        -0.1, 0.1, -1, 1, 
        0.1, -0.1, 1, -1, 
        0.1, 0.1, 1, 1,

        // -0.1, -0.1, -1, -1, 
        // 0.1, -0.1, 1, -1, 
        // -0.1, 0.1, -1, 1,
        // 0.1, 0.1, 1, 1,
    ]);

    
    const vertexBuffer = CreateGPUBuffer(device, vertexData);

    // 绘制个数
    const numTriangles = 1000;
    // uniform属性
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
    // 保存偏移量
    for (let i = 0; i < numTriangles; ++i) {
        uniformBufferData[alignedUniformFloats * i + 0] = 0.2; // scale
        uniformBufferData[alignedUniformFloats * i + 1] =
            0.9 * 2 * (Math.random() - 0.5); // offsetX
        uniformBufferData[alignedUniformFloats * i + 2] =
            0.9 * 2 * (Math.random() - 0.5); // offsetY

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

        const depthTexture = device.createTexture({
            size: [gpu.canvas.width, gpu.canvas.height, 1],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

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

        // const renderBundleEncoder = device.createRenderBundleEncoder({
        //     colorFormats: [presentationFormat],
        // });
        // recordRenderPass(renderBundleEncoder);

        // const renderBundle = renderBundleEncoder.finish();

        return function doDraw(timestamp: number) {
            if (startTime === undefined) {
                startTime = timestamp;
            }

            let textureView = gpu.context.getCurrentTexture().createView();
            renderPassDescriptor.colorAttachments[0].view = textureView;

            // renderPassDescriptor.colorAttachments[0].view = gpu.context
            //     .getCurrentTexture()
            //     .createView();

            const commandEncoder = device.createCommandEncoder();
            const passEncoder =
                commandEncoder.beginRenderPass(renderPassDescriptor);

            recordRenderPass(passEncoder);
            // passEncoder.executeBundles([renderBundle]);

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

largeInstance();

export default largeInstance;
