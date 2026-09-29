import {
  getAllCourses,
  getCourseById,
  getCourseByKode,
  checkCourseQuota,
  type Course,
} from "../rpc/course";
import { renderLucideIcons } from "../icons";

export function renderCourseComponent(container: HTMLElement) {
  const pageTitle = document.getElementById("page-title")!;
  const pageDesc = document.getElementById("page-desc")!;
  pageTitle.textContent = "Katalog Mata Kuliah";
  pageDesc.textContent = "Node 3 | Course Service (Port 3003)";

  container.innerHTML = `
    <div class="space-y-6 text-left">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Cari Mata Kuliah -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="search" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Cari Mata Kuliah</h3>
              <p class="text-xs font-medium text-zinc-500">Pencarian berdasarkan Kode (IF101) atau ID</p>
            </div>
          </div>

          <form id="form-search-course" class="flex gap-2">
            <input type="text" id="input-search-course" placeholder="Masukkan Kode atau ID Matkul..." required
              class="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
            <button type="submit" class="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5">
              <i data-lucide="search" class="w-3.5 h-3.5"></i>
              <span>Cari</span>
            </button>
          </form>
          <div id="course-search-result" class="mt-4"></div>
        </div>

        <!-- Cek Kuota -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="pie-chart" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Cek Kuota Kelas</h3>
              <p class="text-xs font-medium text-zinc-500">checkCourseQuota ke Node 3</p>
            </div>
          </div>

          <form id="form-quota-course" class="flex gap-2">
            <input type="number" id="input-quota-id" placeholder="Masukkan ID Mata Kuliah (contoh: 1)" required min="1"
              class="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
            <button type="submit" class="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
              <span>Cek Kuota</span>
            </button>
          </form>
          <div id="course-quota-result" class="mt-4"></div>
        </div>
      </div>

      <!-- All Courses Table -->
      <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="book-open" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Katalog Seluruh Mata Kuliah</h3>
              <p class="text-xs font-medium text-zinc-500">Data mata kuliah dan kuota tersisa di Node 3</p>
            </div>
          </div>
          <button id="btn-refresh-courses" class="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 border border-zinc-300 px-3.5 py-2 rounded-lg transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-zinc-600"></i>
            <span>Refresh</span>
          </button>
        </div>
        <div id="courses-table-container"></div>
      </div>
    </div>
  `;

  renderLucideIcons(container);

  const searchForm = container.querySelector<HTMLFormElement>("#form-search-course")!;
  const searchInput = container.querySelector<HTMLInputElement>("#input-search-course")!;
  const searchResult = container.querySelector<HTMLElement>("#course-search-result")!;

  const quotaForm = container.querySelector<HTMLFormElement>("#form-quota-course")!;
  const quotaInput = container.querySelector<HTMLInputElement>("#input-quota-id")!;
  const quotaResult = container.querySelector<HTMLElement>("#course-quota-result")!;

  const refreshBtn = container.querySelector<HTMLButtonElement>("#btn-refresh-courses")!;
  const tableEl = container.querySelector<HTMLElement>("#courses-table-container")!;

  function quotaBadge(kuota: number): string {
    const cls =
      kuota > 5
        ? "bg-zinc-100 text-zinc-900 border-zinc-300"
        : kuota > 0
        ? "bg-amber-50 text-amber-900 border-amber-300"
        : "bg-rose-50 text-rose-900 border-rose-300";
    return `<span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded border ${cls}">${kuota} kursi</span>`;
  }

  async function loadAll() {
    tableEl.innerHTML = `
      <div class="flex items-center justify-center gap-2 py-12 text-xs font-medium text-zinc-500">
        <div class="spinner"></div> Memuat katalog mata kuliah dari Node 3...
      </div>
    `;
    try {
      const courses = await getAllCourses();
      if (!courses || courses.length === 0) {
        tableEl.innerHTML = `<div class="text-center py-10 text-xs font-medium text-zinc-400">Belum ada mata kuliah terdaftar.</div>`;
        return;
      }
      tableEl.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="border-b border-zinc-200 text-zinc-500 bg-zinc-50/60">
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-20 text-center">ID</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-40">Kode</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider">Nama Mata Kuliah</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-32">Bobot</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider text-center w-36">Sisa Kuota</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              ${courses
                .map(
                  (c) => `
                <tr class="hover:bg-zinc-50/70 transition">
                  <td class="py-3.5 px-4 text-zinc-400 font-mono font-medium text-center">${c.id}</td>
                  <td class="py-3.5 px-4 font-mono font-semibold text-zinc-900">${c.kode}</td>
                  <td class="py-3.5 px-4 font-semibold text-zinc-900">${c.nama}</td>
                  <td class="py-3.5 px-4 text-zinc-700 font-semibold">${c.sks} SKS</td>
                  <td class="py-3.5 px-4 text-center">${quotaBadge(c.kuota)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat mata kuliah";
      tableEl.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between">
          <div class="flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
            <span>${msg}</span>
          </div>
          <button id="btn-retry-courses" class="text-xs font-semibold text-rose-800 hover:text-rose-950 border border-rose-300 px-3 py-1.5 rounded bg-white">Coba Lagi</button>
        </div>
      `;
      tableEl.querySelector<HTMLButtonElement>("#btn-retry-courses")!.onclick = loadAll;
      renderLucideIcons(tableEl);
    }
  }

  searchForm.onsubmit = async (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    searchResult.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-3">
        <div class="spinner"></div> Mencari mata kuliah...
      </div>
    `;
    try {
      const isId = !isNaN(Number(q));
      const c: Course = isId ? await getCourseById(Number(q)) : await getCourseByKode(q);
      searchResult.innerHTML = `
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs space-y-1.5 text-left">
          <div class="flex items-center gap-1.5 text-zinc-900 font-bold mb-2">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
            <span>Mata Kuliah Ditemukan</span>
          </div>
          <p class="text-zinc-700">Kode: <strong class="text-zinc-900 font-mono">${c.kode}</strong> (ID: ${c.id})</p>
          <p class="text-zinc-700">Nama: <strong class="text-zinc-900">${c.nama}</strong></p>
          <div class="flex items-center gap-3 pt-1">
            <span class="text-zinc-700">Bobot: <strong class="text-zinc-900">${c.sks} SKS</strong></span>
            <span>|</span>
            <span class="text-zinc-700">Sisa Kuota:</span>
            ${quotaBadge(c.kuota)}
          </div>
        </div>
      `;
      renderLucideIcons(searchResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Mata kuliah tidak ditemukan";
      searchResult.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(searchResult);
    }
  };

  quotaForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = Number(quotaInput.value.trim());
    if (isNaN(id)) return;
    quotaResult.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-3">
        <div class="spinner"></div> Mengecek kuota...
      </div>
    `;
    try {
      const r = await checkCourseQuota(id);
      quotaResult.innerHTML = `
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs flex items-center justify-between text-left">
          <div>
            <p class="text-zinc-900 font-bold">${r.nama}</p>
            <p class="text-xs text-zinc-500 font-mono">ID Matkul: ${r.id}</p>
          </div>
          <div>${quotaBadge(r.kuota)}</div>
        </div>
      `;
      renderLucideIcons(quotaResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengecek kuota";
      quotaResult.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(quotaResult);
    }
  };

  refreshBtn.onclick = loadAll;
  loadAll();
}
