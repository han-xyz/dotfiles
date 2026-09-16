import { batteryGlyph, fmtDuration } from "../widget/Battery"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

const FULL = "\u{F240}"
const THREE_QUARTER = "\u{F241}"
const HALF = "\u{F242}"
const QUARTER = "\u{F243}"
const EMPTY = "\u{F244}"
const BOLT = "\u{F0E7}"

assert(batteryGlyph(95, false) === FULL, `95% should be full, got ${batteryGlyph(95, false)}`)
assert(batteryGlyph(90, false) === FULL, `90% should be full, got ${batteryGlyph(90, false)}`)
assert(
  batteryGlyph(60, false) === THREE_QUARTER,
  `60% should be three-quarter, got ${batteryGlyph(60, false)}`,
)
assert(batteryGlyph(35, false) === HALF, `35% should be half, got ${batteryGlyph(35, false)}`)
assert(batteryGlyph(10, false) === QUARTER, `10% should be quarter, got ${batteryGlyph(10, false)}`)
assert(batteryGlyph(5, false) === EMPTY, `5% should be empty, got ${batteryGlyph(5, false)}`)
assert(
  batteryGlyph(50, true).startsWith(BOLT),
  `charging glyph should start with the bolt, got ${batteryGlyph(50, true)}`,
)

assert(fmtDuration(4320) === "1h 12m", `4320s should be "1h 12m", got "${fmtDuration(4320)}"`)
assert(fmtDuration(2700) === "45m", `2700s should be "45m", got "${fmtDuration(2700)}"`)
assert(fmtDuration(0) === "", `0s should be "", got "${fmtDuration(0)}"`)

console.log("ok")
