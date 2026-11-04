// =====================================================================
// Dashboard admin: form edit konten yang dibuat otomatis dari SCHEMA.
// Untuk menambah kolom baru, cukup tambahkan definisinya di SCHEMA dan
// tampilkan di js/script.js.
// =====================================================================
const S = Admin.getSession();
const NS = "http://www.w3.org/2000/svg";
const MAX_FILE = 5 * 1024 * 1024;

const CONTACT_ICONS = ["mail", "phone", "linkedin", "github", "globe", "chart", "code", "pin"];
const LAYER_OPTIONS = [
  { value: "fe", label: "FE · Frontend" },
  { value: "be", label: "BE · Backend / API" },
  { value: "db", label: "DB · Database" },
  { value: "ops", label: "OPS · DevOps & Cloud" },
];

// Baris git graph di bagian Experience
const GRAPH_ACTIONS = [
  { value: "commit", label: "Commit (titik)" },
  { value: "cabang", label: "Cabang baru (branch)" },
  { value: "merge", label: "Merge (gabung)" },
  { value: "head", label: "HEAD (posisi sekarang)" },
];
// Isi yang bisa ditautkan ke sebuah commit. Disimpan sebagai "jenis:judul".
const refOptions = (d) => [
  { value: "", label: "Tanpa tautan, tulis teks sendiri" },
  ...(d?.pengalaman || []).filter((x) => x.posisi).map((x) => ({ value: `pengalaman:${x.posisi}`, label: `Pengalaman · ${x.posisi}` })),
  ...(d?.proyek || []).filter((x) => x.judul).map((x) => ({ value: `proyek:${x.judul}`, label: `Proyek · ${x.singkat || x.judul}` })),
  ...(d?.pendidikan || []).filter((x) => x.institusi).map((x) => ({ value: `pendidikan:${x.institusi}`, label: `Pendidikan · ${x.institusi}` })),
];
function graphRowTitle(r) {
  const p = r.induk || "main";
  if (r.aksi === "cabang") return `Cabang baru: ${r.cabang || "…"} (dari ${p})`;
  if (r.aksi === "merge") return `Merge: ${r.cabang || "…"} → ${p}`;
  if (r.aksi === "head") return `HEAD → ${r.teks || "…"}`;
  const ref = r.tautan ? r.tautan.slice(r.tautan.indexOf(":") + 1) : r.teks;
  return `Commit di ${r.cabang || "main"}: ${ref || "…"}`;
}

