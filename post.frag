#version 300 es
precision highp float;

uniform sampler2D u_post;
uniform sampler2D u_old;

in vec2 coord;
 
out vec4 outColor;
 
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 avg = vec4(0, 0, 0, 0);
    avg += texelFetch(u_post, p * 2, 0);
    avg += texelFetch(u_post, p * 2 + ivec2(1, 0), 0);
    avg += texelFetch(u_post, p * 2 + ivec2(0, 1), 0);
    avg += texelFetch(u_post, p * 2 + ivec2(1, 1), 0);
    outColor = floor(texelFetch(u_old, p, 0) * 192.0) / 255.0 + avg / 16.0;
}
