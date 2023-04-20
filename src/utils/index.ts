import { mat4, vec3 } from "gl-matrix";

/**
 * 判断浏览器是否为ie
 * @returns
 */
export const isIE = () => {
    // @ts-ignore
    if (!!window.ActiveXObject || "ActiveXObject" in window) {
        return true;
    } else {
        return false;
    }
};

/**
 * 初始化WebGPU
 * @returns
 */
export const InitGPU = async () => {
    const checkgpu = CheckWebGPU();
    if (checkgpu.includes("Your current browser does not support WebGPU!")) {
        throw "Your current browser does not support WebGPU!";
    }
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    // 获取device
    // adapter是指物理GPU 一个GPUAdapter 封装了一个显卡适配器，并描述其能力（特性和限制）
    // device是指逻辑GPU 设备是显卡适配器的逻辑实例，内部对象通过设备被创建
    const adapter = await navigator.gpu?.requestAdapter();
    const device = (await adapter?.requestDevice()) as GPUDevice;
    // 获取webgpu的上下文
    const context = canvas.getContext("webgpu") as any;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: format,
        // alphaMode设置的是 Canvas 和 HTML 元素背景的混合方式。
        // 如果设置为’opaque’，则用 WebGPU 绘图内容完全覆盖。
        // 也可以为alphaMode 设置为 ‘premultiplied’ （相当于alpha预乘），
        // 在这种情况下，作为 WebGPU 绘图的结果，如果画布像素的 alpha 小于 1，
        // 则该像素将是画布和 HTML 元素背景混合的颜色。
        alphaMode: "opaque",
    });
    return { device, canvas, format, context };
};

/**
 * 核实是否存在WebGPU。
 * 同时赋予canvas实际宽高。
 * @returns
 */
export const CheckWebGPU = () => {
    let result = "Great, your current browser supports WebGPU!";
    if (!navigator.gpu) {
        result = `Your current browser does not support WebGPU! Make sure you are on a system 
                    with WebGPU enabled. Currently, SPIR-WebGPU is only supported in  
                    <a href="https://www.google.com/chrome/canary/">Chrome canary</a>
                    with the flag "enable-unsafe-webgpu" enabled. See the 
                    <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status"> 
                    Implementation Status</a> page for more details.                   
                `;
    }

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const div = document.getElementById("container") as HTMLElement;
    canvas.width = div.offsetWidth;
    canvas.height = div.offsetHeight;

    function windowResize() {
        canvas.width = div.offsetWidth;
        canvas.height = div.offsetHeight;
    }

    window.addEventListener("resize", windowResize);

    return result;
};

/**
 * 创建GPUBuffer f32
 * @param device
 * @param data
 * @param usageFlag
 * @returns
 */
export const CreateGPUBuffer = (
    device: GPUDevice,
    data: Float32Array,
    usageFlag = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        // 代表的允许的按位标志
        usage: usageFlag,
        // 如果为true，可以通过调用立即设置缓冲区内的值GPUBuffer.getMappedRange()
        // 默认值为false
        mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};

/**
 * 创建GPUBuffer u32
 * @param device 
 * @param data 
 * @param usageFlag 
 * @returns 
 */
export const CreateGPUBufferUint = (
    device: GPUDevice, 
    data: Uint32Array, 
    usageFlag = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });
    new Uint32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};

/**
 * 创建视图矩阵和投影矩阵
 * @param respectRatio 
 * @param cameraPosition 
 * @param lookDirection 
 * @param upDirection 
 * @returns 
 */
export const CreateViewProjection = (
    respectRatio = 1.0,
    cameraPosition: vec3 = [2, 2, 4],
    lookDirection: vec3 = [0, 0, 0],
    upDirection: vec3 = [0, 1, 0]
) => {
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const viewProjectionMatrix = mat4.create();

    mat4.perspective(
        projectionMatrix,
        (2 * Math.PI) / 5,
        respectRatio,
        0.1,
        100.0
    );
    mat4.lookAt(viewMatrix, cameraPosition, lookDirection, upDirection);
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    const cameraOption = {
        eye: cameraPosition,
        center: lookDirection,
        zoomMax: 100,
        zoomSpeed: 2,
    };

    return {
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
        cameraOption,
    };
};

/**
 * 加载纹理
 * @param device 
 * @param imageName 
 * @param addressModeU 
 * @param addressModeV 
 * @returns 
 */
export const GetTexture = async(
    device:GPUDevice, 
    imageName:string, 
    addressModeU = 'repeat',
    addressModeV = 'repeat'
) => {
    // 获取图片
    const img = document.createElement('img');
    img.src = '../src/assets/' + imageName;

    await img.decode();
    const imageBitmap = await createImageBitmap(img);

    // 创建GPUSampler,它控制着着色器如何转换和过滤纹理资源数据
    const sampler = device.createSampler({
        minFilter: 'linear',
        magFilter: 'linear',
        addressModeU: addressModeU as GPUAddressMode,
        addressModeV: addressModeV as GPUAddressMode
    });       

    // 创建纹理
    const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | 
               GPUTextureUsage.COPY_DST | 
               GPUTextureUsage.RENDER_ATTACHMENT
    });
    // 将从源图像、视频或画布中获取的快照复制到给定的GPUTexture.
    device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: texture },
        [imageBitmap.width, imageBitmap.height]
    );

    return {
        texture,
        sampler
    }
}

/**
 * 矩阵翻转
 * @param modelMat 
 * @param translation 
 * @param rotation 
 * @param scaling 
 */
export const CreateTransforms = (modelMat:mat4, translation:vec3 = [0,0,0], rotation:vec3 = [0,0,0], scaling:vec3 = [1,1,1]) => {
    const rotateXMat = mat4.create();
    const rotateYMat = mat4.create();
    const rotateZMat = mat4.create();   
    const translateMat = mat4.create();
    const scaleMat = mat4.create();

    //perform indivisual transformations
    mat4.fromTranslation(translateMat, translation);
    mat4.fromXRotation(rotateXMat, rotation[0]);
    mat4.fromYRotation(rotateYMat, rotation[1]);
    mat4.fromZRotation(rotateZMat, rotation[2]);
    mat4.fromScaling(scaleMat, scaling);

    //combine all transformation matrices together to form a final transform matrix: modelMat
    mat4.multiply(modelMat, rotateXMat, scaleMat);
    mat4.multiply(modelMat, rotateYMat, modelMat);        
    mat4.multiply(modelMat, rotateZMat, modelMat);
    mat4.multiply(modelMat, translateMat, modelMat);
};

/**
 * 动画
 * @param draw 
 * @param rotation 
 * @param isAnimation 
 */
export const CreateAnimation = (draw:any, rotation:vec3 = vec3.fromValues(0,0,0), isAnimation = true ) => {
    function step() {
        if(isAnimation){
            rotation[0] += 0.01;
            rotation[1] += 0.01;
            rotation[2] += 0.01;
        } else{
            rotation = [0, 0, 0];
        }
        draw();
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}