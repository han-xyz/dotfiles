import { createComputed, createState } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { icon } from "./_fa"

const PLAY = "\u{F04B}"
const PAUSE = "\u{F04C}"
const PREV = "\u{F048}"
const NEXT = "\u{F051}"
const MUSIC = "\u{F001}"
const SWITCH = "\u{F0DA}"

type Player = {
  name: string
  status: string // "Playing" | "Paused" | "Stopped" | ""
  title: string
  artist: string
  album: string
}

// One shell tick = one playerctl invocation per player (down from 5). Format
// string crams status + metadata into a single call.
const PLAYERS_CMD = `playerctl --list-all 2>/dev/null | while IFS= read -r p; do
  [ -z "$p" ] && continue
  printf '%s|' "$p"
  playerctl --player="$p" metadata --format '{{status}}|{{title}}|{{artist}}|{{album}}' 2>/dev/null
  echo
done`

const playersPoll = createPoll("", 500, ["sh", "-c", PLAYERS_CMD])

const players = playersPoll((raw) =>
  raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line): Player => {
      const [name = "", status = "", title = "", artist = "", album = ""] = line.split("|")
      return { name, status, title, artist, album }
    }),
)

const [index, setIndex] = createState(0)

const active = createComputed([players, index], (ps, i) =>
  ps.length === 0 ? null : ps[((i % ps.length) + ps.length) % ps.length],
)

const send = (cmd: "play-pause" | "next" | "previous") => {
  const a = active.get()
  if (a) execAsync(["playerctl", `--player=${a.name}`, cmd]).catch(() => {})
}

export default function Media() {
  const barGlyph = active((a) =>
    icon(!a ? MUSIC : a.status === "Playing" ? PAUSE : PLAY),
  )
  const barText = active((a) => {
    if (!a) return ""
    return [a.artist, a.title].filter(Boolean).join(" — ") || "—"
  })
  const title = active((a) => a?.title ?? "")
  const artist = active((a) => a?.artist ?? "")
  const album = active((a) => a?.album ?? "")
  const albumVisible = active((a) => !!a?.album)
  const playPauseGlyph = active((a) => icon(a?.status === "Playing" ? PAUSE : PLAY))
  const showSwitch = players((ps) => ps.length > 1)

  let dupRef: Gtk.Widget | null = null

  return (
    <box>
      <button
        class="module media-switch"
        visible={showSwitch}
        valign={Gtk.Align.CENTER}
        onClicked={() => setIndex((i) => i + 1)}
      >
        <label useMarkup label={icon(SWITCH)} />
      </button>
      <menubutton
        class="module media"
        valign={Gtk.Align.CENTER}
        $={(self) => {
          const apply = () => {
            if (active.get()) self.add_css_class("active")
            else self.remove_css_class("active")
          }
          apply()
          active.subscribe(apply)
        }}
      >
        <box spacing={6} halign={Gtk.Align.CENTER}>
          <label useMarkup label={barGlyph} />
          <scrolledwindow
            class="media-marquee"
            visible={active((a) => a !== null)}
            hscrollbarPolicy={Gtk.PolicyType.EXTERNAL}
            vscrollbarPolicy={Gtk.PolicyType.NEVER}
            propagateNaturalWidth
            propagateNaturalHeight
            maxContentWidth={140}
            $={(self) => {
              let last = -1
              let pos = 0
              const gap = 40
              self.add_tick_callback((_w, clock) => {
                const adj = self.get_hadjustment()
                const upper = adj.get_upper()
                const page = adj.get_page_size()
                const dupShown = dupRef?.get_visible() ?? false
                const textW = dupShown ? (upper - gap) / 2 : upper
                const fits = textW <= page
                if (dupRef && dupRef.get_visible() !== !fits) dupRef.set_visible(!fits)
                const now = clock.get_frame_time()
                if (fits) {
                  adj.set_value(0)
                  pos = 0
                  last = now
                  return true
                }
                if (last < 0) { last = now; return true }
                const dt = (now - last) / 1_000_000
                last = now
                pos = (pos + dt * 30) % (textW + gap)
                adj.set_value(pos)
                return true
              })
            }}
          >
            <box spacing={40}>
              <label useMarkup label={barText} xalign={0} />
              <label useMarkup label={barText} xalign={0} $={(self) => { dupRef = self }} />
            </box>
          </scrolledwindow>
        </box>
        <popover>
          <box class="media-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <label class="title" wrap xalign={0} label={title} />
            <label class="artist" xalign={0} label={artist} />
            <label class="album" xalign={0} label={album} visible={albumVisible} />
            <box class="controls" spacing={4} halign={Gtk.Align.CENTER}>
              <button onClicked={() => send("previous")}>
                <label useMarkup label={icon(PREV)} />
              </button>
              <button onClicked={() => send("play-pause")}>
                <label useMarkup label={playPauseGlyph} />
              </button>
              <button onClicked={() => send("next")}>
                <label useMarkup label={icon(NEXT)} />
              </button>
            </box>
          </box>
        </popover>
      </menubutton>
    </box>
  )
}
