export type Entry = { id: string; wmClass: string; name: string; iconName: string }

export const GENERIC_ICON = "application-x-executable-symbolic"

const STEAM_GAME = /^steam_app_/

export function resolveIcon(cls: string, entries: Entry[], hasIcon: (name: string) => boolean): string {
  if (!cls) return GENERIC_ICON
  if (hasIcon(cls)) return cls

  const usable = entries.filter((e) => isThemeName(e.iconName))

  const byId = usable.find((e) => e.id === `${cls}.desktop`)
  if (byId) return byId.iconName

  const lower = cls.toLowerCase()
  const byClass = usable.find((e) => e.wmClass.toLowerCase() === lower || e.name.toLowerCase() === lower)
  if (byClass) return byClass.iconName

  if (STEAM_GAME.test(cls) && hasIcon("steam")) return "steam"
  if (hasIcon(lower)) return lower

  const segment = lower.slice(lower.lastIndexOf(".") + 1)
  if (hasIcon(segment)) return segment

  return GENERIC_ICON
}

// An `image iconName` takes theme names only; a desktop entry's file path cannot show.
function isThemeName(iconName: string): boolean {
  return iconName !== "" && !iconName.includes("/")
}
