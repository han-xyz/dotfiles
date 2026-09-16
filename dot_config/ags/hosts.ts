import GLib from "gi://GLib"
import { readFile } from "ags/file"

// Laptop is the default when a machine has no host file: this desktop's bar
// is the exception, listed explicitly in hosts/han-pc.json.
export const LAPTOP = ["media", "audio", "brightness", "bluetooth", "battery", "system", "clock", "tray"]

// Every name the bar knows how to render in its end box.
export const WIDGET_NAMES = [
  "media",
  "audio",
  "brightness",
  "bluetooth",
  "battery",
  "system",
  "claude",
  "clock",
  "tray",
]

export function resolveHostList(raw: string | null, file: string): { names: string[]; warnings: string[] } {
  if (raw === null) return { names: LAPTOP, warnings: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { names: LAPTOP, warnings: [`could not parse host list ${file}, using laptop default`] }
  }

  if (!Array.isArray(parsed)) {
    return { names: LAPTOP, warnings: [`host list ${file} is not an array, using laptop default`] }
  }

  const names: string[] = []
  const warnings: string[] = []
  for (const entry of parsed) {
    if (typeof entry === "string" && WIDGET_NAMES.includes(entry)) {
      names.push(entry)
    } else {
      warnings.push(`unknown widget ${JSON.stringify(entry)} in host list ${file}, skipping`)
    }
  }

  return { names, warnings }
}

export function loadHostList(): string[] {
  const file = `${SRC}/hosts/${GLib.get_host_name()}.json`

  let raw: string | null
  try {
    raw = readFile(file)
  } catch {
    raw = null
  }

  const { names, warnings } = resolveHostList(raw, file)
  warnings.forEach((w) => console.warn(w))
  return names
}
