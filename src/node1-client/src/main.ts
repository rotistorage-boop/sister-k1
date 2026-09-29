import "./styles.css";
import { renderLucideIcons } from "./icons";
import { getAllStudents, type Student } from "./rpc/student";
import { getAllCourses, type Course } from "./rpc/course";
import { getAllKrs, type KrsItem } from "./rpc/krs";
import { getAllSchedules, type Schedule } from "./rpc/schedule";

import { renderStudentComponent } from "./components/student";
import { renderCourseComponent } from "./components/course";
import { renderKrsComponent } from "./components/krs";
import { renderScheduleComponent } from "./components/schedule";

type TabId = "dashboard" | "student" | "course" | "krs" | "schedule";

function renderNodeStatusList(
  container: HTMLElement,
  statuses: {
    node2: { online: boolean; loading?: boolean };
    node3: { online: boolean; loading?: boolean };
    node4: { online: boolean; loading?: boolean };
    node5: { online: boolean; loading?: boolean };
  },
) {
  const nodes = [
    { id: 2, name: "Node 2 | Student Service", port: "3002", state: statuses.node2 },
    { id: 3, name: "Node 3 | Course Service", port: "3003", state: statuses.node3 },
    { id: 4, name: "Node 4 | KRS Orchestrator", port: "3004", state: statuses.node4 },
    { id: 5, name: "Node 5 | Schedule Service", port: "3005", state: statuses.node5 },
  ];

  container.innerHTML = nodes
    .map((n) => {
      if (n.state.loading) {
        return `
          <div class="flex items-center justify-between p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
            <div class="flex items-center gap-2.5 text-left">
              <span class="w-2 h-2 rounded-full bg-zinc-400"></span>
              <div>
                <p class="text-xs font-semibold text-zinc-800">${n.name}</p>
                <p class="text-xs text-zinc-500 font-mono">Port ${n.port}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <div class="spinner w-3 h-3"></div>
              <span>Checking...</span>
            </div>
          </div>
        `;
      }

      if (n.state.online) {
        return `
          <div class="flex items-center justify-between p-3.5 rounded-lg bg-white border border-zinc-200 transition text-left">
            <div class="flex items-center gap-2.5 text-left">
              <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
              <div>
                <p class="text-xs font-semibold text-zinc-900">${n.name}</p>
                <p class="text-xs text-zinc-500 font-mono">Port ${n.port}</p>
              </div>
            </div>
            <span class="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              Online
            </span>
          </div>
        `;
      }

      return `
        <div class="flex items-center justify-between p-3.5 rounded-lg bg-white border border-rose-200 transition text-left">
          <div class="flex items-center gap-2.5 text-left">
            <span class="w-2 h-2 rounded-full bg-rose-600"></span>
            <div>
              <p class="text-xs font-semibold text-rose-950">${n.name}</p>
              <p class="text-xs text-rose-500 font-mono">Port ${n.port}</p>
            </div>
          </div>
          <span class="text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
            Offline
          </span>
        </div>
      `;
    })
    .join("");
}

