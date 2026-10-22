const KEY = "ro-zeny-calc-v1";
const GRADE_TH = { Low: "Low Grade", Medium: "Medium Grade", High: "High Grade" };

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {} }

const saved = load();
const state = {
  custom: saved.custom || [],
  prices: saved.prices || {},
  icons: saved.icons || {},
  rate: saved.rate ?? "",
  current: saved.current || "Little Garden-LT",
  grade: saved.grade || {},
  counts: saved.counts || {},
  craft: saved.craft || {},   // แก้สูตรหิน: { ชื่อหิน: { qty, fee, oreQty, oreFee } }
  useCraft: saved.useCraft || {}, // วัตถุดิบที่ให้ใช้ต้นทุนทำเองแทนราคาตลาด
  showOre: saved.showOre || false,  // เปิดทางแลกแร่เป็นหินด้วย
  ench: saved.ench || {},     // ตัวเลือก enchant: { ชื่อ: { s4, s3, from, to, coupon } }
  tab: saved.tab === "enchant" ? "enchant" : "reform",
  last: saved.last || {},     // ไอเทมล่าสุดของแต่ละแท็บ
  type: "all",
};
const TABS = { reform: "Reform LT", enchant: "Enchant" };

// Small in-game icons from divine-pride by item ID; an LT item looks like its base item
const iconIds = { ...window.ICON_IDS };
for (const it of window.RECIPES) if (iconIds[it.base] && !iconIds[it.name]) iconIds[it.name] = iconIds[it.base];
for (const it of window.ENCHANTS || []) if (iconIds[it.icon]) iconIds[it.name] = iconIds[it.icon];
const iconUrl = name => iconIds[name] ? `https://static.divine-pride.net/images/items/item/${iconIds[name]}.png` : "";

const $ = s => document.querySelector(s);
const fmt = (n, d = 0) => (isFinite(n) ? n : 0).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const allItems = () => [...window.RECIPES, ...(window.ENCHANTS || []), ...state.custom];
const tabItems = () => state.tab === "enchant" ? window.ENCHANTS || [] : [...window.RECIPES, ...state.custom];
const findItem = name => allItems().find(i => i.name === name);

function slot(name, opts = {}) {
  const src = state.icons[name] || iconUrl(name);
  const letter = esc((name.trim()[0] || "?").toUpperCase());
  const pick = opts.pick ? ` pick" data-icon="${esc(name)}" role="button" tabindex="0" title="คลิกเพื่อเปลี่ยนรูป` : "";
  const img = src ? `<img alt="" loading="lazy" src="${esc(src)}" onerror="this.replaceWith(document.createTextNode('${letter}'))">` : letter;
  return `<div class="slot${opts.big ? " big" : ""}${pick}">${img}</div>`;
}

function renderTypes() {
  $("#tabs").innerHTML = Object.entries(TABS).map(([k, label]) =>
    `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === state.tab}">${label}</button>`).join("");
  $("#addBox").hidden = state.tab === "enchant";
  const types = ["all", ...new Set(tabItems().map(i => i.type || "อื่นๆ"))];
  $("#types").hidden = types.length < 3;
  $("#types").innerHTML = types.map(t =>
    `<button type="button" data-type="${esc(t)}" aria-pressed="${t === state.type}">${t === "all" ? "ทั้งหมด" : esc(t)}</button>`).join("");
}

function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const items = tabItems().filter(i =>
    (state.type === "all" || (i.type || "อื่นๆ") === state.type) &&
    (!q || (i.name + " " + (i.base || "")).toLowerCase().includes(q)));
  $("#list").innerHTML = items.map(i => `<button type="button" data-name="${esc(i.name)}" aria-pressed="${i.name === state.current}">
      ${slot(i.name)}<span>${esc(i.name)}<small>${i.custom ? "ไอเทมของฉัน" : i.slots ? esc(`${i.type} · NPC ${i.npc}`) : esc((i.type || "") + " · " + i.recipes.map(r => r.grade).filter(Boolean).join(" / "))}</small></span></button>`).join("")
    || `<p class="note">ไม่เจอไอเทมนี้</p>`;
}

