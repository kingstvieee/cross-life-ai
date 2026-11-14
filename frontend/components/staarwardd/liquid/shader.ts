// Shared material: compiled as SkSL on native and GLSL on web.
// time is a periodic phase (0..2π), not wall time; reduced motion fixes it at zero.
const BODY = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 sceneUV(vec2 uv) {
  float a = imageSize.x * crop.z / (imageSize.y * crop.w);
  float b = resolution.x / resolution.y;
  vec2 fit = vec2(min(1.0, b/a), min(1.0, a/b));
  return crop.xy + (clamp((uv-.5)*fit+.5, 0.0, 1.0)) * crop.zw;
}
vec4 material(vec2 p) {
  vec2 uv = p / resolution;
  if (mode < .5) {
    vec2 wave = vec2(sin(uv.y*18.0+time), cos(uv.x*16.0-time)) * .002;
    vec4 base = readImage(sceneUV(uv+wave));
    vec2 cell = floor((uv+vec2(time*.001, 0.0))*resolution/8.0);
    float spark = step(.996, hash(cell)) * pow(max(0.0, sin(time*2.0+hash(cell)*6.283)), 8.0);
    return vec4(base.rgb * .86 + spark * .35, 1.0);
  }
  if (mode > 1.5) {
    // Gentle optical surface movement; architectural elements remain recognizable.
    vec2 wave = vec2(sin(uv.y*11.0+time), cos(uv.x*13.0-time)) * .0015;
    return readImage(sceneUV(uv+wave));
  }
  vec2 q = (uv-.5)*2.12;
  float angle = atan(q.y, q.x);
  float wobble = 1.0 + .018*sin(angle*3.0+time) + .009*cos(angle*5.0-time*2.0);
  vec2 n = q / wobble;
  float r2 = dot(n,n);
  float radius = sqrt(r2);
  float aa = 3.0 / min(resolution.x, resolution.y);
  float alpha = 1.0-smoothstep(1.0-aa,1.0,radius);
  if (alpha < .001) return vec4(0.0);
  float z = sqrt(max(.001,1.0-r2));
  // Sphere normal bends texture coordinates. Chromatic separation is strongest at the rim.
  vec2 bend = n * (.13*(1.0-z));
  vec2 ripple = vec2(sin(n.y*9.0+time*2.0),cos(n.x*8.0-time))*.006*(1.0-z);
  vec2 lensUV = .5+n*.43-bend+ripple;
  vec2 fringe = n*.003*pow(radius,3.0);
  vec3 glass = vec3(readImage(sceneUV(lensUV+fringe)).r, readImage(sceneUV(lensUV)).g, readImage(sceneUV(lensUV-fringe)).b);
  vec3 normal = normalize(vec3(n,z));
  vec3 light = normalize(vec3(-.5+.20*sin(time),-.7,1.3));
  float highlight = pow(max(0.0,dot(normal,light)),30.0);
  float fresnel = pow(1.0-z,3.0);
  float edge = smoothstep(.89,.985,radius);
  float silver = .56 + .44*sin(angle*3.0-time);
  vec3 color = glass*(.86+.14*z) + vec3(.87,.92,1.0)*(highlight*.75+fresnel*.32+edge*silver*.65);
  return vec4(color*alpha,alpha);
}
`;

export const SKSL = `uniform shader image;
uniform float2 resolution;
uniform float2 imageSize;
uniform float4 crop;
uniform float time;
uniform float mode;
half4 readImage(float2 p) { return image.eval(p); }
${BODY.replaceAll('vec2', 'float2').replaceAll('vec3', 'float3').replaceAll('vec4', 'float4')}
half4 main(float2 p) { return material(p); }`;

export const GLSL = `precision highp float;
uniform sampler2D image;
uniform vec2 resolution;
uniform vec2 imageSize;
uniform vec4 crop;
uniform float time;
uniform float mode;
vec4 readImage(vec2 p) { return texture2D(image,p); }
${BODY}
void main() { gl_FragColor = material(vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y)); }`;
