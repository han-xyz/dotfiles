import { Accessor, createState } from "ags"
import { Gtk } from "ags/gtk4"
import { readFile } from "ags/file"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import GLib from "gi://GLib"
import { formatMem, GPU_START, gpuTooltip, isNvidiaHost, nextGpu, parseBusy, type GpuState } from "../system"
import { icon } from "./_fa"

const CPU = "\u{F2DB}"
const GPU = "\u{F5FD}"
const MEM = "\u{F538}"

const POLL_MS = 2000
const MEM_POLL_MS = 5000
const GLYPH_GAP = 4
const NVIDIA_TIMEOUT_S = "3"
// nvidia-smi can ignore TERM while the driver is stuck; KILL follows after this.
const NVIDIA_KILL_AFTER_S = "1"
const DRM = "/sys/class/drm"
const NVIDIA_DRIVER_DIR = "/proc/driver/nvidia"
const STALE_TIP = " · last reading, nvidia-smi not answering"

const NVIDIA_QUERY = [
  "timeout",
  "-k",
  NVIDIA_KILL_AFTER_S,
  NVIDIA_TIMEOUT_S,
  "nvidia-smi",
  "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
  "--format=csv,noheader,nounits",
]

const cpuUsage = createPoll("0%", POLL_MS, [
  "sh",
  "-c",
  "top -bn1 | awk '/^%Cpu/ {printf \"%.0f%%\", 100 - $8}'",
])

const memKb = createPoll(
  [0, 0],
  MEM_POLL_MS,
  ["sh", "-c", "awk '/MemTotal:/{t=$2} /MemAvailable:/{a=$2} END{print t-a, t}' /proc/meminfo"],
  (out) => out.trim().split(/\s+/).map(Number),
)

function readBusy(path: string): string | null {
  try {
    const text = readFile(path)
    return parseBusy(text) === null ? null : text
  } catch {
    return null
  }
}

function readSysfs(): string | null {
  const names: string[] = []
  try {
    const dir = GLib.Dir.open(DRM, 0)
    try {
      for (let name = dir.read_name(); name !== null; name = dir.read_name()) {
        if (/^card\d+$/.test(name)) names.push(name)
      }
    } finally {
      dir.close()
    }
  } catch {
    return null
  }
  names.sort((a, b) => Number(a.slice("card".length)) - Number(b.slice("card".length)))
  for (const name of names) {
    const text = readBusy(`${DRM}/${name}/device/gpu_busy_percent`)
    if (text !== null) return text
  }
  return null
}

async function readGpu(prev: GpuState): Promise<GpuState> {
  const nvidiaHost = isNvidiaHost(
    GLib.find_program_in_path("nvidia-smi") !== null,
    GLib.file_test(NVIDIA_DRIVER_DIR, GLib.FileTest.IS_DIR),
  )
  if (!nvidiaHost) return nextGpu(prev, { nvidiaHost, nvidiaLine: null, sysfsText: readSysfs() })
  const nvidiaLine = await execAsync(NVIDIA_QUERY).catch(() => null)
  return nextGpu(prev, { nvidiaHost, nvidiaLine, sysfsText: null })
}

// A tick is skipped while the previous read is still running, so a slow
// result never lands after a newer one.
function createGpuState(): Accessor<GpuState> {
  const [state, setState] = createState<GpuState>(GPU_START)
  let pending = false
  const tick = () => {
    if (pending) return
    pending = true
    readGpu(state.get())
      .catch(() => GPU_START)
      .then(setState)
      .finally(() => (pending = false))
  }
  tick()
  setInterval(tick, POLL_MS)
  return state
}

let gpuState: Accessor<GpuState> | null = null
const sharedGpuState = () => (gpuState ??= createGpuState())

function Separator({ visible = true }: { visible?: boolean | Accessor<boolean> }) {
  return <label class="sep" label="·" visible={visible} />
}

export default function System() {
  const gpu = sharedGpuState()
  const mem = memKb(([used, total]) => formatMem(used, total))

  return (
    <box class="module system" valign={Gtk.Align.CENTER}>
      <box class="part" spacing={GLYPH_GAP} tooltipText={cpuUsage((v) => `CPU ${v}`)}>
        <label useMarkup label={icon(CPU)} />
        <label label={cpuUsage} />
      </box>
      <Separator visible={gpu((g) => g.reading !== null)} />
      <box
        class={gpu((g) => (g.stale ? "part stale" : "part"))}
        spacing={GLYPH_GAP}
        visible={gpu((g) => g.reading !== null)}
        tooltipText={gpu((g) => (g.reading ? gpuTooltip(g.reading) + (g.stale ? STALE_TIP : "") : ""))}
      >
        <label useMarkup label={icon(GPU)} />
        <label label={gpu((g) => (g.reading ? `${g.reading.percent}%` : ""))} />
      </box>
      <Separator />
      <box class="part" spacing={GLYPH_GAP} tooltipText={mem((m) => `Memory ${m}`)}>
        <label useMarkup label={icon(MEM)} />
        <label label={mem} />
      </box>
    </box>
  )
}
