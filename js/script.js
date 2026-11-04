// =====================================================================
// Render konten portofolio dari data/content.json
// Konten diedit lewat halaman /admin, file ini hanya menampilkannya.
// =====================================================================

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Hanya izinkan URL http(s), mailto, tel, atau path relatif.
const safeUrl = (u) => {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ""; // blokir javascript:, data:, dll.
  return s;
};

const icon = (name) => `<svg class="icon"><use href="#i-${esc(name)}"/></svg>`;
const tags = (list) =>
  list && list.length ? `<div class="tags">${list.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : "";
const ext = (url) => (/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : "");

const templates = {
  heroSocial: (c) =>
    c.kontak.tautan
      .filter((t) => t.tampilDiHero)
      .map((t) => `<a href="${esc(safeUrl(t.url))}"${ext(t.url)} aria-label="${esc(t.label)}" title="${esc(t.label)}">${icon(t.ikon)}</a>`)
      .join("") +
    (c.profil.lokasi ? `<span class="hero-loc">${icon("pin")}${esc(c.profil.lokasi)}</span>` : ""),

  statistik: (c) =>
    c.statistik.map((s) => `<div class="stat"><strong>${esc(s.nilai)}</strong><span>${esc(s.label)}</span></div>`).join(""),

  tentang: (c) => c.tentang.paragraf.map((p) => `<p>${esc(p)}</p>`).join(""),

  pengalaman: (c) =>
    c.pengalaman
      .map(
        (p) => `
      <article class="timeline-item reveal">
        <div class="timeline-date">${esc(p.periode)}</div>
        <div class="timeline-body">
          <h3>${esc(p.posisi)}</h3>
          <p class="org">${esc(p.organisasi)}</p>
          ${p.poin?.length ? `<ul>${p.poin.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          ${tags(p.tag)}
        </div>
      </article>`
      )
      .join(""),

  proyek: (c) =>
    c.proyek
      .map((p) => {
        const links = [
          safeUrl(p.linkKode) && `<a href="${esc(safeUrl(p.linkKode))}" target="_blank" rel="noopener">${icon("github")}Kode</a>`,
          safeUrl(p.linkDemo) && `<a href="${esc(safeUrl(p.linkDemo))}" target="_blank" rel="noopener">${icon("arrow")}Demo</a>`,
        ].filter(Boolean);
        return `
      <article class="project-card${p.unggulan ? " featured" : ""} reveal">
        <div class="project-head">
          <span class="project-icon">${icon(p.ikon || "code")}</span>
          <div>
            <span class="project-label">${esc(p.label)}</span>
            <span class="date">${esc(p.periode)}</span>
          </div>
        </div>
        <h3>${esc(p.judul)}</h3>
        <p>${esc(p.deskripsi)}</p>
        ${
          p.metrik?.length
            ? `<div class="metrics">${p.metrik.map((m) => `<div><strong>${esc(m.nilai)}</strong><span>${esc(m.label)}</span></div>`).join("")}</div>`
            : ""
        }
        ${tags(p.tag)}
        ${links.length ? `<div class="project-links">${links.join("")}</div>` : ""}
      </article>`;
      })
      .join(""),

  keahlian: (c) =>
    c.keahlian.map((k) => `<div class="skill-group reveal"><h4>${esc(k.kategori)}</h4>${tags(k.tag)}</div>`).join(""),

  pendidikan: (c) =>
    c.pendidikan
      .map(
        (e) => `
      <article class="edu-card reveal">
        <span class="project-icon">${icon("cap")}</span>
        <h3>${esc(e.institusi)}</h3>
        <p class="org">${esc(e.jurusan)}</p>
        <div class="edu-meta"><span class="date">${esc(e.periode)}</span>${e.nilai ? `<span class="gpa">${esc(e.nilai)}</span>` : ""}</div>
        ${e.deskripsi ? `<p class="edu-desc">${esc(e.deskripsi)}</p>` : ""}
      </article>`
      )
      .join(""),

  sertifikasi: (c) =>
    c.sertifikasi
      .map(
        (g) => `
      <div class="cert-group">
        <h4>${esc(g.penerbit)} <span class="date">${esc(g.periode)}</span></h4>
        <ul>${g.item
          .map((i) => {
            const u = safeUrl(i.url);
            return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(i.nama)}</a>` : `<span>${esc(i.nama)}</span>`}</li>`;
          })
          .join("")}</ul>
      </div>`
      )
      .join(""),

  kontak: (c) =>
    c.kontak.tautan
      .map(
        (t) => `
      <a href="${esc(safeUrl(t.url))}"${ext(t.url)} class="contact-item">
        <span class="contact-icon">${icon(t.ikon)}</span>
        <span><small>${esc(t.label)}</small>${esc(t.teks)}</span>
      </a>`
      )
      .join(""),
};

function render(c) {
  const p = c.profil;
  const text = {
    nama: p.nama, peran: p.peran, ringkasan: p.ringkasan, statusText: p.teksStatus,
    tentangJudul: c.tentang.judul, kontakJudul: c.kontak.judul, kontakPengantar: c.kontak.pengantar,
  };

  document.querySelectorAll("[data-bind]").forEach((el) => {
    const k = el.dataset.bind;
    if (k in text) el.textContent = text[k] ?? "";
    else if (k === "cv") { el.href = safeUrl(p.cv) || "#"; el.hidden = !p.cv; }
    else if (k === "foto") { el.src = safeUrl(p.foto); el.alt = `Foto ${p.nama}`; }
    else if (k === "status") el.hidden = !p.terbukaKerja;
  });
  document.querySelectorAll("[data-list]").forEach((el) => {
    el.innerHTML = templates[el.dataset.list](c);
  });

  document.title = `${p.nama} — ${String(p.peran).split("·")[0].trim()}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", p.metaDeskripsi || "");
}

async function loadContent() {
  // Mode pratinjau dari halaman admin: tampilkan draf yang belum dipublikasikan.
  if (new URLSearchParams(location.search).has("preview")) {
    try {
      const draft = localStorage.getItem("portfolio:preview");
      if (draft) return JSON.parse(draft);
    } catch (e) { /* lanjut ambil dari file */ }
  }
  const res = await fetch("data/content.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Gagal memuat konten (${res.status})`);
  return res.json();
}

// ---------------------------------------------------------------------
// Interaksi UI
// ---------------------------------------------------------------------
function initUI() {
  document.getElementById("year").textContent = new Date().getFullYear();

  document.querySelector(".theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  toggle.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));

  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll);
  onScroll();

  const navObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        links.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
      }
    }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  document.querySelectorAll("main section[id]").forEach((s) => navObserver.observe(s));
}

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); } }),
    { threshold: 0.1 }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

initUI();
loadContent()
  .then((c) => { render(c); initReveal(); })
  .catch((err) => {
    console.error(err);
    document.querySelector("main").insertAdjacentHTML(
      "afterbegin",
      `<div class="container load-error">Konten gagal dimuat. Jika file dibuka langsung (file://), jalankan lewat server lokal, misalnya <code>python -m http.server</code>.</div>`
    );
  });
