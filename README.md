# Mae Chan Flood Marks

เว็บแผนที่ภาษาไทยสำหรับข้อมูลน้ำท่วมแม่จัน ปี 2567 ใช้ Vite + JavaScript และ Longdo Map API 3

## เริ่มใช้งาน

```sh
npm install
npm run dev
```

เปิด URL ที่ Vite แสดง (ปกติ http://127.0.0.1:5173) ตั้ง `NEXT_PUBLIC_LONGDO_MAP_KEY` ใน `.env.local` ตาม `.env.example` คีย์นี้เป็น browser key จึงปรากฏฝั่งผู้ใช้ ควรกำหนด allowed domains ใน Longdo Console ให้ตรงกับ host ที่ใช้งาน

```sh
npm run build
npm run preview
```

## ข้อมูล

ไฟล์แปลงพร้อมใช้ใน `public/data` ไม่ต้องมี GDAL เพื่อเปิดเว็บ หากต้องการสร้างใหม่ ใช้ `npm run data` โดยต้องมี Python, GDAL Python bindings และ NumPy และไฟล์ต้นฉบับในตำแหน่งเดิม:

- `~/Downloads/แนวเขตน้ำท่วม ปี67.kml`
- `~/Downloads/ข้อมูลระดับน้ำท่วมตามครัวเรือน.kml`
- `~/Desktop/floodMeaChan/flood_depth_IDW_clipped.tif`

KML มี 176 จุดสำรวจ และ 3 polygons ชื่อและบ้านเลขที่ไม่ถูกนำเข้าเว็บ GeoTIFF หน่วย cm, EPSG:32647, 2 m, NoData=-9999, metadata: IDW power=2 k=12

2D ใช้ Longdo RASTER_POI เป็นแผนที่ฐาน ไม่มีอาคารนูน ล็อก pitch=0 และแสดงภาพสีจาก GeoTIFF ที่แปลง EPSG:3857 แบบ nearest neighbour พร้อม alpha สำหรับ NoData

3D ใช้ Longdo NORMAL และกริดความลึกต้นฉบับ 2 m เฉพาะเซลล์ที่มีข้อมูล ความสูงน้ำ = depth_cm / 100 (หน่วยเมตร) ไม่มีตัวขยายความสูง ความสูงอาคารใช้ height จาก Longdo ไม่ทำให้แบนตาม zoom และคง min_height ของอาคาร; หากไม่มี height ใช้ค่าแทน 10 m ตามค่าเริ่มต้นของผู้ให้บริการ อาคารทึบสีเทาเพื่อไม่ให้ชั้นน้ำดูเหมือนย้อมสีหลังคาทั้งหลัง

ไม่มี DEM จึงวางชั้นน้ำและอาคารบนพื้นอ้างอิงราบเดียวกัน ภาพนี้ไม่ใช่ระดับผิวน้ำเทียบระดับทะเล ไม่สามารถยืนยันสัดส่วนจมน้ำจริงทุกอาคารเมื่อความสูงอาคารหรือระดับพื้นขาดหาย ต้องเพิ่ม DTM/DEM และข้อมูลความสูงอาคารที่ตรวจสอบแล้วเพื่ออ้างอิงระดับจริง

การคลิกอ่านค่าใช้กริด EPSG:4326 ที่ resample nearest neighbour สถิติคำนวณจากกริดต้นฉบับเฉพาะเซลล์ valid

## ตรวจสอบ

```sh
node --test tests/map-scene.test.js
python3 tests/flood-data.py
npm run build
```

Python check ต้องมีไฟล์ GeoTIFF ต้นฉบับและ GDAL เปรียบเทียบค่าทุกเซลล์ที่ส่งออกกับต้นฉบับ ตรวจ NoData และขนาดเซลล์ 2 เมตร

ข้อจำกัดการตรวจ: build และข้อมูลตรวจได้ในเครื่อง แต่ยังตรวจภาพ WebGL และการสลับโหมดในเบราว์เซอร์จริงไม่ได้ เพราะไม่มีสิทธิ์ Computer Use


จุดครัวเรือนภายใน/ภายนอกบ้านอ้างอิงคนละพื้น ข้อมูลย้อนหลัง ไม่ใช่การเฝ้าระวังแบบเรียลไทม์ แผนที่ฐานต้องใช้อินเทอร์เน็ตและ Longdo API key ที่ใช้ได้กับโดเมน

อ้างอิง API: https://api.longdo.com/map3/doc.html

MapLibre extrusion height units: https://maplibre.org/maplibre-style-spec/layers/#fill-extrusion-height
