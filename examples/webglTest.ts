/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-24 09:00:36
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-24 14:07:29
 * @FilePath: \webgpu\WebGPU_Demo\examples\webglTest.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {
    _length,
    add,
    clamp,
    distance,
    divideScalar,
    multiScalar,
    normalize,
    sub,
} from "../src/utils/math";
import { initShader } from "../src/utils/shaderUtils";

const vShader = `
    precision highp float;
    attribute vec2 a_pos;
    attribute vec4 a_particleData;

    void main() {
        vec2 a_particlePos = a_particleData.xy;
        vec2 a_particleVel = a_particleData.zw;

        float angle = -atan(a_particleVel.x, a_particleVel.y);
        vec2 pos = vec2(a_pos.x * cos(angle) - a_pos.y * sin(angle),
            a_pos.x * sin(angle) + a_pos.y * cos(angle));
            vec2 data = pos + a_particlePos;
        gl_Position = vec4(data.x, data.y, 0, 1);
  }
`;

const fShader = `
    precision highp float;

    void main() {
        gl_FragColor = vec4(1.0);
    }
`;

const webglTest = () => {
    const instanceCount = 100;

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const div = document.getElementById("container") as HTMLElement;
    const width = div.offsetWidth;
    const height = div.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext("webgl") as WebGLRenderingContext;

    if (!gl) {
        console.log("Fail to creat WebGL context");
        return;
    }

    let [isSuccess, program] = initShader(gl, vShader, fShader);

    if (!isSuccess) {
        console.log("Failed to intialize shaders.");
        return;
    }

    const simParamData = {
        deltaT: 0.04,
        rule1Distance: 0.1,
        rule2Distance: 0.025,
        rule3Distance: 0.025,
        rule1Scale: 0.02,
        rule2Scale: 0.05,
        rule3Scale: 0.005,
    };

    const targetParticleData = new Float32Array(instanceCount * 4);

    const initialParticleData = new Float32Array(instanceCount * 4);
    for (let i = 0; i < instanceCount; ++i) {
        initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
        initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
        initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
        initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
    }

    let _compute = (
        instanceCount: number,
        initialParticleData: number[] | Float32Array,
        targetParticleData: number[] | Float32Array,
        simParamData: {
            rule1Distance: number;
            rule2Distance: number;
            rule3Distance: number;
            rule1Scale: number;
            rule2Scale: number;
            rule3Scale: number;
            deltaT: number;
        }
    ) => {
        for (let i = 0; i < instanceCount; ++i) {
            let vPos: [number, number] = [
                initialParticleData[4 * i],
                initialParticleData[4 * i + 1],
            ];
            let vVel: [number, number] = [
                initialParticleData[4 * i + 2],
                initialParticleData[4 * i + 3],
            ];

            let cMass: [number, number] = [0.0, 0.0];
            let cVel: [number, number] = [0.0, 0.0];
            let colVel: [number, number] = [0.0, 0.0];
            let cMassCount = 0;
            let cVelCount = 0;

            let pos: [number, number];
            let vel: [number, number];

            for (let j = 0; j < instanceCount; ++j) {
                if (j === i) {
                    continue;
                }

                pos = [
                    initialParticleData[4 * j],
                    initialParticleData[4 * j + 1],
                ];
                vel = [
                    initialParticleData[4 * j + 2],
                    initialParticleData[4 * j + 3],
                ];

                if (distance(pos, vPos) < simParamData.rule1Distance) {
                    cMass = add(cMass, pos);
                    cMassCount++;
                }
                if (distance(pos, vPos) < simParamData.rule2Distance) {
                    colVel = sub(colVel, sub(pos, vPos));
                }
                if (distance(pos, vPos) < simParamData.rule3Distance) {
                    cVel = add(cVel, vel);
                    cVelCount++;
                }
            }

            if (cMassCount > 0) {
                cMass = sub(divideScalar(cMass, cMassCount), vPos);
            }
            if (cVelCount > 0) {
                cVel = divideScalar(cVel, cVelCount);
            }

            vVel = add(
                vVel,
                add(
                    add(
                        multiScalar(cMass, simParamData.rule1Scale),
                        multiScalar(colVel, simParamData.rule2Scale)
                    ),
                    multiScalar(cVel, simParamData.rule3Scale)
                )
            );

            vVel = multiScalar(normalize(vVel), clamp(_length(vVel), 0.0, 1.0));

            // kinematic update
            vPos = add(vPos, multiScalar(vVel, simParamData.deltaT));

            // Wrap around boundary
            if (vPos[0] < -1.0) vPos[0] = 1.0;
            if (vPos[0] > 1.0) vPos[0] = -1.0;
            if (vPos[1] < -1.0) vPos[1] = 1.0;
            if (vPos[1] > 1.0) vPos[1] = -1.0;

            targetParticleData[4 * i] = vPos[0];
            targetParticleData[4 * i + 1] = vPos[1];
            targetParticleData[4 * i + 2] = vVel[0];
            targetParticleData[4 * i + 3] = vVel[1];
        }
    };

    const vertexBufferData = new Float32Array([
        -0.01, -0.02, 0.01, -0.02, 0.0, 0.02,
    ]);

    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexBufferData, gl.STATIC_DRAW);

    let particleVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        initialParticleData.byteLength,
        gl.DYNAMIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    let a_pos = gl.getAttribLocation(program, "a_pos");
    gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_pos);

    const ext = gl.getExtension("ANGLE_instanced_arrays");
    if (!ext) {
        return alert("need ANGLE_instanced_arrays");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer);
    let a_particleData = gl.getAttribLocation(program, "a_particleData");

    gl.enableVertexAttribArray(a_particleData);
    gl.vertexAttribPointer(
        a_particleData, // location
        4, // size (num values to pull from buffer per iteration)
        gl.FLOAT, // type of data in buffer
        false, // normalize
        0, // stride, num bytes to advance to get to next set of values
        0 // offset in buffer
    );
    // this line says this attribute only changes for each 1 instance
    ext.vertexAttribDivisorANGLE(a_particleData, 1);

    let indices = new Uint8Array([0, 1, 2]);

    let indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    let sourceData = initialParticleData;
    let targetData = targetParticleData;
    
    let nowTime = 0;

    function frames(
        frameTime: number
    ) {
        // @ts-ignore
        document.getElementById('time').innerHTML = Math.ceil((frameTime - nowTime) * 1e2) / 1e2

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, width, height);
        gl.disable(gl.DEPTH_TEST);

        _compute(instanceCount, sourceData, targetData, simParamData);

        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        gl.bindBuffer(gl.ARRAY_BUFFER, particleVertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, targetData);

        ext?.drawElementsInstancedANGLE(
            gl.TRIANGLES,
            3,
            gl.UNSIGNED_BYTE,
            0, // offset
            instanceCount // num instances
        );

        let temp = sourceData;
        sourceData = targetData;
        targetData = temp;
        
        nowTime = frameTime;
        requestAnimationFrame(frames)
    }
       
    requestAnimationFrame(frames)
};

webglTest();

export default webglTest;