function renderSheet() {
  const list = tabItems();
  const item = list.find(i => i.name === state.current) || list.find(i => i.name === "Little Garden-LT") || list[0];
  state.current = item.name;
  if (item.slots) return renderEnchant(item);
  const recipes = item.recipes;
  let gi = Math.min(state.grade[item.name] ?? recipes.length - 1, recipes.length - 1);
  const recipe = recipes[gi];
  const crafts = Math.max(1, Math.floor(state.counts[item.name] || 1));

  let total = 0, missing = 0;
  const rows = recipe.mats.map(([name, qty]) => {
    const need = qty * crafts;
    const made = state.useCraft[name] && chainOf(name) ? solveChain(name).make : null;
    const raw = made ? made.cost ?? "" : state.prices[name];
    if (raw === undefined || raw === "") missing++;
    const sub = need * (Number(raw) || 0);
    total += sub;
    const craftBtn = chainOf(name) ? `<button type="button" class="craftbtn" data-craft="${esc(name)}" data-need="${need}">⚒ ทำเอง${made ? " ✓" : ""}</button>` : "";
    const priceCell = made
      ? `<span class="num" title="ใช้ต้นทุนทำเอง">${raw === "" ? "?" : fmt(raw)}</span><small class="madetag">ต้นทุนทำเอง</small>`
      : `<input type="number" class="num" min="0" data-price="${esc(name)}" value="${raw ?? ""}" placeholder="0" aria-label="ราคา ${esc(name)} ต่อชิ้น">`;
    return `<tr>
      <td><div class="namecell">${slot(name, { pick: true })}<span>${esc(name)}${craftBtn}</span></div></td>
      <td class="r num">${fmt(qty)}</td>
      <td class="r num"><strong>${fmt(need)}</strong></td>
      <td class="r">${priceCell}</td>
      <td class="r num">${fmt(sub)}</td></tr>`;
  }).join("");
  const baht = total / 1e6 * (Number(state.rate) || 0);

  const gradeChips = recipes.length > 1 ? `<div class="chips">${recipes.map((r, i) =>
    `<button type="button" data-grade="${i}" aria-pressed="${i === gi}">${esc(GRADE_TH[r.grade] || r.grade)}</button>`).join("")}</div>` : "";
  const tags = [
    recipe.grade && !gradeChips ? GRADE_TH[recipe.grade] || recipe.grade : "",
    recipe.refine ? `ต้องตีบวก ${recipe.refine} ขึ้นไป` : "",
    item.custom ? "ไอเทมของฉัน" : "Reform LT",
  ].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join("");

  $("#sheet").innerHTML = `
    <div class="head">
      ${slot(item.name, { big: true, pick: true })}
      <div><h3>${esc(item.name)}</h3><div class="meta">${tags}${item.img ? `<a href="${esc(item.img)}" target="_blank" rel="noopener">ดูการ์ดไอเทม</a>` : ""}</div></div>
      <label class="count">ทำ <input type="number" class="num" id="crafts" min="1" value="${crafts}"> ชิ้น</label>
    </div>
    ${gradeChips}
    <div class="tablewrap"><table>
      <thead><tr><th>วัตถุดิบ</th><th class="r">ต่อชิ้น</th><th class="r">ต้องใช้ทั้งหมด</th><th class="r">ราคา/ชิ้น (z)</th><th class="r">รวม (z)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div class="totals">
      <div class="tot z"><span>รวมทั้งหมด</span><strong>${fmt(total)} z</strong></div>
      <div class="tot b"><span>คิดเป็นเงินบาท${state.rate === "" ? " (ยังไม่ได้ใส่เรต)" : ""}</span><strong>฿${fmt(baht, 2)}</strong></div>
    </div>
    <p class="note">${missing ? `ยังไม่ได้ใส่ราคา ${missing} รายการ · ` : ""}ราคาที่กรอกใช้ร่วมกันทุกสูตร
    ${item.custom ? ` · <button type="button" id="delItem">ลบไอเทมนี้</button>` : ""}</p>`;
}

// ---------- Enchant อาวุธ Dim Glacier ----------
function enchOpts(item) {
  const o = { view: "s4", s4: true, s3: true, from: 0, to: item.levels.length, coupon: false, ...state.ench[item.name] };
  o.to = Math.max(o.from, o.to);
  return o;
}

