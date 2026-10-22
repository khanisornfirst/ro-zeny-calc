// สูตรทำ Enhancement Stone เองที่ NPC Ore Researcher (ห้องแล็บ Rekenberg)
// ตัวเลขตั้งต้นมาจาก iRO Wiki (Item Reform) เพราะหน้า gnjoy ไม่ได้ลงตาราง ถ้าในเกม GGT ไม่ตรงแก้ได้ในหน้าเว็บ
// แต่ละขั้น: from × qty + fee zeny -> หิน 1 ก้อน  หรือ  แร่เกรดเดียวกัน × oreQty + oreFee -> หิน 1 ก้อน
window.CRAFT_CHAINS = [
 {
  family: "Accessory Enhancement Stone",
  npc: "Ore Researcher",
  tiers: [
   { name: "Accessory Enhancement Stone (Low Grade)", from: "Shadowdecon", qty: 1, fee: 20000, ore: "Accessory Enhancement Ore (Low Grade)", oreQty: 5, oreFee: 20000 },
   { name: "Accessory Enhancement Stone (Medium Grade)", qty: 3, fee: 10000, ore: "Accessory Enhancement Ore (Medium Grade)", oreQty: 5, oreFee: 20000 },
   { name: "Accessory Enhancement Stone (High Grade)", qty: 3, fee: 20000, ore: "Accessory Enhancement Ore (High Grade)", oreQty: 5, oreFee: 20000 },
   { name: "Accessory Enhancement Stone (Supreme Grade)", qty: 3, fee: 50000, ore: "Accessory Enhancement Ore (Supreme Grade)", oreQty: 5, oreFee: 20000 },
  ],
 },
];
