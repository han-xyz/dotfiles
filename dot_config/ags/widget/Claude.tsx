import { type Accessor, createComputed, createState, onCleanup } from "ags"
import { Gtk } from "ags/gtk4"
import { monitorFile, readFile } from "ags/file"
import GLib from "gi://GLib"
import Pango from "gi://Pango"
import { icon } from "./_fa"
import {
  isStale,
  isWarn,
  limitNow,
  mergeSessions,
  parseSnapshot,
  pillText,
  resetText,
  type Limit,
  type Snapshot,
} from "../usage"

const ROBOT = "\u{F544}"
const CACHE_FILE = `${GLib.get_user_cache_dir()}/claude-usage/latest.json`
const TICK_SECONDS = 60
const DEBOUNCE_MS = 200

const [snap, setSnap] = createState<Snapshot | null>(null)
const [sessions, setSessions] = createState(new Map<string, Snapshot>())
const [now, setNow] = createState(Math.floor(Date.now() / 1000))

function load() {
  let raw: string
  try {
    raw = readFile(CACHE_FILE)
  } catch {
    // No session has ever run the statusLine hook on this machine.
    return
  }
  const parsed = parseSnapshot(raw)
  if (!parsed) return
  setSnap(parsed)
  setSessions(mergeSessions(sessions.get(), parsed, now.get()))
}

// The hook replaces the file with `mv`, which a file monitor loses track of, so
// watch the directory instead; one write still fires several events.
let pending = 0
monitorFile(GLib.path_get_dirname(CACHE_FILE), () => {
  if (pending) GLib.source_remove(pending)
  pending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
    pending = 0
    load()
    return GLib.SOURCE_REMOVE
  })
})
load()

// Nothing else moves the countdowns and the stale mark between payloads.
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, TICK_SECONDS, () => {
  setNow(Math.floor(Date.now() / 1000))
  return GLib.SOURCE_CONTINUE
})

const SESSION_NAME_CHARS = 24

function clock(seconds: number): string {
  const at = new Date(seconds * 1000)
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`
}

function cell(text: string, classes: string[] = [], xalign = 0): Gtk.Label {
  return new Gtk.Label({ label: text, xalign, cssClasses: classes })
}

function clearGrid(grid: Gtk.Grid) {
  let child = grid.get_first_child()
  while (child) {
    const next = child.get_next_sibling()
    grid.remove(child)
    child = next
  }
}

// GTK colours the filled block by offset classes (low, high, full) placed for a
// 0..1 range; without them the block is plain `filled` and the stylesheet decides.
function levelBar(value: number, warn: boolean): Gtk.LevelBar {
  const bar = new Gtk.LevelBar({ minValue: 0, maxValue: 100, value, valign: Gtk.Align.CENTER })
  bar.remove_offset_value(Gtk.LEVEL_BAR_OFFSET_LOW)
  bar.remove_offset_value(Gtk.LEVEL_BAR_OFFSET_HIGH)
  bar.remove_offset_value(Gtk.LEVEL_BAR_OFFSET_FULL)
  if (warn) bar.add_css_class("warn")
  return bar
}

function fillLimits(grid: Gtk.Grid, limits: Limit[], now: number) {
  clearGrid(grid)
  limits.forEach((limit, row) => {
    const used = limitNow(limit, now)
    const warn = isWarn([limit], now)
    const reset = resetText(limit, now)
    grid.attach(cell(limit.label), 0, row, 1, 1)
    grid.attach(levelBar(used, warn), 1, row, 1, 1)
    grid.attach(cell(`${Math.round(used)}%${warn ? "!" : ""}`, warn ? ["percent", "warn"] : ["percent"], 1), 2, row, 1, 1)
    grid.attach(cell(reset === "reset" ? "reset" : `resets ${reset}`, ["muted"]), 3, row, 1, 1)
  })
}

function fillSessions(grid: Gtk.Grid, live: Snapshot[]) {
  clearGrid(grid)
  live.forEach(({ session: s }, row) => {
    const name = cell(s.name)
    name.maxWidthChars = SESSION_NAME_CHARS
    name.ellipsize = Pango.EllipsizeMode.END
    grid.attach(name, 0, row, 1, 1)
    grid.attach(cell(s.model, ["muted"]), 1, row, 1, 1)
    grid.attach(cell(s.ctx === null ? "ctx —" : `ctx ${Math.round(s.ctx)}%`, [], 1), 2, row, 1, 1)
    grid.attach(cell(`$${s.cost.toFixed(2)}`, [], 1), 3, row, 1, 1)
  })
}

function bindClass(self: Gtk.Widget, name: string, on: Accessor<boolean>) {
  const apply = () => (on.get() ? self.add_css_class(name) : self.remove_css_class(name))
  apply()
  onCleanup(on.subscribe(apply))
}

function bindRebuild<T>(self: Gtk.Grid, source: Accessor<T>, fill: (grid: Gtk.Grid, value: T) => void) {
  fill(self, source.get())
  onCleanup(source.subscribe(() => fill(self, source.get())))
}

export default function Claude() {
  const limits = createComputed([snap], (s) => s?.limits ?? [])
  const text = createComputed([limits, now], (ls, t) => pillText(ls, t))
  const tooltip = text((t) => `Claude usage: ${t === "" ? "no data" : t}. Click for detail`)
  const warn = createComputed([limits, now], (ls, t) => isWarn(ls, t))
  const stale = createComputed([snap, now], (s, t) => s === null || s.limits.length === 0 || isStale(s.receivedAt, t))
  const limitRows = createComputed([limits, now], (ls, t) => ({ limits: ls, now: t }))
  const hasLimits = limits((ls) => ls.length > 0)
  const cacheNote = snap((s) =>
    s !== null && s.cacheFetchedAt !== null && s.limits.some((l) => l.cached)
      ? `scoped limits as of ${clock(s.cacheFetchedAt)}`
      : "",
  )
  const live = createComputed([sessions, now], (map, t) =>
    [...map.values()].filter((s) => !isStale(s.receivedAt, t)),
  )

  return (
    <menubutton
      class="module claude"
      tooltipText={tooltip}
      $={(self) => {
        bindClass(self, "warn", warn)
        bindClass(self, "stale", stale)
      }}
    >
      <label useMarkup label={icon(ROBOT)} />
      <popover>
        <box class="popup-content claude-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <Gtk.Grid
            class="limits"
            columnSpacing={8}
            rowSpacing={4}
            visible={hasLimits}
            $={(self) => bindRebuild(self, limitRows, (grid, r) => fillLimits(grid, r.limits, r.now))}
          />
          <label class="muted note" xalign={0} label={cacheNote} visible={cacheNote((n) => n !== "")} />
          <label xalign={0} label="no usage data yet" visible={hasLimits((h) => !h)} />
          <Gtk.Separator />
          <Gtk.Grid
            class="sessions"
            columnSpacing={8}
            rowSpacing={4}
            visible={live((rs) => rs.length > 0)}
            $={(self) => bindRebuild(self, live, fillSessions)}
          />
          <label xalign={0} label="no live sessions" visible={live((rs) => rs.length === 0)} />
        </box>
      </popover>
    </menubutton>
  )
}
