/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-20 09:46:03
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-20 10:09:41
 * @FilePath: \webgpu\WebGPU_Demo\examples\animationTest.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

const animometerWGSL = `
    struct Time {
        value : f32,
    }

    struct Uniforms {
        scale : f32,
        offsetX : f32,
        offsetY : f32,
        scalar : f32,
        scalarOffset : f32,
    }

    @binding(0) @group(0) var<uniform> time : Time;
    @binding(0) @group(1) var<uniform> uniforms : Uniforms;

    struct VertexOutput {
        @builtin(position) Position : vec4<f32>,
        @location(0) v_color : vec4<f32>,
    }

    @vertex
    fn vert_main(
        @location(0) position : vec4<f32>,
        @location(1) color : vec4<f32>
    ) -> VertexOutput {
        var fade = (uniforms.scalarOffset + time.value * uniforms.scalar / 10.0) % 1.0;
        if (fade < 0.5) {
            fade = fade * 2.0;
        } else {
            fade = (1.0 - fade) * 2.0;
        }
        var xpos = position.x * uniforms.scale;
        var ypos = position.y * uniforms.scale;
        var angle = 3.14159 * 2.0 * fade;
        var xrot = xpos * cos(angle) - ypos * sin(angle);
        var yrot = xpos * sin(angle) + ypos * cos(angle);
        xpos = xrot + uniforms.offsetX;
        ypos = yrot + uniforms.offsetY;

        var output : VertexOutput;
        output.v_color = vec4(fade, 1.0 - fade, 0.0, 1.0) + color;
        output.Position = vec4(xpos, ypos, 0.0, 1.0);
        return output;
    }

    @fragment
    fn frag_main(@location(0) v_color : vec4<f32>) -> @location(0) vec4<f32> {
        return v_color;
    }
`;

const animationTest = async () => {
    if (!navigator.gpu) {
        throw new Error("Your current browser does not support WebGPU!");
    }
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const div = document.getElementById("container") as HTMLElement;
    canvas.width = div.offsetWidth;
    canvas.height = div.offsetHeight;
    // 获取webgpu上下文
    const context = canvas.getContext("webgpu") as any;
    // 获取device
    const adapter = (await navigator.gpu.requestAdapter()) as GPUAdapter;
    const device = (await adapter.requestDevice()) as GPUDevice;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    // 设置gpu内容
    context.configure({
        device,
        format: presentationFormat,
        alphaMode: "premultiplied",
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const timeBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                    minBindingSize: 4,
                },
            },
        ],
    });

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                    minBindingSize: 20,
                },
            },
        ],
    });

    const vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
    // 定义渲染管线布局
    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [timeBindGroupLayout, bindGroupLayout],
    });

    // 加载WGSL
    const shaderModule = device.createShaderModule({
        code: animometerWGSL,
    });

    // 基础管线
    const pipelineDesc = {
        layout: "auto",
        vertex: {
            module: shaderModule,
            entryPoint: "vert_main",
            buffers: [
                {
                    // vertex buffer
                    arrayStride: 2 * vec4Size,
                    stepMode: "vertex",
                    attributes: [
                        {
                            // vertex positions
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x4",
                        },
                        {
                            // vertex colors
                            shaderLocation: 1,
                            offset: vec4Size,
                            format: "float32x4",
                        },
                    ],
                },
            ],
        },
        fragment: {
            module: shaderModule,
            entryPoint: "frag_main",
            targets: [
                {
                    format: presentationFormat,
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
            frontFace: "ccw",
            cullMode: "none",
        },
    };

    // 管线
    // @ts-ignore
    const pipeline = device.createRenderPipeline({
        ...pipelineDesc,
        layout: pipelineLayout,
    });

    const vertexBuffer = device.createBuffer({
        size: 2 * 3 * vec4Size,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });

    // 基准三角形
    new Float32Array(vertexBuffer.getMappedRange()).set([
        0, 0.1, 0, 1, /**/ 1, 0, 0, 1,
        -0.1, -0.1, 0, 1, /**/ 0, 1, 0, 1, 0.1,
        -0.1, 0, 1, /**/ 0, 0, 1, 1,
    ]);
    vertexBuffer.unmap();

    function configure() {
        // 绘制个数
        const numTriangles = 3000;
        // uniform属性
        const uniformBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
        const alignedUniformBytes = Math.ceil(uniformBytes / 256) * 256;
        const alignedUniformFloats = alignedUniformBytes / Float32Array.BYTES_PER_ELEMENT;
        // 创建unifromBuffer
        const uniformBuffer = device.createBuffer({
            size: numTriangles * alignedUniformBytes + Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });
        // 创建Data
        const uniformBufferData = new Float32Array(
            numTriangles * alignedUniformFloats
        );

        const bindGroups = new Array(numTriangles);
        // 保存偏移量
        for (let i = 0; i < numTriangles; ++i) {
            uniformBufferData[alignedUniformFloats * i + 0] =
                Math.random() * 0.2 + 0.2; // scale
            uniformBufferData[alignedUniformFloats * i + 1] =
                0.9 * 2 * (Math.random() - 0.5); // offsetX
            uniformBufferData[alignedUniformFloats * i + 2] =
                0.9 * 2 * (Math.random() - 0.5); // offsetY
            uniformBufferData[alignedUniformFloats * i + 3] =
                Math.random() * 1.5 + 0.5; // scalar
            uniformBufferData[alignedUniformFloats * i + 4] = Math.random() * 10; // scalarOffset

            bindGroups[i] = device.createBindGroup({
                layout: bindGroupLayout,
                entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: uniformBuffer,
                        offset: i * alignedUniformBytes,
                        size: 6 * Float32Array.BYTES_PER_ELEMENT,
                    },
                },
                ],
            });
        }


        // 时间offset
        const timeOffset = numTriangles * alignedUniformBytes;
        const timeBindGroup = device.createBindGroup({
            layout: timeBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: uniformBuffer,
                        offset: timeOffset,
                        size: Float32Array.BYTES_PER_ELEMENT,
                    },
                },
            ],
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
                uniformBufferData.byteOffset + offset * Float32Array.BYTES_PER_ELEMENT,
                uploadCount * Float32Array.BYTES_PER_ELEMENT
            );
        }

        function recordRenderPass(
            passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder
        ) {

            passEncoder.setPipeline(pipeline);

            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.setBindGroup(0, timeBindGroup);

            for (let i = 0; i < numTriangles; ++i) {

                passEncoder.setBindGroup(1, bindGroups[i]);

                passEncoder.draw(3, 1, 0, 0);
            }
        }

        let startTime: number | undefined = undefined;
        const uniformTime = new Float32Array([0]);

        const renderPassDescriptor = {
            colorAttachments: [
                {
                    view: undefined, // Assigned later
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        } as any;

        return function doDraw(timestamp: number) {
            if (startTime === undefined) {
                startTime = timestamp;
            }
            uniformTime[0] = (timestamp - startTime) / 1000;
            device.queue.writeBuffer(uniformBuffer, timeOffset, uniformTime.buffer);

            renderPassDescriptor.colorAttachments[0].view = context
                .getCurrentTexture()
                .createView();

            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

            recordRenderPass(passEncoder);

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

animationTest();
export default animationTest;
