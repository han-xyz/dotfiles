import { createBinding, createComputed, createState, For } from "ags"
import { Gtk } from "ags/gtk4"
import Gio from "gi://Gio"
import AstalBluetooth from "gi://AstalBluetooth"
import { brand } from "./_fa"

const BLUETOOTH = "\u{F294}"
const GLYPH_GAP = 4

// Vala async methods: GJS only returns a Promise from these once promisified,
// otherwise the zero-argument call throws "At least 1 argument required".
Gio._promisify(AstalBluetooth.Device.prototype, "connect_device", "connect_device_finish")
Gio._promisify(AstalBluetooth.Device.prototype, "disconnect_device", "disconnect_device_finish")

export function deviceLine(alias: string, connected: boolean, battery: number): string {
  const status = connected ? "Connected" : "Disconnected"
  return battery >= 0 ? `${alias} · ${status} · ${battery}%` : `${alias} · ${status}`
}

export default function Bluetooth() {
  const bt = AstalBluetooth.get_default()
  // bt.adapter is typed nullable and can briefly lag bt.adapters (e.g. an
  // adapter registering on the bus); fall back to the first listed adapter
  // and hide the pill only when there is truly none.
  const adapter = bt.adapter ?? bt.adapters[0] ?? null
  if (!adapter) return <box visible={false} />

  const paired = () => bt.devices.filter((d) => d.paired)
  const connectedCount = () => bt.devices.filter((d) => d.connected).length

  const [devices, setDevices] = createState(paired())
  const [count, setCount] = createState(connectedCount())
  const refresh = () => {
    setDevices(paired())
    setCount(connectedCount())
  }

  // Each device's notify::paired/notify::connected handlers are wired once
  // (the Map stops a device seen again via device-added from doubling up)
  // and disconnected on device-removed, so discovery churn on a real adapter
  // doesn't leak live signal connections for the bar's lifetime.
  const known = new Map<InstanceType<typeof AstalBluetooth.Device>, number[]>()
  const track = (d: InstanceType<typeof AstalBluetooth.Device>) => {
    if (known.has(d)) return
    const pairedId = d.connect("notify::paired", refresh)
    const connectedId = d.connect("notify::connected", refresh)
    known.set(d, [pairedId, connectedId])
  }
  bt.devices.forEach(track)
  bt.connect("device-added", (_bt, d) => {
    track(d)
    refresh()
  })
  bt.connect("device-removed", (_bt, d) => {
    const ids = known.get(d)
    if (ids) {
      ids.forEach((id) => d.disconnect(id))
      known.delete(d)
    }
    refresh()
  })

  const isPowered = createBinding(bt, "is_powered")
  const isConnected = createBinding(bt, "is_connected")

  return (
    <menubutton
      class="module bluetooth"
      $={(self) => {
        const applyOff = () => {
          if (!isPowered.get()) self.add_css_class("off")
          else self.remove_css_class("off")
        }
        const applyConnected = () => {
          if (isConnected.get()) self.add_css_class("connected")
          else self.remove_css_class("connected")
        }
        applyOff()
        applyConnected()
        isPowered.subscribe(applyOff)
        isConnected.subscribe(applyConnected)
      }}
    >
      <box spacing={GLYPH_GAP}>
        <label useMarkup label={brand(BLUETOOTH)} />
        <label label={count((n) => `${n}`)} visible={count((n) => n > 0)} />
      </box>
      <popover>
        <box class="popup-content bt-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <box spacing={8}>
            <label label="Bluetooth" hexpand xalign={0} />
            <switch
              active={createBinding(adapter, "powered")}
              $={(self) => self.connect("notify::active", () => {
                if (self.active !== adapter.powered) adapter.powered = self.active
              })}
            />
          </box>
          <label label="no paired devices" visible={devices((ds) => ds.length === 0)} />
          <For each={devices}>
            {(d: InstanceType<typeof AstalBluetooth.Device>) => {
              const connected = createBinding(d, "connected")
              const connecting = createBinding(d, "connecting")
              const battery = createBinding(d, "battery_percentage")
              const label = createComputed(
                [connected, connecting, battery],
                (c, cx, b) => deviceLine(d.alias, c, b < 0 ? -1 : Math.round(b * 100)) + (cx ? "…" : ""),
              )
              return (
                <button
                  class="device"
                  onClicked={() => {
                    (d.connected ? d.disconnect_device() : d.connect_device()).catch((e: unknown) =>
                      console.warn(`bluetooth: ${d.alias}: ${e}`),
                    )
                  }}
                >
                  <label label={label} xalign={0} />
                </button>
              )
            }}
          </For>
        </box>
      </popover>
    </menubutton>
  )
}
