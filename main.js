const cnv = document.body.appendChild(document.createElement("canvas"));
const gl = cnv.getContext("webgl2", {
  alpha: false,
  depth: false,
  antialias: false,
  desynchronized: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
});
const cbf = gl.getExtension("EXT_color_buffer_float");

const particlesSide = 512;

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

let particlesFront = gl.createTexture();
let particlesBack = gl.createTexture();
{
  const data = new Float32Array(particlesSide * particlesSide * 4);
  //let angle, mag;
  //for (let i = 0; i < data.length / 4; i++) {
  //  angle = Math.random() * Math.PI * 2;
  //  mag = Math.random() ** 0.5 * 0.5;
  //  data[i * 4 + 0] = Math.cos(angle) * mag;
  //  data[i * 4 + 1] = Math.sin(angle) * mag;

  //  angle = Math.random() * Math.PI * 2;
  //  mag = Math.random() ** 0.5 * 0.00001;
  //  data[i * 4 + 2] = Math.cos(angle) * mag;
  //  data[i * 4 + 3] = Math.sin(angle) * mag;
  //}
  for (const particles of [particlesFront, particlesBack]) {
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

const [pointsVert, pointsFrag, rectVert, stepFrag, postFrag] = await Promise.all(["/points.vert", "/points.frag", "/rect.vert", "/step.frag", "/post.frag"].map(s => fetch(s).then(r => r.text())));
const points = createProgram(gl, compileShader(gl, pointsVert, gl.VERTEX_SHADER), compileShader(gl, pointsFrag, gl.FRAGMENT_SHADER));
const step = createProgram(gl, compileShader(gl, rectVert, gl.VERTEX_SHADER), compileShader(gl, stepFrag, gl.FRAGMENT_SHADER));
const post = createProgram(gl, compileShader(gl, rectVert, gl.VERTEX_SHADER), compileShader(gl, postFrag, gl.FRAGMENT_SHADER));

const resLoc = gl.getUniformLocation(points, "u_resolution");
const timeLoc = gl.getUniformLocation(step, "u_time");
const seedLoc = gl.getUniformLocation(step, "u_seed");
const oldLoc = gl.getUniformLocation(post, "u_old");
const postLoc = gl.getUniformLocation(post, "u_post");

const stepBuffer = gl.createFramebuffer();
const postBuffer = gl.createFramebuffer();
const attachmentPoint = gl.COLOR_ATTACHMENT0;

const postTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, postTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cnv.width * 2, cnv.height * 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const oldTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, oldTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cnv.width, cnv.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

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

function draw() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, stepBuffer);
  gl.viewport(0, 0, particlesSide, particlesSide);
  gl.useProgram(step);
  gl.bindTexture(gl.TEXTURE_2D, particlesFront);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, particlesBack, 0);
  gl.uniform1f(timeLoc, performance.now() / 100000);
  gl.uniform3fv(seedLoc, seed);
  gl.disable(gl.BLEND);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  [particlesFront, particlesBack] = [particlesBack, particlesFront];
  if (resizeCanvasToDisplaySize(cnv)) {
    gl.bindTexture(gl.TEXTURE_2D, postTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cnv.width * 2, cnv.height * 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, postBuffer);
  gl.viewport(0, 0, cnv.width * 2, cnv.height * 2);
  gl.useProgram(points);
  gl.bindTexture(gl.TEXTURE_2D, particlesFront);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, postTexture, 0);
  gl.uniform2f(resLoc, cnv.width, cnv.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.POINTS, 0, particlesSide * particlesSide);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, cnv.width, cnv.height);
  gl.useProgram(post);
  gl.uniform1i(postLoc, 0);
  gl.uniform1i(oldLoc, 1);
  gl.bindTexture(gl.TEXTURE_2D, postTexture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, oldTexture);
  gl.activeTexture(gl.TEXTURE0);
  //gl.clearColor(0, 0, 0, 1);
  //gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.bindTexture(gl.TEXTURE_2D, oldTexture);
  gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGB, 0, 0, cnv.width, cnv.height, 0);

  requestAnimationFrame(draw);
}

reseed();
draw();