function renderEnchant(item) {
  const o = enchOpts(item);
  const lvName = i => (i === 0 ? "ยังไม่มี" : `Lv${i}`);
  const all = o.view === "all", slot2 = all || o.view === "s2";
  // แต่ละช่องเป็นกลุ่มขั้น ดูทีละช่องหรือรวมทั้งหมดก็ได้
  const groups = [];
  for (const s of item.slots) if (all ? o[s.id] : o.view === s.id)
    groups.push({ label: s.label, steps: [{ label: s.label, mats: [...s.mats, o.coupon ? [item.couponName, s.coupon] : [item.brilliantName, s.brilliant]] }] });
  if (slot2 && o.to > o.from) groups.push({ label: `ช่อง 2 (${lvName(o.from)} → Lv${o.to})`, steps: Array.from({ length: o.to - o.from }, (_, k) => {
    const i = o.from + k;
    return { label: i === 0 ? "ช่อง 2 การันตี Lv1" : `ช่อง 2 Lv${i} → Lv${i + 1}`, mats: item.levels[i] };
  }) });
  const steps = groups.flatMap(g => g.steps);

  const need = new Map();
  for (const st of steps) for (const [n, q] of st.mats) need.set(n, (need.get(n) || 0) + q);
  const cost = mats => mats.reduce((t, [n, q]) => t + q * (Number(state.prices[n]) || 0), 0);
  let total = 0, missing = 0;
  const rows = [...need].map(([name, q]) => {
    const raw = state.prices[name];
    if (raw === undefined || raw === "") missing++;
    const sub = q * (Number(raw) || 0); total += sub;
    return `<tr>
      <td><div class="namecell">${slot(name, { pick: true })}<span>${esc(name)}</span></div></td>
      <td class="r num"><strong>${fmt(q)}</strong></td>
      <td class="r"><input type="number" class="num" min="0" data-price="${esc(name)}" value="${raw ?? ""}" placeholder="0" aria-label="ราคา ${esc(name)} ต่อชิ้น"></td>
      <td class="r num">${fmt(sub)}</td></tr>`;
  }).join("");
  const baht = total / 1e6 * (Number(state.rate) || 0);
  const lvOpts = (from, sel, min) => Array.from({ length: item.levels.length + 1 }, (_, i) => i)
    .filter(i => i >= min).map(i => `<option value="${i}"${i === sel ? " selected" : ""}>${lvName(i)}</option>`).join("");
  const views = [...item.slots.map(s => [s.id, s.label.replace(/ \(.*\)/, "")]), ["s2", "ช่อง 2"], ["all", "รวมทั้งหมด"]];
  const breakdown = all
    ? groups.map(g => `<li>${esc(g.label)} <span class="muted">· ${fmt(g.steps.reduce((t, st) => t + cost(st.mats), 0))} z</span></li>`).join("")
    : slot2 ? steps.map(st => `<li>${esc(st.label)} <span class="muted">· ${fmt(cost(st.mats))} z</span></li>`).join("") : "";

  $("#sheet").innerHTML = `
    <div class="head">
      ${slot(item.name, { big: true, pick: true })}
      <div><h3>${esc(item.name)}</h3><div class="meta"><span class="tag">NPC ${esc(item.npc)}</span><span class="tag">0z ทุกขั้น ใช้แค่วัตถุดิบ</span></div></div>
    </div>
    <div class="chips views">${views.map(([id, label]) =>
      `<button type="button" data-ench-view="${id}" aria-pressed="${id === o.view}">${esc(label)}</button>`).join("")}</div>
    <div class="enchopts">
      ${all ? item.slots.map(s => `<label class="usecraft"><input type="checkbox" data-ench="${s.id}" ${o[s.id] ? "checked" : ""}> รวม${esc(s.label)}</label>`).join("") : ""}
      ${slot2 ? `<label class="usecraft">ช่อง 2 ตอนนี้ <select data-ench="from">${lvOpts(0, o.from, 0)}</select>
        อัปถึง <select data-ench="to">${lvOpts(0, o.to, o.from)}</select></label>` : ""}
      ${o.view !== "s2" ? `<label class="usecraft"><input type="checkbox" data-ench="coupon" ${o.coupon ? "checked" : ""}> ช่อง 4/3 ใช้ตั๋ว Enchant Coupon แทนขวดส้ม (Brilliant)</label>` : ""}
    </div>
    ${steps.length ? `
    <div class="tablewrap"><table>
      <thead><tr><th>วัตถุดิบ</th><th class="r">ต้องใช้ทั้งหมด</th><th class="r">ราคา/ชิ้น (z)</th><th class="r">รวม (z)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div class="totals">
      <div class="tot z"><span>${all ? "รวมทั้งหมด" : `รวม${esc(views.find(v => v[0] === o.view)[1])}`}</span><strong>${fmt(total)} z</strong></div>
      <div class="tot b"><span>คิดเป็นเงินบาท${state.rate === "" ? " (ยังไม่ได้ใส่เรต)" : ""}</span><strong>฿${fmt(baht, 2)}</strong></div>
    </div>
    ${breakdown ? `<h4>${all ? "แยกตามช่อง" : "แยกตามขั้น"}</h4><ol class="steps">${breakdown}</ol>` : ""}` : `<p class="note">ยังไม่ได้เลือกขั้นไหนเลย</p>`}
    <p class="note">${missing ? `ยังไม่ได้ใส่ราคา ${missing} รายการ · ` : ""}ราคาที่กรอกใช้ร่วมกันทุกสูตร
    · ข้อมูลช่อง 2 จาก <a href="https://ro.gnjoy.in.th/dim-glacier-weapon/" target="_blank" rel="noopener">gnjoy</a></p>`;
}

