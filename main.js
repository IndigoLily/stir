const cnv = document.body.appendChild(document.createElement("canvas"));
const gl = cnv.getContext("webgl2");
const cbf = gl.getExtension("EXT_color_buffer_float");

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
for (const particles of [particlesFront, particlesBack]) {
  gl.bindTexture(gl.TEXTURE_2D, particles);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA32F,
    256,
    256,
    0,
    gl.RGBA,
    gl.FLOAT,
    new Float32Array(
      Array(256 * 256)
        .keys()
        .flatMap(() => [
          (Math.random() * 2 - 1) * 0.01,
          (Math.random() * 2 - 1) * 0.01,
          0,
          0,
        ])
    ),
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

const pointsVert = compileShader(gl, await fetch("/points.vert").then(r => r.text()), gl.VERTEX_SHADER);
const pointsFrag = compileShader(gl, await fetch("/points.frag").then(r => r.text()), gl.FRAGMENT_SHADER);
const points = createProgram(gl, pointsVert, pointsFrag);
const resLoc = gl.getUniformLocation(points, "u_resolution");

const stepVert = compileShader(gl, await fetch("/step.vert").then(r => r.text()), gl.VERTEX_SHADER);
const stepFrag = compileShader(gl, await fetch("/step.frag").then(r => r.text()), gl.FRAGMENT_SHADER);
const step = createProgram(gl, stepVert, stepFrag);
const timeLoc = gl.getUniformLocation(step, "u_time");

const fb = gl.createFramebuffer();
const attachmentPoint = gl.COLOR_ATTACHMENT0;

function draw() {
  resizeCanvasToDisplaySize(cnv);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, cnv.width, cnv.height);
  gl.useProgram(points);
  gl.uniform2f(resLoc, cnv.width, cnv.height);
  gl.drawArrays(gl.POINTS, 0, 256 * 256);

  [particlesFront, particlesBack] = [particlesBack, particlesFront];

  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, 256, 256);
  gl.useProgram(step);
  gl.bindTexture(gl.TEXTURE_2D, particlesFront);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, particlesBack, 0);
  gl.uniform1f(timeLoc, Math.log1p(performance.now() / 1000));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();
