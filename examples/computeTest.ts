/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-20 08:51:42
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-20 09:40:43
 * @FilePath: \webgpu\WebGPU_Demo\examples\computeTest.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const BUFFER_SIZE = 32;

// Compute shader
const shader = `
    @group(0) @binding(0)
    var<storage, read_write> output: array<f32>;

    // 禁止这么写
    // fn fb(
    //     count: i32
    // ) -> f32 {
    //     if(count == 1 || count == 0){
    //         return 1.;
    //     }else{
    //         return fb(i-1) + fb(i-2);
    //     }
    // }
    
    @compute @workgroup_size(8)
    fn main(
        @builtin(global_invocation_id)
        global_id : vec3u,

        @builtin(local_invocation_id)
        local_id : vec3u,
    ) {
        var a = 0.;
        var b = 1.;
        var ans = 0.;
        for(var i:i32 = 0;i <i32(local_id.x);i++){
            ans = a+b;
            a = b;
            b = ans;
        }
        output[global_id.x] = ans;
    }
`;

const computerTest = async () => {
    if (!navigator.gpu) {
        throw new Error("Your current browser does not support WebGPU!");
    }
    const adapter = (await navigator.gpu.requestAdapter()) as GPUAdapter;

    const device = (await adapter.requestDevice()) as GPUDevice;

    // 2: Create a shader module from the shader template literal
    const shaderModule = device.createShaderModule({
        code: shader,
    });
    // 3: Create an output buffer to read GPU calculations to,
    // and a staging buffer to be mapped for JavaScript access
    // 指定output为一个存储缓冲区
    const output = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    // 指定stagingBuffer可以被映射为一个由JS读取的缓冲区，并将成为复制操作的目标
    const stagingBuffer = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // 4: Create a GPUBindGroupLayout to define the bind group structure,
    // create a GPUBindGroup from it,
    // then use it to create a GPUComputePipeline
    // 创建布局
    // 在这里将管线与一个单一的内存缓冲区绑定,绑定到绑定槽0
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                },
            },
        ],
    });
    // 绑定布局
    // 表示如何在着色器阶段使用这些资源
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: output,
                },
            },
        ],
    });
    // 创建计算管线
    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        }),
        compute: {
            module: shaderModule,
            entryPoint: "main",
        },
    });

    // 运算计算通道
    // 5: Create GPUCommandEncoder to issue commands to the GPU
    const commandEncoder = device.createCommandEncoder();

    // 6: Initiate render pass
    const passEncoder = commandEncoder.beginComputePass();

    // 7: Issue commands
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    // 设置32个为一组
    passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 32));

    // End the render pass
    passEncoder.end();

    // Copy output buffer to staging buffer
    // 将结果返回
    commandEncoder.copyBufferToBuffer(
        output,
        0, // Source offset  来源缓冲区偏移量
        stagingBuffer,
        0, // Destination offset  目的缓冲区偏移量
        BUFFER_SIZE
    );

    // 8: End frame by passing array of command buffers to command queue for execution
    // 通过将命令缓冲区数组传递给命令队列以执行来结束
    device.queue.submit([commandEncoder.finish()]);

    // map staging buffer to read results back to JS
    // 映射staging缓冲区
    await stagingBuffer.mapAsync(
        GPUMapMode.READ,
        0, // Offset
        BUFFER_SIZE // Length
    );

    const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
    // @ts-ignore
    const data = copyArrayBuffer.slice();
    stagingBuffer.unmap();
    console.log("菲波那切数列的前8项为：" , ...new Float32Array(data));
    
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const div = document.getElementById("container") as HTMLElement;
    canvas.width = div.offsetWidth;
    canvas.height = div.offsetHeight;

    const context = canvas.getContext('2d') as any;
    const text = "斐波那契数列的前8项为：" + new Float32Array(data);

    context.font = "40px 微软雅黑";
    context?.fillText(text, 100, 100)
};

computerTest();
export default computerTest;
