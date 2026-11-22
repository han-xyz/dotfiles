// Claude Code has no usage API; the statusLine hook (scripts/claude-statusline.sh)
// drops its JSON payload in the cache and the bar reads it. Everything here is
// pure so the parsing and time maths can be tested without Gtk.

export type Limit = {
  kind: "five_hour" | "weekly_all" | "weekly_scoped"
  label: string
  short: string
  used: number
  resetsAt: number
  cached: boolean
}
export type Session = { id: string; name: string; model: string; ctx: number | null; cost: number }
export type Snapshot = { receivedAt: number; session: Session; limits: Limit[]; cacheFetchedAt: number | null }

// A session that stopped sending payloads is gone from the popover after this
// many seconds, and the pill goes stale.
const SESSION_TTL = 120
const WARN_PERCENT = 80
const DAY = 86400
const WEEK_ALL_LABEL = "Week · all models"

type Fields = Record<string, unknown>

function fields(value: unknown): Fields | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Fields) : null
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function liveLimit(value: unknown, kind: "five_hour" | "weekly_all"): Limit | null {
  const w = fields(value)
  if (!w) return null
  const used = number(w.used_percentage)
  const resetsAt = number(w.resets_at)
  if (used === null || resetsAt === null) return null
  return kind === "five_hour"
    ? { kind, label: "5 hours", short: "5h", used, resetsAt, cached: false }
    : { kind, label: WEEK_ALL_LABEL, short: "", used, resetsAt, cached: false }
}

// The cached limits come from Claude Code's undocumented state file, so any
// entry that does not have the expected shape is dropped.
function cachedLimit(value: unknown): Limit | null {
  const entry = fields(value)
  if (!entry) return null
  const used = number(entry.percent)
  const resetsAt = typeof entry.resets_at === "string" ? Date.parse(entry.resets_at) : NaN
  if (used === null || Number.isNaN(resetsAt)) return null
  const at = Math.floor(resetsAt / 1000)
  if (entry.kind === "weekly_all") {
    return { kind: "weekly_all", label: WEEK_ALL_LABEL, short: "", used, resetsAt: at, cached: true }
  }
  if (entry.kind !== "weekly_scoped") return null
  const name = fields(fields(entry.scope)?.model)?.display_name
  if (typeof name !== "string" || name === "") return null
  return { kind: "weekly_scoped", label: `Week · ${name}`, short: name[0].toUpperCase(), used, resetsAt: at, cached: true }
}

function mergeLimits(rateLimits: Fields | null, cached: Limit[]): Limit[] {
  const five = liveLimit(rateLimits?.five_hour, "five_hour")
  const week = liveLimit(rateLimits?.seven_day, "weekly_all") ?? cached.find((l) => l.kind === "weekly_all") ?? null
  const scoped = cached.filter((l) => l.kind === "weekly_scoped")
  return [five, week, ...scoped].filter((l): l is Limit => l !== null)
}

function sessionName(data: Fields): string {
  if (typeof data.session_name === "string" && data.session_name !== "") return data.session_name
  const dir = fields(data.workspace)?.current_dir
  if (typeof dir === "string") {
    const segment = dir.split("/").filter(Boolean).pop()
    if (segment) return segment
  }
  // Never fall back to session_id: it must not reach the bar (security pass).
  return "session"
}

export function parseSnapshot(raw: string): Snapshot | null {
  let wrapper: unknown
  try {
    wrapper = JSON.parse(raw)
  } catch {
    return null
  }

  const wrapped = fields(wrapper)
  if (!wrapped) return null
  const receivedAt = number(wrapped.received_at)
  const data = fields(wrapped.data)
  if (receivedAt === null || !data) return null
  const id = typeof data.session_id === "string" ? data.session_id : null
  if (!id) return null

  const usage = fields(wrapped.usage)
  const entries = Array.isArray(usage?.limits) ? usage.limits : []
  const cached = entries.map(cachedLimit).filter((l): l is Limit => l !== null)
  const fetchedAtMs = number(usage?.fetched_at_ms)

  const model = fields(data.model)?.display_name

  return {
    receivedAt,
    session: {
      id,
      name: sessionName(data),
      model: typeof model === "string" ? model : "?",
      ctx: number(fields(data.context_window)?.used_percentage),
      cost: number(fields(data.cost)?.total_cost_usd) ?? 0,
    },
    limits: mergeLimits(fields(data.rate_limits), cached),
    cacheFetchedAt: fetchedAtMs === null ? null : Math.floor(fetchedAtMs / 1000),
  }
}

// Claude Code drops a limit from the payload once it resets, but the last
// payload can outlive that moment: a limit past its reset is back at zero.
export function limitNow(limit: Limit, now: number): number {
  return limit.resetsAt <= now ? 0 : limit.used
}

export function mergeSessions(
  map: Map<string, Snapshot>,
  snap: Snapshot,
  now: number,
  ttl = SESSION_TTL,
): Map<string, Snapshot> {
  const merged = new Map(map)
  const known = merged.get(snap.session.id)
  if (!known || known.receivedAt <= snap.receivedAt) merged.set(snap.session.id, snap)
  for (const [id, entry] of merged) {
    if (isStale(entry.receivedAt, now, ttl)) merged.delete(id)
  }
  return merged
}

// The warn rule compares the figure as the pill shows it, so 79.5 counts as 80.
function shownPercent(limit: Limit, now: number): number {
  return Math.round(limitNow(limit, now))
}

// The five-hour limit is only worth pill space once it is close to running out.
function shownLimits(limits: Limit[], now: number): Limit[] {
  return limits.filter((l) => l.kind !== "five_hour" || shownPercent(l, now) >= WARN_PERCENT)
}

export function pillText(limits: Limit[], now: number): string {
  return shownLimits(limits, now)
    .map((l) => {
      const used = shownPercent(l, now)
      const figure = `${used}%${used >= WARN_PERCENT ? "!" : ""}`
      return l.short === "" ? figure : `${l.short} ${figure}`
    })
    .join(" · ")
}

export function resetText(limit: Limit | undefined, now: number): string {
  if (!limit) return "—"
  if (limit.resetsAt <= now) return "reset"
  const seconds = limit.resetsAt - now
  if (seconds < DAY) {
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return hours > 0 ? `in ${hours}h ${minutes % 60}m` : `in ${minutes}m`
  }
  const at = new Date(limit.resetsAt * 1000)
  const clock = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`
  return `${at.toLocaleDateString(undefined, { weekday: "short" })} ${clock}`
}

export function isWarn(limits: Limit[], now: number): boolean {
  return shownLimits(limits, now).some((l) => shownPercent(l, now) >= WARN_PERCENT)
}

export function isStale(receivedAt: number, now: number, ttl = SESSION_TTL): boolean {
  return now - receivedAt > ttl
}
