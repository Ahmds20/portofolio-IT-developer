// =====================================================================
// Dashboard admin: form edit konten yang dibuat otomatis dari SCHEMA.
// Untuk menambah kolom baru, cukup tambahkan definisinya di SCHEMA dan
// tampilkan di js/script.js.
// =====================================================================
const S = Admin.getSession();
const NS = "http://www.w3.org/2000/svg";
const MAX_FILE = 5 * 1024 * 1024;

const PROJECT_ICONS = ["code", "shield", "chart", "cart", "network", "globe", "db", "mobile", "cpu", "award", "cap"];
const CONTACT_ICONS = ["mail", "phone", "linkedin", "github", "globe", "chart", "code", "pin"];

// ---------------------------------------------------------------------
// Skema konten
// type: text | textarea | url | bool | tags | icon | file | lines | list
// ---------------------------------------------------------------------
const SCHEMA = [
  {
    key: "profil", title: "Profil", kind: "object",
    desc: "Nama, peran, foto, dan CV di bagian paling atas website.",
    fields: [
      { key: "nama", label: "Nama lengkap", type: "text", required: true, half: true },
      { key: "lokasi", label: "Lokasi", type: "text", half: true },
      { key: "peran", label: "Peran / jabatan", type: "text", required: true, hint: "Teks sebelum tanda · juga dipakai sebagai judul tab browser." },
      { key: "ringkasan", label: "Ringkasan singkat", type: "textarea", required: true },
      { key: "terbukaKerja", label: "Tampilkan lencana status (titik hijau)", type: "bool" },
      { key: "teksStatus", label: "Teks lencana status", type: "text" },
      { key: "foto", label: "Foto profil", type: "file", accept: "image/png,image/jpeg,image/webp", dir: "assets/img" },
      { key: "cv", label: "File CV (PDF)", type: "file", accept: "application/pdf", dir: "assets/docs" },
      { key: "metaDeskripsi", label: "Deskripsi untuk Google & media sosial", type: "textarea", hint: "Idealnya ±160 karakter." },
    ],
  },
  {
    key: "statistik", title: "Statistik", kind: "list",
    desc: "Angka sorotan yang tampil di bawah foto.",
    addLabel: "Tambah statistik",
    itemTitle: (s) => [s.nilai, s.label].filter(Boolean).join(" — "),
    newItem: () => ({ nilai: "", label: "" }),
    fields: [
      { key: "nilai", label: "Angka", type: "text", required: true, half: true, hint: "Contoh: 99,89%" },
      { key: "label", label: "Keterangan", type: "text", required: true, half: true },
    ],
  },
  {
    key: "tentang", title: "Tentang", kind: "object",
    desc: "Bagian \"Tentang Saya\".",
    fields: [
      { key: "judul", label: "Judul", type: "text", required: true },
      { key: "paragraf", label: "Paragraf", type: "lines", rows: 4, addLabel: "Tambah paragraf" },
    ],
  },
  {
    key: "pengalaman", title: "Pengalaman", kind: "list",
    desc: "Riwayat kerja, magang, dan program. Urutan di sini = urutan di website.",
    addLabel: "Tambah pengalaman",
    itemTitle: (p) => p.posisi, itemSub: (p) => p.organisasi,
    newItem: () => ({ periode: "", posisi: "", organisasi: "", poin: [], tag: [] }),
    fields: [
      { key: "posisi", label: "Posisi", type: "text", required: true, half: true },
      { key: "periode", label: "Periode", type: "text", required: true, half: true, hint: "Contoh: Mar 2025 – Agu 2025" },
      { key: "organisasi", label: "Perusahaan / organisasi", type: "text", required: true },
      { key: "poin", label: "Poin pekerjaan", type: "lines", rows: 2, addLabel: "Tambah poin" },
      { key: "tag", label: "Teknologi", type: "tags" },
    ],
  },
  {
    key: "proyek", title: "Proyek", kind: "list",
    desc: "Kartu proyek. Proyek unggulan tampil sebagai kartu lebar.",
    addLabel: "Tambah proyek",
    itemTitle: (p) => p.judul, itemSub: (p) => (p.unggulan ? "★ unggulan" : p.label),
    newItem: () => ({ unggulan: false, ikon: "code", label: "", periode: "", judul: "", deskripsi: "", metrik: [], tag: [], linkKode: "", linkDemo: "" }),
    fields: [
      { key: "judul", label: "Judul proyek", type: "text", required: true },
      { key: "label", label: "Label", type: "text", half: true, hint: "Contoh: Proyek Akademik" },
      { key: "periode", label: "Periode", type: "text", half: true },
      { key: "deskripsi", label: "Deskripsi", type: "textarea", required: true },
      { key: "ikon", label: "Ikon", type: "icon", options: PROJECT_ICONS },
      { key: "unggulan", label: "Jadikan proyek unggulan (kartu lebar)", type: "bool" },
      { key: "linkKode", label: "Link kode (GitHub)", type: "url", half: true, placeholder: "https://github.com/…" },
      { key: "linkDemo", label: "Link demo", type: "url", half: true, placeholder: "https://…" },
      {
        key: "metrik", label: "Metrik", type: "list", itemName: "Metrik", addLabel: "Tambah metrik",
        itemTitle: (m) => [m.nilai, m.label].filter(Boolean).join(" "),
        newItem: () => ({ nilai: "", label: "" }),
        fields: [
          { key: "nilai", label: "Nilai", type: "text", required: true, half: true },
          { key: "label", label: "Keterangan", type: "text", required: true, half: true },
        ],
      },
      { key: "tag", label: "Teknologi", type: "tags" },
    ],
  },
  {
    key: "keahlian", title: "Keahlian", kind: "list",
    desc: "Kelompok keahlian beserta daftar teknologinya.",
    addLabel: "Tambah kelompok",
    itemTitle: (k) => k.kategori, itemSub: (k) => `${(k.tag || []).length} item`,
    newItem: () => ({ kategori: "", tag: [] }),
    fields: [
      { key: "kategori", label: "Nama kelompok", type: "text", required: true },
      { key: "tag", label: "Keahlian", type: "tags" },
    ],
  },
  {
    key: "pendidikan", title: "Pendidikan", kind: "list",
    desc: "Riwayat pendidikan formal.",
    addLabel: "Tambah pendidikan",
    itemTitle: (e) => e.institusi, itemSub: (e) => e.jurusan,
    newItem: () => ({ institusi: "", jurusan: "", periode: "", nilai: "", deskripsi: "" }),
    fields: [
      { key: "institusi", label: "Institusi", type: "text", required: true },
      { key: "jurusan", label: "Jurusan / jenjang", type: "text", half: true },
      { key: "periode", label: "Periode", type: "text", half: true },
      { key: "nilai", label: "Nilai / IPK", type: "text", hint: "Contoh: IPK 3.80 / 4.00" },
      { key: "deskripsi", label: "Deskripsi", type: "textarea" },
    ],
  },
  {
    key: "sertifikasi", title: "Sertifikasi", kind: "list",
    desc: "Sertifikat dikelompokkan per penerbit. Jangan lupa perbarui angka di Statistik bila jumlahnya berubah.",
    addLabel: "Tambah penerbit",
    itemTitle: (g) => g.penerbit, itemSub: (g) => `${(g.item || []).length} sertifikat`,
    newItem: () => ({ penerbit: "", periode: "", item: [] }),
    fields: [
      { key: "penerbit", label: "Penerbit", type: "text", required: true, half: true },
      { key: "periode", label: "Periode", type: "text", half: true },
      {
        key: "item", label: "Sertifikat", type: "list", itemName: "Sertifikat", addLabel: "Tambah sertifikat",
        itemTitle: (i) => i.nama,
        newItem: () => ({ nama: "", url: "" }),
        fields: [
          { key: "nama", label: "Nama sertifikat", type: "text", required: true },
          { key: "url", label: "Link sertifikat", type: "url", placeholder: "https://…" },
        ],
      },
    ],
  },
  {
    key: "kontak", title: "Kontak", kind: "object",
    desc: "Bagian kontak dan ikon sosial di bagian atas.",
    fields: [
      { key: "judul", label: "Judul", type: "text", required: true },
      { key: "pengantar", label: "Teks pengantar", type: "textarea" },
      {
        key: "tautan", label: "Tautan kontak", type: "list", itemName: "Tautan", addLabel: "Tambah tautan",
        itemTitle: (t) => t.label, itemSub: (t) => t.teks,
        newItem: () => ({ ikon: "globe", label: "", teks: "", url: "", tampilDiHero: false }),
        fields: [
          { key: "label", label: "Label", type: "text", required: true, half: true, hint: "Contoh: Email" },
          { key: "teks", label: "Teks yang ditampilkan", type: "text", required: true, half: true },
          { key: "url", label: "Link", type: "url", required: true, hint: "Gunakan https://, mailto:email, atau https://wa.me/62…" },
          { key: "ikon", label: "Ikon", type: "icon", options: CONTACT_ICONS },
          { key: "tampilDiHero", label: "Tampilkan juga sebagai ikon di bagian atas", type: "bool" },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------
let data = null;        // konten yang sedang diedit
let original = "";      // snapshot konten terakhir yang tersimpan
let sha = null;         // sha file content.json di GitHub
let current = SCHEMA[0].key;
let saving = false;
let notice = "";
const pending = new Map(); // path -> { b64, url } berkas yang belum diunggah
let openItems = new WeakSet();
let uid = 0;

// ---------------------------------------------------------------------
// Helper DOM
// ---------------------------------------------------------------------
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
  return el;
}
function icon(name, cls = "") {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", `icon ${cls}`.trim());
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}
const $ = (id) => document.getElementById(id);
const nextId = () => `f${++uid}`;

function autosize(ta) {
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + 2 + "px";
}

// ---------------------------------------------------------------------
// Kontrol form
// ---------------------------------------------------------------------
function labelEl(f, id) {
  return id ? h("label", { htmlFor: id }, f.label + (f.required ? " *" : "")) : h("span", { class: "field-label" }, f.label);
}
function wrap(f, control, id) {
  return h("div", { class: "field" }, labelEl(f, id), control, f.hint && h("span", { class: "hint" }, f.hint));
}

function textControl(f, obj, onChange) {
  const id = nextId();
  const multi = f.type === "textarea";
  const el = h(multi ? "textarea" : "input", {
    id, class: multi ? "textarea" : "input", value: obj[f.key] ?? "",
    type: multi ? null : f.type === "url" ? "url" : "text",
    placeholder: f.placeholder || "", spellcheck: f.type !== "url",
  });
  el.addEventListener("input", () => {
    obj[f.key] = el.value;
    el.classList.remove("invalid");
    if (multi) autosize(el);
    onChange();
  });
  if (multi) requestAnimationFrame(() => autosize(el));
  return wrap(f, el, id);
}

function boolControl(f, obj, onChange) {
  const cb = h("input", { type: "checkbox", checked: !!obj[f.key] });
  cb.addEventListener("change", () => { obj[f.key] = cb.checked; onChange(); });
  return h("div", { class: "field" }, h("label", { class: "check" }, cb, f.label));
}

function tagsControl(f, obj, onChange) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const arr = obj[f.key];
  const input = h("input", { type: "text", placeholder: "Ketik lalu tekan Enter…", "aria-label": f.label });
  const box = h("div", { class: "chips", onclick: () => input.focus() });

  const draw = () => {
    box.replaceChildren(
      ...arr.map((t, i) =>
        h("span", { class: "chip" }, t,
          h("button", {
            type: "button", "aria-label": `Hapus ${t}`, title: "Hapus",
            onclick: (e) => { e.stopPropagation(); arr.splice(i, 1); draw(); onChange(); input.focus(); },
          }, "×"))
      ),
      input
    );
  };
  const commit = () => {
    const parts = input.value.split(",").map((s) => s.trim()).filter((s) => s && !arr.includes(s));
    input.value = "";
    if (!parts.length) return false;
    arr.push(...parts);
    draw();
    onChange();
    return true;
  };
  input.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.value.trim()) {
      e.preventDefault();
      commit();
      input.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
    } else if (e.key === "Backspace" && !input.value && arr.length) {
      arr.pop();
      draw();
      onChange();
      input.focus();
    }
  });
  input.addEventListener("blur", commit);
  draw();
  return h("div", { class: "field" }, labelEl(f), box, h("span", { class: "hint" }, f.hint || "Pisahkan dengan Enter atau koma."));
}

