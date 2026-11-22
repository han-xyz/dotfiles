import { createComputed, createState, onCleanup } from "ags"
import { Gtk } from "ags/gtk4"
import Pango from "gi://Pango"
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
  const tooltip = active((a) =>
    a ? `${[a.title, a.artist].filter(Boolean).join(" — ") || a.name}. Click for controls` : "",
  )
  const pillText = active((a) => (a ? a.title || a.name : ""))
  const title = active((a) => a?.title ?? "")
  const artist = active((a) => a?.artist ?? "")
  const album = active((a) => a?.album ?? "")
  const albumVisible = active((a) => !!a?.album)
  const playPauseGlyph = active((a) => icon(a?.status === "Playing" ? PAUSE : PLAY))
  const showSwitch = players((ps) => ps.length > 1)

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
        visible={active((a) => a !== null)}
        tooltipText={tooltip}
        valign={Gtk.Align.CENTER}
        $={(self) => {
          const apply = () => {
            if (active.get()) self.add_css_class("active")
            else self.remove_css_class("active")
          }
          apply()
          onCleanup(active.subscribe(apply))
        }}
      >
        <box spacing={4} halign={Gtk.Align.CENTER}>
          <label useMarkup label={icon(MUSIC)} />
          <label label={pillText} maxWidthChars={20} ellipsize={Pango.EllipsizeMode.END} />
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
