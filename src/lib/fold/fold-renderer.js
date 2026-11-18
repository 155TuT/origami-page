import {CraneClip} from './crane-data.js';
import {Paper} from './paper.js';

// The page and the travelling icon stay in the DOM. Only the lifted sheet uses WebGL.
export async function createPaperGPU(canvas) {
  const start=performance.now();
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:false,stencil:false,
    preserveDrawingBuffer:false,failIfMajorPerformanceCaveat:true,powerPreference:'default'});
  const contextMs=performance.now()-start;
  if (!gl || gl.isContextLost()) throw new Error('没有可用的 WebGL2 上下文');
  const shaders=[], buffers=[], textures=new Map();
  const program=gl.createProgram(), vao=gl.createVertexArray();
  function dispose() {
    for (const texture of textures.values()) gl.deleteTexture(texture);
    textures.clear();
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteVertexArray(vao); gl.useProgram(null); gl.deleteProgram(program);
    canvas.width=canvas.height=1;
  }
  function shader(type,source) {
    const s=gl.createShader(type);
    shaders.push(s); gl.shaderSource(s,source); gl.compileShader(s); gl.attachShader(program,s);
  }
  function buffer(target,data,usage) {
    const b=gl.createBuffer();
    buffers.push(b); gl.bindBuffer(target,b); gl.bufferData(target,data,usage);
    return b;
  }
  try {
    shader(gl.VERTEX_SHADER,`#version 300 es
      layout(location=0) in vec3 position;
      layout(location=1) in vec2 uv;
      uniform vec4 stage;
      out highp vec2 paperUV;
      out highp vec3 surfacePoint;
      void main() {
        vec2 xy=(position.xy-stage.xy)/stage.zw;
        gl_Position=vec4(2.0*xy.x-1.0,1.0-2.0*xy.y,0.0,1.0);
        paperUV=uv; surfacePoint=position;
      }`);
    shader(gl.FRAGMENT_SHADER,`#version 300 es
      precision highp float;
      in vec2 paperUV;
      in vec3 surfacePoint;
      uniform vec3 paper, shadow;
      uniform sampler2D stock;
      uniform vec2 spacing;
      uniform float grid, relief, ruling;
      out vec4 color;
      void main() {
        // Screen Y points down in the shared mesh and up in the framebuffer.
        vec3 n=normalize(cross(dFdy(surfacePoint),dFdx(surfacePoint)));
        float light=clamp(0.52+0.55*dot(n,vec3(-0.45,-0.78,0.43))+(gl_FrontFacing?0.025:-0.07),0.0,1.0);
        vec3 base=mix(paper,shadow,round((1.0-light)*0.93*relief*120.0)/120.0);
        vec2 rate=sqrt(dFdx(paperUV)*dFdx(paperUV)+dFdy(paperUV)*dFdy(paperUV));
        vec2 pitch=spacing/max(rate,vec2(0.0000001));
        float fade=ruling*(gl_FrontFacing?1.0:0.45)*smoothstep(0.8,2.3,mix(pitch.y,min(pitch.x,pitch.y),grid));
        vec4 ink=texture(stock,paperUV);
        color=vec4(base*(1.0-ink.a*fade)+ink.rgb*fade,1.0);
      }`);
    gl.linkProgram(program);
    const parallel=gl.getExtension('KHR_parallel_shader_compile');
    const deadline=performance.now()+5000;
    while (parallel && !gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)) {
      if (gl.isContextLost() || performance.now()>deadline) throw new Error('着色器准备超时');
      await new Promise(resolve=>setTimeout(resolve,32));
    }
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('着色器链接失败');
    gl.useProgram(program); gl.bindVertexArray(vao);
    const positions=new Float32Array(CraneClip.vertexCount*3);
    const posBuffer=buffer(gl.ARRAY_BUFFER,positions.byteLength,gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    buffer(gl.ARRAY_BUFFER,new Float32Array(Paper.uv.flat()),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0);
    const indices=new Uint16Array(CraneClip.triangles.length*3);
    const indexBuffer=buffer(gl.ELEMENT_ARRAY_BUFFER,indices.byteLength,gl.DYNAMIC_DRAW);
    const u=Object.fromEntries(['stage','paper','shadow','stock','spacing','grid','relief','ruling']
      .map(name=>[name,gl.getUniformLocation(program,name)]));
    gl.uniform1i(u.stock,0); gl.frontFace(gl.CW);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    if (gl.getError()!==gl.NO_ERROR) throw new Error('GPU 缓冲区初始化失败');
    function release(surface) {
      const texture=textures.get(surface);
      if (texture) { gl.deleteTexture(texture); textures.delete(surface); }
    }
    function bindStock(surface) {
      if (textures.has(surface)) { gl.bindTexture(gl.TEXTURE_2D,textures.get(surface)); return; }
      if (Math.max(surface.stock.width,surface.stock.height)>maxTexture) throw new Error('纸纹超过纹理尺寸上限');
      const texture=gl.createTexture();
      if (!texture) throw new Error('GPU 纹理分配失败');
      textures.set(surface,texture);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface.stock);
      if (gl.getError()!==gl.NO_ERROR) throw new Error('纸纹上传失败');
    }
    function draw(shape,state,surface,stage) {
      if (gl.isContextLost()) throw new Error('WebGL2 上下文丢失');
      if (canvas.width>maxViewport[0] || canvas.height>maxViewport[1] ||
          gl.drawingBufferWidth!==canvas.width || gl.drawingBufferHeight!==canvas.height) throw new Error('GPU 画布尺寸不可用');
      bindStock(surface);
      shape.points.forEach((point,i)=>positions.set(point,3*i));
      Paper.orderedFaces(shape.points).forEach((face,i)=>indices.set(face.ids,3*i));
      gl.bindBuffer(gl.ARRAY_BUFFER,posBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer); gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER,0,indices);
      gl.viewport(0,0,canvas.width,canvas.height);
      const colors=surface.material.palette(state.fold);
      gl.uniform3fv(u.paper,colors.paper); gl.uniform3fv(u.shadow,colors.shadow);
      gl.uniform4f(u.stage,stage.l,stage.t,stage.r-stage.l,stage.b-stage.t);
      gl.uniform2f(u.spacing,surface.stepX/surface.stock.width,surface.stepY/surface.stock.height);
      gl.uniform1f(u.grid,Number(surface.grid)); gl.uniform1f(u.relief,Paper.ease(state.fold/.48));
      gl.uniform1f(u.ruling,state.ruling);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }
    return {draw,release,dispose,contextMs};
  } catch (error) { dispose(); throw error; }
}
