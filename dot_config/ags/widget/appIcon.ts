import AstalApps from "gi://AstalApps"
import { Gdk, Gtk } from "ags/gtk4"

const GENERIC_ICON = "application-x-executable-symbolic"

// Both live for the process lifetime, by design: req 19 asks for a per-class
// cache with no invalidation path (a new app or icon theme takes effect on
// the bar's next restart, not mid-session).
const apps = new AstalApps.Apps()
const cache = new Map<string, string>()

/**
 * Resolves a client's window class to an icon name, caching per class.
 *
 * Desktop-entry matches are tried before the icon theme guess: a sandboxed
 * app (e.g. the bubblejail Firefox) reports its real class in its .desktop
 * entry even when the theme has no icon under that name.
 */
export function iconFor(cls: string): string {
  if (!cls) return GENERIC_ICON

  const cached = cache.get(cls)
  if (cached) return cached

  const icon = resolve(cls)
  cache.set(cls, icon)
  return icon
}

// AstalApps also scores name/executable matches, so a hit isn't necessarily
// a class match — req 19 asks for wmClass/name equality specifically, checked
// here for exact and fuzzy alike so a wrong hit falls through to the fallbacks
// instead of short-circuiting them.
function matchesClass(app: AstalApps.Application, lower: string): boolean {
  return app.wmClass?.toLowerCase() === lower || app.name?.toLowerCase() === lower
}

function resolve(cls: string): string {
  const lower = cls.toLowerCase()

  const exact = apps.exact_query(cls).find((a) => matchesClass(a, lower))
  if (exact?.iconName) return exact.iconName

  const fuzzy = apps.fuzzy_query(cls).find((a) => matchesClass(a, lower))
  if (fuzzy?.iconName) return fuzzy.iconName

  const display = Gdk.Display.get_default()
  if (display && Gtk.IconTheme.get_for_display(display).has_icon(lower)) return lower

  return GENERIC_ICON
}
