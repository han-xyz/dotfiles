import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"

const FA = "Font Awesome 7 Free Solid"
const CPU = "\u{F2DB}"
const MEM = "\u{F538}"

const icon = (glyph: string) => `<span face="${FA}">${glyph}</span>`

const cpuUsage = createPoll("0%", 2000, [
  "sh",
  "-c",
  "top -bn1 | awk '/^%Cpu/ {printf \"%.0f%%\", 100 - $8}'",
])

const memInfo = createPoll("0/0", 5000, [
  "sh",
  "-c",
  "awk '/MemTotal:/{t=$2/1048576} /MemAvailable:/{a=$2/1048576} END{printf \"%.2f/%.2f\", t-a, t}' /proc/meminfo",
])

export default function System() {
  return (
    <box valign={Gtk.Align.CENTER}>
      <box class="module cpu" valign={Gtk.Align.CENTER}>
        <label useMarkup label={cpuUsage((v) => `${v} ${icon(CPU)}`)} />
      </box>
      <box class="module memory" valign={Gtk.Align.CENTER}>
        <label useMarkup label={memInfo((v) => `${v} ${icon(MEM)}`)} />
      </box>
    </box>
  )
}
