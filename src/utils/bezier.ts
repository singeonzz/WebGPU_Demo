/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-21 13:56:05
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-21 13:56:11
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