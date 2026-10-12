import './style.css';
import {sceneLayers,configureBuildings,SCENE_LAYER_IDS} from './map-scene.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let map,meta,houses,boundary,cells,ready=false,is3d=true,markers=[],switching=false;
const status=(message,error=false)=>{ $('status').textContent=message;$('status').className=error?'error':'';};
const number=v=>v===null||v===undefined?'ไม่มีข้อมูล':Number(v).toLocaleString('th-TH',{maximumFractionDigits:1});
function renderLayers(){
 if(!ready||switching)return;
 const r=map.Renderer;
 // Own sources/layers directly: Longdo Layers.remove is asynchronous and can
 // otherwise remove the replacement layer after a rapid toggle or style switch.
 for(const id of SCENE_LAYER_IDS) if(r.getLayer(id))r.removeLayer(id);
 if(!r.getSource('flood-cells'))r.addSource('flood-cells',{type:'geojson',data:cells});
 if(!r.getSource('flood-image-source'))r.addSource('flood-image-source',{type:'image',url:new URL('/data/depth.png',location.origin).href,coordinates:meta.imageCoordinates});
 if(!r.getSource('flood-boundary-source'))r.addSource('flood-boundary-source',{type:'geojson',data:boundary});
 configureBuildings(r,is3d);
 const before=r.getStyle().layers.find(l=>l.type==='symbol')?.id;
 for(const layer of sceneLayers({is3d,depthVisible:$('depth-toggle').checked,boundaryVisible:$('boundary-toggle').checked,opacity:Number($('opacity').value)/100}))r.addLayer(layer,before);
}
function sceneReady(){
 try{switching=false;renderLayers();$('status').className='loaded';}
 catch(e){status(`แสดงชั้นข้อมูลไม่สำเร็จ: ${e.message}`,true);console.error(e);}
}
function renderHouses(){
 if(!ready)return;
 markers.forEach(({marker})=>map.Overlays.remove(marker));markers=[];
 if(!$('house-toggle').checked)return;
 for(const f of houses.features){
  const [lon,lat]=f.geometry.coordinates,p=f.properties;
  const marker=new longdo.Marker({lon,lat},{icon:{html:'<svg class="house-marker" viewBox="0 0 28 30" width="18" height="20" aria-hidden="true"><path d="M3 13 14 3l11 10v14H3Z" fill="#fff" stroke="#216e59" stroke-width="2" stroke-linejoin="round"/><path d="m1 14 13-12 13 12" fill="none" stroke="#216e59" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 27V17h6v10" fill="#216e59"/><path d="M6 15h3v4H6Zm13 0h3v4h-3Z" fill="#71b9a0"/></svg>',size:{width:18,height:20},offset:{x:0,y:0}},anchor:'bottom',title:`จุดสำรวจ ${escape(p.id)}`,detail:`<div class="popup-text">หมู่ ${escape(p.village)}<br>ภายนอกบ้าน ${number(p.outside)} ซม.<br>ภายในบ้าน ${number(p.inside)} ซม.</div>`});
  markers.push({marker,feature:f});map.Overlays.add(marker);
 }
}
function mode(value){
 if(switching||value===is3d)return;
 is3d=value;
 $('view3d').classList.toggle('active',value);$('view2d').classList.toggle('active',!value);
 $('view3d').setAttribute('aria-pressed',value);$('view2d').setAttribute('aria-pressed',!value);
 $('scale-note').hidden=!value;
 $('mode-badge').textContent=value?'3D · น้ำ 1:1 · พื้นอ้างอิงราบ':'2D · แผนที่ฐานปกติ';
 if(ready){
  switching=true;status('กำลังเปลี่ยนแผนที่ฐาน…');
  map.Renderer.setMaxPitch(value?85:0);
  map.goTo({pitch:value?60:0,bearing:value?-15:0});
  map.Layers.setBase(value?longdo.Layers.NORMAL:longdo.Layers.RASTER_POI);
 }
}
function home(){if(ready&&!switching)map.goTo({center:meta.center,zoom:is3d?17:15.6,pitch:is3d?60:0,bearing:is3d?-15:0});}
function setLayersOpen(open,restoreFocus=false){
 $('layers-panel').hidden=!open;
 $('layers-button').setAttribute('aria-expanded',String(open));
 if(restoreFocus)$('layers-button').focus();
}
$('layers-button').onclick=()=>setLayersOpen($('layers-panel').hidden);
$('close-layers').onclick=()=>setLayersOpen(false,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('layers-panel').hidden){setLayersOpen(false,true);}});
document.addEventListener('click',e=>{if(!$('layers-panel').contains(e.target)&&!$('layers-button').contains(e.target))setLayersOpen(false);});
$('legend-toggle').onclick=()=>{const open=$('depth-legend').hidden;$('depth-legend').hidden=!open;$('legend-toggle').setAttribute('aria-expanded',String(open));$('legend-toggle').textContent=open?'สีความลึก ▾':'สีความลึก ▸';};
$('depth-toggle').onchange=renderLayers;$('boundary-toggle').onchange=renderLayers;$('house-toggle').onchange=renderHouses;
$('opacity').oninput=()=>{$('opacity-label').textContent=$('opacity').value+'%';};$('opacity').onchange=renderLayers;
$('view2d').onclick=()=>mode(false);$('view3d').onclick=()=>mode(true);$('reset').onclick=home;
$('zoom-in').onclick=()=>ready&&map.zoom(map.zoom()+1);$('zoom-out').onclick=()=>ready&&map.zoom(map.zoom()-1);$('north').onclick=()=>ready&&map.rotate(0);
$('about-button').onclick=()=>$('about').showModal();$('close-about').onclick=()=>$('about').close();
async function json(name){const r=await fetch(`/data/${name}.json`);if(!r.ok)throw new Error(`โหลด ${name} ไม่สำเร็จ (${r.status})`);return r.json();}
async function loadMap(){
 const key=import.meta.env.NEXT_PUBLIC_LONGDO_MAP_KEY;if(!key)throw new Error('กรุณาตั้งค่า NEXT_PUBLIC_LONGDO_MAP_KEY ใน .env.local');
 await new Promise((resolve,reject)=>{const s=document.createElement('script');const timer=setTimeout(()=>reject(new Error('โหลด Longdo ไม่สำเร็จ โปรดตรวจสอบอินเทอร์เน็ตและสิทธิ์ API key สำหรับ localhost')),25000);s.src=`https://api.longdo.com/map3/?key=${encodeURIComponent(key)}`;s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);reject(new Error('เชื่อมต่อ Longdo ไม่สำเร็จ โปรดตรวจสอบอินเทอร์เน็ต'));};document.head.append(s);});
 map=new longdo.Map({placeholder:$('map'),location:{lon:meta.center[0],lat:meta.center[1]},zoom:17,pitch:60,rotate:-15,lastView:false,language:'th'});
 const timer=setTimeout(()=>{if(!ready)status('แผนที่ยังไม่พร้อม โปรดตรวจสอบ WebGL และสิทธิ์ API key ใน Longdo Console',true);},25000);
 map.Event.bind('ready',()=>{ready=true;clearTimeout(timer);sceneReady();renderHouses();});
 map.Event.bind('layerChange',()=>{if(ready)sceneReady();});
 new ResizeObserver(()=>map.resize()).observe($('map'));
}
async function init(){try{
 [meta,houses,boundary,cells]=await Promise.all(['metadata','households','boundary','depth-3d'].map(json));
 $('house-count').textContent=number(meta.households);$('max-depth').textContent=number(meta.max);$('area-label').textContent=`พื้นที่ IDW ${meta.areaKm2.toFixed(3)} ตร.กม.`;
 $('summary').textContent=`พื้นที่ที่มีข้อมูล ${meta.areaKm2.toFixed(3)} ตร.กม. · ความลึกต่ำสุด ${number(meta.min)} ซม. · เฉลี่ย ${number(meta.mean)} ซม. · สูงสุด ${number(meta.max)} ซม. สถิติคำนวณจากเซลล์ที่มีข้อมูลใน GeoTIFF ต้นฉบับ ไม่ใช่ทั้งอำเภอ`;
 await loadMap();
}catch(e){status(e.message,true);console.error(e);}}
init();
