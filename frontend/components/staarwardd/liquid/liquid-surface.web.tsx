import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';
import { GLSL } from './shader';
import type { LiquidSurfaceProps } from './types';

const VERTEX = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}';
export default function LiquidSurface({ source, width, height, crop = [0, 0, 1, 1], mode = 'bubble', moving, onReady, onUnavailable }: LiquidSurfaceProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [x, y, w, h] = crop;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width < 1 || height < 1) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) { onUnavailable?.(); return; }
    let disposed = false, frame = 0, announced = false;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram(), buffer = gl.createBuffer(), texture = gl.createTexture();
    const fail = () => { if (!disposed) onUnavailable?.(); };
    const compile = (type: number, code: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      shaders.push(shader); gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
      return shader;
    };
    const photo = new window.Image();
    try {
      if (!program || !buffer || !texture) throw new Error('Renderer allocation failed');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, GLSL)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed');
      gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      // Match logical dimensions on native; cap DPR for nine simultaneous portal materials.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr); gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
      gl.uniform4f(gl.getUniformLocation(program, 'crop'), x, y, w, h);
      gl.uniform1f(gl.getUniformLocation(program, 'mode'), mode === 'background' ? 0 : mode === 'world' ? 2 : 1);
      gl.uniform1i(gl.getUniformLocation(program, 'image'), 0);
      const time = gl.getUniformLocation(program, 'time');
      let start = 0;
      const draw = (now: number) => {
        if (disposed) return;
        if (!start) start = now;
        gl.uniform1f(time, moving ? ((now-start)%24000)/24000*Math.PI*2 : 0);
        gl.drawArrays(gl.TRIANGLES,0,6);
        if (!announced) { announced = true; onReady?.(); }
        if (moving) frame = requestAnimationFrame(draw);
      };
      photo.onload = () => {
        if (disposed) return;
        gl.bindTexture(gl.TEXTURE_2D,texture); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);
        gl.uniform2f(gl.getUniformLocation(program,'imageSize'),photo.naturalWidth,photo.naturalHeight); frame=requestAnimationFrame(draw);
      };
      photo.onerror=fail; photo.src=Asset.fromModule(source).uri;
    } catch { fail(); }
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); fail(); };
    canvas.addEventListener('webglcontextlost',lost);
    return () => {
      disposed=true; cancelAnimationFrame(frame); photo.onload=null; photo.onerror=null; canvas.removeEventListener('webglcontextlost',lost);
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); shaders.forEach(shader=>gl.deleteShader(shader)); gl.deleteProgram(program);
    };
  }, [source,width,height,x,y,w,h,mode,moving,onReady,onUnavailable]);
  return <canvas ref={ref} aria-hidden="true" data-testid={`liquid-material-${mode}`} style={{ width,height,display:'block',pointerEvents:'none' }} />;
}
