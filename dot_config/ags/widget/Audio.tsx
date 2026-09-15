import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { icon } from "./_fa"

const SPEAKER = "\u{F028}"
const SPEAKER_MUTED = "\u{F6A9}"
const MIC = "\u{F130}"
const MIC_MUTED = "\u{F131}"

const VOL_CMD = (target: string) =>
  `wpctl get-volume ${target} 2>/dev/null | awk '{vol=int($2*100); state=($3=="[MUTED]")?"muted":"open"; print vol, state}'`

const sinkState = createPoll("0 open", 100, ["sh", "-c", VOL_CMD("@DEFAULT_AUDIO_SINK@")])
const sourceState = createPoll("0 open", 100, ["sh", "-c", VOL_CMD("@DEFAULT_AUDIO_SOURCE@")])

export default function Audio() {
  const speakerLabel = sinkState((s) => {
    const [vol, state] = s.split(" ")
    return state === "muted" ? icon(SPEAKER_MUTED) : `${vol ?? 0}% ${icon(SPEAKER)}`
  })

  const micLabel = sourceState((s) => {
    const [vol, state] = s.split(" ")
    return state === "muted" ? icon(MIC_MUTED) : `${vol ?? 0}% ${icon(MIC)}`
  })

  return (
    <box valign={Gtk.Align.CENTER}>
      <button
        class="module pulseaudio"
        valign={Gtk.Align.CENTER}
        onClicked={() => execAsync(["pavucontrol"]).catch(() => {})}
      >
        <label useMarkup label={speakerLabel} />
      </button>
      <button
        class="module microphone"
        valign={Gtk.Align.CENTER}
        onClicked={() =>
          execAsync(["wpctl", "set-mute", "@DEFAULT_AUDIO_SOURCE@", "toggle"]).catch(() => {})
        }
      >
        <label useMarkup label={micLabel} />
      </button>
    </box>
  )
}
