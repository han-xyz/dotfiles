import { createBinding } from "ags"
import { Gtk } from "ags/gtk4"
import AstalBrightness from "gi://AstalBrightness"
import { icon } from "./_fa"

const SUN = "\u{F185}"
const STEP = 0.05

export default function Brightness() {
  const b = AstalBrightness.get_default()
  if (b.backlights.get_devices().length === 0) return <box visible={false} />

  const brightness = createBinding(b.screen, "brightness")
  const pillLabel = brightness((v) => `${icon(SUN)} ${Math.round(v * 100)}%`)

  return (
    <menubutton
      class="module brightness"
      $={(self) => {
        const ctrl = new Gtk.EventControllerScroll({ flags: Gtk.EventControllerScrollFlags.VERTICAL })
        ctrl.connect("scroll", (_self, _dx, dy) => {
          const v = b.screen.brightness
          b.screen.brightness = dy < 0 ? Math.min(1, v + STEP) : Math.max(0, v - STEP)
          return true
        })
        self.add_controller(ctrl)
      }}
    >
      <label useMarkup label={pillLabel} />
      <popover>
        <box class="popup-content brightness-popup-content">
          <slider
            min={0}
            max={1}
            value={brightness}
            onChangeValue={(_self, _scroll, v) => {
              b.screen.brightness = v
            }}
          />
        </box>
      </popover>
    </menubutton>
  )
}
