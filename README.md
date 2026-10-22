# RO Zeny Calculator

เว็บคำนวณต้นทุนวัตถุดิบ Reform ไอเทม LT ของ Ragnarok Online GGT
เลือกไอเทม ใส่ราคา zeny ต่อชิ้น แล้วดูยอดรวมเป็น zeny และเงินบาท

ข้อมูลสูตรจาก https://ro.gnjoy.in.th/item-gradereform/ อยู่ในไฟล์ `recipes.js`

ปุ่ม "⚒ ทำเอง" ข้าง Accessory Enhancement Stone ในหน้าสูตร เปิดส่วนคิดต้นทุนทำหินเองที่ NPC Ore Researcher
(สูตรทำหินอยู่ใน `crafts.js` ตัวเลขตั้งต้นจาก iRO Wiki แก้ได้ในหน้าเว็บ)

"Dim Glacier Weapon Enchant" ในรายการไอเทม คิดวัตถุดิบ enchant อาวุธ Dim Glacier (ช่อง 4, ช่อง 3, ช่อง 2 Lv1–Lv5)
ข้อมูลอยู่ใน `enchants.js` ค่าอัปเกรดช่อง 2 จาก https://ro.gnjoy.in.th/dim-glacier-weapon/
