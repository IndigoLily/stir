#version 300 es
precision highp float;
 
uniform vec2 u_resolution;
uniform sampler2D u_particles;
 
void main() {
    vec2 ratio = vec2(
        min(1.0, u_resolution.y / u_resolution.x),
        min(1.0, u_resolution.x / u_resolution.y)
    );

    int particlesSide = 512;

    vec2 pos = texelFetch(u_particles, ivec2(gl_VertexID % particlesSide, gl_VertexID / particlesSide), 0).xy * ratio;

    gl_Position = vec4(pos, 0, 1);
    gl_PointSize = 2.0;
}