async function renderDashboard(container: HTMLElement) {
  const pageTitle = document.getElementById("page-title")!;
  const pageDesc = document.getElementById("page-desc")!;
  pageTitle.textContent = "Dashboard";
  pageDesc.textContent = "Ikhtisar data akademik | Pemantauan status node";

  // Initial skeleton
  container.innerHTML = `
    <div class="space-y-6 text-left">
      <div class="flex items-center justify-between">
        <div class="text-left">
          <h3 class="text-base font-bold text-zinc-900">Ringkasan Sistem</h3>
          <p class="text-xs font-medium text-zinc-500">Live query ke seluruh node microservice</p>
        </div>
        <button id="btn-refresh-dashboard" class="flex items-center gap-2 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-semibold px-4 py-2 rounded-lg border border-zinc-300 transition">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-zinc-600"></i>
          <span>Periksa Ulang</span>
        </button>
      </div>

      <!-- Stat Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
        <div class="bg-white p-6 rounded-xl border border-zinc-200 flex items-center justify-center py-8 col-span-full">
          <div class="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <div class="spinner"></div> Menghubungkan ke layanan...
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Mahasiswa & Jadwal -->
        <div class="lg:col-span-2 space-y-6 text-left">
          <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left" id="dashboard-student-highlights">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <i data-lucide="users" class="w-4 h-4 text-zinc-700"></i>
                <h4 class="text-sm font-bold text-zinc-900">Mahasiswa Terdaftar</h4>
              </div>
              <button data-switch-tab="student" class="text-xs font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1.5 transition">
                <span>Buka Mahasiswa</span>
                <span class="font-mono text-xs">=></span>
              </button>
            </div>
            <div id="dashboard-student-list" class="text-center py-6 text-xs text-zinc-400 font-medium">Memuat data...</div>
          </div>

          <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left" id="dashboard-schedule-highlights">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <i data-lucide="calendar" class="w-4 h-4 text-zinc-700"></i>
                <h4 class="text-sm font-bold text-zinc-900">Jadwal Kuliah</h4>
              </div>
              <button data-switch-tab="schedule" class="text-xs font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1.5 transition">
                <span>Buka Jadwal</span>
                <span class="font-mono text-xs">=></span>
              </button>
            </div>
            <div id="dashboard-schedule-list" class="text-center py-6 text-xs text-zinc-400 font-medium">Memuat data...</div>
          </div>
        </div>

        <!-- Right: Status Nodes & Distribusi -->
        <div class="space-y-6 text-left">
          <!-- Node Status -->
          <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
            <div class="flex items-center gap-2 mb-4">
              <i data-lucide="server" class="w-4 h-4 text-zinc-700"></i>
              <h4 class="text-sm font-bold text-zinc-900">Status Node</h4>
            </div>
            <div class="space-y-2.5" id="dashboard-node-status"></div>
          </div>

          <!-- Distribusi Status Mahasiswa -->
          <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left" id="dashboard-student-distribution">
            <div class="flex items-center gap-2 mb-4">
              <i data-lucide="pie-chart" class="w-4 h-4 text-zinc-700"></i>
              <h4 class="text-sm font-bold text-zinc-900">Distribusi Mahasiswa</h4>
            </div>
            <div id="distribution-bars" class="space-y-3">
              <p class="text-xs text-zinc-400 text-center py-4 font-medium">Menghitung...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderLucideIcons(container);

  // Set initial checking status
  const nodeStatusEl = container.querySelector<HTMLElement>("#dashboard-node-status")!;
  renderNodeStatusList(nodeStatusEl, {
    node2: { online: false, loading: true },
    node3: { online: false, loading: true },
    node4: { online: false, loading: true },
    node5: { online: false, loading: true },
  });

  // Bind tab switches
  container.querySelectorAll<HTMLButtonElement>("[data-switch-tab]").forEach((btn) => {
    btn.onclick = () => {
      const tab = btn.getAttribute("data-switch-tab") as TabId;
      if (tab) switchTab(tab);
    };
  });

  const refreshBtn = container.querySelector<HTMLButtonElement>("#btn-refresh-dashboard")!;
  refreshBtn.onclick = () => renderDashboard(container);

  try {
    const [studentsResult, coursesResult, krsResult, schedulesResult] = await Promise.allSettled([
      getAllStudents(),
      getAllCourses(),
      getAllKrs(),
      getAllSchedules(),
    ]);

    const isNode2Online = studentsResult.status === "fulfilled";
    const isNode3Online = coursesResult.status === "fulfilled";
    const isNode4Online = krsResult.status === "fulfilled";
    const isNode5Online = schedulesResult.status === "fulfilled";

    // Update Node Status cards dynamically
    renderNodeStatusList(nodeStatusEl, {
      node2: { online: isNode2Online, loading: false },
      node3: { online: isNode3Online, loading: false },
      node4: { online: isNode4Online, loading: false },
      node5: { online: isNode5Online, loading: false },
    });

    const students: Student[] = isNode2Online ? studentsResult.value : [];
    const courses: Course[] = isNode3Online ? coursesResult.value : [];
    const krsList: KrsItem[] = isNode4Online ? krsResult.value : [];
    const schedules: Schedule[] = isNode5Online ? schedulesResult.value : [];

    // Calculate metrics
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status?.toLowerCase() === "aktif").length;
    const cutiStudents = students.filter((s) => s.status?.toLowerCase() === "cuti").length;
    const lulusStudents = students.filter((s) => s.status?.toLowerCase() === "lulus").length;

    const totalCourses = courses.length;
    const totalSks = courses.reduce((acc, c) => acc + (c.sks || 0), 0);
    const totalKuota = courses.reduce((acc, c) => acc + (c.kuota || 0), 0);

    const totalKrs = krsList.length;
    const totalSchedules = schedules.length;

    // Render Minimalist Stats Grid
    const statsGrid = container.querySelector<HTMLElement>("#dashboard-stats-grid")!;
    statsGrid.innerHTML = `
      <!-- Stat 1: Mahasiswa (Node 2) -->
      <div class="bg-white p-5 rounded-xl border ${isNode2Online ? "border-zinc-200" : "border-rose-200 bg-rose-50/20"} text-left">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold ${isNode2Online ? "text-zinc-500" : "text-rose-600"}">Mahasiswa (Node 2)</span>
          <div class="w-7 h-7 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <i data-lucide="users" class="w-3.5 h-3.5"></i>
          </div>
        </div>
        ${
          isNode2Online
            ? `
            <div class="text-2xl font-bold text-zinc-900 tracking-tight mb-1">${totalStudents}</div>
            <div class="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <span class="text-zinc-800 font-semibold">${activeStudents} Aktif</span>
              <span>|</span>
              <span>${cutiStudents} Cuti</span>
              <span>|</span>
              <span>${lulusStudents} Lulus</span>
            </div>
          `
            : `
            <div class="text-sm font-bold text-rose-700 mb-0.5">Offline</div>
            <div class="text-xs text-rose-500">Node 2 tidak aktif (Port 3002)</div>
          `
        }
      </div>

      <!-- Stat 2: Mata Kuliah (Node 3) -->
      <div class="bg-white p-5 rounded-xl border ${isNode3Online ? "border-zinc-200" : "border-rose-200 bg-rose-50/20"} text-left">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold ${isNode3Online ? "text-zinc-500" : "text-rose-600"}">Mata Kuliah (Node 3)</span>
          <div class="w-7 h-7 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
          </div>
        </div>
        ${
          isNode3Online
            ? `
            <div class="text-2xl font-bold text-zinc-900 tracking-tight mb-1">${totalCourses}</div>
            <div class="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <span class="font-semibold text-zinc-800">${totalSks} SKS</span>
              <span>|</span>
              <span>${totalKuota} Kuota Total</span>
            </div>
          `
            : `
            <div class="text-sm font-bold text-rose-700 mb-0.5">Offline</div>
            <div class="text-xs text-rose-500">Node 3 tidak aktif (Port 3003)</div>
          `
        }
      </div>

      <!-- Stat 3: KRS Terdaftar (Node 4) -->
      <div class="bg-white p-5 rounded-xl border ${isNode4Online ? "border-zinc-200" : "border-rose-200 bg-rose-50/20"} text-left">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold ${isNode4Online ? "text-zinc-500" : "text-rose-600"}">Pengajuan KRS (Node 4)</span>
          <div class="w-7 h-7 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <i data-lucide="file-check" class="w-3.5 h-3.5"></i>
          </div>
        </div>
        ${
          isNode4Online
            ? `
            <div class="text-2xl font-bold text-zinc-900 tracking-tight mb-1">${totalKrs}</div>
            <div class="text-xs text-zinc-500 font-medium">
              <span>Terverifikasi Multi-Node</span>
            </div>
          `
            : `
            <div class="text-sm font-bold text-rose-700 mb-0.5">Offline</div>
            <div class="text-xs text-rose-500">Node 4 tidak aktif (Port 3004)</div>
          `
        }
      </div>

      <!-- Stat 4: Jadwal Perkuliahan (Node 5) -->
      <div class="bg-white p-5 rounded-xl border ${isNode5Online ? "border-zinc-200" : "border-rose-200 bg-rose-50/20"} text-left">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold ${isNode5Online ? "text-zinc-500" : "text-rose-600"}">Jadwal Kuliah (Node 5)</span>
          <div class="w-7 h-7 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
          </div>
        </div>
        ${
          isNode5Online
            ? `
            <div class="text-2xl font-bold text-zinc-900 tracking-tight mb-1">${totalSchedules}</div>
            <div class="text-xs text-zinc-500 font-medium">
              <span>Sesi ruang kuliah</span>
            </div>
          `
            : `
            <div class="text-sm font-bold text-rose-700 mb-0.5">Offline</div>
            <div class="text-xs text-rose-500">Node 5 tidak aktif (Port 3005)</div>
          `
        }
      </div>
    `;

    // Render Student List Highlight
    const studentListEl = container.querySelector<HTMLElement>("#dashboard-student-list")!;
    if (!isNode2Online) {
      studentListEl.innerHTML = `
        <div class="py-6 text-center text-xs text-rose-600 font-medium flex items-center justify-center gap-1.5">
          <i data-lucide="alert-circle" class="w-4 h-4"></i>
          <span>Node 2 (Student Service) sedang Offline di Port 3002.</span>
        </div>
      `;
    } else if (students.length === 0) {
      studentListEl.innerHTML = `<div class="py-6 text-center text-xs text-zinc-400 font-medium">Belum ada data mahasiswa terdaftar.</div>`;
    } else {
      const topStudents = students.slice(0, 5);
      studentListEl.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="text-zinc-400 border-b border-zinc-100">
                <th class="pb-2.5 font-bold uppercase tracking-wider">NIM</th>
                <th class="pb-2.5 font-bold uppercase tracking-wider">Nama Mahasiswa</th>
                <th class="pb-2.5 font-bold uppercase tracking-wider text-center">Status</th>
                <th class="pb-2.5 font-bold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              ${topStudents
                .map((s) => {
                  const statusCls =
                    s.status?.toLowerCase() === "aktif"
                      ? "bg-zinc-100 text-zinc-800 border-zinc-200"
                      : s.status?.toLowerCase() === "cuti"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-800 border-blue-200";
                  return `
                    <tr class="hover:bg-zinc-50/70 transition">
                      <td class="py-3 font-mono font-semibold text-zinc-800">${s.nim}</td>
                      <td class="py-3 font-semibold text-zinc-900">${s.nama}</td>
                      <td class="py-3 text-center">
                        <span class="inline-block px-2 py-0.5 rounded text-xs font-semibold border capitalize ${statusCls}">
                          ${s.status}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button data-quick-nim="${s.nim}" class="text-zinc-700 hover:text-zinc-950 font-bold text-xs transition flex items-center gap-1 ml-auto">
                          <span>Lihat</span>
                          <span class="font-mono text-xs">=></span>
                        </button>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      studentListEl.querySelectorAll<HTMLButtonElement>("[data-quick-nim]").forEach((btn) => {
        btn.onclick = () => {
          switchTab("student");
        };
      });
    }

    // Render Schedule List Highlight
    const scheduleListEl = container.querySelector<HTMLElement>("#dashboard-schedule-list")!;
    if (!isNode5Online) {
      scheduleListEl.innerHTML = `
        <div class="py-6 text-center text-xs text-rose-600 font-medium flex items-center justify-center gap-1.5">
          <i data-lucide="alert-circle" class="w-4 h-4"></i>
          <span>Node 5 (Schedule Service) sedang Offline di Port 3005.</span>
        </div>
      `;
    } else if (schedules.length === 0) {
      scheduleListEl.innerHTML = `<div class="py-6 text-center text-xs text-zinc-400 font-medium">Belum ada data jadwal perkuliahan.</div>`;
    } else {
      const topSchedules = schedules.slice(0, 4);
      scheduleListEl.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          ${topSchedules
            .map((sch) => {
              const matchedCourse = courses.find((c) => c.id === sch.courseId);
              return `
                <div class="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col justify-between text-left">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p class="text-xs font-bold text-zinc-900">${matchedCourse ? matchedCourse.nama : `Mata Kuliah #${sch.courseId}`}</p>
                      <p class="text-xs text-zinc-500 font-mono mt-0.5">${sch.room || "Ruang Kuliah"}</p>
                    </div>
                    <span class="bg-white text-zinc-800 text-xs font-semibold px-2 py-0.5 rounded border border-zinc-200">
                      ${sch.day}
                    </span>
                  </div>
                  <div class="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mt-1">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-zinc-400"></i>
                    <span>${sch.startTime} - ${sch.endTime}</span>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    }

    // Render Distribution Bars
    const distEl = container.querySelector<HTMLElement>("#distribution-bars")!;
    if (isNode2Online && totalStudents > 0) {
      const pAktif = Math.round((activeStudents / totalStudents) * 100);
      const pCuti = Math.round((cutiStudents / totalStudents) * 100);
      const pLulus = Math.round((lulusStudents / totalStudents) * 100);

      distEl.innerHTML = `
        <div class="space-y-3 text-xs font-medium text-left">
          <div>
            <div class="flex justify-between text-zinc-600 mb-1">
              <span class="font-medium">Aktif (${activeStudents})</span>
              <span class="font-bold text-zinc-900">${pAktif}%</span>
            </div>
            <div class="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div class="h-full bg-zinc-800 rounded-full" style="width: ${pAktif}%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-zinc-600 mb-1">
              <span class="font-medium">Cuti (${cutiStudents})</span>
              <span class="font-bold text-zinc-900">${pCuti}%</span>
            </div>
            <div class="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div class="h-full bg-amber-500 rounded-full" style="width: ${pCuti}%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-zinc-600 mb-1">
              <span class="font-medium">Lulus (${lulusStudents})</span>
              <span class="font-bold text-zinc-900">${pLulus}%</span>
            </div>
            <div class="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div class="h-full bg-zinc-400 rounded-full" style="width: ${pLulus}%"></div>
            </div>
          </div>
        </div>
      `;
    } else if (!isNode2Online) {
      distEl.innerHTML = `<div class="py-4 text-center text-xs text-rose-600 font-medium">Node 2 Offline.</div>`;
    } else {
      distEl.innerHTML = `<div class="py-4 text-center text-xs text-zinc-400 font-medium">Tidak ada data.</div>`;
    }

    renderLucideIcons(container);
  } catch (err: any) {
    console.error("Error loading dashboard data:", err);
  }
}

function setActiveNav(tabId: TabId) {
  document.querySelectorAll<HTMLButtonElement>(".nav-btn").forEach((btn) => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle("bg-zinc-100", isActive);
    btn.classList.toggle("text-zinc-900", isActive);
    btn.classList.toggle("font-bold", isActive);
    btn.classList.toggle("text-zinc-600", !isActive);
  });
}

function switchTab(tabId: TabId) {
  setActiveNav(tabId);
  const view = document.getElementById("current-view");
  if (!view) return;
  view.innerHTML = "";

  switch (tabId) {
    case "dashboard":
      renderDashboard(view);
      break;
    case "student":
      renderStudentComponent(view);
      break;
    case "course":
      renderCourseComponent(view);
      break;
    case "krs":
      renderKrsComponent(view);
      break;
    case "schedule":
      renderScheduleComponent(view);
      break;
  }
}

function initApp() {
  document.querySelectorAll<HTMLButtonElement>(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab as TabId;
      if (tabId) switchTab(tabId);
    });
  });
  renderLucideIcons();
  switchTab("dashboard");
}

document.addEventListener("DOMContentLoaded", initApp);
