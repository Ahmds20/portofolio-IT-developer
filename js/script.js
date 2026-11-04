// =====================================================================
// Renders the portfolio from data/content.json.
// Content is edited through the /admin page; this file only displays it.
// =====================================================================

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Only allow http(s), mailto, tel, or relative paths.
const safeUrl = (u) => {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ""; // blocks javascript:, data:, etc.
  return s;
};

const icon = (name) => `<svg class="icon"><use href="#i-${esc(name)}"/></svg>`;
const tags = (list) =>
  list && list.length ? `<div class="tags">${list.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : "";
const ext = (url) => (/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : "");

// Text wrapped in *asterisks* gets the highlighter-pen treatment.
let hlCount = 0;
const marked = (s) =>
  esc(s).replace(/\*([^*]+)\*/g, (_, t) => `<mark class="hl" style="--i:${hlCount++}">${t}</mark>`);
const plain = (s) => String(s ?? "").replace(/\*([^*]+)\*/g, "$1");

// Architecture layers: code → short label & color (CSS variable)
const LAYERS = {
  fe: { short: "FE", name: "Frontend" },
  be: { short: "BE", name: "Backend / API" },
  db: { short: "DB", name: "Database" },
  ops: { short: "OPS", name: "DevOps & Cloud" },
};
const layerVar = (k) => (LAYERS[k] ? `--c: var(--${k})` : "");
const splitTech = (s) => String(s || "").split(/\s*[,·]\s*/).map((t) => t.trim()).filter(Boolean);
const shortName = (p) => p.singkat || String(p.judul || "").split(/\s[—–-]\s/)[0];
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Projects × technologies, built from each project's "stack by layer"
function buildMatrix(c) {
  const cols = c.proyek.map((p, i) => ({ p, i })).filter(({ p }) => (p.stack || []).some((s) => s.teknologi));
  const rows = new Map(); // key -> { name, layer, used: Set(colIndex) }
  cols.forEach(({ p }, ci) => {
    (p.stack || []).forEach((s) => {
      splitTech(s.teknologi).forEach((t) => {
        const key = t.toLowerCase();
        if (!rows.has(key)) rows.set(key, { name: t, layer: s.lapisan, used: new Set() });
        rows.get(key).used.add(ci);
      });
    });
  });
  return { cols, rows: [...rows.values()] };
}

// ---------------------------------------------------------------------
// Experience as a git graph.
// Rows come from content.riwayat, in order, oldest first:
//   commit  – a dot on a branch, optionally showing an experience/project/education entry
//   cabang  – a new branch forks off its parent (induk)
//   merge   – a branch joins back into its parent and ends
//   head    – where main is now
// ---------------------------------------------------------------------
const LANE_W = 22; // distance between lanes
const PAD = 9;     // gutter padding left of lane 0
const R = 8;       // radius of the bends
const BRANCH_COLORS = ["fe", "db", "ops"];
let graphLayout = null;
let jumpToProject = () => {};

function graphRows(c) {
  if (Array.isArray(c.riwayat) && c.riwayat.length) return c.riwayat;
  // No graph yet: every experience becomes a commit on main
  return (c.pengalaman || []).map((p) => ({ aksi: "commit", cabang: "main", tautan: `pengalaman:${p.posisi}`, tanggal: "" }));
}

function resolveRef(c, ref) {
  if (!ref) return null;
  const i = ref.indexOf(":");
  const kind = ref.slice(0, i);
  const key = ref.slice(i + 1);
  const field = { pengalaman: "posisi", proyek: "judul", pendidikan: "institusi" }[kind];
  const list = c[kind] || [];
  const index = field ? list.findIndex((x) => x[field] === key) : -1;
  return index < 0 ? null : { kind, index, item: list[index] };
}

// Assigns each branch a lane (column) and a color.
// A new branch takes the first free lane to the right of its parent.
function layoutGraph(input) {
  const lanes = ["main"]; // lane index -> branch name (or null when free)
  const laneOf = new Map([["main", 0]]);
  const colorOf = new Map([["main", "link"]]);
  let maxLane = 0;
  const color = (b) => {
    if (!colorOf.has(b)) colorOf.set(b, BRANCH_COLORS[(colorOf.size - 1) % BRANCH_COLORS.length]);
    return colorOf.get(b);
  };
  const alloc = (b, after) => {
    let l = after + 1;
    while (lanes[l]) l++;
    lanes[l] = b;
    laneOf.set(b, l);
    maxLane = Math.max(maxLane, l);
    return l;
  };
  const free = (b) => { if (laneOf.has(b) && lanes[laneOf.get(b)] === b) lanes[laneOf.get(b)] = null; };
  const ensure = (b) => (laneOf.has(b) && lanes[laneOf.get(b)] === b ? laneOf.get(b) : b === "main" && !lanes[0] ? ((lanes[0] = "main"), 0) : alloc(b, -1));

  const rows = input.map((r) => {
    const branch = String(r.cabang || "main").trim();
    const parent = String(r.induk || "main").trim();
    if (r.aksi === "cabang") {
      const parentLane = ensure(parent);
      const lane = alloc(branch, parentLane);
      if (r.tutupInduk) free(parent);
      return { ...r, type: "cabang", branch, parent, lane, parentLane, closesParent: !!r.tutupInduk, color: color(branch), parentColor: color(parent) };
    }
    if (r.aksi === "merge") {
      const lane = ensure(branch);
      const targetLane = ensure(parent);
      free(branch);
      return { ...r, type: "merge", branch, parent, lane, targetLane, color: color(branch), targetColor: color(parent) };
    }
    if (r.aksi === "head") return { ...r, type: "head", branch: "main", lane: ensure("main"), color: color("main") };
    return { ...r, type: "commit", branch, lane: ensure(branch), color: color(branch) };
  });
  return { rows, maxLane };
}

// Measures where each row sits and draws the lanes, bends and dots.
function drawGraph() {
  const box = document.querySelector(".ggraph");
  const svg = box?.querySelector(".g-svg");
  if (!svg || !graphLayout) return;
  const { rows, maxLane } = graphLayout;
  const gutter = PAD * 2 + maxLane * LANE_W + 12;
  box.style.setProperty("--gutter", `${gutter}px`);

  const top = box.getBoundingClientRect().top;
  const ys = [...box.querySelectorAll(".g-row")].map((el) => {
    const a = el.querySelector("[data-anchor]") || el;
    const rect = a.getBoundingClientRect();
    const line = parseFloat(getComputedStyle(a).fontSize) * 1.35;
    return Math.round(rect.top - top + Math.min(rect.height, line) / 2);
  });
  const X = (lane) => PAD + lane * LANE_W;

  const lines = [];
  const nodes = [];
  const open = new Map(); // branch -> { lane, y, color }
  const last = new Map(); // branch -> last y seen
  const seg = (branch, lane, color, y1, y2, d) => { if (y2 > y1) lines.push({ branch, color, d, path: `M${X(lane)} ${y1}V${y2}` }); };
  const start = (branch, lane, color, y) => { if (!open.has(branch)) open.set(branch, { lane, color, y }); };
  const end = (branch, y, d) => { const o = open.get(branch); if (o) { seg(branch, o.lane, o.color, o.y, y, d); open.delete(branch); } };

  rows.forEach((r, i) => {
    const y = ys[i];
    if (r.type === "cabang") {
      const px = X(r.parentLane);
      const lx = X(r.lane);
      start(r.parent, r.parentLane, r.parentColor, y);
      let d;
      if (r.closesParent) {
        end(r.parent, y - R, i);
        d = `M${px} ${y - R}Q${px} ${y} ${px + R} ${y}H${lx - R}Q${lx} ${y} ${lx} ${y + R}`;
      } else {
        last.set(r.parent, y);
        d = `M${px} ${y}H${lx - R}Q${lx} ${y} ${lx} ${y + R}`;
      }
      lines.push({ branch: r.branch, color: r.color, d: i, path: d });
      open.set(r.branch, { lane: r.lane, color: r.color, y: y + R });
      nodes.push({ branch: r.parent, color: r.parentColor, d: i, svg: r.closesParent ? "" : `<circle class="g-fork" cx="${px}" cy="${y}" r="3"/>` });
    } else if (r.type === "merge") {
      const lx = X(r.lane);
      const tx = X(r.targetLane);
      start(r.branch, r.lane, r.color, y - R);
      end(r.branch, y - R, i);
      start(r.parent, r.targetLane, r.targetColor, y);
      last.set(r.parent, y);
      lines.push({ branch: r.branch, color: r.color, d: i, path: `M${lx} ${y - R}Q${lx} ${y} ${lx - R} ${y}H${tx}` });
      nodes.push({ branch: r.parent, color: r.targetColor, d: i, svg: `<circle class="g-merge" cx="${tx}" cy="${y}" r="4.5"/>` });
    } else {
      const x = X(r.lane);
      start(r.branch, r.lane, r.color, y);
      last.set(r.branch, y);
      // Project commits are drawn as rings so they read as pointers to a card, not as a job
      const hollow = r.type === "commit" && /^proyek:/.test(r.tautan || "");
      nodes.push({
        branch: r.branch, color: r.color, d: i,
        svg: r.type === "head"
          ? `<circle class="g-halo" cx="${x}" cy="${y}" r="11"/><circle class="g-dot" cx="${x}" cy="${y}" r="6.5"/>`
          : `<circle class="g-dot${hollow ? " g-hollow" : ""}" cx="${x}" cy="${y}" r="${hollow ? 5 : 6}"/>`,
      });
    }
  });
  for (const [b] of [...open]) end(b, last.get(b) ?? open.get(b).y, rows.length);

  const h = Math.ceil(box.scrollHeight);
  svg.setAttribute("width", gutter);
  svg.setAttribute("height", h);
  svg.setAttribute("viewBox", `0 0 ${gutter} ${h}`);
  svg.innerHTML =
    lines.map((l) => `<path class="g-line" pathLength="1" data-branch="${esc(l.branch)}" style="--c: var(--${l.color}); --d: ${l.d}" d="${l.path}"/>`).join("") +
    nodes.filter((n) => n.svg).map((n) => `<g class="g-node" data-branch="${esc(n.branch)}" style="--c: var(--${n.color}); --d: ${n.d}">${n.svg}</g>`).join("");
}

function initGraph() {
  const box = document.querySelector(".ggraph");
  if (!box?.querySelector(".g-svg")) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0;
  const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawGraph); };
  drawGraph();
  new ResizeObserver(redraw).observe(box);
  document.fonts?.ready.then(redraw);

  // Draw the lines in once, when the graph first scrolls into view
  if (!reduce && box.getBoundingClientRect().top > innerHeight * 0.7) {
    box.classList.add("g-pending");
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { box.classList.remove("g-pending"); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(box);
  }

  // Hovering a row brings its branch forward
  const svg = box.querySelector(".g-svg");
  let focus = null;
  const setFocus = (b) => {
    if (b === focus) return;
    focus = b;
    svg.querySelectorAll("[data-branch]").forEach((el) => el.classList.toggle("dim", !!b && el.dataset.branch !== b));
  };
  box.addEventListener("mouseover", (e) => setFocus(e.target.closest(".g-row")?.dataset.branch ?? null));
  box.addEventListener("mouseleave", () => setFocus(null));

  box.querySelectorAll(".g-proj[data-project]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); jumpToProject(Number(a.dataset.project)); })
  );
}

const templates = {
  peran: (c) =>
    String(c.profil.peran || "")
      .split(/\s*[·|,/]\s*/)
      .filter(Boolean)
      .map((r, i) => (i ? `<span class="sep">·</span>` : "") + `<span style="color: var(--${["be", "fe", "db"][i % 3]})">${esc(r)}</span>`)
      .join(""),

  heroSocial: (c) =>
    c.kontak.tautan
      .filter((t) => t.tampilDiHero)
      .map((t) => `<a href="${esc(safeUrl(t.url))}"${ext(t.url)} aria-label="${esc(t.label)}" title="${esc(t.label)}">${icon(t.ikon)}</a>`)
      .join(""),

  arsitektur: (c) => {
    const list = c.arsitektur || [];
    const main = list.filter((l) => l.lapisan !== "ops");
    const ops = list.filter((l) => l.lapisan === "ops");
    const layer = (l, cls = "") => `
      <div class="layer ${cls}" style="${layerVar(l.lapisan)}">
        <span class="layer-name">${esc(l.nama)}</span>
        <div><b>${esc(l.teknologi)}</b>${l.keterangan ? `<small>${esc(l.keterangan)}</small>` : ""}</div>
      </div>`;
    return (
      main
        .map((l, i) => layer(l) + (i < main.length - 1 ? `<div class="wire" style="${layerVar(main[i + 1].lapisan)}"><i class="packet" style="animation-delay:${i * 0.6}s"></i></div>` : ""))
        .join("") + ops.map((l) => layer(l, "ops")).join("")
    );
  },

  statistik: (c) =>
    c.statistik.map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd>${esc(s.nilai)}</dd></div>`).join(""),

  tentang: (c) => c.tentang.paragraf.map((p) => `<p>${marked(p)}</p>`).join(""),

  branch: (c) => {
    const n = new Set(graphRows(c).filter((r) => r.aksi === "cabang").map((r) => r.cabang)).size;
    return `<span>main</span>oldest at the top${n ? ` · ${n} ${n === 1 ? "branch" : "branches"}` : ""}`;
  },

  riwayat: (c) => {
    graphLayout = layoutGraph(graphRows(c));
    let lastDate = "";
    const chip = (name, color) => `<span class="g-chip" style="--c: var(--${color})">${esc(name)}</span>`;
    const note = (r) => (r.keterangan ? `<p class="g-note">${esc(r.keterangan)}</p>` : "");
    const rows = graphLayout.rows.map((r) => {
      const date = r.tanggal && r.tanggal !== lastDate ? r.tanggal : "";
      if (r.tanggal) lastDate = r.tanggal;
      let kind = r.type;
      let body;
      if (r.type === "cabang") {
        body = `<p class="g-ref" data-anchor>${chip(r.branch, r.color)}<span class="g-op">branched from</span>${chip(r.parent, r.parentColor)}</p>${note(r)}`;
      } else if (r.type === "merge") {
        body = `<p class="g-ref" data-anchor><span class="g-op">merged</span>${chip(r.branch, r.color)}<span class="g-op">into</span>${chip(r.parent, r.targetColor)}</p>`;
      } else if (r.type === "head") {
        body = `<p class="g-ref g-head" data-anchor><span class="g-chip g-headchip">HEAD</span><span class="g-op">→</span><span class="g-headtext">${esc(r.teks)}</span></p>`;
      } else {
        const ref = resolveRef(c, r.tautan);
        if (ref?.kind === "pengalaman") {
          kind = "exp";
          const p = ref.item;
          body = `<h3 data-anchor>${esc(p.posisi)}</h3>
            <p class="org">${esc(p.organisasi)}</p>
            ${p.periode ? `<p class="g-meta">${esc(p.periode)}</p>` : ""}
            ${p.poin?.length ? `<ul class="commit-msgs">${p.poin.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
            ${tags(p.tag)}`;
        } else if (ref?.kind === "proyek") {
          kind = "proj";
          const p = ref.item;
          body = `<a class="g-proj" href="#projects" data-project="${ref.index}" data-anchor>
              <span class="g-meta">project</span><b>${esc(shortName(p))}</b><span class="g-arrow" aria-hidden="true">→</span>
            </a>${p.jenis ? `<p class="g-note">${esc(p.jenis)}</p>` : ""}`;
        } else if (ref?.kind === "pendidikan") {
          kind = "edu";
          const e = ref.item;
          body = `<h3 data-anchor>${esc(e.institusi)}</h3><p class="org">${esc([e.jurusan, e.periode].filter(Boolean).join(" · "))}</p>`;
        } else {
          body = `<p class="g-text" data-anchor>${esc(r.teks)}</p>`;
        }
        body += kind === "proj" ? "" : note(r);
      }
      return `<div class="g-row g-is-${kind}" data-branch="${esc(r.branch)}" style="--c: var(--${r.color})">
        <div class="g-date">${esc(date)}</div>
        <div class="g-content">${body}</div>
      </div>`;
    });
    return `<svg class="g-svg" aria-hidden="true"></svg>${rows.join("")}`;
  },

  legenda: (c) => {
    const used = new Set((c.proyek || []).flatMap((p) => (p.stack || []).map((s) => s.lapisan)));
    return Object.entries(LAYERS)
      .filter(([k]) => used.has(k))
      .map(([k, v]) => `<li style="${layerVar(k)}"><i></i>${v.short} · ${v.name}</li>`)
      .join("");
  },

  proyek: (c) =>
    c.proyek
      .map((p, i) => {
        const links = [
          safeUrl(p.linkKode) && `<a href="${esc(safeUrl(p.linkKode))}" target="_blank" rel="noopener">${icon("github")}code</a>`,
          safeUrl(p.linkDemo) && `<a href="${esc(safeUrl(p.linkDemo))}" target="_blank" rel="noopener">${icon("arrow")}live demo</a>`,
        ].filter(Boolean);
        const stack = (p.stack || []).filter((s) => s.teknologi);
        return `
      <article class="project${p.unggulan ? " featured" : ""} reveal" data-i="${i}" tabindex="0" aria-label="${esc(p.judul)}">
        <div class="project-main">
          <div class="project-meta">
            ${p.jenis ? `<span class="jenis">${esc(p.jenis)}</span>` : ""}
            ${p.label ? `<span>${esc(p.label)}</span>` : ""}
            ${p.periode ? `<span>${esc(p.periode)}</span>` : ""}
          </div>
          <h3>${esc(p.judul)}</h3>
          <p>${esc(p.deskripsi)}</p>
          ${p.metrik?.length ? `<div class="metrics">${p.metrik.map((m) => `<div><strong>${esc(m.nilai)}</strong><span>${esc(m.label)}</span></div>`).join("")}</div>` : ""}
          ${links.length ? `<div class="project-links">${links.join("")}</div>` : ""}
        </div>
        ${
          stack.length
            ? `<div class="stack" aria-label="Stack by layer">${stack
                .map((s) => `<div style="${layerVar(s.lapisan)}"><i>${esc(LAYERS[s.lapisan]?.short || s.lapisan)}</i><span>${esc(s.teknologi)}</span></div>`)
                .join("")}</div>`
            : tags(p.tag)
        }
      </article>`;
      })
      .join(""),

  matriks: (c) => {
    const { cols, rows } = buildMatrix(c);
    if (!cols.length) return "";
    const head = `<tr><th scope="col" class="m-corner">technology</th>${cols
      .map(({ p }, ci) => `<th scope="col" class="m-proj" data-col="${ci}"><a href="#projects" data-project="${p ? c.proyek.indexOf(p) : ""}">${esc(shortName(p))}</a></th>`)
      .join("")}<th scope="col" class="m-count">used in</th></tr>`;
    const body = Object.entries(LAYERS)
      .map(([k, v]) => {
        const group = rows.filter((r) => r.layer === k).sort((a, b) => b.used.size - a.used.size);
        if (!group.length) return "";
        return (
          `<tr class="m-group" style="${layerVar(k)}"><th scope="rowgroup" colspan="${cols.length + 2}">${v.short} · ${v.name}</th></tr>` +
          group
            .map(
              (r) => `<tr style="${layerVar(k)}"><th scope="row">${esc(r.name)}</th>${cols
                .map((_, ci) => (r.used.has(ci) ? `<td data-col="${ci}"><span class="m-dot" title="Used"></span><span class="sr">yes</span></td>` : `<td data-col="${ci}" class="m-no"><span class="sr">no</span></td>`))
                .join("")}<td class="m-count">${r.used.size}</td></tr>`
            )
            .join("")
        );
      })
      .join("");
    return `<table class="matrix"><caption class="sr">Technologies used in each project, grouped by layer</caption><thead>${head}</thead><tbody>${body}</tbody></table>`;
  },

  lainnya: (c) => {
    const inMatrix = new Set(buildMatrix(c).rows.map((r) => r.name.toLowerCase()));
    const groups = c.keahlian
      .map((k) => ({ ...k, rest: (k.tag || []).filter((t) => !inMatrix.has(t.toLowerCase())) }))
      .filter((k) => k.rest.length);
    if (!groups.length) return "";
    return `<h3 class="also-title">Also worked with</h3><dl class="also-list">${groups
      .map((k) => `<div style="${layerVar(k.lapisan)}"><dt>${esc(k.kategori)}</dt><dd>${tags(k.rest)}</dd></div>`)
      .join("")}</dl>`;
  },

  pendidikan: (c) =>
    c.pendidikan
      .map(
        (e) => `
      <article class="edu-card reveal">
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
        <span class="contact-text"><small>${esc(t.label)}</small><span>${esc(t.teks)}</span></span>
        <span class="contact-go" aria-hidden="true">↗</span>
      </a>`
      )
      .join(""),
};

function render(c) {
  const p = c.profil;
  hlCount = 0;
  const peranPendek = String(p.peran || "").split(/\s*[·|,]\s*/)[0].toLowerCase();
  const text = {
    nama: p.nama, statusText: p.teksStatus, lokasi: p.lokasi, peranPendek,
    tentangJudul: c.tentang.judul, kontakJudul: c.kontak.judul, kontakPengantar: c.kontak.pengantar,
  };

  document.querySelectorAll("[data-bind]").forEach((el) => {
    const k = el.dataset.bind;
    if (k in text) el.textContent = text[k] ?? "";
    else if (k === "ringkasan") el.innerHTML = marked(p.ringkasan);
    else if (k === "cv") { el.href = safeUrl(p.cv) || "#"; el.hidden = !p.cv; }
    else if (k === "foto") { el.src = safeUrl(p.foto); el.alt = `Photo of ${p.nama}`; el.hidden = !p.foto; }
    else if (k === "status") el.hidden = !p.terbukaKerja;
  });
  document.querySelectorAll("[data-list]").forEach((el) => {
    const fn = templates[el.dataset.list];
    if (fn) el.innerHTML = fn(c);
  });

  const title = `${p.nama} — ${String(p.peran).split(/\s*[·|]\s*/)[0].trim()}`;
  const desc = plain(p.metaDeskripsi || p.ringkasan || "");
  document.title = title;
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
}

// ---------------------------------------------------------------------
// Request trace: the panel beside the projects lights up the layers
// the selected project touches and sends a packet through them.
// ---------------------------------------------------------------------
function initTrace(c) {
  const cards = [...document.querySelectorAll(".project")];
  const body = document.getElementById("trace-body");
  const dot = document.getElementById("trace-dot");
  if (!cards.length || !body) return;

  const names = Object.fromEntries((c.arsitektur || []).map((l) => [l.lapisan, l.nama]));
  const rows = Object.keys(LAYERS).map((k) => {
    const el = document.createElement("div");
    el.className = "t-layer";
    el.style.setProperty("--c", `var(--${k})`);
    el.innerHTML = `<span class="t-node"></span><span class="t-name">${esc(names[k] || LAYERS[k].name)}</span><span class="t-tech"></span>`;
    body.append(el);
    return { k, el, node: el.querySelector(".t-node"), tech: el.querySelector(".t-tech") };
  });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let anim = null;
  let current = -1;

  const select = (i, force) => {
    if (i === current && !force) return;
    current = i;
    const p = c.proyek[i];
    cards.forEach((el) => el.classList.toggle("is-active", Number(el.dataset.i) === i));

    const byLayer = {};
    (p.stack || []).forEach((s) => { if (s.teknologi) byLayer[s.lapisan] = byLayer[s.lapisan] ? `${byLayer[s.lapisan]}, ${s.teknologi}` : s.teknologi; });
    rows.forEach(({ k, el, tech }) => {
      const on = Boolean(byLayer[k]);
      el.classList.toggle("on", on);
      tech.textContent = on ? byLayer[k] : "not used";
    });
    const used = rows.filter((r) => r.el.classList.contains("on"));
    document.getElementById("trace-route").textContent = `/${slug(shortName(p))}`;
    document.getElementById("trace-foot").textContent = used.length
      ? `Touches ${used.length} of ${rows.length} layers${p.jenis ? ` · ${p.jenis}` : ""}`
      : "No stack added for this project yet";

    anim?.cancel();
    if (reduce || !used.length || !body.offsetParent) { dot.style.opacity = "0"; return; }
    const ys = used.map((r) => r.node.offsetTop + r.node.offsetHeight / 2 - 4);
    const n = ys.length;
    const frames = [{ transform: `translateY(${ys[0] - 18}px)`, opacity: 0, offset: 0 }];
    ys.forEach((y, j) => frames.push({ transform: `translateY(${y}px)`, opacity: 1, offset: n === 1 ? 0.5 : 0.12 + (0.72 * j) / (n - 1) }));
    frames.push({ transform: `translateY(${ys[n - 1] + 18}px)`, opacity: 0, offset: 1 });
    dot.style.opacity = "";
    anim = dot.animate(frames, { duration: 900 + n * 500, iterations: Infinity, easing: "ease-in-out" });
  };

  // After a jump from the stack table, ignore hover for a moment so the card
  // that happens to end up under the cursor does not override the choice.
  let hoverLockUntil = 0;
  cards.forEach((el) => {
    const i = Number(el.dataset.i);
    el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && Date.now() > hoverLockUntil) select(i); });
    el.addEventListener("focusin", () => select(i));
    el.addEventListener("click", () => select(i));
  });
  // Project links in the stack table and the git graph jump to and trace that project
  jumpToProject = (i) => {
    const card = cards.find((el) => Number(el.dataset.i) === i);
    if (!card) return;
    hoverLockUntil = Date.now() + 1200;
    select(i);
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };
  document.querySelectorAll(".matrix [data-project]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); jumpToProject(Number(a.dataset.project)); })
  );
  let t;
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => select(current, true), 150); });
  const featured = c.proyek.findIndex((p) => p.unggulan);
  select(featured >= 0 ? featured : 0);
}

// Highlight a whole column of the stack table on hover
function initMatrix() {
  const table = document.querySelector(".matrix");
  if (!table) return;
  const set = (col) => table.querySelectorAll("[data-col]").forEach((el) => el.classList.toggle("col-on", el.dataset.col === col));
  table.addEventListener("mouseover", (e) => { const cell = e.target.closest("[data-col]"); set(cell ? cell.dataset.col : null); });
  table.addEventListener("mouseleave", () => set(null));
}

async function loadContent() {
  // Preview mode from the admin page: show the unpublished draft.
  if (new URLSearchParams(location.search).has("preview")) {
    try {
      const draft = localStorage.getItem("portfolio:preview");
      if (draft) return JSON.parse(draft);
    } catch (e) { /* fall back to the file */ }
  }
  const res = await fetch("data/content.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load content (${res.status})`);
  return res.json();
}

// ---------------------------------------------------------------------
// UI interactions
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
  const setOpen = (open) => { links.classList.toggle("open", open); toggle.setAttribute("aria-expanded", String(open)); };
  toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));

  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
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

initUI();
loadContent()
  .then((c) => { render(c); initTrace(c); initMatrix(); initGraph(); })
  .catch((err) => {
    console.error(err);
    document.querySelector("main").insertAdjacentHTML(
      "afterbegin",
      `<div class="container"><div class="load-error">Content failed to load. If you opened the file directly (file://), serve it locally instead, for example with <code>python -m http.server</code>.</div></div>`
    );
  });