function render() { renderTypes(); renderList(); renderSheet(); save() }

$("#list").addEventListener("click", e => { const b = e.target.closest("[data-name]"); if (b) { state.current = b.dataset.name; render() } });
$("#tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-tab]"); if (!b || b.dataset.tab === state.tab) return;
  state.last[state.tab] = state.current;
  state.tab = b.dataset.tab; state.current = state.last[state.tab] || ""; state.type = "all";
  $("#search").value = ""; render();
});
$("#types").addEventListener("click", e => { const b = e.target.closest("[data-type]"); if (b) { state.type = b.dataset.type; renderTypes(); renderList() } });
$("#search").addEventListener("input", renderList);
$("#rate").value = state.rate;
$("#rate").addEventListener("input", e => { state.rate = e.target.value; renderSheet(); save() });

$("#sheet").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.price) state.prices[t.dataset.price] = t.value === "" ? "" : Number(t.value);
  if (t.id === "crafts") state.counts[state.current] = Number(t.value) || 1;
  if (t.dataset.ench) {
    const o = (state.ench[state.current] ||= {}), k = t.dataset.ench;
    o[k] = t.type === "checkbox" ? t.checked : Number(t.value);
  }
  render();
});
$("#sheet").addEventListener("click", e => {
  if (e.target.id === "delItem") { state.custom = state.custom.filter(i => i.name !== state.current); state.current = "Little Garden-LT"; render(); return }
  const v = e.target.closest("[data-ench-view]");
  if (v) { (state.ench[state.current] ||= {}).view = v.dataset.enchView; render(); return }
  const g = e.target.closest("[data-grade]"); if (g) { state.grade[state.current] = Number(g.dataset.grade); render(); return }
  const c = e.target.closest("[data-craft]"); if (c) { openCraft(c.dataset.craft, Number(c.dataset.need) || 1); return }
  const s = e.target.closest("[data-icon]"); if (s) pickIcon(s.dataset.icon);
});
$("#sheet").addEventListener("keydown", e => {
  const s = e.target.closest("[data-icon]");
  if (s && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pickIcon(s.dataset.icon) }
});

let iconTarget = null;
function pickIcon(name) { iconTarget = name; $("#iconFile").value = ""; $("#iconFile").click() }
$("#iconFile").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f || !iconTarget) return;
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => { // shrink to 64px so it fits in browser storage
    const c = document.createElement("canvas"), k = Math.min(64 / img.width, 64 / img.height, 1);
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    state.icons[iconTarget] = c.toDataURL("image/png"); URL.revokeObjectURL(url); render();
  };
  img.src = url;
});

