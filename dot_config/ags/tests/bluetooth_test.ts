import { deviceLine } from "../widget/Bluetooth"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(
  deviceLine("Buds", true, 80) === "Buds · Connected · 80%",
  `expected "Buds · Connected · 80%", got "${deviceLine("Buds", true, 80)}"`,
)
assert(
  deviceLine("Buds", false, -1) === "Buds · Disconnected",
  `expected "Buds · Disconnected", got "${deviceLine("Buds", false, -1)}"`,
)
assert(
  deviceLine("Buds", true, -1) === "Buds · Connected",
  `expected "Buds · Connected", got "${deviceLine("Buds", true, -1)}"`,
)

console.log("ok")
