/*
 * @Author: 沈银岗 shenyingang@chuanglintech.com
 * @Date: 2023-04-23 14:35:41
 * @LastEditors: 沈银岗 shenyingang@chuanglintech.com
 * @LastEditTime: 2023-04-23 15:04:10
 * @FilePath: \webgpu\WebGPU_Demo\examples\easyTest.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { InitGPU } from "../src/utils"


const easyTest = async () => {

    const gpu = await InitGPU()

    const device = gpu.device;

}

easyTest()

export default easyTest