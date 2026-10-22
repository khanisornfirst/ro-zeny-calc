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
  type: "all",
};

// Small in-game icons from divine-pride by item ID; an LT item looks like its base item
const iconIds = { ...window.ICON_IDS };
for (const it of window.RECIPES) if (iconIds[it.base] && !iconIds[it.name]) iconIds[it.name] = iconIds[it.base];
const iconUrl = name => iconIds[name] ? `https://static.divine-pride.net/images/items/item/${iconIds[name]}.png` : "";

const $ = s => document.querySelector(s);
const fmt = (n, d = 0) => (isFinite(n) ? n : 0).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const allItems = () => [...window.RECIPES, ...state.custom];
const findItem = name => allItems().find(i => i.name === name);

function slot(name, opts = {}) {
  const src = state.icons[name] || iconUrl(name);
  const letter = esc((name.trim()[0] || "?").toUpperCase());
  const pick = opts.pick ? ` pick" data-icon="${esc(name)}" role="button" tabindex="0" title="คลิกเพื่อเปลี่ยนรูป` : "";
  const img = src ? `<img alt="" loading="lazy" src="${esc(src)}" onerror="this.replaceWith(document.createTextNode('${letter}'))">` : letter;
  return `<div class="slot${opts.big ? " big" : ""}${pick}">${img}</div>`;
}

function renderTypes() {
  const types = ["all", ...new Set(allItems().map(i => i.type || "อื่นๆ"))];
  $("#types").innerHTML = types.map(t =>
    `<button type="button" data-type="${esc(t)}" aria-pressed="${t === state.type}">${t === "all" ? "ทั้งหมด" : esc(t)}</button>`).join("");
}

function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const items = allItems().filter(i =>
    (state.type === "all" || (i.type || "อื่นๆ") === state.type) &&
    (!q || (i.name + " " + (i.base || "")).toLowerCase().includes(q)));
  $("#list").innerHTML = items.map(i => `<button type="button" data-name="${esc(i.name)}" aria-pressed="${i.name === state.current}">
      ${slot(i.name)}<span>${esc(i.name)}<small>${i.custom ? "ไอเทมของฉัน" : esc((i.type || "") + " · " + i.recipes.map(r => r.grade).filter(Boolean).join(" / "))}</small></span></button>`).join("")
    || `<p class="note">ไม่เจอไอเทมนี้</p>`;
}

function renderSheet() {
  const item = findItem(state.current) || findItem("Little Garden-LT") || allItems()[0];
  state.current = item.name;
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

function render() { renderTypes(); renderList(); renderSheet(); save() }

$("#list").addEventListener("click", e => { const b = e.target.closest("[data-name]"); if (b) { state.current = b.dataset.name; render() } });
$("#types").addEventListener("click", e => { const b = e.target.closest("[data-type]"); if (b) { state.type = b.dataset.type; renderTypes(); renderList() } });
$("#search").addEventListener("input", renderList);
$("#rate").value = state.rate;
$("#rate").addEventListener("input", e => { state.rate = e.target.value; renderSheet(); save() });

$("#sheet").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.price) state.prices[t.dataset.price] = t.value === "" ? "" : Number(t.value);
  if (t.id === "crafts") state.counts[state.current] = Number(t.value) || 1;
  render();
});
$("#sheet").addEventListener("click", e => {
  if (e.target.id === "delItem") { state.custom = state.custom.filter(i => i.name !== state.current); state.current = "Little Garden-LT"; render(); return }
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
    const ore = price(t.ore);
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

  // ตารางราคาแบบย่อ: แถวละเกรด มีช่องราคาแร่กับราคาหิน
  const priceRows = `<tr><td><div class="namecell">${slot(tiers[0].from)}<span>${esc(tiers[0].from)}</span></div></td><td class="r" colspan="2">${priceIn(tiers[0].from)}</td></tr>` +
    tiers.map(t => `<tr><td><div class="namecell">${slot(t.name)}<span>${esc(shortGrade(t.name))}</span></div></td>
      <td class="r">${priceIn(t.ore)}</td><td class="r">${priceIn(t.name)}</td></tr>`).join("");

  const stepRows = tiers.map((t, i) => {
    const b = best[i], src = i === 0 ? `${esc(t.from)} ×${t.qty}` : `${esc(shortGrade(tiers[i - 1].name))} ×${t.qty}`;
    const cell = how => { const o = b.opts.find(o => o.how === how);
      return `<td class="r num${b.how === how ? " pickd" : ""}">${how === "market" && i === top ? `<span class="muted">เทียบด้านล่าง</span>` : z(o.cost)}</td>` };
    return `<tr><td><div class="namecell">${slot(t.name)}<span>${esc(shortGrade(t.name))}<small>${src} + ${fmt(t.fee)}z<br>หรือ แร่ ×${t.oreQty} + ${fmt(t.oreFee)}z</small></span></div></td>
      ${cell("craft")}${cell("ore")}${cell("market")}</tr>`;
  }).join("");

  let result;
  if (make.cost == null) result = `<p class="note">ใส่ราคา ${esc(tiers[0].from)} หรือราคาแร่ ด้านบนก่อน ถึงจะคิดต้นทุนได้</p>`;
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

    <h4>1. ใส่ราคาตลาด (zeny ต่อชิ้น) <small class="muted">ไม่รู้ราคาอันไหนเว้นว่างไว้ จะไม่เอาทางนั้นมาคิด</small></h4>
    <div class="tablewrap"><table class="mini prices">
      <thead><tr><th>เกรด</th><th class="r">ราคาแร่</th><th class="r">ราคาหิน</th></tr></thead>
      <tbody>${priceRows}</tbody></table></div>

    <h4>2. ต้นทุนต่อก้อนแต่ละขั้น <small class="muted">ช่องที่ไฮไลต์คือทางที่ถูกสุด</small></h4>
    <div class="tablewrap"><table class="mini">
      <thead><tr><th>ขั้น · สูตร</th><th class="r">ทำจากขั้นก่อน</th><th class="r">ทำจากแร่</th><th class="r">ซื้อตลาด</th></tr></thead>
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
  if (t.dataset.cfg) (state.craft[t.dataset.cfg] ||= {})[t.dataset.key] = Math.max(0, Number(t.value) || 0);
  renderCraft(); renderSheet(); save();
});
$("#craft").addEventListener("click", e => {
  if (e.target.id === "craftClose" || e.target === $("#craft")) $("#craft").close();
  if (e.target.id === "cfgReset") { for (const t of solveChain(craftCur.name).tiers) delete state.craft[t.name]; renderCraft(); renderSheet(); save() }
});

render();
