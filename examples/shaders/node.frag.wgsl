fn circle(
    st: vec2<f32>,
    radius: f32
) -> f32 {
    var dist: vec2<f32> = st - vec2(0.5);
    return 1.0 - smoothstep(
        radius - (radius * 0.01),
        radius + (radius * 0.01),
        dot(dist, dist) * 4.0
    );
}

@fragment
fn frag_main(
    @location(0) vCoord: vec2<f32>
) -> @location(0) vec4<f32> {
    let coord = vCoord;

    if circle(coord, 1.0) < 0.5 {
            discard;
            // return vec4(1.0, 1.0, 1.0, 1.0);
    }

    return vec4(1.0, 0.0, 0.0, 1.0);
}