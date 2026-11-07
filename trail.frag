#version 300 es
precision highp float;

uniform sampler2D u_trail;
uniform sampler2D u_points;
 
out vec4 outColor;
 
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);

    vec4 avg = vec4(0, 0, 0, 0);
    avg += texelFetch(u_points, p * 2, 0);
    avg += texelFetch(u_points, p * 2 + ivec2(1, 0), 0);
    avg += texelFetch(u_points, p * 2 + ivec2(0, 1), 0);
    avg += texelFetch(u_points, p * 2 + ivec2(1, 1), 0);
    avg /= 4.0;

    vec4 old = texelFetch(u_trail, p, 0) * 0.95;

    outColor = old + avg;
}
