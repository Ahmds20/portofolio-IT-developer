// Kode bersama halaman admin: sesi login, tema, dan akses GitHub API.
// Token GitHub hanya disimpan di browser kamu sendiri, tidak pernah ditulis ke repo.
const Admin = (() => {
  const KEY = "portfolio:admin";
  const CFG_KEY = "portfolio:admin-cfg";
  const CONTENT_PATH = "data/content.json";
  const API = "https://api.github.com";

  // ---------- Sesi ----------
  function getSession() {
    try {
      const v = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }
  function setSession(s, remember) {
    try {
      clearSession();
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
    } catch (e) { /* storage diblokir: sesi hanya berlaku di memori */ }
  }
  function clearSession() {
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {}
  }
  // Konfigurasi repo (bukan rahasia) untuk mengisi form login otomatis
  function getConfig() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  }
  function setConfig(c) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {}
  }

  // ---------- Tema (ikut pilihan di website utama) ----------
  function initTheme() {
    let t;
    try { t = localStorage.getItem("theme"); } catch (e) {}
    document.documentElement.dataset.theme = t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  }

  // ---------- Base64 aman untuk UTF-8 ----------
  function toB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromB64(b64) {
    const bin = atob(String(b64).replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }

  // ---------- GitHub API ----------
  async function gh(s, path, opts = {}) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${s.token}`,
    };
    if (opts.body) headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(API + path, { ...opts, headers, cache: "no-store" });
    } catch (e) {
      const err = new Error("Tidak bisa terhubung ke GitHub. Periksa koneksi internet.");
      err.status = 0;
      throw err;
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).message || msg; } catch (e) {}
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const repoBase = (s) => `/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}`;
  const contentsUrl = (s, p) => `${repoBase(s)}/contents/${p.split("/").map(encodeURIComponent).join("/")}`;

  async function getFile(s, path) {
    try {
      return await gh(s, `${contentsUrl(s, path)}?ref=${encodeURIComponent(s.branch)}`);
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }
  function putFile(s, path, base64, message, sha) {
    const body = { message, content: base64, branch: s.branch };
    if (sha) body.sha = sha;
    return gh(s, contentsUrl(s, path), { method: "PUT", body: JSON.stringify(body) });
  }

  // Terjemahkan error GitHub ke pesan yang mudah dipahami
  function explain(e) {
    switch (e.status) {
      case 0: return e.message;
      case 401: return "Token tidak valid atau sudah kedaluwarsa. Silakan login ulang dengan token baru.";
      case 403: return "Akses ditolak. Pastikan token punya izin \"Contents: Read and write\" untuk repo ini.";
      case 404: return "Repo atau branch tidak ditemukan, atau token tidak punya akses ke repo tersebut.";
      case 409: return "Konten di GitHub sudah berubah sejak halaman ini dibuka. Klik \"Muat ulang\" lalu ulangi perubahanmu.";
      case 422: return "GitHub menolak perubahan: " + e.message;
      default: return "Terjadi kesalahan: " + e.message;
    }
  }

  // ---------- Notifikasi kecil ----------
  function toast(msg, type = "info", ms = 5000) {
    let box = document.querySelector(".toasts");
    if (!box) {
      box = document.createElement("div");
      box.className = "toasts";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.append(box);
    }
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, ms);
  }

  return {
    CONTENT_PATH, getSession, setSession, clearSession, getConfig, setConfig,
    initTheme, toggleTheme, toB64, fromB64, gh, repoBase, getFile, putFile, explain, toast,
  };
})();

Admin.initTheme();
