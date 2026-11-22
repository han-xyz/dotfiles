import {
  isWarn,
  limitNow,
  mergeSessions,
  parseSnapshot,
  pillText,
  resetText,
  type Limit,
  type Snapshot,
} from "../usage"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function parsed(raw: string, what: string): Snapshot {
  const snap = parseSnapshot(raw)
  if (snap === null) throw new Error(`${what} should have parsed`)
  return snap
}

const now = 1758000000
const inFourDaysIso = "2025-09-20T05:20:00.801688+00:00"
const inFourDays = 1758345600
const fetchedAtMs = 1795341594329

const live = (rateLimits: Record<string, unknown>) => ({ session_id: "abc", rate_limits: rateLimits })
const window = (used: number) => ({ used_percentage: used, resets_at: now + 3600 })
const cachedAll = (percent: unknown) => ({ kind: "weekly_all", percent, resets_at: inFourDaysIso, scope: null })
const cachedScoped = (name: unknown, percent: unknown = 53) => ({
  kind: "weekly_scoped",
  percent,
  resets_at: inFourDaysIso,
  scope: { model: { display_name: name } },
})

function snap(data: Record<string, unknown>, limits?: unknown[]): Snapshot {
  const wrapper: Record<string, unknown> = { received_at: now, data }
  if (limits) wrapper.usage = { fetched_at_ms: fetchedAtMs, limits }
  return parsed(JSON.stringify(wrapper), JSON.stringify(wrapper))
}

const kinds = (s: Snapshot) => s.limits.map((l) => l.kind).join(",")

const full = parsed(
  JSON.stringify({
    received_at: now,
    data: {
      session_id: "3f2a91c4d5e67890",
      workspace: { current_dir: "/home/han/Projects/hyprland-lua-transfer" },
      model: { display_name: "Opus 5" },
      context_window: { used_percentage: 37.4 },
      cost: { total_cost_usd: 1.234 },
    },
  }),
  "a full statusLine payload",
)
assert(
  full.session.name === "hyprland-lua-transfer",
  `an unnamed session takes the current dir's last segment, got "${full.session.name}"`,
)

assert(parseSnapshot("not json") === null, "bad JSON should parse to null")

const weekAndScoped = snap(live({ seven_day: window(55) }), [cachedScoped("Fable")])
assert(
  pillText(weekAndScoped.limits, now) === "55% · F 53%",
  `live week 55 and cached Fable 53 give "55% · F 53%", got "${pillText(weekAndScoped.limits, now)}"`,
)

const liveOverCache = snap(live({ seven_day: window(55) }), [cachedAll(40)])
assert(
  liveOverCache.limits.length === 1 && liveOverCache.limits[0].used === 55 && !liveOverCache.limits[0].cached,
  `live seven_day wins over cached weekly_all, got ${JSON.stringify(liveOverCache.limits)}`,
)

const three = snap(live({ five_hour: window(12), seven_day: window(55) }), [cachedScoped("Fable")])
const labels = three.limits.map((l) => `${l.label}/${l.short}`).join(",")
assert(
  kinds(three) === "five_hour,weekly_all,weekly_scoped" && labels === "5 hours/5h,Week · all models/,Week · Fable/F",
  `three limits in order with labels, got ${kinds(three)} ${labels}`,
)
assert(
  pillText(three.limits, now) === "55% · F 53%",
  `a five-hour limit below 80 is not shown, got "${pillText(three.limits, now)}"`,
)

const fiveHigh = snap(live({ five_hour: window(85), seven_day: window(10) }))
assert(
  pillText(fiveHigh.limits, now) === "5h 85%! · 10%",
  `expected "5h 85%! · 10%", got "${pillText(fiveHigh.limits, now)}"`,
)
assert(isWarn(fiveHigh.limits, now), "a shown five-hour limit at 85 warns")

