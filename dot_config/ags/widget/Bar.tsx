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

// A host-list name with no entry here warns instead of crashing.
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

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const hostWidgets = loadHostList()
  hostWidgets
    .filter((name) => !(name in END))
    .forEach((name) => console.warn(`no widget registered for "${name}"`))

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
          {hostWidgets.filter((name) => name in END).map((name) => END[name]())}
        </box>
      </centerbox>
    </window>
  )
}
