import { resolveHostList, LAPTOP } from "../hosts"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

const r1 = resolveHostList(null, "hosts/x.json")
assert(sameOrder(r1.names, LAPTOP), `null host file should give LAPTOP, got ${JSON.stringify(r1.names)}`)
assert(r1.warnings.length === 0, `null host file should give no warnings, got ${JSON.stringify(r1.warnings)}`)

const r2 = resolveHostList('["clock","tray"]', "hosts/x.json")
assert(sameOrder(r2.names, ["clock", "tray"]), `expected [clock,tray], got ${JSON.stringify(r2.names)}`)
assert(r2.warnings.length === 0, `expected no warnings, got ${JSON.stringify(r2.warnings)}`)

const r3 = resolveHostList("{}", "hosts/x.json")
assert(sameOrder(r3.names, LAPTOP), `non-array should give LAPTOP, got ${JSON.stringify(r3.names)}`)
assert(
  r3.warnings.length === 1 && r3.warnings[0].includes("hosts/x.json"),
  `expected one warning naming the file, got ${JSON.stringify(r3.warnings)}`,
)

const r4 = resolveHostList('["clock","nope"]', "hosts/x.json")
assert(sameOrder(r4.names, ["clock"]), `expected [clock], got ${JSON.stringify(r4.names)}`)
assert(
  r4.warnings.length === 1 && r4.warnings[0].includes("nope"),
  `expected one warning naming nope, got ${JSON.stringify(r4.warnings)}`,
)

console.log("ok")
