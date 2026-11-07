"use strict";
const cnv = document.body.appendChild(document.createElement("canvas"));
const gl = cnv.getContext("webgl2", {
  alpha: false,
  depth: false,
  antialias: false,
  desynchronized: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: false,
});
const cbf = gl.getExtension("EXT_color_buffer_float");
const fbl = gl.getExtension("EXT_float_blend");

let particlesSide = 512;

function resizeCanvasToDisplaySize(cnv) {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth = cnv.clientWidth;
  const displayHeight = cnv.clientHeight;

  // Check if the canvas is not the same size.
  const needResize = cnv.width !== displayWidth || cnv.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    cnv.width = displayWidth;
    cnv.height = displayHeight;
  }

  return needResize;
}

function compileShader(gl, shaderSource, shaderType) {
  const shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    throw ("could not compile shader:" + gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    // something went wrong with the link; get the error
    throw ("program failed to link:" + gl.getProgramInfoLog(program));
  }
  return program;
}

const [pointsVert, pointsFrag, rectVert, stepFrag, trailFrag, finalFrag] = await Promise.all(["/points.vert", "/points.frag", "/rect.vert", "/step.frag", "/trail.frag", "/final.frag"].map(s => fetch(s).then(r => r.text())));

// calculate the next position and velocity of the particles
const step = createProgram(gl, compileShader(gl, rectVert, gl.VERTEX_SHADER), compileShader(gl, stepFrag, gl.FRAGMENT_SHADER));
const u_time = gl.getUniformLocation(step, "u_time");
const u_seed = gl.getUniformLocation(step, "u_seed");
const stepFB = gl.createFramebuffer();

let particles1 = gl.createTexture();
let particles2 = gl.createTexture();
{
  const data = new Float32Array(particlesSide * particlesSide * 4);
  let angle, mag;
  for (let i = 0; i < data.length / 4; i++) {
    //angle = Math.random() * Math.PI * 2;
    //mag = Math.random() ** 0.5 * 0.5;
    //data[i * 4 + 0] = Math.cos(angle) * mag;
    //data[i * 4 + 1] = Math.sin(angle) * mag;

    angle = Math.random() * Math.PI * 2;
    mag = Math.random() ** 0.5 * 0.00001;
    data[i * 4 + 2] = Math.cos(angle) * mag;
    data[i * 4 + 3] = Math.sin(angle) * mag;
  }
  for (const particles of [particles1, particles2]) {
    gl.bindTexture(gl.TEXTURE_2D, particles);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      particlesSide,
      particlesSide,
      0,
      gl.RGBA,
      gl.FLOAT,
      data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}

// draws the current state of the points
const points = createProgram(gl, compileShader(gl, pointsVert, gl.VERTEX_SHADER), compileShader(gl, pointsFrag, gl.FRAGMENT_SHADER));
const resLoc = gl.getUniformLocation(points, "u_resolution");
const pointsFB = gl.createFramebuffer();
const pointsTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, pointsTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cnv.width * 2, cnv.height * 2, 0, gl.RED, gl.FLOAT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// adds the current points to the trail
const trail = createProgram(gl, compileShader(gl, rectVert, gl.VERTEX_SHADER), compileShader(gl, trailFrag, gl.FRAGMENT_SHADER));
const u_trail = gl.getUniformLocation(trail, "u_trail");
const u_points = gl.getUniformLocation(trail, "u_points");
const trailFB = gl.createFramebuffer();
let [trailTexture1, trailTexture2] = [gl.createTexture(), gl.createTexture()].map(t => {
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cnv.width, cnv.height, 0, gl.RED, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
});

// renders new trail to canvas with tone mapping
const final = createProgram(gl, compileShader(gl, rectVert, gl.VERTEX_SHADER), compileShader(gl, finalFrag, gl.FRAGMENT_SHADER));

let seed;
function reseed() {
  seed = new Float32Array([
    Math.random() * 2000 - 1000,
    Math.random() * 2000 - 1000,
    Math.random() * 2000 - 1000,
  ]);
}
window.addEventListener("keydown", ({ code }) => {
  if (code === "KeyR") {
    reseed();
  }
});

gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

function draw() {
  gl.useProgram(step);
  gl.bindFramebuffer(gl.FRAMEBUFFER, stepFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particles2, 0);
  gl.disable(gl.BLEND);
  gl.viewport(0, 0, particlesSide, particlesSide);
  gl.bindTexture(gl.TEXTURE_2D, particles1);
  gl.uniform1f(u_time, performance.now() / 100000);
  gl.uniform3fv(u_seed, seed);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  [particles1, particles2] = [particles2, particles1];
  if (resizeCanvasToDisplaySize(cnv)) {
    gl.bindTexture(gl.TEXTURE_2D, pointsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cnv.width * 2, cnv.height * 2, 0, gl.RED, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cnv.width, cnv.height, 0, gl.RED, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cnv.width, cnv.height, 0, gl.RED, gl.FLOAT, null);
  }

  gl.enable(gl.BLEND);
  gl.useProgram(points);
  gl.bindFramebuffer(gl.FRAMEBUFFER, pointsFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pointsTexture, 0);
  gl.viewport(0, 0, cnv.width * 2, cnv.height * 2);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindTexture(gl.TEXTURE_2D, particles1);
  gl.uniform2f(resLoc, cnv.width, cnv.height);
  gl.drawArrays(gl.POINTS, 0, particlesSide * particlesSide);
  gl.disable(gl.BLEND);

  gl.useProgram(trail);
  gl.bindFramebuffer(gl.FRAMEBUFFER, trailFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, trailTexture1, 0);
  gl.viewport(0, 0, cnv.width, cnv.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, pointsTexture);
  gl.uniform1i(u_points, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, trailTexture2);
  gl.uniform1i(u_trail, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.useProgram(final);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, cnv.width, cnv.height);
  gl.bindTexture(gl.TEXTURE_2D, trailTexture1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  [trailTexture1, trailTexture2] = [trailTexture2, trailTexture1];

  requestAnimationFrame(draw);
}

reseed();
draw();
