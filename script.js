/**
 * WarungKu — Pembukuan Utang Warung Klontong
 * v3.0 - Peningkatan UI/UX, mobile support, dark mode,
 *        pencarian & filter transaksi, paginasi, backup/restore,
 *        detail & edit transaksi, navigasi badge.
 * Data disimpan di browser (localStorage).
 */

const STORAGE_KEY_PELANGGAN = "warungku_pelanggan";
const STORAGE_KEY_TRANSAKSI = "warungku_transaksi";
const STORAGE_KEY_THEME = "warungku_theme";
const STORAGE_KEY_PREFS = "warungku_prefs";

const app = {
  pelanggan: [],
  transaksi: [],
  currentView: "dashboard",
  confirmAction: null,
  pendingTransaksiPelanggan: null, // { source: 'transaksi'|'modal' } when adding from transaksi form

  // v3.0 state
  theme: "light",
  pageSize: 10,
  transaksiPage: 1,
  transaksiFilter: { search: "", pelanggan: "", jenis: "" },
  detailPelangganId: null,

  // ========== INISIALISASI ==========
  init() {
    this.loadData();
    this.loadPrefs();
    this.applyTheme(this.theme, false);
    this.setupEventListeners();
    this.render();
    this.setTodayDate();
    this.updatePrintDate();
  },

  loadData() {
    try {
      const p = localStorage.getItem(STORAGE_KEY_PELANGGAN);
      const t = localStorage.getItem(STORAGE_KEY_TRANSAKSI);
      this.pelanggan = p ? JSON.parse(p) : [];
      this.transaksi = t ? JSON.parse(t) : [];
    } catch (e) {
      console.error("Gagal memuat data:", e);
      this.pelanggan = [];
      this.transaksi = [];
    }
  },

  loadPrefs() {
    try {
      const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFS) || "{}");
      if (prefs.pageSize) this.pageSize = prefs.pageSize;
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme) this.theme = savedTheme;
    } catch (e) {}
  },

  savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify({ pageSize: this.pageSize }));
    } catch (e) {}
  },

  saveData() {
    localStorage.setItem(STORAGE_KEY_PELANGGAN, JSON.stringify(this.pelanggan));
    localStorage.setItem(STORAGE_KEY_TRANSAKSI, JSON.stringify(this.transaksi));
  },

  setTodayDate() {
    const today = new Date().toISOString().split("T")[0];
    document.querySelectorAll('input[type="date"]').forEach((el) => {
      if (!el.value) el.value = today;
    });
  },

  setupEventListeners() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("submit", (e) => { e.preventDefault(); fn(); });
    };
    bind("pelanggan-form", () => this.savePelanggan());
    bind("transaksi-form", () => this.saveTransaksi());
    bind("transaksi-modal-form", () => this.saveTransaksiFromModal());

    const search = document.getElementById("pelanggan-search");
    if (search) search.addEventListener("input", (e) => this.renderPelangganTable(e.target.value));

    // Filter & pencarian transaksi (v3.0)
    const trxSearch = document.getElementById("transaksi-search");
    if (trxSearch) trxSearch.addEventListener("input", (e) => {
      this.transaksiFilter.search = e.target.value;
      this.transaksiPage = 1;
      this.renderTransaksiTable();
    });
    const fPel = document.getElementById("transaksi-filter-pelanggan");
    if (fPel) fPel.addEventListener("change", (e) => {
      this.transaksiFilter.pelanggan = e.target.value;
      this.transaksiPage = 1;
      this.renderTransaksiTable();
    });
    const fJenis = document.getElementById("transaksi-filter-jenis");
    if (fJenis) fJenis.addEventListener("change", (e) => {
      this.transaksiFilter.jenis = e.target.value;
      this.transaksiPage = 1;
      this.renderTransaksiTable();
    });

    // Ukuran halaman (v3.0)
    const pageSizeSel = document.getElementById("page-size-select");
    if (pageSizeSel) {
      pageSizeSel.value = String(this.pageSize);
      pageSizeSel.addEventListener("change", (e) => {
        this.pageSize = parseInt(e.target.value) || 10;
        this.transaksiPage = 1;
        this.savePrefs();
        this.renderTransaksiTable();
      });
    }

    // Radio buttons jenis transaksi (halaman transaksi)
    document.querySelectorAll('input[name="type"]').forEach((el) => {
      el.addEventListener("change", () => this.updateTypeStyle());
    });

    // Tutup modal dengan tombol Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeTopModal();
    });
  },

  closeTopModal() {
    const modals = [
      ["modal-confirm", () => this.closeConfirmModal()],
      ["modal-detail", () => this.closeDetailModal()],
      ["modal-transaksi-detail", () => this.closeTransaksiDetail()],
      ["modal-transaksi", () => this.closeTransaksiModal()],
      ["modal-pelanggan", () => this.closePelangganModal()],
    ];
    for (const [id, close] of modals) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains("hidden")) { close(); return; }
    }
  },

  updateTypeStyle() {
    // Styling handled by Tailwind peer-checked CSS (list type labels).
  },

  // ========== TEMA (DARK MODE) ==========
  applyTheme(theme, persist = true) {
    this.theme = theme;
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY_THEME, theme); } catch (e) {}
    }
    this.updateThemeUI(isDark);
  },

  toggleTheme() {
    this.applyTheme(this.theme === "dark" ? "light" : "dark");
    this.showToast(this.theme === "dark" ? "Mode gelap aktif" : "Mode terang aktif", "success");
  },

  updateThemeUI(isDark) {
    const toggle = document.getElementById("theme-toggle");
    const knob = document.getElementById("theme-toggle-knob");
    const icon = document.getElementById("theme-toggle-icon");
    const mobileIcon = document.getElementById("mobile-theme-icon");
    if (toggle) {
      toggle.classList.toggle("bg-indigo-600", isDark);
      toggle.classList.toggle("bg-gray-300", !isDark);
      toggle.setAttribute("aria-checked", String(isDark));
    }
    if (knob) knob.style.transform = isDark ? "translateX(28px)" : "translateX(0)";
    if (icon) icon.className = isDark ? "fas fa-moon text-indigo-600" : "fas fa-sun text-amber-500";
    if (mobileIcon) mobileIcon.className = isDark ? "fas fa-sun text-lg" : "fas fa-moon text-lg";
  },

  // ========== NAVIGASI VIEW ==========
  showView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll(".view-section").forEach((el) => el.classList.add("hidden"));
    const target = document.getElementById("view-" + viewName);
    if (target) target.classList.remove("hidden");

    // Sidebar (desktop)
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.remove("active", "text-indigo-600", "bg-indigo-50");
      el.classList.add("text-gray-600");
    });
    const activeLink = document.querySelector(`a[onclick="app.showView('${viewName}')"]`);
    if (activeLink) {
      activeLink.classList.remove("text-gray-600");
      activeLink.classList.add("active", "text-indigo-600", "bg-indigo-50");
    }

    // Bottom nav (mobile)
    document.querySelectorAll(".bottom-nav-item").forEach((el) => {
      el.classList.remove("active");
      el.classList.add("text-gray-500");
    });
    const bottomNav = document.querySelector(`button.bottom-nav-item[onclick="app.showView('${viewName}')"]`);
    if (bottomNav) {
      bottomNav.classList.remove("text-gray-500");
      bottomNav.classList.add("active");
    }

    this.closeSidebar();
    this.render();
    this.updatePrintDate();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-overlay");
    const isOpen = !sidebar.classList.contains("-translate-x-full");
    if (isOpen) this.closeSidebar();
    else {
      sidebar.classList.remove("-translate-x-full");
      overlay?.classList.remove("hidden");
    }
  },

  closeSidebar() {
    document.getElementById("sidebar")?.classList.add("-translate-x-full");
    document.getElementById("mobile-overlay")?.classList.add("hidden");
  },

  fabAction() {
    if (this.currentView === "pelanggan") this.openPelangganModal();
    else if (this.currentView === "dashboard" || this.currentView === "rekap" || this.currentView === "pengaturan") {
      this.showView("transaksi");
      setTimeout(() => this.openTransaksiModal(), 150);
    } else {
      this.openTransaksiModal();
    }
  },

  // ========== RENDER ==========
  render() {
    this.renderDashboard();
    this.renderPelangganTable(document.getElementById("pelanggan-search")?.value || "");
    this.renderTransaksiTable();
    this.renderRekapTable();
    this.fillPelangganSelects();
    this.fillTransaksiFilter();
    this.updateNavBadges();
    this.updateTypeStyle();
  },

  updateNavBadges() {
    const setBadge = (id, count, cls) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (count > 0) {
        el.textContent = count > 99 ? "99+" : count;
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    };
    const belumLunas = this.getPelangganWithSisa().filter((p) => p.sisa > 0).length;
    setBadge("nav-badge-rekap", belumLunas);
    const today = new Date().toISOString().split("T")[0];
    const trxToday = this.transaksi.filter((t) => t.tanggal === today).length;
    setBadge("nav-badge-transaksi", trxToday);
  },

  hitungSisa(pelangganId) {
    const trx = this.transaksi.filter((t) => t.pelangganId === pelangganId);
    const utang = trx.filter((t) => t.type === "utang").reduce((a, t) => a + t.nominal, 0);
    const bayar = trx.filter((t) => t.type === "pelunasan").reduce((a, t) => a + t.nominal, 0);
    return utang - bayar;
  },

  getPelangganWithSisa() {
    return this.pelanggan.map((p) => ({ ...p, sisa: this.hitungSisa(p.id) }));
  },

  getLastTransaksiDate(pelangganId) {
    const trx = this.transaksi
      .filter((t) => t.pelangganId === pelangganId)
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    return trx.length > 0 ? trx[0].tanggal : null;
  },

  renderDashboard() {
    const sisaList = this.getPelangganWithSisa();
    const totalUtang = sisaList.filter((p) => p.sisa > 0).reduce((a, p) => a + p.sisa, 0);
    const lunas = sisaList.filter((p) => p.sisa === 0).length;
    const totalTransaksi = this.transaksi.length;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText("stat-total-utang", this.formatRupiah(totalUtang));
    setText("stat-jumlah-pelanggan", this.pelanggan.length + " orang");
    setText("stat-lunas", lunas + " orang");
    setText("stat-total-transaksi", totalTransaksi);

    const tbody = document.getElementById("dashboard-table-body");
    const empty = document.getElementById("dashboard-empty");
    if (!tbody) return;
    tbody.innerHTML = "";

    const recent = sisaList
      .sort((a, b) => {
        const ta = this.getLastTransaksiDate(a.id) || "";
        const tb = this.getLastTransaksiDate(b.id) || "";
        return new Date(tb) - new Date(ta);
      })
      .slice(0, 10);

    if (recent.length === 0) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");

    recent.forEach((p) => {
      const sisa = p.sisa;
      const lastDate = this.getLastTransaksiDate(p.id) || "-";
      const status = sisa > 0
        ? `<span class="text-xs font-medium px-2.5 py-1 rounded-full text-orange-600 bg-orange-50">Utang</span>`
        : `<span class="text-xs font-medium px-2.5 py-1 rounded-full text-green-600 bg-green-50">Lunas</span>`;
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors";
      tr.innerHTML = `
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(p.nama)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(p.catatan || "-")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-600">${lastDate === "-" ? "-" : this.formatDateTrx(lastDate)}</td>
        <td class="px-6 py-4 text-right font-semibold text-gray-900">${this.formatRupiah(sisa)}</td>
        <td class="px-6 py-4 text-right">${status}</td>
        <td class="px-6 py-4 text-right">
          <button onclick="app.openDetail(${p.id})" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Lihat <i class="fas fa-arrow-right ml-1 text-xs"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });
  },

  renderPelangganTable(search = "") {
    const tbody = document.getElementById("pelanggan-table-body");
    const empty = document.getElementById("pelanggan-empty");
    if (!tbody) return;
    tbody.innerHTML = "";

    const q = search.toLowerCase();
    const filtered = this.pelanggan.filter((p) =>
      p.nama.toLowerCase().includes(q) ||
      (p.kontak || "").toLowerCase().includes(q) ||
      (p.catatan || "").toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");

    filtered.forEach((p) => {
      const sisa = this.hitungSisa(p.id);
      const status = sisa > 0
        ? `<span class="text-xs font-medium px-2.5 py-1 rounded-full text-orange-600 bg-orange-50">Utang</span>`
        : `<span class="text-xs font-medium px-2.5 py-1 rounded-full text-green-600 bg-green-50">Lunas</span>`;
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors";
      tr.innerHTML = `
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
              ${this.getInitials(p.nama)}
            </div>
            <div>
              <div class="font-semibold text-gray-900">${this.escapeHtml(p.nama)}</div>
              <div class="text-xs text-gray-500">${this.escapeHtml(p.catatan || "-")}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-600">${this.escapeHtml(p.kontak || "-")}</td>
        <td class="px-6 py-4 text-right font-semibold text-gray-900">${this.formatRupiah(sisa)}</td>
        <td class="px-6 py-4">${status}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex justify-end gap-2">
            <button onclick="app.openDetail(${p.id})" class="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">Detail</button>
            <button onclick="app.editPelanggan(${p.id})" class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">Edit</button>
            <button onclick="app.confirmDelete('pelanggan', ${p.id})" class="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Hapus</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  },

  getFilteredTransaksi() {
    const { search, pelanggan, jenis } = this.transaksiFilter;
    const q = search.toLowerCase().trim();
    return [...this.transaksi]
      .filter((t) => {
        const p = this.pelanggan.find((x) => x.id === t.pelangganId);
        const nama = p ? p.nama.toLowerCase() : "";
        const ket = (t.keterangan || "").toLowerCase();
        const matchSearch = !q || nama.includes(q) || ket.includes(q);
        const matchPel = !pelanggan || String(t.pelangganId) === String(pelanggan);
        const matchJenis = !jenis || t.type === jenis;
        return matchSearch && matchPel && matchJenis;
      })
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  },

  fillTransaksiFilter() {
    const sel = document.getElementById("transaksi-filter-pelanggan");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Semua Pelanggan</option>';
    this.pelanggan.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.nama;
      sel.appendChild(opt);
    });
    sel.value = current;
  },

  renderTransaksiTable() {
    const tbody = document.getElementById("transaksi-table-body");
    const empty = document.getElementById("transaksi-empty");
    const count = document.getElementById("transaksi-count");
    const pagination = document.getElementById("transaksi-pagination");
    const pageButtons = document.getElementById("transaksi-page-buttons");
    const pageInfo = document.getElementById("transaksi-page-info");
    if (!tbody) return;
    tbody.innerHTML = "";

    const all = this.getFilteredTransaksi();
    const total = all.length;

    if (count) count.textContent = total + " transaksi";

    if (total === 0) {
      if (empty) empty.classList.remove("hidden");
      if (pagination) pagination.classList.add("hidden");
      if (pagination) pagination.classList.remove("flex");
      return;
    }
    if (empty) empty.classList.add("hidden");

    // Pagination
    const size = this.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / size));
    if (this.transaksiPage > totalPages) this.transaksiPage = totalPages;
    if (this.transaksiPage < 1) this.transaksiPage = 1;
    const start = (this.transaksiPage - 1) * size;
    const pageItems = all.slice(start, start + size);

    pageItems.forEach((trx) => {
      const pelanggan = this.pelanggan.find((p) => p.id === trx.pelangganId);
      const nama = pelanggan ? pelanggan.nama : "Tidak diketahui";
      const isUtang = trx.type === "utang";
      const badge = isUtang
        ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold text-orange-700 bg-orange-100"><i class="fas fa-arrow-up mr-1"></i>Utang</span>`
        : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold text-green-700 bg-green-100"><i class="fas fa-arrow-down mr-1"></i>Pelunasan</span>`;
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors cursor-pointer";
      tr.onclick = () => this.openTransaksiDetail(trx.id);
      tr.innerHTML = `
        <td class="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">${this.formatDateTrx(trx.tanggal)}</td>
        <td class="px-4 py-4 text-sm font-medium text-gray-900">${this.escapeHtml(nama)}</td>
        <td class="px-4 py-4">${badge}</td>
        <td class="px-4 py-4 text-sm text-right font-semibold ${isUtang ? "text-red-600" : "text-green-600"}">${isUtang ? "+" : "-"}${this.formatRupiah(trx.nominal)}</td>
        <td class="px-4 py-4 text-sm text-gray-600">${this.escapeHtml(trx.keterangan || "-")}</td>
        <td class="px-4 py-4 text-right">
          <div class="flex justify-end gap-1">
            <button onclick="event.stopPropagation(); app.editTransaksi(${trx.id})" title="Edit" class="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"><i class="fas fa-pen text-xs"></i></button>
            <button onclick="event.stopPropagation(); app.confirmDelete('transaksi', ${trx.id})" title="Hapus" class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"><i class="fas fa-trash text-xs"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });

    // Render pagination controls
    if (pagination && pageButtons && pageInfo) {
      if (totalPages > 1) {
        pagination.classList.remove("hidden");
        pagination.classList.add("flex");
        pageInfo.textContent = `Menampilkan ${start + 1}–${Math.min(start + size, total)} dari ${total} transaksi`;
        this.renderPaginationButtons(pageButtons, totalPages);
      } else {
        pagination.classList.add("hidden");
        pagination.classList.remove("flex");
      }
    }
  },

  renderPaginationButtons(container, totalPages) {
    container.innerHTML = "";
    const cur = this.transaksiPage;
    const makeBtn = (label, page, opts = {}) => {
      const b = document.createElement("button");
      b.className = "pagination-btn" + (opts.active ? " active" : "");
      b.innerHTML = label;
      b.disabled = !!opts.disabled;
      if (!opts.disabled && !opts.active) b.onclick = () => this.goToTransaksiPage(page);
      container.appendChild(b);
    };
    makeBtn('<i class="fas fa-chevron-left"></i>', cur - 1, { disabled: cur === 1 });
    // ringkas: 1 ... cur-1 cur cur+1 ... last
    const pages = new Set([1, totalPages, cur, cur - 1, cur + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    let prev = 0;
    sorted.forEach((p) => {
      if (p - prev > 1) {
        const span = document.createElement("span");
        span.className = "px-1 text-gray-400 text-sm";
        span.textContent = "…";
        container.appendChild(span);
      }
      makeBtn(String(p), p, { active: p === cur });
      prev = p;
    });
    makeBtn('<i class="fas fa-chevron-right"></i>', cur + 1, { disabled: cur === totalPages });
  },

  goToTransaksiPage(page) {
    this.transaksiPage = page;
    this.renderTransaksiTable();
    const card = document.getElementById("transaksi-table-body");
    card?.closest(".bg-white")?.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  renderRekapTable() {
    const tbody = document.getElementById("rekap-table-body");
    const empty = document.getElementById("rekap-empty");
    if (!tbody) return;
    tbody.innerHTML = "";

    const list = this.getPelangganWithSisa();
    if (list.length === 0) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");

    let totalUtang = 0;
    let totalDibayar = 0;
    let belumLunas = 0;
    let totalTransaksi = this.transaksi.length;

    list.forEach((p, index) => {
      const trxP = this.transaksi.filter((t) => t.pelangganId === p.id);
      const totalUtangP = trxP.filter((t) => t.type === "utang").reduce((a, t) => a + t.nominal, 0);
      const totalBayarP = trxP.filter((t) => t.type === "pelunasan").reduce((a, t) => a + t.nominal, 0);
      const sisa = p.sisa;

      totalUtang += totalUtangP;
      totalDibayar += totalBayarP;
      if (sisa > 0) belumLunas++;

      const status = sisa > 0
        ? `<span class="text-xs font-medium px-2.5 py-1 rounded-full text-orange-600 bg-orange-50">Belum Lunas</span>`
        : `<span class="text-xs font-medium px-2.5 py-1 rounded-full text-green-600 bg-green-50">Lunas</span>`;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors";
      tr.innerHTML = `
        <td class="px-6 py-4 text-sm text-gray-600">${index + 1}</td>
        <td class="px-6 py-4 text-sm font-semibold text-gray-900">${this.escapeHtml(p.nama)}</td>
        <td class="px-6 py-4 text-sm text-right text-gray-600">${this.formatRupiah(totalUtangP)}</td>
        <td class="px-6 py-4 text-sm text-right text-gray-600">${this.formatRupiah(totalBayarP)}</td>
        <td class="px-6 py-4 text-sm text-right font-bold ${sisa > 0 ? "text-red-600" : "text-green-600"}">${this.formatRupiah(sisa)}</td>
        <td class="px-6 py-4">${status}</td>
        <td class="px-6 py-4 text-right no-print">
          <button onclick="app.openDetail(${p.id})" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Detail</button>
        </td>`;
      tbody.appendChild(tr);
    });

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText("rekap-total", this.formatRupiah(totalUtang));
    setText("rekap-jumlah-pelanggan", this.pelanggan.length + " orang");
    setText("rekap-belum-lunas", belumLunas + " orang");
    setText("rekap-total-transaksi", totalTransaksi);
    setText("pengaturan-data-info", `${this.pelanggan.length} pelanggan & ${this.transaksi.length} transaksi tersimpan. Menghapus data tidak dapat dibatalkan.`);
  },

  fillPelangganSelects() {
    const selects = [
      document.getElementById("transaksi-pelanggan"),
      document.getElementById("modal-transaksi-pelanggan"),
    ];
    selects.forEach((sel) => {
      if (!sel) return;
      const currentValue = sel.value;
      sel.innerHTML = '<option value="">-- Pilih pelanggan --</option>';
      this.pelanggan.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nama + (this.hitungSisa(p.id) > 0 ? ` (sisa ${this.formatRupiah(this.hitungSisa(p.id))})` : "");
        sel.appendChild(opt);
      });
      sel.value = currentValue;
    });
  },

  // ========== FORMATTING ==========
  formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  },

  formatDateTrx(dateString) {
    const d = new Date(dateString);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  },

  getInitials(name) {
    const parts = String(name || "?").trim().split(/\s+/);
    return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
  },

  // ========== CURRENCY INPUT HELPERS ==========
  // Formats user input like "50500" or "50.500" into "50.500" (dot thousand separator)
  formatNominalInput(el) {
    let val = el.value.replace(/\D/g, ""); // keep only digits
    if (val === "") {
      el.value = "";
      return;
    }
    // Remove leading zeros
    val = val.replace(/^0+/, "") || "0";
    // Add dot thousand separators
    el.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  },

  // Parses formatted input like "50.500" back to integer 50500
  parseCurrencyInput(value) {
    if (!value) return 0;
    return parseInt(String(value).replace(/\./g, ""), 10) || 0;
  },

  // ========== PELANGGAN CRUD ==========
  openPelangganModal() {
    this.pendingTransaksiPelanggan = null;
    document.getElementById("pelanggan-id").value = "";
    document.getElementById("pelanggan-form").reset();
    const title = document.getElementById("modal-pelanggan-title");
    if (title) title.textContent = "Tambah Pelanggan";
    document.getElementById("modal-pelanggan").classList.remove("hidden");
    const content = document.getElementById("modal-pelanggan-content");
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
    setTimeout(() => document.getElementById("pelanggan-nama").focus(), 100);
  },

  openPelangganModalForTransaksi(source) {
    this.pendingTransaksiPelanggan = { source };
    this.openPelangganModal();
  },

  closePelangganModal() {
    const content = document.getElementById("modal-pelanggan-content");
    content.classList.remove("scale-100", "opacity-100");
    content.classList.add("scale-95", "opacity-0");
    setTimeout(() => document.getElementById("modal-pelanggan").classList.add("hidden"), 200);
  },

  savePelanggan() {
    const id = document.getElementById("pelanggan-id").value;
    const nama = document.getElementById("pelanggan-nama").value.trim();
    const kontak = document.getElementById("pelanggan-kontak").value.trim();
    const catatan = document.getElementById("pelanggan-catatan").value.trim();

    if (!nama) {
      this.showToast("Nama pelanggan wajib diisi", "error");
      document.getElementById("pelanggan-nama").classList.add("border-red-400", "ring-red-200");
      return;
    }

    let savedId = id ? parseInt(id) : null;
    const isEdit = !!id;

    if (id) {
      const idx = this.pelanggan.findIndex((p) => p.id === parseInt(id));
      if (idx !== -1) {
        this.pelanggan[idx] = { ...this.pelanggan[idx], nama, kontak, catatan };
      }
    } else {
      const newId = Date.now();
      this.pelanggan.push({
        id: newId, nama, kontak, catatan,
        createdAt: new Date().toISOString(),
      });
      savedId = newId;
    }

    this.saveData();
    this.render();
    this.closePelangganModal();

    // Jika pelanggan ditambahkan dari form transaksi, otomatis pilih di dropdown
    if (this.pendingTransaksiPelanggan && savedId) {
      const source = this.pendingTransaksiPelanggan.source;
      const selectId = source === "modal" ? "modal-transaksi-pelanggan" : "transaksi-pelanggan";
      const select = document.getElementById(selectId);
      if (select) {
        this.fillPelangganSelects();
        select.value = String(savedId);
      }
      this.pendingTransaksiPelanggan = null;
      this.showToast("Pelanggan ditambahkan & terpilih otomatis", "success");
    } else {
      this.showToast(isEdit ? "Data pelanggan diperbarui" : "Data pelanggan disimpan", "success");
    }
  },

  editPelanggan(id) {
    const p = this.pelanggan.find((x) => x.id === id);
    if (!p) return;
    document.getElementById("pelanggan-id").value = p.id;
    document.getElementById("pelanggan-nama").value = p.nama;
    document.getElementById("pelanggan-kontak").value = p.kontak || "";
    document.getElementById("pelanggan-catatan").value = p.catatan || "";
    const title = document.getElementById("modal-pelanggan-title");
    if (title) title.textContent = "Edit Pelanggan";
    document.getElementById("modal-pelanggan").classList.remove("hidden");
    const content = document.getElementById("modal-pelanggan-content");
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  },

  // ========== TRANSAKSI CRUD ==========
  openTransaksiModal() {
    document.getElementById("modal-transaksi-id").value = "";
    document.getElementById("transaksi-modal-form").reset();
    const title = document.getElementById("modal-transaksi-title");
    const subtitle = document.getElementById("modal-transaksi-subtitle");
    if (title) title.textContent = "Catat Transaksi";
    if (subtitle) subtitle.textContent = "Masukkan detail transaksi baru";
    this.setTodayDate();
    document.getElementById("modal-transaksi").classList.remove("hidden");
    const content = document.getElementById("modal-transaksi-content");
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
    setTimeout(() => document.getElementById("modal-transaksi-pelanggan").focus(), 100);
  },

  closeTransaksiModal() {
    const content = document.getElementById("modal-transaksi-content");
    content.classList.remove("scale-100", "opacity-100");
    content.classList.add("scale-95", "opacity-0");
    setTimeout(() => document.getElementById("modal-transaksi").classList.add("hidden"), 200);
  },

  saveTransaksi() {
    const type = document.querySelector('input[name="type"]:checked')?.value || "utang";
    const pelangganId = parseInt(document.getElementById("transaksi-pelanggan").value);
    const nominal = this.parseCurrencyInput(document.getElementById("transaksi-nominal").value);
    const tanggal = document.getElementById("transaksi-tanggal").value;
    const keterangan = document.getElementById("transaksi-keterangan").value.trim();

    if (!pelangganId || !nominal || !tanggal) {
      this.showToast("Semua field wajib diisi", "error");
      return;
    }
    if (nominal <= 0) {
      this.showToast("Nominal harus lebih dari 0", "error");
      return;
    }

    this.addTransaksi({ type, pelangganId, nominal, tanggal, keterangan });
    document.getElementById("transaksi-form").reset();
    this.setTodayDate();
    this.transaksiPage = 1;
    this.render();
    this.showToast("Transaksi berhasil dicatat", "success");
  },

  saveTransaksiFromModal() {
    const id = document.getElementById("modal-transaksi-id").value;
    const type = document.getElementById("modal-transaksi-type").value;
    const pelangganId = parseInt(document.getElementById("modal-transaksi-pelanggan").value);
    const nominal = this.parseCurrencyInput(document.getElementById("modal-transaksi-nominal").value);
    const tanggal = document.getElementById("modal-transaksi-tanggal").value;
    const keterangan = document.getElementById("modal-transaksi-keterangan").value.trim();

    if (!pelangganId || !nominal || !tanggal) {
      this.showToast("Semua field wajib diisi", "error");
      return;
    }
    if (nominal <= 0) {
      this.showToast("Nominal harus lebih dari 0", "error");
      return;
    }

    if (id) {
      const idx = this.transaksi.findIndex((t) => t.id === parseInt(id));
      if (idx !== -1) {
        this.transaksi[idx] = { ...this.transaksi[idx], type, pelangganId, nominal, tanggal, keterangan };
      }
    } else {
      this.addTransaksi({ type, pelangganId, nominal, tanggal, keterangan });
    }

    this.saveData();
    this.render();
    this.closeTransaksiModal();
    this.showToast(id ? "Transaksi berhasil diperbarui" : "Transaksi berhasil disimpan", "success");
  },

  addTransaksi(data) {
    this.transaksi.push({
      id: Date.now(),
      type: data.type,
      pelangganId: data.pelangganId,
      nominal: data.nominal,
      tanggal: data.tanggal,
      keterangan: data.keterangan || "",
      createdAt: new Date().toISOString(),
    });
    this.saveData();
  },

  editTransaksi(id) {
    const t = this.transaksi.find((x) => x.id === id);
    if (!t) return;
    this.closeTransaksiDetail();
    document.getElementById("modal-transaksi-id").value = t.id;
    document.getElementById("modal-transaksi-type").value = t.type;
    document.getElementById("modal-transaksi-pelanggan").value = String(t.pelangganId);
    document.getElementById("modal-transaksi-nominal").value = this.formatNominalValue(t.nominal);
    document.getElementById("modal-transaksi-tanggal").value = t.tanggal;
    document.getElementById("modal-transaksi-keterangan").value = t.keterangan || "";
    const title = document.getElementById("modal-transaksi-title");
    const subtitle = document.getElementById("modal-transaksi-subtitle");
    if (title) title.textContent = "Edit Transaksi";
    if (subtitle) subtitle.textContent = "Perbarui detail transaksi";
    document.getElementById("modal-transaksi").classList.remove("hidden");
    const content = document.getElementById("modal-transaksi-content");
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  },

  formatNominalValue(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  },

  // ========== DETAIL TRANSAKSI ==========
  openTransaksiDetail(id) {
    const t = this.transaksi.find((x) => x.id === id);
    if (!t) return;
    const pelanggan = this.pelanggan.find((p) => p.id === t.pelangganId);
    const nama = pelanggan ? pelanggan.nama : "Tidak diketahui";
    const isUtang = t.type === "utang";

    const body = document.getElementById("transaksi-detail-body");
    body.innerHTML = `
      <div class="text-center mb-6">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full ${isUtang ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"} font-semibold mb-3">
          <i class="fas ${isUtang ? "fa-arrow-up" : "fa-arrow-down"}"></i> ${isUtang ? "Utang" : "Pelunasan"}
        </div>
        <p class="text-3xl font-bold ${isUtang ? "text-red-600" : "text-green-600"}">${isUtang ? "+" : "-"}${this.formatRupiah(t.nominal)}</p>
      </div>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">Pelanggan</span>
          <span class="font-medium text-gray-800">${this.escapeHtml(nama)}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">Tanggal</span>
          <span class="font-medium text-gray-800">${this.formatDateTrx(t.tanggal)}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">Keterangan</span>
          <span class="font-medium text-gray-800 text-right ml-4">${this.escapeHtml(t.keterangan || "-")}</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-gray-500">ID Transaksi</span>
          <span class="font-mono text-xs text-gray-500">${t.id}</span>
        </div>
      </div>`;

    document.getElementById("transaksi-detail-edit").onclick = () => this.editTransaksi(id);
    document.getElementById("transaksi-detail-delete").onclick = () => {
      this.closeTransaksiDetail();
      this.confirmDelete("transaksi", id);
    };

    document.getElementById("modal-transaksi-detail").classList.remove("hidden");
    const content = document.getElementById("modal-transaksi-detail-content");
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  },

  closeTransaksiDetail() {
    const content = document.getElementById("modal-transaksi-detail-content");
    if (!content) return;
    content.classList.remove("scale-100", "opacity-100");
    content.classList.add("scale-95", "opacity-0");
    setTimeout(() => document.getElementById("modal-transaksi-detail").classList.add("hidden"), 200);
  },

  // ========== DETAIL PELANGGAN ==========
  openDetail(id) {
    const p = this.pelanggan.find((x) => x.id === id);
    if (!p) return;
    this.detailPelangganId = id;

    document.getElementById("detail-title").textContent = "Riwayat: " + p.nama;
    document.getElementById("detail-nama").textContent = p.nama;
    document.getElementById("detail-kontak").innerHTML = p.kontak
      ? `<i class="fas fa-phone text-gray-400"></i> <span>${this.escapeHtml(p.kontak)}</span>`
      : `<i class="fas fa-phone text-gray-400"></i> <span>-</span>`;
    document.getElementById("detail-sisa").textContent = this.formatRupiah(this.hitungSisa(id));

    const trx = this.transaksi
      .filter((t) => t.pelangganId === id)
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    document.getElementById("detail-transaksi-count").textContent = trx.length;
    document.getElementById("detail-count").textContent = trx.length + " transaksi";

    const container = document.getElementById("detail-riwayat");
    const empty = document.getElementById("detail-empty");
    container.innerHTML = "";

    if (trx.length === 0) {
      empty.classList.remove("hidden");
    } else {
      empty.classList.add("hidden");
      trx.forEach((t) => {
        const isUtang = t.type === "utang";
        const div = document.createElement("div");
        div.className = `flex justify-between items-center p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow ${isUtang ? "bg-orange-50/50 border-orange-100" : "bg-green-50/50 border-green-100"}`;
        div.onclick = () => { this.closeDetailModal(); setTimeout(() => this.openTransaksiDetail(t.id), 200); };
        div.innerHTML = `
          <div class="flex flex-col">
            <span class="text-sm font-semibold ${isUtang ? "text-orange-700" : "text-green-700"}">
              <i class="fas ${isUtang ? "fa-arrow-up" : "fa-arrow-down"} mr-1"></i>${isUtang ? "Utang" : "Pelunasan"}
            </span>
            <span class="text-xs text-gray-500 mt-1">${this.formatDateTrx(t.tanggal)}</span>
            <span class="text-xs text-gray-500 mt-1">${this.escapeHtml(t.keterangan || "-")}</span>
          </div>
          <div class="text-right">
            <div class="font-bold ${isUtang ? "text-red-600" : "text-green-600"}">${isUtang ? "+" : "-"}${this.formatRupiah(t.nominal)}</div>
            <div class="text-xs text-gray-400 mt-1">Lihat detail <i class="fas fa-chevron-right ml-1"></i></div>
          </div>`;
        container.appendChild(div);
      });
    }

    const editBtn = document.getElementById("detail-edit-btn");
    if (editBtn) editBtn.onclick = () => { this.closeDetailModal(); setTimeout(() => this.editPelanggan(id), 200); };

    document.getElementById("modal-detail").classList.remove("hidden");
    const content = document.getElementById("modal-detail-content");
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  },

  closeDetailModal() {
    const content = document.getElementById("modal-detail-content");
    content.classList.remove("scale-100", "opacity-100");
    content.classList.add("scale-95", "opacity-0");
    setTimeout(() => document.getElementById("modal-detail").classList.add("hidden"), 200);
  },

  // ========== HAPUS DATA ==========
  confirmDelete(type, id) {
    this.confirmAction = { type, id };
    document.getElementById("confirm-message").textContent =
      type === "pelanggan"
        ? "Yakin ingin menghapus pelanggan ini? Semua transaksi terkait juga akan dihapus."
        : "Yakin ingin menghapus transaksi ini?";
    document.getElementById("modal-confirm").classList.remove("hidden");
  },

  confirmReset() {
    this.confirmAction = { type: "reset" };
    document.getElementById("confirm-message").textContent =
      "Yakin ingin menghapus SEMUA data pelanggan dan transaksi? Tindakan ini tidak dapat dibatalkan.";
    document.getElementById("modal-confirm").classList.remove("hidden");
  },

  closeConfirmModal() {
    this.confirmAction = null;
    document.getElementById("modal-confirm").classList.add("hidden");
  },

  executeConfirm() {
    if (!this.confirmAction) return;
    const { type, id } = this.confirmAction;

    if (type === "pelanggan") {
      this.pelanggan = this.pelanggan.filter((p) => p.id !== id);
      this.transaksi = this.transaksi.filter((t) => t.pelangganId !== id);
    } else if (type === "transaksi") {
      this.transaksi = this.transaksi.filter((t) => t.id !== id);
    } else if (type === "reset") {
      this.pelanggan = [];
      this.transaksi = [];
    }

    this.saveData();
    this.render();
    this.closeConfirmModal();
    this.showToast(type === "reset" ? "Semua data telah dihapus" : "Data berhasil dihapus", "success");
  },

  // ========== EKSPOR / BACKUP ==========
  exportData() {
    const rows = [];
    rows.push(["Pelanggan", "Kontak", "Total Utang", "Total Dibayar", "Sisa Utang", "Status"]);
    this.getPelangganWithSisa().forEach((p) => {
      const trxP = this.transaksi.filter((t) => t.pelangganId === p.id);
      const totalUtangP = trxP.filter((t) => t.type === "utang").reduce((a, t) => a + t.nominal, 0);
      const totalBayarP = trxP.filter((t) => t.type === "pelunasan").reduce((a, t) => a + t.nominal, 0);
      rows.push([p.nama, p.kontak || "-", totalUtangP, totalBayarP, p.sisa, p.sisa > 0 ? "Utang" : "Lunas"]);
    });

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    this.downloadFile("\ufeff" + csv, "text/csv;charset=utf-8;", "rekap_warungku_export.csv");
    this.showToast("Data berhasil diekspor", "success");
  },

  exportCustomerData(nama) {
    const p = this.pelanggan.find((x) => x.nama === nama);
    if (!p) return;
    const trxP = this.transaksi.filter((t) => t.pelangganId === p.id);
    const rows = [["Tanggal", "Jenis", "Nominal", "Keterangan"]];
    trxP.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)).forEach((t) => {
      rows.push([t.tanggal, t.type === "utang" ? "Utang" : "Pelunasan", t.nominal, t.keterangan || "-"]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    this.downloadFile("\ufeff" + csv, "text/csv;charset=utf-8;", `riwayat_${nama.toLowerCase().replace(/\s+/g, "_")}.csv`);
    this.showToast("Riwayat pelanggan diekspor", "success");
  },

  backupJSON() {
    const payload = {
      app: "WarungKu",
      version: "3.0",
      exportedAt: new Date().toISOString(),
      pelanggan: this.pelanggan,
      transaksi: this.transaksi,
    };
    const date = new Date().toISOString().split("T")[0];
    this.downloadFile(JSON.stringify(payload, null, 2), "application/json", `warungku_backup_${date}.json`);
    this.showToast("Cadangan data berhasil diunduh", "success");
  },

  restoreJSON(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const pelanggan = Array.isArray(data.pelanggan) ? data.pelanggan : [];
        const transaksi = Array.isArray(data.transaksi) ? data.transaksi : [];
        if (!pelanggan.length && !transaksi.length) {
          this.showToast("Berkas tidak berisi data yang valid", "error");
          return;
        }
        if (!confirm(`Pulihkan ${pelanggan.length} pelanggan & ${transaksi.length} transaksi? Data saat ini akan digantikan.`)) {
          input.value = "";
          return;
        }
        this.pelanggan = pelanggan;
        this.transaksi = transaksi;
        this.saveData();
        this.transaksiPage = 1;
        this.render();
        this.showToast("Data berhasil dipulihkan", "success");
      } catch (err) {
        console.error(err);
        this.showToast("Gagal membaca berkas cadangan", "error");
      } finally {
        input.value = "";
      }
    };
    reader.readAsText(file);
  },

  downloadFile(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  updatePrintDate() {
    const el = document.getElementById("print-date");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) +
      " " + now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  },

  // ========== UTILITAS ==========
  showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-msg");
    const icon = toast.querySelector(".toast-icon i");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    if (type === "error") {
      icon.className = "fas fa-exclamation-circle text-red-400 text-xl";
    } else {
      icon.className = "fas fa-check-circle text-green-400 text-xl";
    }

    toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  },

  closeToast() {
    document.getElementById("toast")?.classList.remove("show");
  },
};

document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
