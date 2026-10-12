from pathlib import Path
import json, math, xml.etree.ElementTree as ET
import numpy as np
from osgeo import gdal, osr
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/data'; OUT.mkdir(parents=True,exist_ok=True)
HOME=Path.home(); NS={'k':'http://www.opengis.net/kml/2.2'}
def save(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def coords(el): return [[float(v) for v in s.split(',')[:2]] for s in el.text.split()]
def fc(features): return {'type':'FeatureCollection','features':features}
def feat(geom,props): return {'type':'Feature','geometry':geom,'properties':props}
b=[]
for p in ET.parse(HOME/'Downloads/แนวเขตน้ำท่วม ปี67.kml').findall('.//k:Placemark',NS):
 for poly in p.findall('.//k:Polygon',NS):
  rings=[coords(poly.find('k:outerBoundaryIs/k:LinearRing/k:coordinates',NS))]+[coords(x) for x in poly.findall('k:innerBoundaryIs/k:LinearRing/k:coordinates',NS)]
  b.append(feat({'type':'Polygon','coordinates':rings},{'name':p.findtext('k:name','แนวเขตน้ำท่วม',NS)}))
save('boundary.json',fc(b)); houses=[]
def number(v):
 try:
  x=float(v); return x if math.isfinite(x) else None
 except (ValueError,TypeError): return None
for i,p in enumerate(ET.parse(HOME/'Downloads/ข้อมูลระดับน้ำท่วมตามครัวเรือน.kml').findall('.//k:Placemark',NS)):
 pt=p.find('.//k:Point/k:coordinates',NS)
 if pt is None: continue
 d={x.attrib['name']:x.findtext('k:value','',NS) for x in p.findall('.//k:Data',NS)}
 houses.append(feat({'type':'Point','coordinates':coords(pt)[0]},{'id':d.get('ลำดับ',str(i+1)), 'village':d.get('หมู่',''), 'outside':number(d.get('ระดับน้ำสูงจากพื้นดิน (ภายนอกบ้าน)')), 'inside':number(d.get('ระดับน้ำสูงจากพื้นบ้าน (ภายในบ้าน)')), 'date':d.get('วันที่เก็บข้อมูล','')}))
save('households.json',fc(houses))
ds=gdal.Open(str(HOME/'Desktop/floodMeaChan/flood_depth_IDW_clipped.tif')); a=ds.ReadAsArray(); gt=ds.GetGeoTransform(); valid=np.isfinite(a)&(a!=ds.GetRasterBand(1).GetNoDataValue()); values=a[valid]
src=osr.SpatialReference();src.ImportFromWkt(ds.GetProjection()); dest=osr.SpatialReference();dest.ImportFromEPSG(4326);dest.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER); tr=osr.CoordinateTransformation(src,dest)
def ll(x,y): return [round(v,8) for v in tr.TransformPoint(gt[0]+x*gt[1],gt[3]+y*gt[5])[:2]]
cells=[]
for y in range(0,a.shape[0],1):
 for x in range(0,a.shape[1],1):
  block=a[y:y+1,x:x+1]; mask=valid[y:y+1,x:x+1]
  if not mask.any():continue
  x2=min(x+1,a.shape[1]);y2=min(y+1,a.shape[0]);ring=[ll(x,y),ll(x2,y),ll(x2,y2),ll(x,y2),ll(x,y)]
  cells.append(feat({'type':'Polygon','coordinates':[ring]},{'depth':round(float(block[mask].mean()),2)}))
save('depth-3d.json',fc(cells))
w=gdal.Warp('',ds,format='MEM',dstSRS='EPSG:4326',resampleAlg='near',dstNodata=-9999);wa=w.ReadAsArray();wg=w.GetGeoTransform();save('depth-grid.json',{'width':w.RasterXSize,'height':w.RasterYSize,'transform':wg,'nodata':-9999,'values':[round(float(v),2) if v!=-9999 and np.isfinite(v) else None for v in wa.flatten()]})
merc=gdal.Warp('',ds,format='MEM',dstSRS='EPSG:3857',resampleAlg='near',dstNodata=-9999)
color=ROOT/'scripts/colors.txt';color.write_text('nv 0 0 0 0\n0 186 230 253 210\n30 56 189 248 220\n60 14 165 233 225\n100 37 99 235 230\n150 109 40 217 235\n250 76 29 149 240\n')
gdal.DEMProcessing(str(OUT/'depth.png'),merc,'color-relief',colorFilename=str(color),format='PNG',addAlpha=True)
ms=osr.SpatialReference();ms.ImportFromEPSG(3857);mt=osr.CoordinateTransformation(ms,dest);mg=merc.GetGeoTransform()
def mll(x,y):return list(mt.TransformPoint(mg[0]+x*mg[1],mg[3]+y*mg[5])[:2])
counts=[int(((values>=lo)&(values<hi)).sum()) for lo,hi in [(0,30),(30,60),(60,100),(100,150),(150,float('inf'))]]
save('metadata.json',{'unit':'cm','method':ds.GetMetadata().get('method'),'resolution':2,'cell3d':2,'areaKm2':float(valid.sum()*4/1e6),'min':float(values.min()),'max':float(values.max()),'mean':float(values.mean()),'households':len(houses),'counts':counts,'imageCoordinates':[mll(0,0),mll(merc.RasterXSize,0),mll(merc.RasterXSize,merc.RasterYSize),mll(0,merc.RasterYSize)],'center':ll(a.shape[1]/2,a.shape[0]/2),'bounds':[ll(0,a.shape[0]),ll(a.shape[1],0)]})
assert len(houses)>0 and len(b)>0 and values.min()>=0
print(json.dumps({'households':len(houses),'polygons':len(b),'cells3d':len(cells),'min':float(values.min()),'max':float(values.max()),'areaKm2':float(valid.sum()*4/1e6)},ensure_ascii=False))
