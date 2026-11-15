#version 300 es
precision highp float;
 
uniform vec2 u_res;
uniform sampler2D u_particles;
 
void main() {
    vec2 ratio = vec2(
        min(1.0, u_res.y / u_res.x),
        min(1.0, u_res.x / u_res.y)
    );

    int particlesSide = $particlesSide$;

    vec2 pos = texelFetch(u_particles, ivec2(gl_VertexID % particlesSide, gl_VertexID / particlesSide), 0).xy * ratio;

    gl_Position = vec4(pos, 0, 1);
    gl_PointSize = max(2.0, min(u_res.x, u_res.y) / 640.0) * sqrt(2.0);
}