function iconControl(f, obj, onChange) {
  const box = h("div", { class: "icon-pick", role: "radiogroup", "aria-label": f.label });
  const draw = () => {
    box.replaceChildren(
      ...f.options.map((name) =>
        h("button", {
          type: "button", class: obj[f.key] === name ? "sel" : "", title: name,
          role: "radio", "aria-checked": String(obj[f.key] === name), "aria-label": name,
          onclick: () => { obj[f.key] = name; draw(); onChange(); },
        }, icon(name))
      )
    );
  };
  draw();
  return h("div", { class: "field" }, labelEl(f), box);
}

function linesControl(f, obj, onChange) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const arr = obj[f.key];
  const box = h("div");
  const draw = (focusIndex) => {
    const rows = arr.map((v, i) => {
      const ta = h("textarea", { class: "textarea", value: v, rows: f.rows || 2, "aria-label": `${f.label} ${i + 1}` });
      ta.addEventListener("input", () => { arr[i] = ta.value; autosize(ta); onChange(); });
      requestAnimationFrame(() => autosize(ta));
      if (i === focusIndex) requestAnimationFrame(() => ta.focus());
      return h("div", { class: "line" }, ta, tools(i, arr.length, {
        up: () => { swap(arr, i, i - 1); draw(); onChange(); },
        down: () => { swap(arr, i, i + 1); draw(); onChange(); },
        del: () => { if (!arr[i].trim() || confirm("Hapus baris ini?")) { arr.splice(i, 1); draw(); onChange(); } },
      }));
    });
    box.replaceChildren(
      ...rows,
      h("button", {
        type: "button", class: "btn btn-sm btn-ghost add-btn",
        onclick: () => { arr.push(""); draw(arr.length - 1); onChange(); },
      }, icon("plus"), f.addLabel || "Tambah")
    );
  };
  draw();
  return h("div", { class: "field" }, labelEl(f), box);
}

