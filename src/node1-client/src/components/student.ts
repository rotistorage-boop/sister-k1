import {
  getAllStudents,
  getStudentByNim,
  createStudent,
} from "../rpc/student";
import { renderLucideIcons } from "../icons";

export function renderStudentComponent(container: HTMLElement) {
  const pageTitle = document.getElementById("page-title")!;
  const pageDesc = document.getElementById("page-desc")!;
  pageTitle.textContent = "Data Mahasiswa";
  pageDesc.textContent = "Node 2 | Student Service (Port 3002)";

  container.innerHTML = `
    <div class="space-y-6 text-left">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Cari Mahasiswa -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="search" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Cari Mahasiswa</h3>
              <p class="text-xs font-medium text-zinc-500">getStudentByNim ke Node 2</p>
            </div>
          </div>

          <form id="form-search-student" class="flex gap-2">
            <input type="text" id="input-search-nim" placeholder="Masukkan NIM (contoh: 240411100000)" required
              class="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
            <button type="submit" class="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5">
              <i data-lucide="search" class="w-3.5 h-3.5"></i>
              <span>Cari</span>
            </button>
          </form>
          <div id="student-search-result" class="mt-4"></div>
        </div>

        <!-- Tambah Mahasiswa -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Tambah Mahasiswa Baru</h3>
              <p class="text-xs font-medium text-zinc-500">createStudent ke Node 2</p>
            </div>
          </div>

          <form id="form-create-student" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="input-create-nim" class="block text-xs font-bold text-zinc-700 mb-1">NIM Mahasiswa</label>
                <input type="text" id="input-create-nim" placeholder="Contoh: 240411100099" required
                  class="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
              </div>
              <div>
                <label for="input-create-nama" class="block text-xs font-bold text-zinc-700 mb-1">Nama Lengkap</label>
                <input type="text" id="input-create-nama" placeholder="Nama Mahasiswa" required
                  class="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition" />
              </div>
            </div>
            <div>
              <label for="select-create-status" class="block text-xs font-bold text-zinc-700 mb-1">Status Akademik</label>
              <select id="select-create-status"
                class="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition">
                <option value="aktif">Aktif</option>
                <option value="cuti">Cuti</option>
                <option value="lulus">Lulus</option>
              </select>
            </div>
            <button type="submit" class="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Simpan ke Database Node 2</span>
            </button>
          </form>
          <div id="student-create-result" class="mt-4"></div>
        </div>
      </div>

      <!-- Table Semua Mahasiswa -->
      <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <i data-lucide="list" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-900">Daftar Seluruh Mahasiswa</h3>
              <p class="text-xs font-medium text-zinc-500">Query langsung dari tabel students Node 2</p>
            </div>
          </div>
          <button id="btn-refresh-students" class="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 border border-zinc-300 px-3.5 py-2 rounded-lg transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-zinc-600"></i>
            <span>Refresh</span>
          </button>
        </div>
        <div id="students-table-container"></div>
      </div>
    </div>
  `;

  renderLucideIcons(container);

  const searchForm = container.querySelector<HTMLFormElement>("#form-search-student")!;
  const searchInput = container.querySelector<HTMLInputElement>("#input-search-nim")!;
  const searchResult = container.querySelector<HTMLElement>("#student-search-result")!;

  const createForm = container.querySelector<HTMLFormElement>("#form-create-student")!;
  const createNim = container.querySelector<HTMLInputElement>("#input-create-nim")!;
  const createNama = container.querySelector<HTMLInputElement>("#input-create-nama")!;
  const createStatus = container.querySelector<HTMLSelectElement>("#select-create-status")!;
  const createResult = container.querySelector<HTMLElement>("#student-create-result")!;

  const refreshBtn = container.querySelector<HTMLButtonElement>("#btn-refresh-students")!;
  const tableEl = container.querySelector<HTMLElement>("#students-table-container")!;

  function statusBadge(status: string): string {
    const colors: Record<string, string> = {
      aktif: "bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold",
      cuti: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
      lulus: "bg-blue-50 text-blue-900 border-blue-300 font-semibold",
    };
    const cls = colors[status?.toLowerCase()] || "bg-zinc-100 text-zinc-700 border-zinc-300";
    return `<span class="inline-block text-xs px-2.5 py-0.5 rounded border capitalize ${cls}">${status}</span>`;
  }

  async function loadAll() {
    tableEl.innerHTML = `
      <div class="flex items-center justify-center gap-2 py-12 text-xs font-medium text-zinc-500">
        <div class="spinner"></div> Memuat data mahasiswa dari Node 2...
      </div>
    `;
    try {
      const students = await getAllStudents();
      if (!students || students.length === 0) {
        tableEl.innerHTML = `<div class="text-center py-10 text-xs font-medium text-zinc-400">Belum ada data mahasiswa terdaftar.</div>`;
        return;
      }
      tableEl.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="border-b border-zinc-200 text-zinc-500 bg-zinc-50/60">
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-20 text-center">ID</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider w-48">NIM</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider">Nama Mahasiswa</th>
                <th class="py-3.5 px-4 font-bold uppercase tracking-wider text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              ${students
                .map(
                  (s) => `
                <tr class="hover:bg-zinc-50/70 transition">
                  <td class="py-3.5 px-4 text-zinc-400 font-mono font-medium text-center">${s.id}</td>
                  <td class="py-3.5 px-4 font-mono font-semibold text-zinc-900">${s.nim}</td>
                  <td class="py-3.5 px-4 font-semibold text-zinc-900">${s.nama}</td>
                  <td class="py-3.5 px-4 text-center">${statusBadge(s.status)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data mahasiswa";
      tableEl.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between">
          <div class="flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
            <span>${msg}</span>
          </div>
          <button id="btn-retry-students" class="text-xs font-semibold text-rose-800 hover:text-rose-950 border border-rose-300 px-3 py-1.5 rounded bg-white">Coba Lagi</button>
        </div>
      `;
      tableEl.querySelector<HTMLButtonElement>("#btn-retry-students")!.onclick = loadAll;
      renderLucideIcons(tableEl);
    }
  }

  searchForm.onsubmit = async (e) => {
    e.preventDefault();
    const nim = searchInput.value.trim();
    if (!nim) return;
    searchResult.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-3">
        <div class="spinner"></div> Mencari data...
      </div>
    `;
    try {
      const s = await getStudentByNim(nim);
      searchResult.innerHTML = `
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs space-y-1.5 text-left">
          <div class="flex items-center gap-1.5 text-zinc-900 font-bold mb-2">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
            <span>Data Mahasiswa Ditemukan</span>
          </div>
          <p class="text-zinc-700">NIM: <strong class="text-zinc-900 font-mono">${s.nim}</strong></p>
          <p class="text-zinc-700">Nama: <strong class="text-zinc-900">${s.nama}</strong></p>
          <div class="flex items-center gap-2 pt-1">
            <span class="text-zinc-700 font-medium">Status:</span>
            ${statusBadge(s.status)}
          </div>
        </div>
      `;
      renderLucideIcons(searchResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Mahasiswa tidak ditemukan";
      searchResult.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(searchResult);
    }
  };

  createForm.onsubmit = async (e) => {
    e.preventDefault();
    const nim = createNim.value.trim();
    const nama = createNama.value.trim();
    const status = createStatus.value;
    if (!nim || !nama) return;
    createResult.innerHTML = `
      <div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-2">
        <div class="spinner"></div> Menyimpan ke Node 2...
      </div>
    `;
    try {
      const created = await createStudent(nim, nama, status);
      createResult.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900 font-medium flex items-center gap-2">
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
          <span>Mahasiswa <strong>${created.nama}</strong> (${created.nim}) berhasil ditambahkan.</span>
        </div>
      `;
      createForm.reset();
      renderLucideIcons(createResult);
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan mahasiswa";
      createResult.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>${msg}</span>
        </div>
      `;
      renderLucideIcons(createResult);
    }
  };

  refreshBtn.onclick = loadAll;
  loadAll();
}