// ---------------------------------------------------------------------
// Skema konten
// type: text | textarea | url | bool | tags | icon | select | file | lines | list
// ---------------------------------------------------------------------
const SCHEMA = [
  {
    key: "profil", title: "Profil", kind: "object",
    desc: "Nama, peran, foto, dan CV di bagian paling atas website.",
    fields: [
      { key: "nama", label: "Nama lengkap", type: "text", required: true, half: true },
      { key: "lokasi", label: "Lokasi", type: "text", half: true },
      { key: "peran", label: "Peran / jabatan", type: "text", required: true, hint: "Pisahkan beberapa peran dengan tanda · agar tampil berwarna, misal: Fullstack · Backend · Software Engineer. Peran pertama dipakai di judul tab browser." },
      { key: "ringkasan", label: "Ringkasan singkat", type: "textarea", required: true, hint: "Apit kata kunci dengan *bintang* agar diberi efek stabilo, misal: *backend services and APIs*. Cukup 1–2 frasa." },
      { key: "terbukaKerja", label: "Tampilkan lencana status (titik hijau)", type: "bool" },
      { key: "teksStatus", label: "Teks lencana status", type: "text" },
      { key: "foto", label: "Foto profil", type: "file", accept: "image/png,image/jpeg,image/webp", dir: "assets/img" },
      { key: "cv", label: "File CV (PDF)", type: "file", accept: "application/pdf", dir: "assets/docs" },
      { key: "metaDeskripsi", label: "Deskripsi untuk Google & media sosial", type: "textarea", hint: "Idealnya ±160 karakter." },
    ],
  },
  {
    key: "arsitektur", title: "Diagram Arsitektur", kind: "list",
    desc: "Lapisan pada diagram di samping nama (hero). Lapisan OPS tampil sebagai pembungkus bergaris putus-putus di bawah.",
    addLabel: "Tambah lapisan",
    itemTitle: (l) => l.nama, itemSub: (l) => l.teknologi,
    newItem: () => ({ lapisan: "be", nama: "", teknologi: "", keterangan: "" }),
    fields: [
      { key: "lapisan", label: "Jenis lapisan (warna)", type: "select", options: LAYER_OPTIONS, half: true },
      { key: "nama", label: "Nama lapisan", type: "text", required: true, half: true, hint: "Contoh: Frontend, API, Data" },
      { key: "teknologi", label: "Teknologi", type: "text", required: true, hint: "Contoh: Django · Flask · REST API" },
      { key: "keterangan", label: "Keterangan singkat", type: "text" },
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
      { key: "paragraf", label: "Paragraf", type: "lines", rows: 4, addLabel: "Tambah paragraf", hint: "Apit frasa dengan *bintang* untuk efek stabilo." },
    ],
  },
  {
    key: "pengalaman", title: "Pengalaman", kind: "list",
    desc: "Riwayat kerja, magang, dan program. Agar tampil di website, tautkan sebagai commit di bagian Riwayat (Git Graph).",
    addLabel: "Tambah pengalaman",
    itemTitle: (p) => p.posisi,
    itemSub: (p) =>
      data?.riwayat?.length && !data.riwayat.some((r) => r.tautan === `pengalaman:${p.posisi}`) ? "⚠ belum tampil di Riwayat" : p.organisasi,
    newItem: () => ({ periode: "", posisi: "", organisasi: "", poin: [], tag: [] }),
    fields: [
      { key: "posisi", label: "Posisi", type: "text", required: true, half: true, ref: "pengalaman" },
      { key: "periode", label: "Periode", type: "text", required: true, half: true, hint: "Contoh: Mar 2025 – Agu 2025" },
      { key: "organisasi", label: "Perusahaan / organisasi", type: "text", required: true },
      { key: "poin", label: "Poin pekerjaan", type: "lines", rows: 2, addLabel: "Tambah poin" },
      { key: "tag", label: "Teknologi", type: "tags" },
    ],
  },
  {
    key: "riwayat", title: "Riwayat (Git Graph)", kind: "list",
    desc: "Jalur git graph di bagian Experience, dari yang terlama (atas) ke terbaru (bawah). Pola umumnya: buat Cabang baru, isi Commit di cabang itu, lalu Merge kembali ke main. HEAD selalu di baris terakhir.",
    addLabel: "Tambah baris",
    itemTitle: graphRowTitle, itemSub: (r) => r.tanggal,
    newItem: () => ({ aksi: "commit", cabang: "main", induk: "main", tutupInduk: false, tanggal: "", tautan: "", teks: "", keterangan: "" }),
    fields: [
      { key: "aksi", label: "Jenis baris", type: "select", options: GRAPH_ACTIONS, half: true },
      { key: "tanggal", label: "Tanggal", type: "text", half: true, hint: "Contoh: Mar 2025. Tampil di kolom kiri." },
      {
        key: "cabang", label: "Nama cabang", type: "text", when: (r) => r.aksi !== "head",
        hint: "Commit: cabang tempat titik ini (main = jalur utama). Cabang baru: nama cabangnya, misal internship/cronos-studio. Merge: cabang yang digabungkan.",
      },
      {
        key: "induk", label: "Cabang induk", type: "text", when: (r) => r.aksi === "cabang" || r.aksi === "merge",
        hint: "Cabang baru: dibuat dari cabang mana. Merge: digabung ke cabang mana (biasanya main).",
      },
      { key: "tutupInduk", label: "Cabang induk berakhir di sini (pekerjaan berlanjut di cabang baru)", type: "bool", when: (r) => r.aksi === "cabang" },
      {
        key: "tautan", label: "Tampilkan isi dari", type: "select", options: refOptions, when: (r) => r.aksi === "commit",
        hint: "Pengalaman tampil lengkap dengan poin dan teknologinya. Proyek tampil sebagai tautan ke kartu proyeknya.",
      },
      { key: "teks", label: "Teks", type: "text", when: (r) => r.aksi === "head" || (r.aksi === "commit" && !r.tautan), hint: "Untuk HEAD, misal: open to work." },
      { key: "keterangan", label: "Keterangan tambahan (opsional)", type: "text", when: (r) => r.aksi === "commit" || r.aksi === "cabang" },
    ],
  },
  {
    key: "proyek", title: "Proyek", kind: "list",
    desc: "Kartu proyek. Proyek unggulan tampil sebagai kartu lebar. Urutan di sini = urutan di website.",
    addLabel: "Tambah proyek",
    itemTitle: (p) => p.judul, itemSub: (p) => (p.unggulan ? "★ unggulan" : p.jenis || p.label),
    newItem: () => ({ unggulan: false, jenis: "", label: "", periode: "", judul: "", deskripsi: "", stack: [], metrik: [], tag: [], linkKode: "", linkDemo: "" }),
    fields: [
      { key: "judul", label: "Judul proyek", type: "text", required: true, half: true, ref: "proyek" },
      { key: "singkat", label: "Nama singkat", type: "text", half: true, hint: "Dipakai di tabel stack dan panel trace. Contoh: Coffee Shop" },
      { key: "jenis", label: "Jenis proyek", type: "text", half: true, hint: "Contoh: fullstack, backend · ml" },
      { key: "label", label: "Label", type: "text", half: true, hint: "Contoh: Proyek Akademik" },
      { key: "periode", label: "Periode", type: "text" },
      { key: "deskripsi", label: "Deskripsi", type: "textarea", required: true },
      { key: "unggulan", label: "Jadikan proyek unggulan (kartu lebar)", type: "bool" },
      {
        key: "stack", label: "Stack per lapisan", type: "list", itemName: "Lapisan", addLabel: "Tambah lapisan",
        hint: "Tampil di kartu proyek, menyalakan panel trace, dan otomatis mengisi tabel \"Where I have used what\". Pisahkan teknologi dengan koma.",
        itemTitle: (s) => [LAYER_OPTIONS.find((o) => o.value === s.lapisan)?.label.split(" · ")[0], s.teknologi].filter(Boolean).join(" — "),
        newItem: () => ({ lapisan: "be", teknologi: "" }),
        fields: [
          { key: "lapisan", label: "Lapisan", type: "select", options: LAYER_OPTIONS, half: true },
          { key: "teknologi", label: "Teknologi", type: "text", required: true, half: true, hint: "Contoh: Django, PostgreSQL" },
        ],
      },
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
      { key: "tag", label: "Teknologi (cadangan)", type: "tags", hint: "Dipakai bila Stack per lapisan kosong. Pisahkan dengan Enter atau koma." },
    ],
  },
  {
    key: "keahlian", title: "Keahlian", kind: "list",
    desc: "Keahlian yang sudah muncul di Stack per lapisan proyek tampil di tabel. Sisanya tampil di bawah tabel sebagai \"Also worked with\".",
    addLabel: "Tambah kelompok",
    itemTitle: (k) => k.kategori, itemSub: (k) => `${(k.tag || []).length} item`,
    newItem: () => ({ kategori: "", lapisan: "", tag: [] }),
    fields: [
      { key: "kategori", label: "Nama kelompok", type: "text", required: true, half: true },
      { key: "lapisan", label: "Warna lapisan", type: "select", half: true, options: [{ value: "", label: "Tanpa warna" }, ...LAYER_OPTIONS] },
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
      { key: "institusi", label: "Institusi", type: "text", required: true, ref: "pendidikan" },
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
  // Kolom yang dirujuk oleh Riwayat (Git Graph): saat diganti, rujukannya ikut diganti.
  let refOld = obj[f.key] ?? "";
  el.addEventListener("input", () => {
    obj[f.key] = el.value;
    if (f.ref && Array.isArray(data?.riwayat)) {
      const from = `${f.ref}:${refOld}`, to = `${f.ref}:${el.value}`;
      data.riwayat.forEach((r) => { if (r.tautan === from) r.tautan = to; });
      refOld = el.value;
    }
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

function selectControl(f, obj, onChange) {
  const id = nextId();
  const sel = h("select", { id, class: "select" });
  const fill = () => {
    const opts = typeof f.options === "function" ? f.options(data) : f.options;
    const cur = obj[f.key] ?? "";
    const list = opts.some((o) => o.value === cur) ? opts : [...opts, { value: cur, label: `⚠ Tidak ditemukan: ${cur}` }];
    sel.replaceChildren(...list.map((o) => h("option", { value: o.value, selected: cur === o.value }, o.label)));
  };
  fill();
  // Pilihan yang diambil dari bagian lain diperbarui setiap kali dibuka
  if (typeof f.options === "function") sel.addEventListener("focus", fill);
  sel.addEventListener("change", () => { obj[f.key] = sel.value; onChange(); });
  return wrap(f, sel, id);
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
    case "select": return selectControl(f, obj, onChange);
    case "lines": return linesControl(f, obj, onChange);
    case "file": return fileControl(f, obj, onChange);
    case "list":
      if (!Array.isArray(obj[f.key])) obj[f.key] = [];
      return h("div", { class: "field" }, labelEl(f), f.hint && h("span", { class: "hint" }, f.hint), listControl(f, obj[f.key], onChange, true));
  }
}

// Kolom "half" yang berurutan digabung jadi dua kolom.
// Kolom dengan `when` hanya tampil bila kondisinya terpenuhi.
function renderFields(fields, obj, onChange) {
  const out = [];
  const conditional = [];
  const refresh = () => conditional.forEach(({ f, el }) => { el.hidden = !f.when(obj); });
  const changed = () => { refresh(); onChange(); };
  let row = null;
  for (const f of fields) {
    const el = renderField(f, obj, changed);
    if (f.when) conditional.push({ f, el });
    if (f.half) {
      if (!row) { row = h("div", { class: "grid-2" }); out.push(row); }
      row.append(el);
      if (row.children.length === 2) row = null;
    } else {
      row = null;
      out.push(el);
    }
  }
  refresh();
  return out;
}

// ---------------------------------------------------------------------
// Validasi
// ---------------------------------------------------------------------
const isWebUrl = (v) => /^(https?:\/\/\S+|mailto:\S+|tel:\S+)$/i.test(v);
const isPathOrUrl = (v) => isWebUrl(v) || (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/\s/.test(v));

// Memeriksa urutan Riwayat (Git Graph) dengan cara yang sama seperti website menggambarnya
function validateGraph(rows, errs) {
  if (!rows?.length) return;
  const open = new Set();
  const used = new Set();
  const at = (i) => `Riwayat (Git Graph) #${i + 1}`;
  const push = (i, msg) => errs.push({ section: "riwayat", msg: `${at(i)}: ${msg}` });
  rows.forEach((r, i) => {
    const b = (r.cabang || "main").trim();
    const p = (r.induk || "main").trim();
    if (r.aksi === "head") {
      if (i !== rows.length - 1) push(i, "HEAD harus berada di baris terakhir.");
      return;
    }
    if (r.aksi === "cabang") {
      if (!r.cabang?.trim()) return push(i, "\"Nama cabang\" wajib diisi.");
      if (open.size && !open.has(p)) push(i, `cabang induk "${p}" belum dibuat atau sudah di-merge.`);
      if (open.has(b)) push(i, `cabang "${b}" sudah ada dan masih terbuka.`);
      if (r.tutupInduk) open.delete(p);
      open.add(b);
      return;
    }
    if (r.aksi === "merge") {
      if (!open.has(b)) push(i, `cabang "${b}" tidak sedang terbuka, jadi tidak bisa di-merge.`);
      if (!open.has(p)) push(i, `cabang tujuan "${p}" tidak sedang terbuka.`);
      if (b === p) push(i, "cabang tidak bisa di-merge ke dirinya sendiri.");
      open.delete(b);
      return;
    }
    // commit
    if (open.size && !open.has(b)) push(i, `cabang "${b}" belum dibuat atau sudah di-merge.`);
    open.add(b);
    if (!r.tautan && !r.teks?.trim()) push(i, "pilih isi di \"Tampilkan isi dari\" atau tulis teks.");
    if (r.tautan) {
      const [kind, ...rest] = r.tautan.split(":");
      const key = rest.join(":");
      const found = {
        pengalaman: () => data.pengalaman?.some((x) => x.posisi === key),
        proyek: () => data.proyek?.some((x) => x.judul === key),
        pendidikan: () => data.pendidikan?.some((x) => x.institusi === key),
      }[kind]?.();
      if (!found) push(i, `isi yang ditautkan ("${key}") sudah tidak ada. Pilih ulang.`);
      if (kind === "pengalaman" && used.has(r.tautan)) push(i, `pengalaman "${key}" sudah dipakai di baris lain.`);
      used.add(r.tautan);
    }
  });
}

function validateFields(fields, obj, where, section, errs) {
  for (const f of fields) {
    if (f.when && !f.when(obj)) continue;
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
  validateGraph(data.riwayat, errs);
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
