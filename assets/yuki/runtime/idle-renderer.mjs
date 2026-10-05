import {deformIdlePoint} from './idle-deform.mjs?idle=19';
// One continuous textured mesh, not separate cut-out limbs. The original PNG
// pixels/alpha are sampled directly; the original <img> is the safe fallback.
export class IdleRenderer {
 constructor(canvas){
  this.canvas=canvas;this.failed=false;this.textures=new Map();
  const gl=this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false});
  if(!gl){this.failed=true;return;}
  canvas.addEventListener('webglcontextlost',()=>{this.failed=true;canvas.hidden=true;});
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 aPosition;attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(aPosition.x/350.0-1.0,1.0-aPosition.y/350.0,0.0,1.0);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 vUV;uniform sampler2D uImage;void main(){gl_FragColor=texture2D(uImage,vUV);}'));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'uImage'),0);
  this.points=[];const uv=[],indices=[],cols=36,rows=40;
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){this.points.push([col/cols*700,row/rows*700]);uv.push(col/cols,row/rows);}
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;indices.push(a,b,c,b,d,c);}
  this.positions=new Float32Array(this.points.length*2);this.count=indices.length;
  this.positionBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.positions.byteLength,gl.DYNAMIC_DRAW);
  const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const uvBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
  const tex=gl.getAttribLocation(program,'aUV');gl.enableVertexAttribArray(tex);gl.vertexAttribPointer(tex,2,gl.FLOAT,false,0,0);
  const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.clearColor(0,0,0,0);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 }
 draw(image,pose,size){
  if(this.failed)return false;const gl=this.gl;
  const n=Math.max(1,Math.round(size*Math.min(devicePixelRatio||1,2)));
  if(this.canvas.width!==n||this.canvas.height!==n){this.canvas.width=n;this.canvas.height=n;gl.viewport(0,0,n,n);}
  let texture=this.textures.get(image);
  if(!texture){texture=gl.createTexture();this.textures.set(image,texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
  else gl.bindTexture(gl.TEXTURE_2D,texture);
  for(let i=0;i<this.points.length;i++){const [x,y]=deformIdlePoint(...this.points[i],pose);this.positions[i*2]=x;this.positions[i*2+1]=y;}
  gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.positions);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
  return true;
 }
}
