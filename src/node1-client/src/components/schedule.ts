import {
  getAllSchedules,
  getScheduleByCourseId,
  getScheduleByDay,
  checkScheduleConflict,
  type Schedule,
} from "../rpc/schedule";
import { getAllCourses, type Course } from "../rpc/course";
import { renderLucideIcons } from "../icons";

export function renderScheduleComponent(container: HTMLElement) {
  const pageTitle = document.getElementById("page-title")!;
  const pageDesc = document.getElementById("page-desc")!;
  pageTitle.textContent = "Jadwal Perkuliahan";
  pageDesc.textContent = "Node 5 | Schedule Service (RMI Protocol - Port 3005) & Sinkronisasi Node 3";

  container.innerHTML = `
    <div class="space-y-6 text-left">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Filter Jadwal -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="filter" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Filter Jadwal Kuliah</h3>
              <p class="text-xs font-medium text-zinc-500">Pilih hari atau mata kuliah dari Node 3</p>
            </div>
          </div>

          <div class="space-y-3">
            <form id="form-filter-day" class="flex gap-2">
              <select id="select-filter-day"
                class="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition">
                <option value="">Semua Hari (Senin - Jumat)</option>
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
              </select>
              <button type="submit" class="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1">
                <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                <span>Filter Hari</span>
              </button>
            </form>

            <form id="form-search-course-id" class="flex gap-2">
              <select id="select-schedule-course"
                class="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition">
                <option value="">-- Pilih Mata Kuliah (Node 3) --</option>
              </select>
              <button type="submit" class="bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-semibold px-4 py-2 rounded-lg border border-zinc-300 transition flex items-center gap-1">
                <i data-lucide="search" class="w-3.5 h-3.5 text-zinc-600"></i>
                <span>Cari</span>
              </button>
            </form>
          </div>
        </div>

        <!-- Cek Konflik -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-2">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="clock" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Deteksi Konflik Jadwal</h3>
              <p class="text-xs font-medium text-zinc-500">checkScheduleConflict ke Node 5</p>
            </div>
          </div>

          <p class="text-xs text-zinc-500 mb-3 font-medium">Mengecek irisan jam kuliah antar kombinasi mata kuliah.</p>

          <form id="form-check-conflict" class="space-y-3">
            <div>
              <label for="input-conflict-courses" class="block text-xs font-bold text-zinc-700 mb-1">ID Mata Kuliah (pisahkan koma, contoh: 1, 2, 3)</label>
              <input type="text" id="input-conflict-courses" placeholder="Contoh: 1, 2, 3" required
                class="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
            </div>
            <button type="submit" class="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5">
              <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
              <span>Periksa Bentrok Jadwal</span>
            </button>
          </form>
          <div id="conflict-result" class="mt-4"></div>
        </div>
      </div>

      <!-- Schedule Table -->
      <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="calendar-days" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 id="schedule-table-title" class="text-sm font-bold text-zinc-900">Daftar Seluruh Jadwal Perkuliahan</h3>
              <p class="text-xs font-medium text-zinc-500">Integrasi jadwal Node 5 dengan katalog mata kuliah Node 3</p>
            </div>
          </div>
          <button id="btn-refresh-schedules" class="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 border border-zinc-300 px-3.5 py-2 rounded-lg transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-zinc-600"></i>
            <span>Refresh</span>
          </button>
        </div>
        <div id="schedules-table-container"></div>
      </div>
    </div>
  `;

  renderLucideIcons(container);

  const filterForm = container.querySelector<HTMLFormElement>("#form-filter-day")!;
  const filterSelect = container.querySelector<HTMLSelectElement>("#select-filter-day")!;

  const searchCourseForm = container.querySelector<HTMLFormElement>("#form-search-course-id")!;
  const courseSelect = container.querySelector<HTMLSelectElement>("#select-schedule-course")!;

  const conflictForm = container.querySelector<HTMLFormElement>("#form-check-conflict")!;
  const conflictInput = container.querySelector<HTMLInputElement>("#input-conflict-courses")!;
  const conflictResult = container.querySelector<HTMLElement>("#conflict-result")!;

  const refreshBtn = container.querySelector<HTMLButtonElement>("#btn-refresh-schedules")!;
  const tableTitle = container.querySelector<HTMLElement>("#schedule-table-title")!;
  const tableEl = container.querySelector<HTMLElement>("#schedules-table-container")!;

  let courseMap = new Map<number, Course>();

  async function populateCourses() {
    try {
      const courses = await getAllCourses();
      courseMap.clear();
      courseSelect.innerHTML = `<option value="">-- Pilih Mata Kuliah (Node 3) --</option>`;
      courses.forEach((c) => {
        courseMap.set(c.id, c);
        const opt = document.createElement("option");
        opt.value = String(c.id);
        opt.textContent = `[${c.kode}] ${c.nama} (${c.sks} SKS)`;
        courseSelect.appendChild(opt);
      });
    } catch (e) {
      console.warn("Gagal mengambil katalog mata kuliah untuk jadwal:", e);
    }
  }

  function renderTable(schedules: Schedule[], title?: string) {
    if (title) tableTitle.textContent = title;
    if (!schedules || schedules.length === 0) {
      tableEl.innerHTML = `<div class="text-center py-10 text-xs font-medium text-zinc-400">Tidak ada jadwal perkuliahan ditemukan.</div>`;
      return;
    }
    tableEl.innerHTML = `
      <div class="overflow-x-auto w-full">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="border-b border-zinc-200 text-zinc-500 bg-zinc-50/60">
              <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-20 text-center">ID</th>
              <th class="py-3.5 px-4 font-bold uppercase tracking-wider">Mata Kuliah (Node 3)</th>
              <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-40">Kode & SKS</th>
              <th class="py-3.5 px-4 font-bold uppercase tracking-wider text-center w-28">Hari</th>
              <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-40">Waktu Kuliah</th>
              <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-36">Ruangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            ${schedules
              .map((s) => {
                const c = courseMap.get(s.courseId);
                return `
                <tr class="hover:bg-zinc-50/70 transition">
                  <td class="py-3.5 px-4 text-zinc-400 font-mono font-medium text-center">#${s.id}</td>
                  <td class="py-3.5 px-4">
                    <p class="font-bold text-zinc-900">${c ? c.nama : `Mata Kuliah #${s.courseId}`}</p>
                    <p class="text-xs text-zinc-400 font-mono">Course ID: ${s.courseId}</p>
                  </td>
                  <td class="py-3.5 px-4 font-medium text-zinc-700">
                    ${c ? `<span class="font-mono font-bold text-zinc-900">${c.kode}</span> | ${c.sks} SKS` : `<span class="text-zinc-400 font-mono">-</span>`}
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded border bg-zinc-100 text-zinc-900 border-zinc-300">
                      ${s.day}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-zinc-700 font-semibold">${s.startTime} - ${s.endTime}</td>
                  <td class="py-3.5 px-4 text-zinc-900 font-medium">${s.room || "Ruang Kuliah"}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  async function loadAll() {
    tableEl.innerHTML = `
      <div class="flex items-center justify-center gap-2 py-12 text-xs font-medium text-zinc-500">
        <div class="spinner"></div> Memuat jadwal dari Node 5 & sinkronisasi Node 3...
      </div>
    `;
    try {
      await populateCourses();
      const schedules = await getAllSchedules();
      renderTable(schedules, "Daftar Seluruh Jadwal Perkuliahan");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat jadwal";
      tableEl.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between">
          <div class="flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
            <span>${msg}</span>
          </div>
          <button id="btn-retry-schedules" class="text-xs font-semibold text-rose-800 hover:text-rose-950 border border-rose-300 px-3 py-1.5 rounded bg-white">Coba Lagi</button>
        </div>
      `;
      tableEl.querySelector<HTMLButtonElement>("#btn-retry-schedules")!.onclick = loadAll;
      renderLucideIcons(tableEl);
    }
  }

  filterForm.onsubmit = async (e) => {
    e.preventDefault();
    const day = filterSelect.value;
    if (!day) {
      loadAll();
      return;
    }
    tableEl.innerHTML = `
      <div class="flex items-center justify-center gap-2 py-10 text-xs font-medium text-zinc-500">
        <div class="spinner"></div> Memfilter jadwal hari ${day}...
      </div>
    `;
    try {
      const s = await getScheduleByDay(day);
      renderTable(s, `Jadwal Perkuliahan Hari ${day}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memfilter jadwal";
      tableEl.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(tableEl);
    }
  };

  searchCourseForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = Number(courseSelect.value.trim());
    if (isNaN(id) || id <= 0) {
      loadAll();
      return;
    }
    tableEl.innerHTML = `
      <div class="flex items-center justify-center gap-2 py-10 text-xs font-medium text-zinc-500">
        <div class="spinner"></div> Mencari jadwal mata kuliah...
      </div>
    `;
    try {
      const s = await getScheduleByCourseId(id);
      const c = courseMap.get(id);
      renderTable(s, `Jadwal Kuliah: ${c ? `${c.nama} (${c.kode})` : `Course ID #${id}`}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencari jadwal";
      tableEl.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(tableEl);
    }
  };

  conflictForm.onsubmit = async (e) => {
    e.preventDefault();
    const ids = conflictInput.value
      .trim()
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    if (ids.length === 0) {
      conflictResult.innerHTML = `
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs font-semibold text-amber-800 flex items-center gap-2">
          <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600"></i>
          <span>Masukkan minimal 1 ID mata kuliah.</span>
        </div>
      `;
      renderLucideIcons(conflictResult);
      return;
    }
    conflictResult.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-3">
        <div class="spinner"></div> Memeriksa konflik jadwal di Node 5...
      </div>
    `;
    try {
      const r = await checkScheduleConflict(ids);
      if (r.hasConflict) {
        conflictResult.innerHTML = `
          <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs space-y-2 text-left">
            <div class="flex items-center gap-1.5 text-rose-900 font-bold">
              <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-600"></i>
              <span>Terdeteksi Konflik Jadwal</span>
            </div>
            <ul class="list-disc list-inside text-rose-800 space-y-1 font-medium">
              ${r.conflicts.map((c) => `<li>${c}</li>`).join("")}
            </ul>
          </div>
        `;
      } else {
        conflictResult.innerHTML = `
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900 font-medium flex items-center gap-2 text-left">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
            <span>Tidak ada konflik jadwal. Seluruh slot waktu kuliah aman.</span>
          </div>
        `;
      }
      renderLucideIcons(conflictResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengecek konflik";
      conflictResult.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(conflictResult);
    }
  };

  refreshBtn.onclick = loadAll;
  loadAll();
}