function matRow(name = "", qty = 1) {
  const d = document.createElement("div"); d.className = "matrow";
  d.innerHTML = `<input type="text" placeholder="วัตถุดิบ" value="${esc(name)}" aria-label="ชื่อวัตถุดิบ"><input type="number" min="1" value="${qty}" aria-label="จำนวน"><button type="button" aria-label="ลบแถว">×</button>`;
  d.querySelector("button").onclick = () => d.remove();
  $("#newMats").append(d);
}
matRow(); matRow();
$("#addMat").onclick = () => matRow();
$("#addForm").addEventListener("submit", e => {
  e.preventDefault();
  const mats = [...document.querySelectorAll("#newMats .matrow")]
    .map(r => { const [n, q] = r.querySelectorAll("input"); return [n.value.trim(), Math.max(1, Number(q.value) || 1)] })
    .filter(m => m[0]);
  const name = $("#newName").value.trim();
  if (!name || !mats.length || findItem(name)) return;
  state.custom.push({ name, custom: true, type: "ของฉัน", recipes: [{ grade: "", refine: "", mats }] });
  state.current = name; $("#newName").value = ""; $("#newMats").innerHTML = ""; matRow(); matRow();
  render();
});

// ---------- คิดต้นทุนทำ Enhancement Stone เอง ----------
const price = name => { const v = state.prices[name]; return v === undefined || v === "" ? null : Number(v) };
function chainOf(name) {
  for (const chain of window.CRAFT_CHAINS || []) {
    const top = chain.tiers.findIndex(t => t.name === name);
    if (top >= 0) return { chain, top };
  }
}

// ทุกขั้นเลือกทางที่ถูกสุด (ซื้อตลาด / ทำจากขั้นก่อน / ทำจากแร่) ส่วนขั้นบนสุดดูเฉพาะทางทำเองเพื่อเทียบกับราคาตลาด
function solveChain(name) {
  const { chain, top } = chainOf(name);
  const tiers = chain.tiers.slice(0, top + 1).map(t => ({ ...t, ...state.craft[t.name] }));
  const best = [];
  tiers.forEach((t, i) => {
    const input = i === 0 ? price(t.from) : best[i - 1].cost;
    const ore = state.showOre ? price(t.ore) : null;
    const opts = [
      { how: "craft", cost: input == null ? null : t.qty * input + t.fee },
      { how: "ore", cost: ore == null ? null : t.oreQty * ore + t.oreFee },
      { how: "market", cost: price(t.name) },
    ];
    const ok = opts.filter(o => o.cost != null && (i < top || o.how !== "market"));
    best[i] = { opts, ...(ok.length ? ok.reduce((a, b) => (b.cost < a.cost ? b : a)) : { how: null, cost: null }) };
  });
  return { chain, tiers, best, make: best[top], market: price(name) };
}

// แตกเป็นรายการของที่ต้องซื้อ + ค่าธรรมเนียม NPC สำหรับ n ก้อน
function expand(sol, i, n, out = { buy: {}, fee: 0, steps: [] }) {
  const t = sol.tiers[i], b = sol.best[i];
  const add = (k, q) => (out.buy[k] = (out.buy[k] || 0) + q);
  if (b.how === "market") add(t.name, n);
  else if (b.how === "ore") { add(t.ore, n * t.oreQty); out.fee += n * t.oreFee; out.steps.push([t, n, "ore"]) }
  else if (b.how === "craft") {
    out.fee += n * t.fee;
    if (i === 0) add(t.from, n * t.qty); else expand(sol, i - 1, n * t.qty, out);
    out.steps.push([t, n, "craft"]);
  }
  return out;
}

const shortGrade = name => (name.match(/\(([^)]+)\)/) || [, name])[1];
let craftCur = null;
function openCraft(name, need) { craftCur = { name, n: need }; renderCraft(); $("#craft").showModal() }

