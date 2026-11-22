export type GpuReading = { percent: number; usedMiB: number | null; totalMiB: number | null; tempC: number | null }

const KIB_PER_GIB = 1024 * 1024
const MIB_PER_GIB = 1024

function finiteOrNull(field: string | undefined): number | null {
  const s = field?.trim() ?? ""
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function parseNvidia(line: string): GpuReading | null {
  const [percent, used, total, temp] = line.split("\n")[0].split(",")
  const p = finiteOrNull(percent)
  if (p === null) return null
  return { percent: p, usedMiB: finiteOrNull(used), totalMiB: finiteOrNull(total), tempC: finiteOrNull(temp) }
}

export const GPU_MISS_LIMIT = 3

export type GpuState = { reading: GpuReading | null; source: "nvidia" | "sysfs" | null; stale: boolean; misses: number }
export type GpuInput = { nvidiaHost: boolean; nvidiaLine: string | null; sysfsText: string | null }

export const GPU_START: GpuState = { reading: null, source: null, stale: false, misses: 0 }

export function isNvidiaHost(smiOnPath: boolean, driverLoaded: boolean): boolean {
  return smiOnPath && driverLoaded
}

// On an NVIDIA host the sysfs file belongs to the integrated GPU, so it is
// never shown there: a failed read holds the last NVIDIA reading instead.
export function nextGpu(prev: GpuState, input: GpuInput): GpuState {
  if (!input.nvidiaHost) {
    const percent = input.sysfsText === null ? null : parseBusy(input.sysfsText)
    if (percent === null) return GPU_START
    return { reading: { percent, usedMiB: null, totalMiB: null, tempC: null }, source: "sysfs", stale: false, misses: 0 }
  }
  const reading = input.nvidiaLine === null ? null : parseNvidia(input.nvidiaLine)
  if (reading !== null) return { reading, source: "nvidia", stale: false, misses: 0 }
  const misses = prev.misses + 1
  if (prev.source !== "nvidia" || misses > GPU_MISS_LIMIT) return { reading: null, source: null, stale: false, misses }
  return { reading: prev.reading, source: "nvidia", stale: true, misses }
}

export function parseBusy(text: string): number | null {
  return finiteOrNull(text)
}

export function formatMem(usedKb: number, totalKb: number): string {
  return `${(usedKb / KIB_PER_GIB).toFixed(1)}/${(totalKb / KIB_PER_GIB).toFixed(1)}G`
}

export function gpuTooltip(r: GpuReading): string {
  let text = `GPU ${r.percent}%`
  if (r.usedMiB !== null && r.totalMiB !== null) {
    text += ` · ${(r.usedMiB / MIB_PER_GIB).toFixed(1)}/${(r.totalMiB / MIB_PER_GIB).toFixed(1)}G VRAM`
  }
  if (r.tempC !== null) text += ` · ${Math.round(r.tempC)}°C`
  return text
}
