// Claude Code has no usage API; the statusLine hook (scripts/claude-statusline.sh)
// drops its JSON payload in the cache and the bar reads it. Everything here is
// pure so the parsing and time maths can be tested without Gtk.

export type Window = { used: number; resetsAt: number }
export type Session = { id: string; name: string; model: string; ctx: number | null; cost: number }
export type Snapshot = { receivedAt: number; session: Session; windows: { five?: Window; week?: Window } }

// A session that stopped sending payloads is gone from the popover after this
// many seconds, and the pill goes stale.
const SESSION_TTL = 120
const WARN_PERCENT = 80
const DAY = 86400

type Fields = Record<string, unknown>

function fields(value: unknown): Fields | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Fields) : null
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function parseWindow(value: unknown): Window | undefined {
  const w = fields(value)
  if (!w) return undefined
  const used = number(w.used_percentage)
  const resetsAt = number(w.resets_at)
  if (used === null || resetsAt === null) return undefined
  return { used, resetsAt }
}

function sessionName(data: Fields, id: string): string {
  if (typeof data.session_name === "string" && data.session_name !== "") return data.session_name
  const dir = fields(data.workspace)?.current_dir
  if (typeof dir === "string") {
    const segment = dir.split("/").filter(Boolean).pop()
    if (segment) return segment
  }
  return id.slice(0, 8)
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

  const limits = fields(data.rate_limits)
  const five = limits ? parseWindow(limits.five_hour) : undefined
  const week = limits ? parseWindow(limits.seven_day) : undefined
  const windows: Snapshot["windows"] = {}
  if (five) windows.five = five
  if (week) windows.week = week

  const model = fields(data.model)?.display_name

  return {
    receivedAt,
    session: {
      id,
      name: sessionName(data, id),
      model: typeof model === "string" ? model : "?",
      ctx: number(fields(data.context_window)?.used_percentage),
      cost: number(fields(data.cost)?.total_cost_usd) ?? 0,
    },
    windows,
  }
}

// Claude Code drops a window from the payload once it resets, but the last
// payload can outlive that moment: a window past its reset is back at zero.
export function windowNow(w: Window | undefined, now: number): number | null {
  if (!w) return null
  return w.resetsAt <= now ? 0 : w.used
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

export function pillText(windows: Snapshot["windows"] | undefined, now: number): string {
  const percent = (w: Window | undefined) => {
    const used = windowNow(w, now)
    return used === null ? "—" : `${Math.round(used)}%`
  }
  return `5h ${percent(windows?.five)} · wk ${percent(windows?.week)}`
}

export function resetText(w: Window | undefined, now: number): string {
  if (!w) return "—"
  if (w.resetsAt <= now) return "reset"
  const seconds = w.resetsAt - now
  if (seconds < DAY) {
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return hours > 0 ? `in ${hours}h ${minutes % 60}m` : `in ${minutes}m`
  }
  const at = new Date(w.resetsAt * 1000)
  const clock = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`
  return `${at.toLocaleDateString(undefined, { weekday: "short" })} ${clock}`
}

export function isWarn(windows: Snapshot["windows"] | undefined, now: number): boolean {
  return [windows?.five, windows?.week].some((w) => (windowNow(w, now) ?? 0) >= WARN_PERCENT)
}

export function isStale(receivedAt: number, now: number, ttl = SESSION_TTL): boolean {
  return now - receivedAt > ttl
}