const fiveBelow = snap(live({ five_hour: window(79), seven_day: window(10) }))
assert(pillText(fiveBelow.limits, now) === "10%", `expected "10%", got "${pillText(fiveBelow.limits, now)}"`)
assert(!isWarn(fiveBelow.limits, now), "a hidden five-hour limit at 79 does not warn")

const cacheOnly = snap({ session_id: "abc" }, [cachedAll(40)])
assert(
  kinds(cacheOnly) === "weekly_all" && cacheOnly.limits[0].cached && cacheOnly.limits[0].resetsAt === inFourDays,
  `cache only gives a cached weekly_all reset in epoch seconds, got ${JSON.stringify(cacheOnly.limits)}`,
)
assert(cacheOnly.cacheFetchedAt === 1795341594, `cacheFetchedAt in seconds, got ${cacheOnly.cacheFetchedAt}`)

const scopedOnly = snap({ session_id: "abc" }, [cachedScoped("Fable")])
assert(pillText(scopedOnly.limits, now) === "F 53%", `expected "F 53%", got "${pillText(scopedOnly.limits, now)}"`)

const bare = snap({ session_id: "abc", model: { display_name: "Opus 5" } })
assert(bare.limits.length === 0, `no rate_limits and no usage give no limits, got ${JSON.stringify(bare.limits)}`)
assert(pillText(bare.limits, now) === "", `no limits give empty text, got "${pillText(bare.limits, now)}"`)
assert(bare.cacheFetchedAt === null, `no usage gives a null cacheFetchedAt, got ${bare.cacheFetchedAt}`)

const skipped = snap({ session_id: "abc" }, [
  { ...cachedScoped("Fable", 5), kind: "spend_limit" },
  cachedAll("55"),
  { kind: "weekly_all", percent: 55, resets_at: "soon", scope: null },
  cachedScoped(""),
  { kind: "weekly_scoped", percent: 53, resets_at: inFourDaysIso, scope: null },
  "garbage",
  cachedScoped("sonnet", 20),
])
assert(
  skipped.limits.length === 1 && skipped.limits[0].short === "S",
  `unknown kinds and malformed entries are skipped, got ${JSON.stringify(skipped.limits)}`,
)

const weekAt80 = snap(live({ seven_day: window(80) }))
assert(pillText(weekAt80.limits, now) === "80%!", `expected "80%!", got "${pillText(weekAt80.limits, now)}"`)

const fiveAt80 = snap(live({ five_hour: window(80), seven_day: window(10) }))
assert(
  pillText(fiveAt80.limits, now) === "5h 80%! · 10%" && isWarn(fiveAt80.limits, now),
  `a five-hour limit at exactly 80 is shown and warns, got "${pillText(fiveAt80.limits, now)}"`,
)

for (const [used, text, warns] of [
  [79, "79%", false],
  [50, "50%", false],
  [79.4, "79%", false],
  [79.5, "80%!", true],
] as const) {
  const week = snap(live({ seven_day: window(used) }))
  assert(
    pillText(week.limits, now) === text && isWarn(week.limits, now) === warns,
    `weekly ${used} shows "${text}" and warn ${warns}, got "${pillText(week.limits, now)}" and ${isWarn(week.limits, now)}`,
  )
}

const fiveRoundsUp = snap(live({ five_hour: window(79.5), seven_day: window(10) }))
assert(
  pillText(fiveRoundsUp.limits, now) === "5h 80%! · 10%",
  `a five-hour limit that rounds to 80 is shown, got "${pillText(fiveRoundsUp.limits, now)}"`,
)

const weekHigh = snap(live({ seven_day: window(85) }))
assert(isWarn(weekHigh.limits, now), "a weekly limit at 85 warns")
const scopedHigh = snap({ session_id: "abc" }, [cachedScoped("Fable", 85)])
assert(
  pillText(scopedHigh.limits, now) === "F 85%!" && isWarn(scopedHigh.limits, now),
  `a scoped limit at 85 shows "F 85%!" and warns, got "${pillText(scopedHigh.limits, now)}"`,
)

