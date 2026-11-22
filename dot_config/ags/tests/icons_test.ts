import { resolveIcon, GENERIC_ICON, type Entry } from "../icons"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function theme(...names: string[]) {
  return (name: string) => names.includes(name)
}

function entry(fields: Partial<Entry>): Entry {
  return { id: "", wmClass: "", name: "", iconName: "", ...fields }
}

function expect(cls: string, entries: Entry[], hasIcon: (name: string) => boolean, want: string) {
  const got = resolveIcon(cls, entries, hasIcon)
  assert(got === want, `${JSON.stringify(cls)}: expected ${want}, got ${got}`)
}

const lutris = entry({ id: "net.lutris.Lutris.desktop", name: "Lutris", iconName: "lutris" })
expect("net.lutris.Lutris", [lutris], theme("net.lutris.Lutris", "lutris"), "net.lutris.Lutris")

const zed = entry({ id: "dev.zed.Zed.desktop", name: "Zed", iconName: "zed" })
expect("dev.zed.Zed", [zed], theme(), "zed")

const firefox = entry({ id: "firefox-bubble.desktop", wmClass: "firefox", name: "Firefox (sandboxed)", iconName: "firefox" })
expect("Firefox", [firefox], theme(), "firefox")

expect("steam_app_default", [], theme("steam"), "steam")
expect("steam_app_default", [], theme(), GENERIC_ICON)
expect("not_steam_app_default", [], theme("steam"), GENERIC_ICON)

const steamGame = entry({ id: "steam_app_570.desktop", iconName: "steam_icon_570" })
expect("steam_app_570", [steamGame], theme("steam"), "steam_icon_570")

expect("dev.zed.Zed", [zed], theme("dev.zed.Zed"), "dev.zed.Zed")

const emptyIcon = entry({ id: "Foo.desktop", wmClass: "Foo", iconName: "" })
expect("Foo", [emptyIcon], theme("foo"), "foo")

const pathIcon = entry({ id: "Bar.desktop", wmClass: "Bar", iconName: "/opt/bar/icon.png" })
const nameMatch = entry({ name: "bar", iconName: "bar-app" })
expect("Bar", [pathIcon, nameMatch], theme(), "bar-app")

expect("Org.Kitty", [], theme("org.kitty", "kitty"), "org.kitty")
expect("org.example.Foo", [], theme("foo"), "foo")

expect("unknown.Thing", [zed, firefox], theme("steam"), GENERIC_ICON)
expect("", [entry({ iconName: "oops" })], theme(""), GENERIC_ICON)

console.log("ok")
