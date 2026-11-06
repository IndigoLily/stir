#version 300 es
precision highp float;

uniform sampler2D u_post;
uniform sampler2D u_old;

in vec2 coord;
 
out vec4 outColor;

vec4 byte_floor(vec4 clr) {
    return floor(clr * 255.0) / 255.0;
}
 
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);

    vec4 avg = vec4(0, 0, 0, 0);
    avg += texelFetch(u_post, p * 2, 0);
    avg += texelFetch(u_post, p * 2 + ivec2(1, 0), 0);
    avg += texelFetch(u_post, p * 2 + ivec2(0, 1), 0);
    avg += texelFetch(u_post, p * 2 + ivec2(1, 1), 0);
    avg /= 4.0;

    vec4 old = byte_floor(texelFetch(u_old, p, 0) * 0.9);

    outColor = old + avg;
}
