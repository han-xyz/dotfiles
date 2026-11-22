import { parseNvidia, parseBusy, formatMem, gpuTooltip, nextGpu, isNvidiaHost, GPU_START, type GpuState } from "../system"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

const show = (v: unknown) => JSON.stringify(v)

const full = parseNvidia("30, 1793, 12282, 44.61")
assert(
  full !== null && full.percent === 30 && full.usedMiB === 1793 && full.totalMiB === 12282 && full.tempC === 44.61,
  `full line, got ${show(full)}`,
)

const partial = parseNvidia("30, [N/A], [N/A], [N/A]")
assert(
  partial !== null &&
    partial.percent === 30 &&
    partial.usedMiB === null &&
    partial.totalMiB === null &&
    partial.tempC === null,
  `N/A fields should be null, got ${show(partial)}`,
)

assert(parseNvidia("garbage") === null, `garbage should be null, got ${show(parseNvidia("garbage"))}`)
assert(parseNvidia("") === null, `empty should be null, got ${show(parseNvidia(""))}`)

const twoLines = parseNvidia("12, 100, 200, 40\n99, 1, 2, 3")
assert(twoLines !== null && twoLines.percent === 12, `first line should win, got ${show(twoLines)}`)

assert(parseBusy("17\n") === 17, `busy 17, got ${show(parseBusy("17\n"))}`)
assert(parseBusy("x") === null, `busy x should be null, got ${show(parseBusy("x"))}`)

assert(formatMem(12792627, 31981568) === "12.2/30.5G", `formatMem, got ${formatMem(12792627, 31981568)}`)

assert(
  full !== null && gpuTooltip(full) === "GPU 30% · 1.8/12.0G VRAM · 45°C",
  `full tooltip, got ${full && gpuTooltip(full)}`,
)
assert(partial !== null && gpuTooltip(partial) === "GPU 30%", `partial tooltip, got ${partial && gpuTooltip(partial)}`)

const zeros = parseNvidia("0, 0, 0, 0")
assert(
  zeros !== null && zeros.percent === 0 && zeros.usedMiB === 0 && zeros.totalMiB === 0 && zeros.tempC === 0,
  `zeros are readings, not missing, got ${show(zeros)}`,
)

const blanks = parseNvidia("30,,,")
assert(
  blanks !== null && blanks.usedMiB === null && blanks.totalMiB === null && blanks.tempC === null,
  `blank fields should be null, got ${show(blanks)}`,
)

const shortLine = parseNvidia("30")
assert(shortLine !== null && shortLine.percent === 30 && shortLine.tempC === null, `short line, got ${show(shortLine)}`)

assert(parseNvidia("Infinity, 1, 2, 3") === null, "non-finite percent should be null")
assert(parseNvidia("30, Infinity, NaN, -Infinity")?.usedMiB === null, "non-finite fields should be null")

assert(parseBusy("") === null, `empty busy should be null, got ${show(parseBusy(""))}`)
assert(parseBusy("Infinity") === null, "non-finite busy should be null")
assert(parseBusy("0\n") === 0, `busy 0, got ${show(parseBusy("0\n"))}`)

const tip = (r: Parameters<typeof gpuTooltip>[0]) => gpuTooltip(r)
assert(
  tip({ percent: 30, usedMiB: 1793, totalMiB: null, tempC: null }) === "GPU 30%",
  "used without total should drop VRAM",
)
assert(
  tip({ percent: 30, usedMiB: null, totalMiB: 12282, tempC: null }) === "GPU 30%",
  "total without used should drop VRAM",
)
assert(
  tip({ percent: 30, usedMiB: null, totalMiB: null, tempC: 44.4 }) === "GPU 30% · 44°C",
  "temperature alone, rounded down",
)
assert(
  tip({ percent: 0, usedMiB: 0, totalMiB: 12288, tempC: 0 }) === "GPU 0% · 0.0/12.0G VRAM · 0°C",
  "zero values are shown",
)

assert(formatMem(0, 1048576) === "0.0/1.0G", `formatMem 0, got ${formatMem(0, 1048576)}`)

const GOOD = "30, 1793, 12282, 44.61"
const run = (prev: GpuState, nvidiaHost: boolean, nvidiaLine: string | null, sysfsText: string | null) =>
  nextGpu(prev, { nvidiaHost, nvidiaLine, sysfsText })

const good = run(GPU_START, true, GOOD, null)
assert(good.reading?.percent === 30 && !good.stale && good.misses === 0, `good nvidia read, got ${show(good)}`)

let held = good
for (let miss = 1; miss <= 3; miss++) {
  held = run(held, true, miss === 2 ? "NVIDIA-SMI has failed" : null, null)
  assert(
    held.reading?.percent === 30 && held.stale && held.misses === miss,
    `miss ${miss} should hold the last reading stale, got ${show(held)}`,
  )
}
const fourth = run(held, true, null, null)
assert(fourth.reading === null, `4th miss should hide, got ${show(fourth)}`)

const back = run(fourth, true, "55, 1, 2, 3", null)
assert(back.reading?.percent === 55 && !back.stale && back.misses === 0, `good read after misses, got ${show(back)}`)
const backFromStale = run(run(good, true, null, null), true, GOOD, null)
assert(!backFromStale.stale && backFromStale.misses === 0, `good read after a stale one, got ${show(backFromStale)}`)

const never = run(GPU_START, true, null, null)
assert(never.reading === null, `miss with no previous reading should hide, got ${show(never)}`)

const goodIgnoresSysfs = run(GPU_START, true, GOOD, "17\n")
assert(goodIgnoresSysfs.reading?.percent === 30, `nvidia host ignores sysfs on a good read, got ${show(goodIgnoresSysfs)}`)
const missIgnoresSysfs = run(GPU_START, true, null, "17\n")
assert(missIgnoresSysfs.reading === null, `nvidia host ignores sysfs on a miss, got ${show(missIgnoresSysfs)}`)
const heldIgnoresSysfs = run(good, true, null, "17\n")
assert(heldIgnoresSysfs.reading?.percent === 30, `nvidia host holds nvidia, not sysfs, got ${show(heldIgnoresSysfs)}`)

const fourthIgnoresSysfs = run(held, true, null, "17\n")
assert(fourthIgnoresSysfs.reading === null, `4th miss with sysfs readable should hide, got ${show(fourthIgnoresSysfs)}`)
const sysfsThenNvidiaMiss = run(run(GPU_START, false, null, "17\n"), true, null, null)
assert(sysfsThenNvidiaMiss.reading === null, `a sysfs reading is not held on an nvidia host, got ${show(sysfsThenNvidiaMiss)}`)

const igpu = run(GPU_START, false, null, "17\n")
assert(
  igpu.reading?.percent === 17 && igpu.reading.usedMiB === null && !igpu.stale,
  `sysfs on a non-nvidia host, got ${show(igpu)}`,
)
const noGpu = run(good, false, null, null)
assert(noGpu.reading === null, `no sysfs on a non-nvidia host should hide, got ${show(noGpu)}`)

assert(isNvidiaHost(true, true), "nvidia-smi on PATH with the driver is an nvidia host")
assert(!isNvidiaHost(true, false), "nvidia-smi on PATH without the driver is not an nvidia host")
assert(!isNvidiaHost(false, true), "the driver without nvidia-smi is not an nvidia host")

console.log("ok")
