struct Output {
    @builtin(position) Position: vec4<f32>,
}

@vertex
fn main(
    @location(0) pos: vec4<f32>
) -> Output {
    var output: Output;
    output.Position = pos;
    return output;
}