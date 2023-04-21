import { mat4, vec3 } from "gl-matrix";
const interp = require('interpolate-arrays');

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

export const AddColors = (colormapName:string, min:number, max:number, x:number ) => {
    const colors = ColormapData(colormapName);    
    if(!colors) return;  
    if(x<min) x = min;
    if(x>max) x = max;
    if(min == max) return [0,0,0];
    const xn = (x-min)/(max-min);
    return interp(colors, xn);
}

export const ColormapData = (colormapName:string) => {
    let colors;
    switch(colormapName){
        case 'hsv':
            colors = [[1,0,0],[1,0.5,0],[0.97,1,0.01],[0,0.99,0.04],[0,0.98,0.52],[0,0.98,1],[0.01,0.49,1],[0.03,0,0.99],[1,0,0.96],[1,0,0.49],[1,0,0.02]];
        break;
        case 'hot':
            colors = [[0,0,0],[0.3,0,0],[0.6,0,0],[0.9,0,0],[0.93,0.27,0],[0.97,0.55,0],[1,0.82,0],[1,0.87,0.25],[1,0.91,0.5],[1,0.96,0.75],[1,1,1]];
            break;
        case 'cool':
            colors = [[0.49,0,0.7],[0.45,0,0.85],[0.42,0.15,0.89],[0.38,0.29,0.93],[0.27,0.57,0.91],[0,0.8,0.77],[0,0.97,0.57],[0,0.98,0.46],[0,1,0.35],[0.16,1,0.03],[0.58,1,0]];
            break;
        case 'spring':
            colors = [[1,0,1],[1,0.1,0.9],[1,0.2,0.8],[1,0.3,0.7],[1,0.4,0.6],[1,0.5,0.5],[1,0.6,0.4],[1,0.7,0.3],[1,0.8,0.2],[1,0.9,0.1],[1,1,0]];
            break;
        case 'summer':
            colors = [[0,0.5,0.4],[0.1,0.55,0.4],[0.2,0.6,0.4],[0.3,0.65,0.4],[0.4,0.7,0.4],[0.5,0.75,0.4],[0.6,0.8,0.4],[0.7,0.85,0.4],[0.8,0.9,0.4],[0.9,0.95,0.4],[1,1,0.4]];
            break;
        case 'autumn':
            colors = [[1,0,0],[1,0.1,0],[1,0.2,0],[1,0.3,0],[1,0.4,0],[1,0.5,0],[1,0.6,0],[1,0.7,0],[1,0.8,0],[1,0.9,0],[1,1,0]];
            break;
        case 'winter':
            colors = [[0,0,1],[0,0.1,0.95],[0,0.2,0.9],[0,0.3,0.85],[0,0.4,0.8],[0,0.5,0.75],[0,0.6,0.7],[0,0.7,0.65],[0,0.8,0.6],[0,0.9,0.55],[0,1,0.5]];
            break;
        case 'bone':
            colors = [[0,0,0],[0.08,0.08,0.11],[0.16,0.16,0.23],[0.25,0.25,0.34],[0.33,0.33,0.45],[0.41,0.44,0.54],[0.5,0.56,0.62],[0.58,0.67,0.7],[0.66,0.78,0.78],[0.83,0.89,0.89],[1,1,1]];
            break;
        case 'copper':
            colors = [[0,0,0],[0.13,0.08,0.05],[0.25,0.16,0.1],[0.38,0.24,0.15],[0.5,0.31,0.2],[0.62,0.39,0.25],[0.75,0.47,0.3],[0.87,0.55,0.35],[1,0.63,0.4],[1,0.71,0.45],[1,0.78,0.5]];
            break;
        case 'greys':
            colors = [[0,0,0],[0.1,0.1,0.1],[0.2,0.2,0.2],[0.3,0.3,0.3],[0.4,0.4,0.4],[0.5,0.5,0.5],[0.6,0.6,0.6],[0.7,0.7,0.7],[0.8,0.8,0.8],[0.9,0.9,0.9],[1,1,1]];
            break;
        case 'jet': default:
            colors = [[0,0,0.51],[0,0.24,0.67],[0.01,0.49,0.78],[0.01,0.75,0.89],[0.02,1,1],[0.51,1,0.5],[1,1,0],[0.99,0.67,0],[0.99,0.33,0],[0.98,0,0],[0.5,0,0]];
            break;
    }
    return colors;
};