function fileControl(f, obj, onChange) {
  const id = nextId();
  const isImg = f.accept.startsWith("image");
  const path = h("input", { id, class: "input", value: obj[f.key] ?? "", spellcheck: false });
  const picker = h("input", { type: "file", accept: f.accept, hidden: true });
  const thumb = isImg ? h("img", { class: "thumb", alt: "" }) : null;
  const openLink = isImg ? null : h("a", { class: "link-btn", target: "_blank", rel: "noopener" }, "Lihat file ↗");
  const pendingNote = h("span", { class: "pending" });

  const refresh = () => {
    const v = obj[f.key] || "";
    const src = pending.get(v)?.url || (/^https?:/i.test(v) ? v : v ? `../${v}` : "");
    if (thumb) { thumb.hidden = !src; if (src) thumb.src = src; }
    if (openLink) { openLink.hidden = !src; openLink.href = src; }
    pendingNote.textContent = pending.has(v) ? "Berkas baru, akan diunggah saat disimpan." : "";
  };
  path.addEventListener("input", () => { obj[f.key] = path.value.trim(); refresh(); onChange(); });
  picker.addEventListener("change", async () => {
    const file = picker.files[0];
    picker.value = "";
    if (!file) return;
    if (file.size > MAX_FILE) return Admin.toast(`Ukuran berkas maksimal 5 MB (berkas ini ${(file.size / 1048576).toFixed(1)} MB).`, "error");
    const name = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const p = `${f.dir}/${name || "berkas"}`;
    const b64 = await readBase64(file);
    const old = pending.get(p);
    if (old) URL.revokeObjectURL(old.url);
    pending.set(p, { b64, url: URL.createObjectURL(file) });
    obj[f.key] = p;
    path.value = p;
    refresh();
    onChange();
  });
  refresh();

  return wrap(f,
    h("div", { class: "file-row" },
      thumb, path,
      h("button", { type: "button", class: "btn btn-sm btn-ghost", onclick: () => picker.click() }, icon("upload"), "Unggah"),
      openLink, picker
    ),
    id
  ).appendChild(pendingNote).parentNode;
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Tombol naik / turun / hapus
function tools(i, n, { up, down, del }) {
  return h("span", { class: "tools", onclick: (e) => e.stopPropagation(), onkeydown: (e) => e.stopPropagation() },
    h("button", { type: "button", class: "tool", title: "Naikkan", "aria-label": "Naikkan", disabled: i === 0, onclick: up }, icon("up")),
    h("button", { type: "button", class: "tool", title: "Turunkan", "aria-label": "Turunkan", disabled: i === n - 1, onclick: down }, icon("down")),
    h("button", { type: "button", class: "tool del", title: "Hapus", "aria-label": "Hapus", onclick: del }, icon("trash"))
  );
}
function swap(arr, a, b) {
  if (b < 0 || b >= arr.length) return;
  [arr[a], arr[b]] = [arr[b], arr[a]];
}

// Daftar item yang bisa dibuka-tutup
function listControl(def, arr, onChange, nested) {
  const box = h("div");
  const itemsBox = h("div", { class: "items" });

  const draw = () => {
    itemsBox.replaceChildren(
      ...arr.map((it, i) => {
        const titleEl = h("span", { class: "title" });
        const setTitle = () => {
          const sub = def.itemSub?.(it);
          titleEl.replaceChildren(def.itemTitle(it) || `${def.itemName || def.title || "Item"} baru`, sub ? h("small", {}, sub) : "");
        };
        setTitle();

        const el = h("div", { class: `item${nested ? " nested" : ""}${openItems.has(it) ? " open" : ""}` });
        const toggle = () => {
          const isOpen = el.classList.toggle("open");
          isOpen ? openItems.add(it) : openItems.delete(it);
          head.setAttribute("aria-expanded", String(isOpen));
        };
        const head = h("div", {
          class: "item-head", role: "button", tabindex: "0", "aria-expanded": String(openItems.has(it)),
          onclick: toggle,
          onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } },
        },
          icon("chev", "chev"), titleEl,
          tools(i, arr.length, {
            up: () => { swap(arr, i, i - 1); draw(); onChange(); },
            down: () => { swap(arr, i, i + 1); draw(); onChange(); },
            del: () => {
              const name = def.itemTitle(it) || `${def.itemName || "item"} ini`;
              if (confirm(`Hapus "${name}"?`)) { arr.splice(i, 1); draw(); onChange(); }
            },
          })
        );
        const body = h("div", { class: "item-body" }, renderFields(def.fields, it, () => { setTitle(); onChange(); }));
        el.append(head, body);
        return el;
      })
    );
  };

  box.append(
    itemsBox,
    h("button", {
      type: "button", class: "btn btn-sm btn-ghost add-btn",
      onclick: () => {
        const item = def.newItem();
        arr.push(item);
        openItems.add(item);
        draw();
        onChange();
        itemsBox.lastElementChild?.querySelector("input, textarea")?.focus();
      },
    }, icon("plus"), def.addLabel || "Tambah")
  );
  draw();
  return box;
}