const expired = snap(live({ five_hour: { used_percentage: 90, resets_at: now - 1 }, seven_day: { used_percentage: 90, resets_at: now - 1 } }))
assert(
  pillText(expired.limits, now) === "0%" && !isWarn(expired.limits, now),
  `limits past their reset read 0 in the pill and do not warn, got "${pillText(expired.limits, now)}"`,
)

const halfUp = snap(live({ seven_day: window(55.5) }))
assert(pillText(halfUp.limits, now) === "56%", `55.5 rounds to 56, got "${pillText(halfUp.limits, now)}"`)

const badLiveWeek = snap(live({ seven_day: { used_percentage: "55", resets_at: now + 3600 } }), [cachedAll(40)])
assert(
  badLiveWeek.limits.length === 1 && badLiveWeek.limits[0].used === 40 && badLiveWeek.limits[0].cached,
  `a malformed live seven_day falls back to the cached weekly_all, got ${JSON.stringify(badLiveWeek.limits)}`,
)

const twoScoped = snap({ session_id: "abc" }, [cachedScoped("Fable", 53), cachedScoped("Sonnet", 20)])
assert(
  pillText(twoScoped.limits, now) === "F 53% · S 20%",
  `scoped limits keep file order, got "${pillText(twoScoped.limits, now)}"`,
)

const fetchedLate = parsed(
  JSON.stringify({
    received_at: now,
    data: { session_id: "abc" },
    usage: { fetched_at_ms: 1795341594999, limits: [] },
  }),
  "usage with fetched_at_ms near the next second",
)
assert(fetchedLate.cacheFetchedAt === 1795341594, `cacheFetchedAt floors, got ${fetchedLate.cacheFetchedAt}`)
const fetchedBad = parsed(
  JSON.stringify({ received_at: now, data: { session_id: "abc" }, usage: { fetched_at_ms: "1795341594329", limits: [] } }),
  "usage with a non-numeric fetched_at_ms",
)
assert(fetchedBad.cacheFetchedAt === null, `a non-numeric fetched_at_ms gives null, got ${fetchedBad.cacheFetchedAt}`)

const limit = (used: number, resetsAt: number): Limit => ({
  kind: "weekly_all",
  label: "Week · all models",
  short: "",
  used,
  resetsAt,
  cached: false,
})

assert(limitNow(limit(50, now - 1), now) === 0, `a limit past its reset reads 0, got ${limitNow(limit(50, now - 1), now)}`)
assert(limitNow(limit(50, now), now) === 0, `a limit at its reset instant reads 0, got ${limitNow(limit(50, now), now)}`)
assert(limitNow(limit(50, now + 1), now) === 50, `a limit before its reset keeps its figure, got ${limitNow(limit(50, now + 1), now)}`)

const snapshot = (id: string, receivedAt: number): Snapshot => ({
  receivedAt,
  session: { id, name: id, model: "Opus 5", ctx: null, cost: 0 },
  limits: [],
  cacheFetchedAt: null,
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
  resetText(limit(0, now + 72 * 60), now) === "in 1h 12m",
  `expected "in 1h 12m", got "${resetText(limit(0, now + 72 * 60), now)}"`,
)
const far = resetText(limit(0, now + 30 * 3600), now)
assert(/^[A-Z][a-z]{2} \d{2}:\d{2}$/.test(far), `expected a weekday and clock time, got "${far}"`)
assert(
  resetText(limit(0, now - 500), now) === "reset",
  `a limit past its reset reads "reset", got "${resetText(limit(0, now - 500), now)}"`,
)
assert(resetText(undefined, now) === "—", `an absent limit resets "—", got "${resetText(undefined, now)}"`)

const noNameNoWorkspace = parsed(
  JSON.stringify({ received_at: now, data: { session_id: "3f2a91c4d5e67890" } }),
  "a payload with only session_id",
)
assert(
  noNameNoWorkspace.session.name === "session",
  `no session_name and no workspace should fall back to "session", got "${noNameNoWorkspace.session.name}"`,
)

console.log("ok")
