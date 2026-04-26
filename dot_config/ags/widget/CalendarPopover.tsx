import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"

const events = createPoll(
  "",
  60_000,
  ["sh", "-c", "calcurse -d 365 2>/dev/null || true"],
)

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
