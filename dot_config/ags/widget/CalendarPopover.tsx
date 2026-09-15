import { createState } from "ags"
import { Gtk } from "ags/gtk4"
import { monitorFile } from "ags/file"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"

// Upcoming events come from `calcurse -d 365`. Calcurse writes its data dir
// only on save or quit, so watch that dir instead of polling: refresh once at
// startup and again, debounced (one save fires several events), on any change.
const CALCURSE_DIR = `${GLib.get_user_data_dir()}/calcurse`
const EVENTS_CMD = ["sh", "-c", "calcurse -d 365 2>/dev/null || true"]

const [events, setEvents] = createState("")
const refresh = () => execAsync(EVENTS_CMD).then(setEvents).catch(() => {})
let pending = 0
monitorFile(CALCURSE_DIR, () => {
  if (pending) GLib.source_remove(pending)
  pending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
    pending = 0
    refresh()
    return GLib.SOURCE_REMOVE
  })
})
refresh()

function openCalcurseAt(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  execAsync([
    "kitty",
    "--title",
    "calcurse",
    "-e",
    "sh",
    "-c",
    `calcurse --startday ${year}-${m}-${d} || calcurse`,
  ]).catch(() => {})
}

export default function CalendarPopover() {
  return (
    <box class="calendar-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <Gtk.Calendar
        showHeading
        showDayNames
        $={(self) => {
          const rightClick = new Gtk.GestureClick({ button: 3 })
          rightClick.connect("released", () => {
            const d = self.get_date()
            openCalcurseAt(d.get_year(), d.get_month(), d.get_day_of_month())
          })
          self.add_controller(rightClick)
        }}
      />
      <box class="event-list" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
        <label class="event-list-header" label="Upcoming events" xalign={0} />
        <label
          class="event-list-body"
          wrap
          xalign={0}
          label={events((raw) => raw.trim() || "(no events in the next year)")}
        />
      </box>
    </box>
  )
}
