import { pillState } from "../workspaces"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

const cases: [number, number | null, number | null, string][] = [
  [3, 3, 1, "focused"],
  [1, 3, 1, "shown"],
  [2, 3, 1, "other"],
  [4, 4, 4, "focused"],
  [5, null, null, "other"],
]

for (const [ws, focused, shown, want] of cases) {
  const got = pillState(ws, focused, shown)
  assert(got === want, `pillState(${ws}, ${focused}, ${shown}) should be ${want}, got ${got}`)
}

console.log("ok")
