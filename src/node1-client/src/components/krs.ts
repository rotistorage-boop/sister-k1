import {
  getAllKrs,
  getKrsByNim,
  submitKrs,
  type KrsItem,
} from "../rpc/krs";
import { getAllStudents, type Student } from "../rpc/student";
import type { Course } from "../rpc/course";
import { renderLucideIcons } from "../icons";

export function renderKrsComponent(container: HTMLElement) {
  const pageTitle = document.getElementById("page-title")!;
  const pageDesc = document.getElementById("page-desc")!;
  pageTitle.textContent = "Kartu Rencana Studi (KRS)";
  pageDesc.textContent = "Node 4 | KRS Orchestrator (Port 3004)";

  container.innerHTML = `
    <div class="space-y-6 text-left">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Cari KRS -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="search" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Cari KRS Mahasiswa</h3>
              <p class="text-xs font-medium text-zinc-500">getKrsByNim ke Node 4</p>
            </div>
          </div>

          <form id="form-search-krs" class="flex gap-2">
            <input type="text" id="input-search-krs-nim" placeholder="Masukkan NIM (contoh: 240411100000)" required
              class="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
            <button type="submit" class="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5">
              <i data-lucide="search" class="w-3.5 h-3.5"></i>
              <span>Cari</span>
            </button>
          </form>
          <div id="krs-search-result" class="mt-4"></div>
        </div>

        <!-- Submit KRS -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-3">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="layers" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Submit Pengisian KRS</h3>
              <p class="text-xs font-medium text-zinc-500">Orkestrasi Multi-Node (Node 2, 3, 5 => Node 4)</p>
            </div>
          </div>

          <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-3 mb-4 text-xs font-medium text-zinc-600 flex items-start gap-2 text-left">
            <i data-lucide="info" class="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0"></i>
            <span>Orkestrator akan memvalidasi status mahasiswa (N2), kuota matkul (N3), dan bentrok jadwal (N5).</span>
          </div>

          <form id="form-submit-krs" class="space-y-3">
            <div>
              <label for="input-submit-krs-nim" class="block text-xs font-bold text-zinc-700 mb-1">NIM Mahasiswa</label>
              <input type="text" id="input-submit-krs-nim" placeholder="Contoh: 240411100000" required
                class="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
            </div>
            <div>
              <label for="input-submit-krs-courses" class="block text-xs font-bold text-zinc-700 mb-1">ID Mata Kuliah (pisahkan dengan koma)</label>
              <input type="text" id="input-submit-krs-courses" placeholder="Contoh: 1, 2" required
                class="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
            </div>
            <button type="submit" class="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Proses Submit KRS</span>
            </button>
          </form>
          <div id="krs-submit-result" class="mt-4"></div>
        </div>
      </div>

      <!-- All KRS Table (Full-width, proportional, spacious) -->
      <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="file-text" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Daftar Seluruh Kartu Rencana Studi</h3>
              <p class="text-xs font-medium text-zinc-500">Data terdistribusi dari database Node 4 & integrasi Node 2</p>
            </div>
          </div>
          <button id="btn-refresh-krs" class="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 border border-zinc-300 px-3.5 py-2 rounded-lg transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-zinc-600"></i>
            <span>Refresh</span>
          </button>
        </div>
        <div id="krs-table-container"></div>
      </div>
    </div>
  `;

  renderLucideIcons(container);

  const searchForm = container.querySelector<HTMLFormElement>("#form-search-krs")!;
  const searchNim = container.querySelector<HTMLInputElement>("#input-search-krs-nim")!;
  const searchResult = container.querySelector<HTMLElement>("#krs-search-result")!;

  const submitForm = container.querySelector<HTMLFormElement>("#form-submit-krs")!;
  const submitNim = container.querySelector<HTMLInputElement>("#input-submit-krs-nim")!;
  const submitCourses = container.querySelector<HTMLInputElement>("#input-submit-krs-courses")!;
  const submitResult = container.querySelector<HTMLElement>("#krs-submit-result")!;

  const refreshBtn = container.querySelector<HTMLButtonElement>("#btn-refresh-krs")!;
  const tableEl = container.querySelector<HTMLElement>("#krs-table-container")!;

  let studentMap = new Map<string, Student>();

  function courseChips(courses: Course[]): string {
    if (!courses || courses.length === 0) return `<span class="text-zinc-400 italic text-xs">Belum ada mata kuliah</span>`;
    return `
      <div class="flex flex-wrap gap-2">
        ${courses
          .map(
            (c) =>
              `<div class="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-semibold px-2.5 py-1 rounded">
                <span class="font-mono text-zinc-500 text-[11px]">${c.kode || "#" + c.id}</span>
                <span>${c.nama || "Matkul"}</span>
                <span class="text-zinc-500 font-normal text-[11px]">(${c.sks || 0} SKS)</span>
              </div>`,
          )
          .join("")}
      </div>
    `;
  }

  async function loadAll() {
    tableEl.innerHTML = `
      <div class="flex items-center justify-center gap-2 py-12 text-xs font-medium text-zinc-500">
        <div class="spinner"></div> Memuat data KRS dari Node 4...
      </div>
    `;
    try {
      try {
        const students = await getAllStudents();
        studentMap.clear();
        students.forEach((st) => studentMap.set(st.nim, st));
      } catch (e) {
        console.warn("Gagal load student names:", e);
      }

      const list = await getAllKrs();
      if (!list || list.length === 0) {
        tableEl.innerHTML = `<div class="text-center py-10 text-xs font-medium text-zinc-400">Belum ada data KRS terdaftar.</div>`;
        return;
      }

      tableEl.innerHTML = `
        <div class="overflow-x-auto w-full">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-200 text-zinc-600 bg-zinc-50/80">
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-20 text-center">ID KRS</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-64">Mahasiswa</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-28 text-center">Total SKS</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider min-w-[320px]">Mata Kuliah Terambil</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200/80">
              ${list
                .map((k) => {
                  const st = studentMap.get(k.nim);
                  const totalSks = (k.courses || []).reduce((acc, c) => acc + (c.sks || 0), 0);
                  const countMatkul = (k.courses || []).length;
                  return `
                <tr class="hover:bg-zinc-50/60 transition">
                  <td class="py-4 px-4 text-zinc-400 font-mono font-medium text-center">#${k.id}</td>
                  <td class="py-4 px-4">
                    <p class="font-bold text-zinc-900 text-xs">${st ? st.nama : "Mahasiswa"}</p>
                    <p class="font-mono text-zinc-500 text-[11px] mt-0.5">NIM: ${k.nim}</p>
                  </td>
                  <td class="py-4 px-4 text-center">
                    <p class="font-bold text-zinc-900 text-xs">${totalSks} SKS</p>
                    <p class="text-[11px] text-zinc-500 font-medium">${countMatkul} Matkul</p>
                  </td>
                  <td class="py-4 px-4">
                    ${courseChips(k.courses)}
                  </td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data KRS";
      tableEl.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between">
          <div class="flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
            <span>${msg}</span>
          </div>
          <button id="btn-retry-krs" class="text-xs font-semibold text-rose-800 hover:text-rose-950 border border-rose-300 px-3 py-1.5 rounded bg-white">Coba Lagi</button>
        </div>
      `;
      tableEl.querySelector<HTMLButtonElement>("#btn-retry-krs")!.onclick = loadAll;
      renderLucideIcons(tableEl);
    }
  }

  searchForm.onsubmit = async (e) => {
    e.preventDefault();
    const nim = searchNim.value.trim();
    if (!nim) return;
    searchResult.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-3">
        <div class="spinner"></div> Mencari data KRS...
      </div>
    `;
    try {
      const results = await getKrsByNim(nim);
      if (!results || results.length === 0) {
        searchResult.innerHTML = `
          <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs text-zinc-700 font-medium flex items-center gap-2 text-left">
            <i data-lucide="info" class="w-4 h-4 text-zinc-500"></i>
            <span>Tidak ada data KRS ditemukan untuk NIM ${nim}.</span>
          </div>
        `;
        renderLucideIcons(searchResult);
        return;
      }
      searchResult.innerHTML = `
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs space-y-3 text-left">
          <div class="flex items-center gap-1.5 text-zinc-900 font-bold">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
            <span>Ditemukan ${results.length} Catatan KRS untuk NIM ${nim}</span>
          </div>
          ${results
            .map((item: KrsItem) => {
              const totalSks = (item.courses || []).reduce((acc, c) => acc + (c.sks || 0), 0);
              return `
              <div class="border-t border-zinc-200 pt-2.5">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-zinc-800 font-semibold">KRS ID: <strong>#${item.id}</strong> | <span class="text-zinc-600">${totalSks} Total SKS</span></span>
                </div>
                <div class="mt-1">${courseChips(item.courses)}</div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
      renderLucideIcons(searchResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencari data KRS";
      searchResult.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(searchResult);
    }
  };

  submitForm.onsubmit = async (e) => {
    e.preventDefault();
    const nim = submitNim.value.trim();
    const ids = submitCourses.value
      .trim()
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    if (!nim || ids.length === 0) {
      submitResult.innerHTML = `
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs font-semibold text-amber-800 flex items-center gap-2">
          <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600"></i>
          <span>Masukkan NIM dan minimal 1 ID mata kuliah.</span>
        </div>
      `;
      renderLucideIcons(submitResult);
      return;
    }
    submitResult.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-3">
        <div class="spinner"></div> Memproses validasi multi-node...
      </div>
    `;
    try {
      const r = await submitKrs(nim, ids);
      submitResult.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs space-y-2 text-left">
          <div class="flex items-center gap-1.5 text-emerald-900 font-bold">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
            <span>KRS Berhasil Disimpan & Diverifikasi (ID: #${r.krs.id})</span>
          </div>
          <p class="text-zinc-700">Mahasiswa: <strong class="text-zinc-900">${r.student.nama}</strong> (${r.student.nim})</p>
          <div>Mata Kuliah: ${courseChips(r.courses)}</div>
          <p class="text-emerald-800 text-xs font-semibold pt-1">Validasi kuota & jadwal sukses. KRS berhasil tersimpan.</p>
        </div>
      `;
      submitForm.reset();
      renderLucideIcons(submitResult);
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal melakukan submit KRS";
      submitResult.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(submitResult);
    }
  };

  refreshBtn.onclick = loadAll;
  loadAll();
}
