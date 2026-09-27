import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"
import { createBinding, For } from "ags"
import style from "./style.scss"
import Bar from "./widget/Bar"

app.start({
  css: style,
  main() {
    // One bar per connected monitor, kept in step with hot-plug: For keys by
    // Gdk.Monitor identity, so an unplugged monitor's window is destroyed
    // (not moved onto a surviving output) and a replugged one gets a new bar.
    For({
      each: createBinding(app, "monitors"),
      children: (monitor) => Bar(monitor),
      cleanup: (win) => (win as Gtk.Window).destroy(),
    })
  },
})
