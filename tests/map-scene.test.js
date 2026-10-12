import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneLayers,configureBuildings,WATER_HEIGHT} from '../src/map-scene.js';
const defaults={depthVisible:true,boundaryVisible:true,opacity:.8};
test('2D has only a flat raster and boundary; hiding water leaves boundary',()=>{
 assert.deepEqual(sceneLayers({...defaults,is3d:false}).map(l=>l.type),['raster','line']);
 assert.deepEqual(sceneLayers({...defaults,is3d:false,depthVisible:false}).map(l=>l.type),['line']);
});
test('3D converts source centimetres to metres without exaggeration',()=>{
 const water=sceneLayers({...defaults,is3d:true})[0];
 assert.equal(water.paint['fill-extrusion-base'],0);
 const evaluate=(x,depth)=>!Array.isArray(x)?x:x[0]==='get'?depth:x[0]==='max'?Math.max(...x.slice(1).map(v=>evaluate(v,depth))):evaluate(x[1],depth)/evaluate(x[2],depth);
 for(const [cm,m] of [[0,0],[20,.2],[100,1],[169.81,1.6981]])assert.equal(evaluate(WATER_HEIGHT,cm),m);
});
test('base buildings are opaque and unexaggerated, 2D hides all base extrusions',()=>{
 const paint=[],layout=[];
 const renderer={getStyle:()=>({layers:[{id:'building',type:'fill-extrusion','source-layer':'building'},{id:'flood-water',type:'fill-extrusion'}]}),setPaintProperty:(...args)=>paint.push(args),setLayoutProperty:(...args)=>layout.push(args)};
 configureBuildings(renderer,true);
 assert.ok(paint.some(([id,key,v])=>id==='building'&&key==='fill-extrusion-opacity'&&v===1));
 assert.ok(!JSON.stringify(paint).includes('interpolate'));
 assert.ok(!paint.some(([id])=>id==='flood-water'));
 configureBuildings(renderer,false);
 assert.deepEqual(layout.at(-1),['building','visibility','none']);
});
