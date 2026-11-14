import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getHubLayout } from '../lib/staarwardd/hub-layout.ts';
import { createArrivalSession } from '../lib/staarwardd/arrival-session.ts';
import { SKSL } from '../components/staarwardd/liquid/shader.ts';
const require=createRequire(import.meta.url);

for (const [width,height] of [[320,300],[360,350],[390,530],[430,620],[844,180],[1024,490],[1440,650]]) {
  test(`all nine touch targets fit without overlap at ${width}x${height}`, () => {
    const { portals }=getHubLayout(width,height);
    assert.equal(portals.length,9);
    for (const [i,a] of portals.entries()) {
      assert.ok(a.width>=44 && a.height>=44,'minimum 44pt target');
      assert.ok(a.left>=0 && a.top>=0 && a.left+a.width<=width && a.top+a.height<=height,'target inside viewport');
      for (const b of portals.slice(i+1)) assert.ok(!(a.left<b.left+b.width && a.left+a.width>b.left && a.top<b.top+b.height && a.top+a.height>b.top),'independent portal targets must not overlap');
    }
  });
}

test('native material compiles and renders transparent, moving refractive glass', async () => {
  const init=require('canvaskit-wasm');
  const ck=await init({ locateFile: file => require.resolve('canvaskit-wasm/bin/'+file) });
  let compilationError='';
  const effect=ck.RuntimeEffect.Make(SKSL, error=>{compilationError=error;});
  assert.ok(effect,compilationError);
  const image=ck.MakeImageFromEncoded(readFileSync(new URL('../assets/images/staarwardd/locked/homepage.png',import.meta.url)));
  assert.ok(image);
  const child=image.makeShaderOptions(ck.TileMode.Clamp,ck.TileMode.Clamp,ck.FilterMode.Linear,ck.MipmapMode.None,ck.Matrix.scaled(1/image.width(),1/image.height()));
  const surface=ck.MakeSurface(128,128);
  assert.ok(surface);
  function render(time,mode=1) {
    const shader=effect.makeShaderWithChildren([128,128,image.width(),image.height(),0,0,1,1,time,mode],[child]);
    const paint=new ck.Paint();paint.setShader(shader);
    surface.getCanvas().clear(ck.TRANSPARENT);surface.getCanvas().drawPaint(paint);surface.flush();
    const snapshot=surface.makeImageSnapshot();
    const bytes=snapshot.readPixels(0,0,{width:128,height:128,colorType:ck.ColorType.RGBA_8888,alphaType:ck.AlphaType.Unpremul,colorSpace:ck.ColorSpace.SRGB});
    const result=Uint8Array.from(bytes);snapshot.delete();paint.delete();shader.delete();return result;
  }
  const a=render(0),b=render(1.5),center=(64*128+64)*4;
  assert.equal(a[3],0,'corners transparent, not a rectangular card');
  assert.equal(a[center+3],255,'portal interior opaque');
  assert.ok(a[center]+a[center+1]+a[center+2]>10,'image sampled, not black');
  assert.notDeepEqual(a,b,'time changes the actual material pixels');
  const bg=render(0,0),world=render(0,2);
  assert.equal(bg[3],255);assert.equal(world[3],255);
  surface.delete();child.delete();image.delete();effect.delete();
});


test('arrival is unprompted once per account/session, independent of Hub route remounts', () => {
  const session=createArrivalSession();
  assert.equal(session.claim(null),false,'no greeting before authentication');
  let requests=0;
  const enterHub=()=>{if(session.claim('account-a'))requests++;};
  enterHub(); // Authenticated homepage entry: no click or microphone event.
  assert.equal(requests,1);
  enterHub(); // Return from a portal or alternate /hub route.
  assert.equal(requests,1,'returning must not repeat the login greeting');
  assert.equal(session.claim('account-b'),true,'another authenticated account gets its own greeting');
  assert.equal(createArrivalSession().claim('account-a'),true,'a new app session greets again');
});
