import { createBinding, For } from "ags"
import { Gtk } from "ags/gtk4"
import AstalTray from "gi://AstalTray"

const tray = AstalTray.get_default()

export default function Tray() {
  const items = createBinding(tray, "items")

  return (
    <box class="module tray" spacing={10}>
      <For each={items}>
        {(item) => (
          <menubutton
            tooltipMarkup={createBinding(item, "tooltipMarkup")}
            menuModel={createBinding(item, "menuModel")}
            $={(self) => {
              self.insert_action_group("dbusmenu", item.actionGroup)
              const path = item.iconThemePath
              if (path) {
                const display = self.get_display()
                if (display) {
                  Gtk.IconTheme.get_for_display(display).add_search_path(path)
                }
              }
            }}
          >
            <image
              gicon={createBinding(item, "gicon")}
              pixelSize={16}
              widthRequest={16}
              heightRequest={16}
              valign={Gtk.Align.CENTER}
              halign={Gtk.Align.CENTER}
            />
          </menubutton>
        )}
      </For>
    </box>
  )
}
