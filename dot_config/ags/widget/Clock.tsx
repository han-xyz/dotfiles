import { createPoll } from "ags/time"
import CalendarPopover from "./CalendarPopover"

export default function Clock() {
  const now = createPoll("", 1000, ["date", "+%d/%m/%Y %H:%M:%S"])

  return (
    <menubutton class="module clock" tooltipText="Click for calendar">
      <label label={now} />
      <popover>
        <CalendarPopover />
      </popover>
    </menubutton>
  )
}
