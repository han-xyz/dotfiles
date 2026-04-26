import { createBinding, createComputed } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import AstalWp from "gi://AstalWp"
import { icon } from "./_fa"

const speaker = AstalWp.get_default()?.audio?.default_speaker ?? null

const SPEAKER = "\u{F028}"
const SPEAKER_MUTED = "\u{F6A9}"
const MIC = "\u{F130}"
const MIC_MUTED = "\u{F131}"

// `wpctl` poll: emits "<vol> open" or "<vol> muted". 100ms = imperceptibly responsive.
const sourceState = createPoll("0 open", 100, [
  "sh",
  "-c",
  "wpctl get-volume @DEFAULT_AUDIO_SOURCE@ 2>/dev/null | awk '{vol=int($2*100); state=($3==\"[MUTED]\")?\"muted\":\"open\"; print vol, state}'",
])

export default function Audio() {
  const speakerLabel = speaker
    ? createComputed(
        [createBinding(speaker, "volume"), createBinding(speaker, "mute")],
        (vol, muted) =>
          `${Math.round(vol * 100)}% ${icon(muted ? SPEAKER_MUTED : SPEAKER)}`,
      )
    : null

  const micLabel = sourceState((s) => {
    const [vol, state] = s.split(" ")
    return state === "muted" ? icon(MIC_MUTED) : `${vol ?? 0}% ${icon(MIC)}`
  })

  return (
    <box valign={Gtk.Align.CENTER}>
      {speakerLabel && (
        <button
          class="module pulseaudio"
          valign={Gtk.Align.CENTER}
          onClicked={() => execAsync(["pavucontrol"]).catch(() => {})}
        >
          <label useMarkup label={speakerLabel} />
        </button>
      )}
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
