#version 300 es
precision highp float;

out vec2 coord;
 
void main() {
    coord = vec2(float(gl_VertexID % 2), float(gl_VertexID / 2));
    gl_Position = vec4(coord * 2.0 - 1.0, 0, 1);
}
