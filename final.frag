#version 300 es
precision highp float;

uniform sampler2D u_trail;

out vec4 outColor;

void main() {
    float l = texelFetch(u_trail, ivec2(gl_FragCoord.xy), 0).r;
    l = pow(tanh(pow(l, 0.5) * 0.75), 1.5);
    outColor = vec4(l, l, l, 1);
}
