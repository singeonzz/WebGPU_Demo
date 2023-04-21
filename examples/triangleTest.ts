/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-20 08:48:10
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-21 16:41:16
 * @FilePath: \webgpu\WebGPU_Demo\examples\triangle.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const trangleTest = async () => {
    if (!navigator.gpu) {
        throw new Error("Your current browser does not support WebGPU!");
    }

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const div = document.getElementById("container") as HTMLElement;
    canvas.width = div.offsetWidth;
    canvas.height = div.offsetHeight;

    // 获取device
    // adapter是指物理GPU 一个GPUAdapter 封装了一个显卡适配器，并描述其能力（特性和限制）
    // device是指逻辑GPU 设备是显卡适配器的逻辑实例，内部对象通过设备被创建
    const adapter = (await navigator.gpu.requestAdapter()) as GPUAdapter;
    const device = (await adapter.requestDevice()) as GPUDevice;
    // 获取webgpu的上下文
    const context = canvas.getContext("webgpu") as any;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: presentationFormat,
        // alphaMode设置的是 Canvas 和 HTML 元素背景的混合方式。
        // 如果设置为’opaque’，则用 WebGPU 绘图内容完全覆盖。
        // 也可以为alphaMode 设置为 ‘premultiplied’ （相当于alpha预乘），
        // 在这种情况下，作为 WebGPU 绘图的结果，如果画布像素的 alpha 小于 1，
        // 则该像素将是画布和 HTML 元素背景混合的颜色。
        alphaMode: "opaque", // or 'premultiplied'
    });

    const queue = device.queue;
    // @vertex 意味着这是一个顶点着色器。
    // fn是function的缩写

    // @builtin(vertex_index) VertexIndex : u32
    // @builtin 意味着已经内置到着色器语言WGSL中得变量
    // 这里声明vertex_index为内部变量，让后起了一个VertexIndex的别名
    // :u32是VertexIndex的类型，代表无符号32位整型

    // -> @builtin(position) vec4<f32>
    // -> 表示函数返回类型
    const shaderCode = `
            @vertex
            fn main(
            @builtin(vertex_index) VertexIndex : u32
            ) -> @builtin(position) vec4<f32> {

                var pos = array<vec2<f32>, 3>(
                    vec2<f32>(0.0, 0.5),
                    vec2<f32>(-0.5, -0.5),
                    vec2<f32>(0.5, -0.5)
                );

                return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
            }
        `;
    // -> @location(0) vec4<f32>
    // -> @location(0) vec4<f32>显示了主函数的返回值，这是片元着色器的输出。
    // 其中@location(0)对应于fragment.targets数组中的第0个格式，也对应于renderPassDescriptor.colorAttachments数组中的第0个规范。
    // @location(0)也意味着片元着色器的context.getCurrentTexture().createView();指向画布的当前缓冲区。
    const FRCode = `
            @fragment
            fn main() -> @location(0) vec4<f32> {
                return vec4<f32>(1.0, 0.0, 0.0, 1.0);
            }
        `;

    // 创建绑定组的布局对象
    // const bindGroupLayout = device.createBindGroupLayout({});
    // 传递绑定组布局对象
    // const pipelineLayout = device.createPipelineLayout({});
    /*
        上面两个布局对象其实可以偷懒不创建，绑定组虽然需要绑定组布局以
        通知对应管线阶段绑定组的资源长啥样，但是绑定组布局是可以由
        管线对象通过可编程阶段的代码自己推断出来绑定组布局对象的
    */

    // 渲染管线设置
    // PipelineStateObject(PSO)是对GPU的每个处理步骤的设置的抽象
    /* 
        创建管线
        指定管线各个阶段所需的素材
        其中有三个阶段可以传递着色器以实现可编程，即顶点、片段、计算 
        每个阶段还可以指定其所需要的数据、信息，例如 buffer 等

        除此之外，管线还需要一个管线的布局对象，其内置的绑定组布局对象可以
        让着色器知晓之后在通道中使用的绑定组资源是啥样子的
    */
    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: device.createShaderModule({ code: shaderCode }),
            entryPoint: "main",
        },
        fragment: {
            module: device.createShaderModule({ code: FRCode }),
            entryPoint: "main",
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
    // CommandEncoder(命令编辑器)
    const commandEncoder = device.createCommandEncoder({});
    const renderPassDescriptor = {
        colorAttachments: [
            {
                // 指定要绘制到的渲染目标纹理
                view: context.getCurrentTexture().createView(),
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
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();

    const commandBuffer = commandEncoder.finish();
    // 向GPU发出命令
    queue.submit([commandBuffer]);
};

trangleTest();
export default trangleTest;
