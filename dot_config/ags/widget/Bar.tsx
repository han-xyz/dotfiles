import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Workspaces from "./Workspaces"
import WindowTitle from "./WindowTitle"
import Media from "./Media"
import Audio from "./Audio"
import Battery from "./Battery"
import Brightness from "./Brightness"
import Bluetooth from "./Bluetooth"
import System from "./System"
import Claude from "./Claude"
import Clock from "./Clock"
import Tray from "./Tray"
import { loadHostList } from "../hosts"

// resolveHostList already drops any name outside WIDGET_NAMES, and every
// WIDGET_NAMES entry has an END widget, so every name here is renderable.
const END: Record<string, () => JSX.Element> = {
  media: Media,
  audio: Audio,
  brightness: Brightness,
  bluetooth: Bluetooth,
  battery: Battery,
  system: System,
  claude: Claude,
  clock: Clock,
  tray: Tray,
}

// Read once, not once per monitor, so host-list warnings print once.
const hostWidgets = loadHostList()

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      visible
      name="bar"
      class="Bar"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <centerbox>
        <box $type="start">
          <Workspaces monitor={gdkmonitor} />
        </box>
        <box $type="center">
          <WindowTitle />
        </box>
        <box $type="end">
          {hostWidgets.map((name) => END[name]())}
        </box>
      </centerbox>
    </window>
  )
}
