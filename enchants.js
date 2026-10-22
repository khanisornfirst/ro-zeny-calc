// Enchant อาวุธ Dim Glacier (EP19) ที่ NPC Poruru ใน Ice Castle
// ค่าอัปเกรดช่อง 2 Lv1→Lv5 จาก https://ro.gnjoy.in.th/dim-glacier-weapon/ (0z ทุกขั้น)
// ค่าช่อง 4, ช่อง 3 และการันตีช่อง 2 Lv1 จากตารางที่เฟิร์สส่งมา
// หน้า GGT เรียก "Glacier Flower Magic Stone Extract" แต่เป็นไอเทมเดียวกับ Snow Flower Magic Stone Extract (ID 1001034-1001036)
(() => {
const SNOW = "Snow Flower Magic Stone Extract";
const SHINING = "Shining Snow Flower Magic Stone Extract";
const BRILLIANT = "Brilliant Snow Flower Magic Stone Extract";
const COUPON = "Slot 4 & 3 Dim Glacier Enchant Coupon";

window.ENCHANTS = [
 {
  name: "Dim Glacier Weapon Enchant",
  icon: "Dim Glacier Wand [1]",
  type: "Enchant",
  npc: "Poruru (Ice Castle)",
  // ช่อง 4 กับ 3 จ่ายได้ 2 แบบ: ขวดส้ม (Brilliant) หรือตั๋ว
  slots: [
   { id: "s4", label: "ช่อง 4 (สกิล)", mats: [[SNOW, 10], [SHINING, 15]], brilliant: 25, coupon: 1 },
   { id: "s3", label: "ช่อง 3 (สกิล)", mats: [[SNOW, 15], [SHINING, 20]], brilliant: 35, coupon: 2 },
  ],
  // ช่อง 2: levels[0] คือการันตี Lv1, levels[i] คือ Lv i → Lv i+1
  levels: [
   [[SNOW, 30], [SHINING, 40], [BRILLIANT, 60], ["Glacier Extract", 50]],
   [["Encroached Magical Crystal", 5], ["Neutralized Magical Crystal", 5], [SNOW, 15], [SHINING, 20], [BRILLIANT, 30], ["Glacier Extract", 25]],
   [["Encroached Magical Crystal", 7], ["Neutralized Magical Crystal", 7], ["Miasmal Spell", 1], [SNOW, 20], [SHINING, 30], [BRILLIANT, 40], ["Glacier Extract", 35]],
   [["Encroached Magical Crystal", 10], ["Neutralized Magical Crystal", 10], ["Miasmal Spell", 2], [SNOW, 30], [SHINING, 40], [BRILLIANT, 50], ["Glacier Extract", 45]],
   [["Encroached Magical Crystal", 15], ["Neutralized Magical Crystal", 15], ["Miasmal Spell", 3], [SNOW, 40], [SHINING, 50], [BRILLIANT, 65], ["Glacier Extract", 70]],
  ],
  brilliantName: BRILLIANT,
  couponName: COUPON,
 },
];
})();
