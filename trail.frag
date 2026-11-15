#version 300 es
precision highp float;

uniform sampler2D u_trail;
uniform sampler2D u_points;

out vec4 outColor;

float blur(sampler2D tex, ivec2 center) {
    return (
        texelFetch(tex, center + ivec2(-1, -1), 0).r * 0.0625 +
        texelFetch(tex, center + ivec2(-1,  0), 0).r * 0.125 +
        texelFetch(tex, center + ivec2(-1,  1), 0).r * 0.0625 +
        texelFetch(tex, center + ivec2( 0, -1), 0).r * 0.125 +
        texelFetch(tex, center + ivec2( 0,  0), 0).r * 0.25 +
        texelFetch(tex, center + ivec2( 0,  1), 0).r * 0.125 +
        texelFetch(tex, center + ivec2( 1, -1), 0).r * 0.0625 +
        texelFetch(tex, center + ivec2( 1,  0), 0).r * 0.125 +
        texelFetch(tex, center + ivec2( 1,  1), 0).r * 0.0625
    );
}

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);

    float avg = (
        texelFetch(u_points, p * 2 + ivec2(0, 0), 0).r +
        texelFetch(u_points, p * 2 + ivec2(1, 0), 0).r +
        texelFetch(u_points, p * 2 + ivec2(0, 1), 0).r +
        texelFetch(u_points, p * 2 + ivec2(1, 1), 0).r
    ) / 4.0;

    float old = texelFetch(u_trail, p, 0).r * 0.975;

    outColor = vec4(old + avg);
}
