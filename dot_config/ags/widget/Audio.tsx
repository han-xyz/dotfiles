import { createBinding, createComputed } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import AstalWp from "gi://AstalWp"
import { icon } from "./_fa"

const SPEAKER = "\u{F028}"
const SPEAKER_MUTED = "\u{F6A9}"
const MIC = "\u{F130}"
const MIC_MUTED = "\u{F131}"
const GLYPH_GAP = 4
// PipeWire id 0 is the core object, never a node: with no reachable PipeWire
// the default endpoint is a placeholder carrying it.
const PLACEHOLDER_ID = 0

type Level = { percent: number; mute: boolean }

// The default endpoint is bound itself, then its volume and mute under it, so a
// changed default device is followed rather than the first endpoint object.
const levelOf = (audio: AstalWp.Audio, prop: "defaultSpeaker" | "defaultMicrophone") =>
  createComputed((): Level | null => {
    const ep = createBinding(audio, prop)()
    if (!ep || createBinding(ep, "id")() === PLACEHOLDER_ID) return null
    return {
      percent: Math.round(createBinding(ep, "volume")() * 100),
      mute: createBinding(ep, "mute")(),
    }
  })

export default function Audio() {
  const audio = AstalWp.get_default()?.audio
  if (!audio) return <box visible={false} />

  const speaker = levelOf(audio, "defaultSpeaker")
  const mic = levelOf(audio, "defaultMicrophone")

  const hasSpeaker = speaker((l) => l !== null)
  const hasMic = mic((l) => l !== null)
  const hasBoth = createComputed(() => hasSpeaker() && hasMic())
  const hasAny = createComputed(() => hasSpeaker() || hasMic())

  const speakerGlyph = speaker((l) => icon(!l || l.mute ? SPEAKER_MUTED : SPEAKER))
  const speakerTooltip = speaker((l) =>
    !l || l.mute ? "Volume muted. Click: open mixer" : `Volume ${l.percent}%. Click: open mixer`,
  )
  const micGlyph = mic((l) => icon(!l || l.mute ? MIC_MUTED : MIC))
  const micTooltip = mic((l) =>
    !l || l.mute ? "Microphone muted. Click: unmute" : `Microphone ${l.percent}%. Click: mute`,
  )

  const toggleMicMute = () => {
    const ep = audio.defaultMicrophone
    if (ep) ep.set_mute(!ep.mute)
  }

  return (
    <box class="module audio" visible={hasAny} valign={Gtk.Align.CENTER}>
      <button
        class="part"
        visible={hasSpeaker}
        tooltipText={speakerTooltip}
        onClicked={() => execAsync(["pavucontrol"]).catch(() => {})}
      >
        <box spacing={GLYPH_GAP}>
          <label useMarkup label={speakerGlyph} />
          <label label={speaker((l) => (l ? `${l.percent}%` : ""))} visible={speaker((l) => !!l && !l.mute)} />
        </box>
      </button>
      <label class="sep" label="·" visible={hasBoth} />
      <button class="part" visible={hasMic} tooltipText={micTooltip} onClicked={toggleMicMute}>
        <box spacing={GLYPH_GAP}>
          <label useMarkup label={micGlyph} />
          <label label={mic((l) => (l ? `${l.percent}%` : ""))} visible={mic((l) => !!l && !l.mute)} />
        </box>
      </button>
    </box>
  )
}
