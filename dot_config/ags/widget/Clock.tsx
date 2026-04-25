import { createPoll } from "ags/time"
import CalendarPopover from "./CalendarPopover"

export default function Clock() {
  const date = createPoll("", 60_000, ["date", "+%d/%m/%Y"])
  const time = createPoll("", 1000, ["date", "+%H:%M:%S"])

  return (
    <box>
      <menubutton class="module clock-date">
        <label label={date} />
        <popover>
          <CalendarPopover />
        </popover>
      </menubutton>
      <box class="module clock-time">
        <label label={time} />
      </box>
    </box>
  )
}
