import { synchronizeTime, getKrsPeriod, type SyncResult } from "../rpc/time";
import { renderLucideIcons } from "../icons";

function fmtClock(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtSigned(ms: number): string {
  const sign = ms < 0 ? "-" : "+";
  return `${sign}${Math.abs(Math.round(ms))} ms`;
}

export function renderTimeSyncComponent(container: HTMLElement) {
  const pageTitle = document.getElementById("page-title")!;
  const pageDesc = document.getElementById("page-desc")!;
  pageTitle.textContent = "Sinkronisasi Waktu KRS";
  pageDesc.textContent = "Node 1 <-> Node 4 | Cristian's Algorithm (Physical Clock Sync)";

  container.innerHTML = `
    <div class="space-y-6 text-left">
      <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <i data-lucide="clock" class="w-4 h-4"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-900">Sinkronisasi Jam (Cristian's Algorithm)</h3>
            <p class="text-xs font-medium text-zinc-500">Node 1 memanggil getTime() ke Node 4 (time authority)</p>
          </div>
        </div>
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-3 mb-4 text-xs font-medium text-zinc-600 flex items-start gap-2">
          <i data-lucide="info" class="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0"></i>
          <span>Rumus: RTT = T4 - T1, offset = (T<sub>server</sub> + RTT/2) - T4. Jam validasi = jam lokal + offset, tanpa memundurkan jam sistem.</span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button id="btn-sync" class="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span>Sinkronkan Sekarang (4 sampel)</span>
          </button>
          <button id="btn-period" class="text-xs font-semibold text-zinc-800 hover:bg-zinc-50 border border-zinc-300 px-3.5 py-2 rounded-lg transition">
            Lihat Periode KRS
          </button>
        </div>
        <div id="sync-result" class="mt-4"></div>
      </div>

      <div class="bg-white rounded-xl border border-zinc-200 p-6 text-left">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-8 h-8 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center">
            <i data-lucide="shield-check" class="w-4 h-4"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-900">Uji Kelayakan Waktu Submit</h3>
            <p class="text-xs font-medium text-zinc-500">Apakah jam tersinkron masih di dalam periode KRS?</p>
          </div>
        </div>
        <div id="period-box" class="text-xs text-zinc-500 font-medium">Klik "Sinkronkan Sekarang" untuk menguji.</div>
      </div>
    </div>
  `;

  renderLucideIcons(container);

  const syncBtn = container.querySelector<HTMLButtonElement>("#btn-sync")!;
  const periodBtn = container.querySelector<HTMLButtonElement>("#btn-period")!;
  const resultEl = container.querySelector<HTMLElement>("#sync-result")!;
  const periodBox = container.querySelector<HTMLElement>("#period-box")!;

  function renderResult(r: SyncResult) {
    const rows = r.samples
      .map(
        (s, i) => `
        <tr class="border-t border-zinc-100 ${s.rtt === r.best.rtt ? "bg-emerald-50/60 font-semibold" : ""}">
          <td class="py-2 px-3 font-mono">#${i + 1}</td>
          <td class="py-2 px-3 font-mono">${s.rtt} ms</td>
          <td class="py-2 px-3 font-mono">${fmtSigned(s.offset)}</td>
          <td class="py-2 px-3 font-mono">${new Date(s.serverTime).toLocaleTimeString("id-ID")}</td>
        </tr>`,
      )
      .join("");
    resultEl.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
          <p class="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">RTT terbaik</p>
          <p class="text-lg font-bold text-zinc-900 font-mono">${r.rtt} ms</p>
        </div>
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
          <p class="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Offset jam</p>
          <p class="text-lg font-bold text-zinc-900 font-mono">${fmtSigned(r.offset)}</p>
        </div>
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
          <p class="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Jam server (estimasi)</p>
          <p class="text-sm font-bold text-zinc-900">${fmtClock(r.estimatedServerNow)}</p>
        </div>
      </div>
      <div class="overflow-x-auto border border-zinc-200 rounded-lg">
        <table class="w-full text-xs text-left">
          <thead><tr class="bg-zinc-50 text-zinc-500">
            <th class="py-2 px-3 font-bold uppercase">Sampel</th>
            <th class="py-2 px-3 font-bold uppercase">RTT (T4-T1)</th>
            <th class="py-2 px-3 font-bold uppercase">Offset</th>
            <th class="py-2 px-3 font-bold uppercase">T_server</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="mt-2 text-[11px] text-zinc-400 font-medium">Sampel dengan RTT terkecil dipakai (tahan jitter jaringan).</p>
    `;
    const open = r.period.openAt !== null ? fmtClock(r.period.openAt) : "tidak dibatasi";
    const close = r.period.closeAt !== null ? fmtClock(r.period.closeAt) : "tidak dibatasi";
    periodBox.innerHTML = r.withinPeriod
      ? `<div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
          <span>LAYAK SUBMIT — jam tersinkron ${fmtClock(r.adjustedNow)} berada dalam periode (${open} s/d ${close}).</span>
        </div>`
      : `<div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
          <span>DITOLAK — jam tersinkron ${fmtClock(r.adjustedNow)} di luar periode (${open} s/d ${close}). Server juga akan menolak via checkPeriod().</span>
        </div>`;
    renderLucideIcons(container);
  }

  syncBtn.onclick = async () => {
    resultEl.innerHTML = `<div class="flex items-center gap-2 text-xs font-medium text-zinc-500 py-3"><div class="spinner"></div> Mengukur RTT ke Node 4 (4x getTime)...</div>`;
    try {
      renderResult(await synchronizeTime(4));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal sinkronisasi";
      resultEl.innerHTML = `<div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800">${msg}</div>`;
    }
  };

  periodBtn.onclick = async () => {
    periodBox.innerHTML = `<div class="flex items-center gap-2 text-xs font-medium text-zinc-500"><div class="spinner"></div> Memuat periode...</div>`;
    try {
      const p = await getKrsPeriod();
      periodBox.innerHTML = `
        <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs space-y-1 font-medium text-zinc-700">
          <p>Dibuka: <strong>${p.openAtIso ?? "-"}</strong></p>
          <p>Ditutup: <strong>${p.closeAtIso ?? "-"}</strong></p>
          <p>Jam server: <strong class="font-mono">${p.serverIso}</strong></p>
          <p>Status: <strong>${p.isOpen ? "DIBUKA" : "DITUTUP"}</strong> — ${p.reason}</p>
        </div>`;
    } catch (err: unknown) {
      periodBox.innerHTML = `<div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs font-semibold text-rose-800">Gagal memuat periode.</div>`;
    }
  };
}