function renderField(f, obj, onChange) {
  switch (f.type) {
    case "text": case "textarea": case "url": return textControl(f, obj, onChange);
    case "bool": return boolControl(f, obj, onChange);
    case "tags": return tagsControl(f, obj, onChange);
    case "icon": return iconControl(f, obj, onChange);
    case "lines": return linesControl(f, obj, onChange);
    case "file": return fileControl(f, obj, onChange);
    case "list":
      if (!Array.isArray(obj[f.key])) obj[f.key] = [];
      return h("div", { class: "field" }, labelEl(f), listControl(f, obj[f.key], onChange, true));
  }
}

// Kolom "half" yang berurutan digabung jadi dua kolom
function renderFields(fields, obj, onChange) {
  const out = [];
  let row = null;
  for (const f of fields) {
    const el = renderField(f, obj, onChange);
    if (f.half) {
      if (!row) { row = h("div", { class: "grid-2" }); out.push(row); }
      row.append(el);
      if (row.children.length === 2) row = null;
    } else {
      row = null;
      out.push(el);
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// Validasi
// ---------------------------------------------------------------------
const isWebUrl = (v) => /^(https?:\/\/\S+|mailto:\S+|tel:\S+)$/i.test(v);
const isPathOrUrl = (v) => isWebUrl(v) || (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/\s/.test(v));

function validateFields(fields, obj, where, section, errs) {
  for (const f of fields) {
    const v = obj?.[f.key];
    const str = typeof v === "string" ? v.trim() : "";
    if (f.required && ["text", "textarea", "url"].includes(f.type) && !str) {
      errs.push({ section, msg: `${where}: "${f.label}" wajib diisi.` });
    }
    if (f.type === "url" && str && !isWebUrl(str)) {
      errs.push({ section, msg: `${where}: "${f.label}" harus diawali https://, mailto:, atau tel:.` });
    }
    if (f.type === "file" && str && !isPathOrUrl(str)) {
      errs.push({ section, msg: `${where}: "${f.label}" bukan path atau link yang valid.` });
    }
    if (f.type === "list") {
      (v || []).forEach((it, i) => validateFields(f.fields, it, `${where} › ${f.itemName || f.label} #${i + 1}`, section, errs));
    }
  }
}
function validate() {
  const errs = [];
  for (const s of SCHEMA) {
    if (s.kind === "object") validateFields(s.fields, data[s.key], s.title, s.key, errs);
    else (data[s.key] || []).forEach((it, i) => validateFields(s.fields, it, `${s.title} #${i + 1}`, s.key, errs));
  }
  return errs;
}

// ---------------------------------------------------------------------
// Tampilan utama
// ---------------------------------------------------------------------
function referencedUploads() {
  const json = JSON.stringify(data);
  return [...pending.keys()].filter((p) => json.includes(JSON.stringify(p)));
}
const isDirty = () => !!data && (JSON.stringify(data) !== original || referencedUploads().length > 0);

function updateChrome() {
  const dirty = isDirty();
  const st = $("status");
  st.textContent = !data ? "Memuat…" : saving ? "Menyimpan…" : dirty ? "● Belum disimpan" : "Semua tersimpan";
  st.classList.toggle("dirty", dirty && !saving);
  $("btn-save").disabled = !dirty || saving;
  $("btn-discard").disabled = !dirty || saving;
  $("btn-preview").disabled = !data || saving;
  renderNav();
}

function renderNav() {
  $("sidenav").replaceChildren(
    ...SCHEMA.map((s) =>
      h("button", { type: "button", class: s.key === current ? "active" : "", onclick: () => show(s.key) },
        s.title,
        s.kind === "list" && data ? h("span", { class: "count" }, String((data[s.key] || []).length)) : null)
    ),
    h("hr"),
    h("button", { type: "button", onclick: () => window.open("../index.html", "_blank", "noopener") }, "Lihat website ↗"),
    h("button", { type: "button", onclick: logout }, "Keluar")
  );
}

function show(key, errs = []) {
  current = key;
  history.replaceState(null, "", `#${key}`);
  const s = SCHEMA.find((x) => x.key === key);
  if (s.kind === "object" && (typeof data[s.key] !== "object" || !data[s.key])) data[s.key] = {};
  if (s.kind === "list" && !Array.isArray(data[s.key])) data[s.key] = [];

  const mine = errs.filter((e) => e.section === key);
  const kids = [
    h("div", { class: "panel-head" }, h("div", {}, h("h2", {}, s.title), h("p", {}, s.desc))),
    notice ? h("div", { class: "errors" }, notice) : null,
    errs.length
      ? h("div", { class: "errors", role: "alert" },
          h("strong", {}, `Ada ${errs.length} isian yang perlu diperbaiki sebelum menyimpan:`),
          h("ul", {}, errs.map((e) => h("li", {}, e.msg))))
      : null,
    ...(s.kind === "object"
      ? renderFields(s.fields, data[s.key], updateChrome)
      : [listControl(s, data[s.key], updateChrome, false)]),
  ];
  // replaceChildren bawaan DOM mengubah null jadi teks "null", jadi disaring dulu
  $("panel").replaceChildren(...kids.filter(Boolean));
  if (mine.length) {
    // buka semua item agar isian yang bermasalah mudah ditemukan
    $("panel").querySelectorAll(".item").forEach((el) => el.classList.add("open"));
  }
  renderNav();
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------------
// Muat, simpan, pratinjau
// ---------------------------------------------------------------------
async function load() {
  $("repo-chip").textContent = `${S.owner}/${S.repo} · ${S.branch}`;
  $("panel").replaceChildren(h("div", { class: "loading" }, "Memuat konten dari GitHub…"));
  data = null;
  updateChrome();
  try {
    const f = await Admin.getFile(S, Admin.CONTENT_PATH);
    if (f) {
      data = JSON.parse(Admin.fromB64(f.content));
      sha = f.sha;
      notice = "";
    } else {
      // Belum ada di repo: ambil salinan lokal, lalu buat saat disimpan pertama kali
      const res = await fetch("../data/content.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`${Admin.CONTENT_PATH} tidak ditemukan di repo maupun di server ini.`);
      data = await res.json();
      sha = null;
      notice = `${Admin.CONTENT_PATH} belum ada di repo GitHub. Konten ditampilkan dari salinan lokal dan akan dibuat di repo saat kamu menyimpan.`;
    }
    original = JSON.stringify(data);
    openItems = new WeakSet();
    const fromHash = location.hash.slice(1);
    show(SCHEMA.some((s) => s.key === fromHash) ? fromHash : current);
    updateChrome();
  } catch (e) {
    if (e.status === 401) {
      Admin.clearSession();
      Admin.toast(Admin.explain(e), "error");
      setTimeout(() => location.replace("login.html"), 1500);
      return;
    }
    $("panel").replaceChildren(
      h("div", { class: "errors", role: "alert" }, e.status !== undefined ? Admin.explain(e) : `Gagal memuat konten: ${e.message}`),
      h("button", { type: "button", class: "btn btn-sm", onclick: load }, "Coba lagi")
    );
  }
}

async function save() {
  const errs = validate();
  if (errs.length) {
    show(errs[0].section, errs);
    Admin.toast("Periksa kembali isian yang ditandai.", "error");
    return;
  }

  saving = true;
  updateChrome();
  const msg = $("msg");
  try {
    for (const path of referencedUploads()) {
      msg.textContent = `Mengunggah ${path}…`;
      const existing = await Admin.getFile(S, path);
      await Admin.putFile(S, path, pending.get(path).b64, `admin: unggah ${path}`, existing?.sha);
      URL.revokeObjectURL(pending.get(path).url);
      pending.delete(path);
    }
    msg.textContent = "Menyimpan konten…";
    const json = JSON.stringify(data, null, 2) + "\n";
    const res = await Admin.putFile(S, Admin.CONTENT_PATH, Admin.toB64(json), "admin: perbarui konten portofolio", sha);
    sha = res.content.sha;
    original = JSON.stringify(data);
    if (notice) { notice = ""; show(current); }
    Admin.toast("Tersimpan! Website akan terupdate dalam ±1 menit setelah Vercel selesai deploy.", "success", 7000);
  } catch (e) {
    Admin.toast(Admin.explain(e), "error", 9000);
  } finally {
    saving = false;
    msg.textContent = "";
    updateChrome();
  }
}

function preview() {
  // Ganti path berkas yang belum diunggah dengan URL sementara agar ikut tampil
  let json = JSON.stringify(data);
  for (const [p, v] of pending) json = json.split(JSON.stringify(p)).join(JSON.stringify(v.url));
  try {
    localStorage.setItem("portfolio:preview", json);
  } catch (e) {
    return Admin.toast("Pratinjau butuh izin penyimpanan browser (localStorage).", "error");
  }
  window.open("../index.html?preview", "_blank");
}

function discard() {
  if (!confirm("Batalkan semua perubahan yang belum disimpan?")) return;
  data = JSON.parse(original);
  for (const v of pending.values()) URL.revokeObjectURL(v.url);
  pending.clear();
  openItems = new WeakSet();
  show(current);
  updateChrome();
}

function logout() {
  if (isDirty() && !confirm("Ada perubahan yang belum disimpan. Tetap keluar?")) return;
  Admin.clearSession();
  window.removeEventListener("beforeunload", guard);
  location.replace("login.html");
}

function guard(e) {
  if (isDirty()) { e.preventDefault(); e.returnValue = ""; }
}

// ---------------------------------------------------------------------
// Mulai
// ---------------------------------------------------------------------
if (S) {
  document.querySelector(".theme-toggle").addEventListener("click", Admin.toggleTheme);
  $("btn-save").addEventListener("click", save);
  $("btn-preview").addEventListener("click", preview);
  $("btn-discard").addEventListener("click", discard);
  window.addEventListener("beforeunload", guard);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (!$("btn-save").disabled) save();
    }
  });
  load();
}
