import os from "node:os";
import type { GpuInfo } from "../schemas/probe.js";
import { runExecFile } from "./exec.js";

function bytesToRoundedGb(bytes: number): number {
  return Math.round((bytes / 1024 ** 3) * 10) / 10;
}

function inferGpuVendor(name: string): GpuInfo["vendor"] {
  const lower = name.toLowerCase();
  if (lower.includes("nvidia") || lower.includes("geforce") || lower.includes("rtx") || lower.includes("gtx") || lower.includes("quadro")) {
    return "nvidia";
  }
  if (lower.includes("amd") || lower.includes("radeon")) {
    return "amd";
  }
  if (lower.includes("apple")) {
    return "apple";
  }
  if (lower.includes("intel") || lower.includes("uhd") || lower.includes("iris") || lower.includes("arc")) {
    return "intel";
  }
  return "unknown";
}

async function probeNvidiaSmi(): Promise<GpuInfo[]> {
  const res = await runExecFile(
    "nvidia-smi",
    ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
    3000
  );
  if (!res.ok || !res.stdout.trim()) {
    return [];
  }

  const gpus: GpuInfo[] = [];
  for (const line of res.stdout.trim().split(/\r?\n/)) {
    const [rawName, rawMem] = line.split(",").map((part) => part.trim());
    if (!rawName) {
      continue;
    }
    const parsedMem = rawMem ? Number.parseInt(rawMem, 10) : Number.NaN;
    gpus.push({
      name: rawName,
      vendor: "nvidia",
      vramMb: Number.isFinite(parsedMem) && parsedMem >= 0 ? parsedMem : null,
    });
  }
  return gpus;
}

async function probeWindowsGpus(): Promise<GpuInfo[]> {
  const res = await runExecFile(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress",
    ],
    3000
  );
  if (!res.ok || !res.stdout.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(res.stdout.trim()) as
      | { Name?: unknown; AdapterRAM?: unknown }
      | Array<{ Name?: unknown; AdapterRAM?: unknown }>;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const gpus: GpuInfo[] = [];

    for (const item of items) {
      if (typeof item.Name !== "string" || !item.Name.trim()) {
        continue;
      }
      const name = item.Name.trim();
      const rawRam = typeof item.AdapterRAM === "number" ? item.AdapterRAM : Number.NaN;
      const vramMb =
        Number.isFinite(rawRam) && rawRam > 0 ? Math.round(rawRam / (1024 * 1024)) : null;
      gpus.push({
        name,
        vendor: inferGpuVendor(name),
        vramMb,
      });
    }
    return gpus;
  } catch {
    return [];
  }
}

async function probeDarwinGpus(): Promise<GpuInfo[]> {
  const res = await runExecFile("system_profiler", ["SPDisplaysDataType", "-json"], 3000);
  if (!res.ok || !res.stdout.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(res.stdout) as {
      SPDisplaysDataType?: Array<{
        sppci_model?: string;
        _name?: string;
        spdisplays_vram?: string;
      }>;
    };
    const displays = parsed.SPDisplaysDataType ?? [];
    const gpus: GpuInfo[] = [];
    for (const entry of displays) {
      const name = (entry.sppci_model ?? entry._name ?? "").trim();
      if (!name) {
        continue;
      }
      let vramMb: number | null = null;
      if (typeof entry.spdisplays_vram === "string") {
        const match = entry.spdisplays_vram.match(/(\d+)\s*(GB|MB)/i);
        if (match && match[1] && match[2]) {
          const val = Number.parseInt(match[1], 10);
          vramMb = match[2].toUpperCase() === "GB" ? val * 1024 : val;
        }
      }
      gpus.push({ name, vendor: inferGpuVendor(name), vramMb });
    }
    return gpus;
  } catch {
    return [];
  }
}

async function probeLinuxGpus(): Promise<GpuInfo[]> {
  const res = await runExecFile("lspci", [], 3000);
  if (!res.ok || !res.stdout.trim()) {
    return [];
  }
  const gpus: GpuInfo[] = [];
  for (const line of res.stdout.split(/\r?\n/)) {
    if (/(VGA compatible controller|3D controller|Display controller)/i.test(line)) {
      const parts = line.split(":");
      const name = parts.slice(2).join(":").trim() || line.trim();
      gpus.push({ name, vendor: inferGpuVendor(name), vramMb: null });
    }
  }
  return gpus;
}

async function detectGpus(): Promise<GpuInfo[]> {
  const nvidiaGpus = await probeNvidiaSmi();
  if (nvidiaGpus.length > 0) {
    return nvidiaGpus;
  }

  if (process.platform === "win32") {
    return probeWindowsGpus();
  }
  if (process.platform === "darwin") {
    return probeDarwinGpus();
  }
  if (process.platform === "linux") {
    return probeLinuxGpus();
  }
  return [];
}

/** Collects host CPU, RAM, and GPU/VRAM characteristics safely. */
export async function probeHardware(): Promise<{
  cpuModel: string;
  cpuCores: number;
  totalRamGb: number;
  freeRamGb: number;
  gpus: GpuInfo[];
}> {
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model?.trim() || "Unknown CPU";
  const cpuCores = Math.max(cpus.length, 1);
  const totalRamGb = bytesToRoundedGb(os.totalmem());
  const freeRamGb = bytesToRoundedGb(os.freemem());
  const gpus = await detectGpus();

  return {
    cpuModel,
    cpuCores,
    totalRamGb,
    freeRamGb,
    gpus,
  };
}
