struct Uniforms {
        scale: f32,
        offsetX: f32,
        offsetY: f32,
    }
@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct outPut {
        @builtin(position) Position: vec4<f32>,
        @location(0) vCoord: vec2<f32>
    }

    @vertex
fn vert_main(
    @location(0) position: vec4<f32>,
    @location(1) coord: vec2<f32>,
) -> outPut {
    var xpos = position.x * uniforms.scale;
    var ypos = position.y * uniforms.scale;

    xpos = xpos + uniforms.offsetX;
    ypos = ypos + uniforms.offsetY;

    var output: outPut;
    output.vCoord = coord;
    output.Position = vec4(xpos, ypos, 0.0, 1.0);
    return output;
}