function renderCraft() {
  if (!craftCur) return;
  const sol = solveChain(craftCur.name), { tiers, best, make, market } = sol;
  const n = craftCur.n, top = tiers.length - 1;
  const z = v => (v == null ? `<span class="muted">–</span>` : `${fmt(v)}`);
  const priceIn = k => `<input type="number" class="num" min="0" data-cprice="${esc(k)}" value="${state.prices[k] ?? ""}" placeholder="ราคา" aria-label="ราคา ${esc(k)}">`;
  const HOW = { craft: "ทำจากขั้นก่อน", ore: "ทำจากแร่", market: "ซื้อตลาด" };

  // ตารางราคาแบบย่อ: แถวละเกรด ช่องราคาหิน (+ ช่องราคาแร่ ถ้าเปิดทางแร่)
  const ore = state.showOre;
  const priceRows = `<tr><td><div class="namecell">${slot(tiers[0].from)}<span>${esc(tiers[0].from)}<small>ใช้แลกเป็นหิน Low</small></span></div></td>${ore ? "<td></td>" : ""}<td class="r">${priceIn(tiers[0].from)}</td></tr>` +
    tiers.map(t => `<tr><td><div class="namecell">${slot(t.name)}<span>หิน ${esc(shortGrade(t.name))}</span></div></td>
      ${ore ? `<td class="r">${priceIn(t.ore)}</td>` : ""}<td class="r">${priceIn(t.name)}</td></tr>`).join("");

  const stepRows = tiers.map((t, i) => {
    const b = best[i], src = i === 0 ? `${esc(t.from)} ×${t.qty}` : `${esc(shortGrade(tiers[i - 1].name))} ×${t.qty}`;
    const cell = how => { const o = b.opts.find(o => o.how === how);
      return `<td class="r num${b.how === how ? " pickd" : ""}">${how === "market" && i === top ? `<span class="muted">เทียบด้านล่าง</span>` : z(o.cost)}</td>` };
    return `<tr><td><div class="namecell">${slot(t.name)}<span>${esc(shortGrade(t.name))}<small>${src} + ${fmt(t.fee)}z${ore ? `<br>หรือ แร่ ×${t.oreQty} + ${fmt(t.oreFee)}z` : ""}</small></span></div></td>
      ${cell("craft")}${ore ? cell("ore") : ""}${cell("market")}</tr>`;
  }).join("");

  let result;
  if (make.cost == null) result = `<p class="note">ใส่ราคา ${esc(tiers[0].from)}${ore ? " หรือราคาแร่" : ""} ด้านบนก่อน ถึงจะคิดต้นทุนได้</p>`;
  else {
    const ex = expand(sol, top, n), buyTotal = Object.entries(ex.buy).reduce((s, [k, q]) => s + q * price(k), 0);
    const buyRows = Object.entries(ex.buy).map(([k, q]) =>
      `<tr><td><div class="namecell">${slot(k)}<span>${esc(k)}</span></div></td><td class="r num"><strong>${fmt(q)}</strong></td><td class="r num">${fmt(price(k))}</td><td class="r num">${fmt(q * price(k))}</td></tr>`).join("");
    const stepsTxt = ex.steps.map(([t, q, how]) => `<li>${how === "ore" ? `แลกแร่เป็น` : t.from ? `แลก ${esc(t.from)} เป็น` : `รวมเป็น`} <strong>${esc(shortGrade(t.name))}</strong> ${fmt(q)} ก้อน · ค่า NPC ${fmt(q * (how === "ore" ? t.oreFee : t.fee))}z</li>`).join("");
    const diff = market == null ? null : market * n - make.cost * n;
    result = `
      <h4>ของที่ต้องเตรียม (ทำ ${fmt(n)} ก้อน)</h4>
      <div class="tablewrap"><table class="mini">
        <thead><tr><th>ของ</th><th class="r">จำนวน</th><th class="r">ราคา/ชิ้น</th><th class="r">รวม (z)</th></tr></thead>
        <tbody>${buyRows}<tr><td>ค่าธรรมเนียม NPC ทุกขั้น</td><td></td><td></td><td class="r num">${fmt(ex.fee)}</td></tr></tbody>
      </table></div>
      <ol class="steps">${stepsTxt}</ol>
      <div class="totals">
        <div class="tot z"><span>ทำเอง ${fmt(n)} ก้อน (ก้อนละ ${fmt(make.cost)})</span><strong>${fmt(buyTotal + ex.fee)} z</strong></div>
        <div class="tot ${diff == null ? "" : diff >= 0 ? "b" : "z"}"><span>${market == null ? "ใส่ราคาตลาดของหินก้อนนี้เพื่อเทียบ" : `ซื้อตลาด ${fmt(n)} ก้อน = ${fmt(market * n)} z`}</span>
          <strong>${diff == null ? "–" : diff >= 0 ? `ทำเองถูกกว่า ${fmt(diff)} z` : `ซื้อถูกกว่า ${fmt(-diff)} z`}</strong></div>
      </div>`;
  }

  const cfgRows = tiers.map(t => `<tr><td>${esc(shortGrade(t.name))}</td>${["qty", "fee", "oreQty", "oreFee"].map(k =>
    `<td><input type="number" class="num" min="0" data-cfg="${esc(t.name)}" data-key="${k}" value="${t[k]}"></td>`).join("")}</tr>`).join("");

  $("#craftBody").innerHTML = `
    <div class="head">${slot(craftCur.name, { big: true })}
      <div><h3>${esc(craftCur.name)}</h3><div class="meta">ทำที่ NPC ${esc(sol.chain.npc)} (ห้องแล็บ Rekenberg)</div></div>
      <label class="count">ทำ <input type="number" class="num" id="craftN" min="1" value="${n}"> ก้อน</label></div>

    <h4>1. ใส่ราคาตลาด (zeny ต่อชิ้น) <small class="muted">ใส่แค่ Shadowdecon ก็คิดได้แล้ว ช่องอื่นใส่เฉพาะที่รู้ราคา</small></h4>
    <div class="tablewrap"><table class="mini prices">
      <thead><tr><th>ของ</th>${ore ? `<th class="r">ราคาแร่ (Ore)<small>เอาไปแลกเป็นหิน</small></th>` : ""}<th class="r">ราคาในตลาด<small>ถ้าซื้อมาใช้เลย</small></th></tr></thead>
      <tbody>${priceRows}</tbody></table></div>
    <label class="usecraft"><input type="checkbox" id="showOre" ${ore ? "checked" : ""}> มี Enhancement Ore ขายด้วย (แลกแร่เป็นหินได้อีกทาง)</label>

    <h4>2. ต้นทุนต่อก้อนแต่ละขั้น <small class="muted">ช่องที่ไฮไลต์คือทางที่ถูกสุด</small></h4>
    <div class="tablewrap"><table class="mini">
      <thead><tr><th>ขั้น · สูตร</th><th class="r">ทำจากขั้นก่อน</th>${ore ? `<th class="r">ทำจากแร่</th>` : ""}<th class="r">ซื้อตลาด</th></tr></thead>
      <tbody>${stepRows}</tbody></table></div>

    ${result}

    <label class="usecraft"><input type="checkbox" id="useCraft" ${state.useCraft[craftCur.name] ? "checked" : ""}> ใช้ต้นทุนทำเองเป็นราคาของหินนี้ในหน้าสูตร</label>

    <details><summary>แก้สูตรถ้าในเกมไม่ตรง</summary>
      <p class="note">ตัวเลขตั้งต้นมาจาก iRO Wiki (หน้าของ GGT ไม่ได้ลงตารางไว้) ขั้นละ: ใช้ขั้นก่อนกี่ก้อน + ค่า NPC หรือ ใช้แร่กี่ก้อน + ค่า NPC</p>
      <div class="tablewrap"><table class="mini cfg">
        <thead><tr><th>ขั้น</th><th>ใช้ขั้นก่อน</th><th>ค่า NPC (z)</th><th>ใช้แร่</th><th>ค่า NPC แร่ (z)</th></tr></thead>
        <tbody>${cfgRows}</tbody></table></div>
      <button type="button" id="cfgReset">คืนค่าเริ่มต้น</button>
    </details>`;
}

$("#craft").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.cprice) state.prices[t.dataset.cprice] = t.value === "" ? "" : Number(t.value);
  if (t.id === "craftN") craftCur.n = Math.max(1, Math.floor(Number(t.value) || 1));
  if (t.id === "useCraft") state.useCraft[craftCur.name] = t.checked;
  if (t.id === "showOre") state.showOre = t.checked;
  if (t.dataset.cfg) (state.craft[t.dataset.cfg] ||= {})[t.dataset.key] = Math.max(0, Number(t.value) || 0);
  renderCraft(); renderSheet(); save();
});
$("#craft").addEventListener("click", e => {
  if (e.target.id === "craftClose" || e.target === $("#craft")) $("#craft").close();
  if (e.target.id === "cfgReset") { for (const t of solveChain(craftCur.name).tiers) delete state.craft[t.name]; renderCraft(); renderSheet(); save() }
});

render();
