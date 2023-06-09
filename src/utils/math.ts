/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-21 15:11:21
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-24 09:37:07
 * @FilePath: \webgpu\WebGPU_Demo\src\utils\math.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { vec3 } from "gl-matrix";

export const Float32ArrayConcat = (
    first: Float32Array,
    second: Float32Array
) => {
    var firstLength = first.length,
        result = new Float32Array(firstLength + second.length);
    result.set(first);
    result.set(second, firstLength);
    return result;
};

export const Wellenkugel = (u: number, v: number, center: vec3 = [0, 0, 0]) => {
    let x = u * Math.cos(Math.cos(u)) * Math.sin(v);
    let y = u * Math.sin(Math.cos(u));
    let z = u * Math.cos(Math.cos(u)) * Math.cos(v);
    return vec3.fromValues(x + center[0], y + center[1], z + center[2]);
};

export const KleinBottle = (u: number, v: number, center: vec3 = [0, 0, 0]) => {
    let x = (2 / 15) * (3 + 5 * Math.cos(u) * Math.sin(u)) * Math.sin(v);

    let y =
        (-1 / 15) *
        Math.sin(u) *
        (3 * Math.cos(v) -
            3 * Math.pow(Math.cos(u), 2) * Math.cos(v) -
            48 * Math.pow(Math.cos(u), 4) * Math.cos(v) +
            48 * Math.pow(Math.cos(u), 6) * Math.cos(v) -
            60 * Math.sin(u) +
            5 * Math.cos(u) * Math.cos(v) * Math.sin(u) -
            5 * Math.pow(Math.cos(u), 3) * Math.cos(v) * Math.sin(u) -
            80 * Math.pow(Math.cos(u), 5) * Math.cos(v) * Math.sin(u) +
            80 * Math.pow(Math.cos(u), 7) * Math.cos(v) * Math.sin(u));

    let z =
        (-2 / 15) *
        Math.cos(u) *
        (3 * Math.cos(v) -
            30 * Math.sin(u) +
            90 * Math.pow(Math.cos(u), 4) * Math.sin(u) -
            60 * Math.pow(Math.cos(u), 6) * Math.sin(u) +
            5 * Math.cos(u) * Math.cos(v) * Math.sin(u));

    return vec3.fromValues(x + center[0], y + center[1], z + center[2]);
};

export const Peaks = (x: number, z: number, center: vec3 = [0, 0, 0]) => {
    let y =
        3 * (1 - z) * (1 - z) * Math.exp(-(z * z) - (x + 1) * (x + 1)) -
        10 *
            (z / 5 - z * z * z - x * x * x * x * x) *
            Math.exp(-z * z - x * x) -
        (1 / 3) * Math.exp(-(z + 1) * (z + 1) - x * x);
    return vec3.fromValues(x + center[0], y + center[1], z + center[2]);
};

export const Sinc = (x: number, z: number, center: vec3 = [0, 0, 0]) => {
    let r = Math.sqrt(x * x + z * z) + 0.00001;
    let y = Math.sin(r) / r;
    return vec3.fromValues(x + center[0], y + center[1], z + center[2]);
};

export const TorusPosition = (
    R: number,
    r: number,
    u: number,
    v: number,
    center: vec3 = [0, 0, 0]
) => {
    let snu = Math.sin((u * Math.PI) / 180);
    let cnu = Math.cos((u * Math.PI) / 180);
    let snv = Math.sin((v * Math.PI) / 180);
    let cnv = Math.cos((v * Math.PI) / 180);
    return vec3.fromValues(
        (R + r * cnv) * cnu + center[0],
        r * snv + center[1],
        -(R + r * cnv) * snu + center[2]
    );
};

export const ConePosition = (
    radius: number,
    theta: number,
    y: number,
    center: vec3 = [0, 0, 0]
) => {
    let sn = Math.sin((theta * Math.PI) / 180);
    let cn = Math.cos((theta * Math.PI) / 180);
    return vec3.fromValues(
        radius * cn + center[0],
        y + center[1],
        -radius * sn + center[2]
    );
};

export const CylinderPosition = (
    radius: number,
    theta: number,
    y: number,
    center: vec3 = [0, 0, 0]
) => {
    let sn = Math.sin((theta * Math.PI) / 180);
    let cn = Math.cos((theta * Math.PI) / 180);
    return vec3.fromValues(
        radius * cn + center[0],
        y + center[1],
        -radius * sn + center[2]
    );
};

export const SpherePosition = (
    radius: number,
    theta: number,
    phi: number,
    center: vec3 = [0, 0, 0]
) => {
    let snt = Math.sin((theta * Math.PI) / 180);
    let cnt = Math.cos((theta * Math.PI) / 180);
    let snp = Math.sin((phi * Math.PI) / 180);
    let cnp = Math.cos((phi * Math.PI) / 180);
    return vec3.fromValues(
        radius * snt * cnp + center[0],
        radius * cnt + center[1],
        -radius * snt * snp + center[2]
    );
};

export const distance = (
    [x1, x2]: [number, number],
    [y1, y2]: [number, number]
): number => {
    return Math.sqrt(Math.pow(x1 - y1, 2) + Math.pow(x2 - y2, 2));
};

export const sub = (
    [x1, x2]: [number, number],
    [y1, y2]: [number, number]
): [number, number] => {
    return [x1 - y1, x2 - y2];
};

export const add = (
    [x1, x2]: [number, number],
    [y1, y2]: [number, number]
): [number, number] => {
    return [x1 + y1, x2 + y2];
};

export const divide = (
    [x1, x2]: [number, number],
    [y1, y2]: [number, number]
): [number, number] => {
    return [x1 / y1, x2 / y2];
};

export const divideScalar = (
    [x1, x2]: [number, number],
    scalar: number
): [number, number] => {
    return [x1 / scalar, x2 / scalar];
};

export const multiScalar = (
    [x1, x2]: [number, number],
    scalar: number
): [number, number] => {
    return [x1 * scalar, x2 * scalar];
};

export const _length = ([x1, x2]: [number, number]): number => {
    return Math.sqrt(x1 * x1 + x2 * x2);
};

export const normalize = ([x1, x2]: [number, number]): [number, number] => {
    let nlength = _length([x1, x2]);

    return [x1 / nlength, x2 / nlength];
};

export const clamp = (x: number, min: number, max: number) => {
    return Math.min(Math.max(x, min), max);
};
