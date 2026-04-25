import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Workspaces from "./Workspaces"
import WindowTitle from "./WindowTitle"
import Audio from "./Audio"
import System from "./System"
import Clock from "./Clock"
import Tray from "./Tray"

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
          <Audio />
          <System />
          <Clock />
          <Tray />
        </box>
      </centerbox>
    </window>
  )
}
