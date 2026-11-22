import { createBinding, createComputed } from "ags"
import { Gtk } from "ags/gtk4"
import AstalBattery from "gi://AstalBattery"
import AstalPowerProfiles from "gi://AstalPowerProfiles"
import { icon } from "./_fa"

const BATTERY_FULL = "\u{F240}"
const BATTERY_THREE_QUARTER = "\u{F241}"
const BATTERY_HALF = "\u{F242}"
const BATTERY_QUARTER = "\u{F243}"
const BATTERY_EMPTY = "\u{F244}"
const BOLT = "\u{F0E7}"
const SCALE = "\u{F24E}"
const LEAF = "\u{F06C}"
const GLYPH_GAP = 4

const PROFILES = [
  { profile: "performance", glyph: BOLT },
  { profile: "balanced", glyph: SCALE },
  { profile: "power-saver", glyph: LEAF },
]

export function batteryGlyph(pct: number, charging: boolean): string {
  const level =
    pct >= 90
      ? BATTERY_FULL
      : pct >= 60
        ? BATTERY_THREE_QUARTER
        : pct >= 35
          ? BATTERY_HALF
          : pct >= 10
            ? BATTERY_QUARTER
            : BATTERY_EMPTY
  return charging ? `${BOLT}${level}` : level
}

export function fmtDuration(seconds: number): string {
  if (seconds <= 0) return ""
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

export default function Battery() {
  const dev = AstalBattery.get_default()
  if (!dev) return <box visible={false} />

  const pp = AstalPowerProfiles.get_default()
  const hasProfiles = pp.get_profiles().length > 0

  const percentage = createBinding(dev, "percentage")
  const charging = createBinding(dev, "charging")
  const state = createBinding(dev, "state")
  const timeToEmpty = createBinding(dev, "time_to_empty")
  const timeToFull = createBinding(dev, "time_to_full")
  const energyRate = createBinding(dev, "energy_rate")
  const activeProfile = createBinding(pp, "active_profile")

  const pillGlyph = createComputed([percentage, charging], (pct, isCharging) =>
    icon(batteryGlyph(Math.round(pct * 100), isCharging)),
  )
  const pillText = percentage((pct) => `${Math.round(pct * 100)}%`)

  const stateLabel = createComputed([charging, state], (isCharging, s) =>
    isCharging ? "Charging" : s === AstalBattery.State.FULLY_CHARGED ? "Full" : "Discharging",
  )

  const remaining = createComputed([charging, timeToEmpty, timeToFull], (isCharging, empty, full) =>
    isCharging ? full : empty,
  )
  const timeLabel = createComputed(
    [charging, remaining],
    (isCharging, seconds) => `time to ${isCharging ? "full" : "empty"} ${fmtDuration(seconds)}`,
  )
  const timeVisible = remaining((seconds) => seconds > 0)

  const energyLabel = energyRate((w) => `energy ${w.toFixed(1)} W`)

  return (
    <menubutton class="module battery" visible={createBinding(dev, "is_present")}>
      <box spacing={GLYPH_GAP}>
        <label useMarkup label={pillGlyph} />
        <label label={pillText} />
      </box>
      <popover>
        <box class="popup-content battery-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <label xalign={0} label={stateLabel} />
          <label xalign={0} label={timeLabel} visible={timeVisible} />
          <label xalign={0} label={energyLabel} />
          <box class="profiles" spacing={4} halign={Gtk.Align.CENTER} visible={hasProfiles}>
            {PROFILES.map(({ profile, glyph }) => (
              <button
                class={activeProfile((ap) => (ap === profile ? "active" : ""))}
                onClicked={() => {
                  pp.active_profile = profile
                }}
              >
                <label useMarkup label={`${icon(glyph)} ${profile}`} />
              </button>
            ))}
          </box>
        </box>
      </popover>
    </menubutton>
  )
}
