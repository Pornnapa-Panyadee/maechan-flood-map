"""Validate exported geometry/depth against the original raster, including NoData."""
import json
from pathlib import Path
import numpy as np
from osgeo import gdal,osr
gdal.UseExceptions()
root=Path(__file__).resolve().parents[1]
cells=json.loads((root/'public/data/depth-3d.json').read_text())['features']
ds=gdal.Open(str(Path.home()/'Desktop/floodMeaChan/flood_depth_IDW_clipped.tif'))
a=ds.ReadAsArray(); valid=np.isfinite(a)&(a!=ds.GetRasterBand(1).GetNoDataValue())
assert len(cells)==int(valid.sum())
np.testing.assert_allclose([f['properties']['depth'] for f in cells],a[valid],atol=.0051)
src=osr.SpatialReference();src.ImportFromEPSG(4326);src.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
dst=osr.SpatialReference();dst.ImportFromWkt(ds.GetProjection());tr=osr.CoordinateTransformation(src,dst)
for index in [0,len(cells)//2,len(cells)-1]:
 ring=cells[index]['geometry']['coordinates'][0]
 assert ring[0]==ring[-1]
 corners=np.array([tr.TransformPoint(*xy)[:2] for xy in ring])
 np.testing.assert_allclose(np.linalg.norm(np.diff(corners,axis=0),axis=1),2,atol=.002)
 y,x=np.argwhere(valid)[index]; gt=ds.GetGeoTransform()
 np.testing.assert_allclose(corners[0],[gt[0]+x*gt[1],gt[3]+y*gt[5]],atol=.002)
assert max(f['properties']['depth']/100 for f in cells)<1.71
print(f'PASS: {len(cells)} valid 2 m cells, source depths preserved, NoData excluded, 3D maximum <1.71 m')
