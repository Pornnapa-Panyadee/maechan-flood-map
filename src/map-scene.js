// MapLibre extrusion heights are metres above the common map ground plane.
// The source flood raster is centimetres, never an absolute elevation/DEM.
export const WATER_HEIGHT = ['/', ['max', 0, ['get', 'depth']], 100];
export const DEPTH_COLORS = ['interpolate',['linear'],['get','depth'],0,'#bae6fd',30,'#38bdf8',60,'#0ea5e9',100,'#2563eb',150,'#6d28d9',250,'#4c1d95'];
export function sceneLayers({is3d,depthVisible,boundaryVisible,opacity}) {
 const result=[];
 if(depthVisible) result.push(is3d
  ? {id:'flood-water',type:'fill-extrusion',source:'flood-cells',paint:{'fill-extrusion-color':DEPTH_COLORS,'fill-extrusion-height':WATER_HEIGHT,'fill-extrusion-base':0,'fill-extrusion-opacity':opacity,'fill-extrusion-vertical-gradient':false}}
  : {id:'flood-image',type:'raster',source:'flood-image-source',paint:{'raster-opacity':opacity,'raster-fade-duration':0}});
 if(boundaryVisible) result.push({id:'flood-boundary',type:'line',source:'flood-boundary-source',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#e58224','line-width':4.5}});
 return result;
}
export function configureBuildings(renderer,is3d) {
 for(const layer of renderer.getStyle().layers) {
  if(layer.type!=='fill-extrusion'||layer.id==='flood-water') continue;
  renderer.setLayoutProperty(layer.id,'visibility',is3d?'visible':'none');
  if(is3d && layer['source-layer']==='building') {
   // Preserve provider heights in metres without zoom-dependent flattening.
   // Longdo uses 10 m where the building height is absent; disclose this in UI.
   renderer.setPaintProperty(layer.id,'fill-extrusion-height',['max',0,['coalesce',['get','height'],10]]);
   renderer.setPaintProperty(layer.id,'fill-extrusion-base',['max',0,['coalesce',['get','min_height'],0]]);
   renderer.setPaintProperty(layer.id,'fill-extrusion-opacity',1);
   renderer.setPaintProperty(layer.id,'fill-extrusion-color','#c5c9c8');
  }
 }
}
export const SCENE_LAYER_IDS=['flood-water','flood-image','flood-boundary'];
