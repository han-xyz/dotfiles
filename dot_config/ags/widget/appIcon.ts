import AstalApps from "gi://AstalApps"
import { Gdk, Gtk } from "ags/gtk4"
import { resolveIcon, GENERIC_ICON, type Entry } from "../icons"

// Both live for the process lifetime, by design: the per-class cache has no
// invalidation path (a new app or icon theme takes effect on
// the bar's next restart, not mid-session).
const apps = new AstalApps.Apps()
const cache = new Map<string, string>()

/**
 * Resolves a client's window class to an icon name, caching per class.
 *
 * Order: exact theme name, desktop entry id, entry wmClass or name, steam for
 * Steam games, then the lowercased class and its last dot-segment in the theme.
 */
export function iconFor(cls: string): string {
  if (!cls) return GENERIC_ICON

  const cached = cache.get(cls)
  if (cached) return cached

  const icon = resolveIcon(cls, desktopEntries(), hasThemeIcon)
  cache.set(cls, icon)
  return icon
}

function desktopEntries(): Entry[] {
  return apps.list.map((app) => ({
    id: app.entry ?? "",
    wmClass: app.wmClass ?? "",
    name: app.name ?? "",
    iconName: app.iconName ?? "",
  }))
}

function hasThemeIcon(name: string): boolean {
  const display = Gdk.Display.get_default()
  return display !== null && Gtk.IconTheme.get_for_display(display).has_icon(name)
}
