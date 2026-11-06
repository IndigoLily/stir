#version 300 es
precision highp float;
 
// we need to declare an output for the fragment shader
out vec4 outColor;
 
void main() {
    // max alpha
    float m = 0.1;

    // scales gaussian so all representable values fit inside point
    float a = 4.0 * log(1.0 / 256.0 / m);

    outColor = vec4(1, 1, 1, m * exp(a * pow(length(gl_PointCoord - vec2(0.5, 0.5)), 2.0)));
}
