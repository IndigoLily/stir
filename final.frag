#version 300 es
precision highp float;

uniform sampler2D u_trail;

out vec4 outColor;

void main() {
    float l = texelFetch(u_trail, ivec2(gl_FragCoord.xy), 0).r;
    l = 1.0 - pow(0.67, pow(l, 0.67));
    outColor = vec4(l);
}
