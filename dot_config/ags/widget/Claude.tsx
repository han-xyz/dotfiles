import { createComputed, createState, For } from "ags"
import { Gtk } from "ags/gtk4"
import { monitorFile, readFile } from "ags/file"
import GLib from "gi://GLib"
import { icon } from "./_fa"
import {
  isStale,
  isWarn,
  mergeSessions,
  parseSnapshot,
  pillText,
  resetText,
  type Session,
  type Snapshot,
  type Window,
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

function windowLine(label: string, w: Window | undefined, now: number): string {
  const text = resetText(w, now)
  return text === "reset" ? `${label} reset` : `${label} resets ${text}`
}

function sessionLine(s: Session): string {
  const ctx = s.ctx === null ? "—" : `${Math.round(s.ctx)}%`
  return `${s.name} · ${s.model} · ctx ${ctx} · $${s.cost.toFixed(2)}`
}

export default function Claude() {
  const pillLabel = icon(ROBOT)
  const summaryLine = createComputed([snap, now], (s, t) => pillText(s?.windows, t))
  const warn = createComputed([snap, now], (s, t) => isWarn(s?.windows, t))
  const stale = createComputed([snap, now], (s, t) => s === null || isStale(s.receivedAt, t))
  const fiveLine = createComputed([snap, now], (s, t) => windowLine("5h", s?.windows.five, t))
  const weekLine = createComputed([snap, now], (s, t) => windowLine("week", s?.windows.week, t))
  const live = createComputed([sessions, now], (map, t) =>
    [...map.values()].filter((s) => !isStale(s.receivedAt, t)),
  )

  return (
    <menubutton
      class="module claude"
      $={(self) => {
        const applyWarn = () => {
          if (warn.get()) self.add_css_class("warn")
          else self.remove_css_class("warn")
        }
        const applyStale = () => {
          if (stale.get()) self.add_css_class("stale")
          else self.remove_css_class("stale")
        }
        applyWarn()
        applyStale()
        warn.subscribe(applyWarn)
        stale.subscribe(applyStale)
      }}
    >
      <label useMarkup label={pillLabel} />
      <popover>
        <box class="popup-content claude-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="summary" xalign={0} label={summaryLine} />
          <label xalign={0} label={fiveLine} />
          <label xalign={0} label={weekLine} />
          <Gtk.Separator />
          <label xalign={0} label="no live sessions" visible={live((rows) => rows.length === 0)} />
          <For each={live}>
            {(s: Snapshot) => <label class="session" xalign={0} label={sessionLine(s.session)} />}
          </For>
        </box>
      </popover>
    </menubutton>
  )
}
