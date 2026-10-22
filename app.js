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
    const raw = state.prices[name];
    if (raw === undefined || raw === "") missing++;
    const sub = need * (Number(raw) || 0);
    total += sub;
    return `<tr>
      <td><div class="namecell">${slot(name, { pick: true })}<span>${esc(name)}</span></div></td>
      <td class="r num">${fmt(qty)}</td>
      <td class="r num"><strong>${fmt(need)}</strong></td>
      <td class="r"><input type="number" class="num" min="0" data-price="${esc(name)}" value="${raw ?? ""}" placeholder="0" aria-label="ราคา ${esc(name)} ต่อชิ้น"></td>
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

render();
