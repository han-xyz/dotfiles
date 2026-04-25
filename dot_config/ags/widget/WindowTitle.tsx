import { createBinding } from "ags"
import Pango from "gi://Pango"
import AstalHyprland from "gi://AstalHyprland"

const hypr = AstalHyprland.get_default()

export default function WindowTitle() {
  const title = createBinding(hypr, "focusedClient")((c) => c?.title ?? "")

  return (
    <label
      class="window-title"
      maxWidthChars={60}
      ellipsize={Pango.EllipsizeMode.END}
      label={title}
    />
  )
}
