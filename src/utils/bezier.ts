/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-21 13:56:05
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-23 15:31:32
 * @FilePath: \webgpu\WebGPU_Demo\src\utils\bezier.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

interface CoordBezie {
    x: number
    y: number //贝塞尔用的坐标<x,y>
}

/**
 * 生成二阶贝塞尔曲线定点数据
 * @param p0   起始点  { x : number, y : number, z : number }
 * @param p1   控制点1 { x : number, y : number, z : number }
 * @param p2   终止点 { x : number, y : number, z : number }
 * @param num  线条精度
 * @param tick 绘制系数
 * @returns {{points: Array, num: number}}
 */
export function create3DBezier(
    p0: CoordBezie,
    p1: CoordBezie,
    p2: CoordBezie,
    num: number,
    tick: number,
) {
    let pointMum = num || 100
    let _tick = tick || 1.0
    let t = _tick / (pointMum - 1)
    let points = []
    for (let i = pointMum - 1; i >= 0; i--) {
        let point = getBezierNowPoint(p0, p1, p2, i, t)
        points.push([point.x, point.y])
        // @ts-ignore
        point = null
    }
    return points
}
/**
 * 二阶贝塞尔曲线公式
 * B(t) = (1-t)^2 * P0 + 2t * (1-t) * P1 + t^2 * P2
 * @param p0 起始点
 * @param p1 控制点
 * @param p2 终止点
 * @param t  绘制系数
 * @returns {*}
 * @constructor
 */
export function Bezier(p0: number, p1: number, p2: number, t: number) {
    let P0, P1, P2
    P0 = p0 * Math.pow(1 - t, 2)
    P1 = 2 * p1 * t * (1 - t)
    P2 = p2 * Math.pow(t, 2)
    return P0 + P1 + P2
}

/**
 * 获取二阶贝塞尔曲线中指定位置的点坐标
 * @param p0 起始点
 * @param p1 控制点
 * @param p2 终止点
 * @param num 绘制个数
 * @param tick 绘制系数
 * @returns {{x, y, z}}
 */
function getBezierNowPoint(
    p0: CoordBezie,
    p1: CoordBezie,
    p2: CoordBezie,
    num: number,
    tick: number,
) {
    return {
        x: Bezier(p0.x, p1.x, p2.x, num * tick),
        y: Bezier(p0.y, p1.y, p2.y, num * tick),
    }
}

export const calcLine = (
    source = { x: 0.8, y: 0 },
    control = { x: 0, y: 0.5 },
    target = { x: -0.8, y: 0 },
    width = 0.05,
    num = 20
) => {
    // 计算贝塞尔曲线坐标
    let normalizePath = create3DBezier(source, control, target, num, 1.0);

    // 计算法向量
    let attrNormal: number[] = [],
        attrMiter: number[] = [],
        attrPoint: number[] | null = [];

    for (let i = 0, lens = normalizePath.length; i < lens; i++) {
        let x1, x2, y1, y2;
        if (i == lens - 1) {
            x2 = normalizePath[i][0];
            y2 = normalizePath[i][1];
            x1 = normalizePath[i - 1][0];
            y1 = normalizePath[i - 1][1];
        } else {
            x1 = normalizePath[i][0];
            y1 = normalizePath[i][1];
            x2 = normalizePath[i + 1][0];
            y2 = normalizePath[i + 1][1];
        }
        const dx = x2 - x1,
            dy = y2 - y1;
        let len = dx * dx + dy * dy,
            n1 = 0,
            n2 = 0;

        if (len) {
            len = 1 / Math.sqrt(len);
            n1 = -dy * len;
            n2 = dx * len;
        }

        let rx = i * 4;
        let item = normalizePath[i];

        // 用于计算矩阵的点
        attrPoint[rx] = item[0];
        attrPoint[rx + 1] = item[1];
        attrPoint[rx + 2] = item[0];
        attrPoint[rx + 3] = item[1];

        let norm = [n1, n2];
        let miter = -1;
        // 法向量
        attrNormal[rx] = norm[0];
        attrNormal[rx + 1] = norm[1];
        attrNormal[rx + 2] = norm[0];
        attrNormal[rx + 3] = norm[1];
        // 斜接
        let ry = i * 2;
        attrMiter[ry] = -miter;
        attrMiter[ry + 1] = miter;
    }

    let MatArray: any = [];

    for (let i = 0, j = 0; i < attrPoint.length; i += 2, j += 1) {
        MatArray[i] =
            Math.ceil(
                (attrPoint[i] + attrNormal[i] * width * attrMiter[j]) * 1e3
            ) / 1e3;
        MatArray[i + 1] =
            Math.ceil(
                (attrPoint[i + 1] + attrNormal[i + 1] * width * attrMiter[j]) *
                    1e3
            ) / 1e3;
    }

    return MatArray;
};