import { isWarn, mergeSessions, parseSnapshot, pillText, resetText, windowNow, type Snapshot } from "../usage"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function parsed(raw: string, what: string): Snapshot {
  const snap = parseSnapshot(raw)
  if (snap === null) throw new Error(`${what} should have parsed`)
  return snap
}

const now = 1758000000

const full = parsed(
  JSON.stringify({
    received_at: now,
    data: {
      session_id: "3f2a91c4d5e67890",
      workspace: { current_dir: "/home/han/Projects/hyprland-lua-transfer" },
      model: { display_name: "Opus 5" },
      context_window: { used_percentage: 37.4 },
      cost: { total_cost_usd: 1.234 },
      rate_limits: {
        five_hour: { used_percentage: 23.5, resets_at: now + 3600 },
        seven_day: { used_percentage: 41.2, resets_at: now + 5 * 86400 },
      },
    },
  }),
  "a full statusLine payload",
)

assert(
  full.session.name === "hyprland-lua-transfer",
  `an unnamed session takes the current dir's last segment, got "${full.session.name}"`,
)
assert(full.windows.five !== undefined, "five-hour window should be present")
assert(full.windows.week !== undefined, "weekly window should be present")
assert(
  pillText(full.windows, now) === "5h 24% · wk 41%",
  `expected "5h 24% · wk 41%", got "${pillText(full.windows, now)}"`,
)

assert(parseSnapshot("not json") === null, "bad JSON should parse to null")

const bare = parsed(
  JSON.stringify({ received_at: now, data: { session_id: "abc", model: { display_name: "Opus 5" } } }),
  "a payload without rate_limits",
)
assert(
  Object.keys(bare.windows).length === 0,
  `no rate_limits means no windows, got ${JSON.stringify(bare.windows)}`,
)
assert(
  pillText(bare.windows, now) === "5h — · wk —",
  `expected "5h — · wk —", got "${pillText(bare.windows, now)}"`,
)

assert(
  windowNow({ used: 50, resetsAt: now - 1 }, now) === 0,
  `a window past its reset reads 0, got ${windowNow({ used: 50, resetsAt: now - 1 }, now)}`,
)

const snapshot = (id: string, receivedAt: number): Snapshot => ({
  receivedAt,
  session: { id, name: id, model: "Opus 5", ctx: null, cost: 0 },
  windows: {},
})

const pruned = mergeSessions(
  mergeSessions(new Map(), snapshot("older", now - 121), now),
  snapshot("younger", now - 119),
  now,
)
assert(pruned.size === 1, `only the younger session survives, got ${[...pruned.keys()].join(", ")}`)
assert(pruned.has("younger"), `the 119s-old session should survive, got ${[...pruned.keys()].join(", ")}`)

const byId = mergeSessions(
  mergeSessions(new Map(), snapshot("same", now - 30), now),
  snapshot("same", now - 5),
  now,
)
assert(
  byId.size === 1 && byId.get("same")?.receivedAt === now - 5,
  `the newest snapshot per id wins, got ${JSON.stringify([...byId.values()].map((s) => s.receivedAt))}`,
)

assert(
  resetText({ used: 0, resetsAt: now + 72 * 60 }, now) === "in 1h 12m",
  `expected "in 1h 12m", got "${resetText({ used: 0, resetsAt: now + 72 * 60 }, now)}"`,
)
const far = resetText({ used: 0, resetsAt: now + 30 * 3600 }, now)
assert(/^[A-Z][a-z]{2} \d{2}:\d{2}$/.test(far), `expected a weekday and clock time, got "${far}"`)
assert(
  resetText({ used: 0, resetsAt: now - 500 }, now) === "reset",
  `a window past its reset reads "reset", got "${resetText({ used: 0, resetsAt: now - 500 }, now)}"`,
)
assert(resetText(undefined, now) === "—", `an absent window resets "—", got "${resetText(undefined, now)}"`)

assert(isWarn({ five: { used: 80, resetsAt: now + 3600 } }, now), "80% should warn")
assert(!isWarn({ five: { used: 79.9, resetsAt: now + 3600 } }, now), "79.9% should not warn")

console.log("ok")
