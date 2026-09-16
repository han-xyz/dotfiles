# dotfiles

han's Arch desktop, managed with chezmoi.

## What is here

- `~/.config/hypr` — Hyprland ≥0.55 Lua config on the native scrolling layout, per-monitor workspace sets (DP-1 owns 1–10, DP-2 owns 11–20), and the lockguard plugin (`plugins/lockguard/`: source, Makefile, built `.so`) that keeps games' pointer locks alive across relayouts.
- `~/.config/ags` — the GTK4 status bar (AGS 3 / gnim). `hosts/<hostname>.json` lists the right-side pills for one machine, in order; no file means the laptop set (media, audio, brightness, bluetooth, battery, system, clock, tray). `hosts/han-pc.json` is the desktop list, which swaps the laptop pills for the Claude Code usage pill (fed by `scripts/claude-statusline.sh`, see Fresh machine).
- `~/.config/alacritty`, `~/.config/rofi` — terminal and launcher configs.
- `~/.config/waybar` — kept, not used by the Hyprland config (the bar is AGS).
- `~/.config/mako` — notifications, styled like the bar's popovers; mako starts on demand through D-Bus activation, no autostart line needed. `Super+Shift+N` dismisses all.
- `~/.config/pipewire`, `~/.config/wireplumber` — audio.
- `~/.config/yay` — yay v13 Lua hooks (`init.lua`).

## Packages

Arch package lists below come from what the configs actually call: Hyprland binds, autostart, the bar, and the plugin build.

```
sudo pacman -S --needed hyprland hyprpaper xdg-desktop-portal-hyprland xdg-desktop-portal-gtk mako libnotify kitty alacritty rofi cliphist wl-clipboard grim slurp satty pipewire pipewire-pulse pipewire-alsa wireplumber pavucontrol playerctl udiskie polkit-kde-agent firefox calcurse btop gjs gtk4-layer-shell dart-sass ttf-jetbrains-mono otf-font-awesome chezmoi git make gcc pkgconf
```

Optional official: `lua` and `jq` for the config's tests and helper commands; `waybar` only if you use that config; `brightnessctl` for the brightness keys on laptops.

```
sudo pacman -S --needed lua jq waybar brightnessctl
```

Laptop pills (battery, power profiles, bluetooth) need the daemons they read:

```
sudo pacman -S --needed upower power-profiles-daemon bluez bluez-utils
```

yay bootstrap:

```
git clone https://aur.archlinux.org/yay-bin.git && cd yay-bin && makepkg -si
```

AUR (`aylurs-gtk-shell-git` pulls libastal, libastal-4 and libastal-io; `bubblejail` is the Firefox sandbox behind Super+F):

```
yay -S --needed aylurs-gtk-shell-git libastal-apps-git libastal-hyprland-git libastal-tray-git libastal-battery-git libastal-brightness-git libastal-bluetooth-git libastal-powerprofiles-git bubblejail
```

The four laptop libastal packages are needed on every machine: the bar imports them at startup even where the host list leaves those pills out.

Optional AUR (`polychromatic-git`, the Razer tray applet in autostart):

```
yay -S --needed polychromatic-git
```

## Fresh machine

1. `sudo pacman -S --needed chezmoi git`
2. `chezmoi init --apply https://codeberg.org/hanxyz/dotfiles.git`
3. `make -B -C ~/.config/hypr/plugins/lockguard lockguard.so` — forced, because the applied binary is newer than Hyprland's headers, so a plain make would keep the stale build; the plugin embeds the compositor hash and refuses to load when it does not match.
4. `ags types -u -d ~/.config/ags` — recreates the ignored `node_modules` links to `/usr/share/ags/js` (and the `@girs` types); the bar does not start without them. Run it again after installing any new `libastal-*` package, or its types stay missing.
5. Pick the bar's pills: no file under `~/.config/ags/hosts/` means the laptop set. For another desktop, `cp ~/.config/ags/hosts/han-pc.json ~/.config/ags/hosts/$(hostname).json` and edit the list.
6. Claude Code usage pill (only where the host list names `claude`): add to `~/.claude/settings.json` (not managed here, it holds per-machine state):
   ```
   "statusLine": { "type": "command", "command": "sh ~/.config/ags/scripts/claude-statusline.sh", "refreshInterval": 30 }
   ```
   The script keeps the last status payload in `~/.cache/claude-usage/latest.json`; the pill reads only that file, prints nothing in the terminal, and shows the last known values dimmed when no session is open.
7. `bubblejail create --profile firefox FirefoxInstance` — the instance Super+F launches.
8. If the outputs are not `DP-1` and `DP-2`: edit `~/.config/hypr/lua/monitors.lua` and the `M.base` table in `~/.config/hypr/lua/workspaces.lua`.
9. Log in on a TTY and run `Hyprland` (no display manager, no login-shell launcher). Then `hyprctl configerrors` prints nothing and `hyprctl plugin list` shows lockguard.

`hyprpaper` runs without a managed config; the wallpaper is not part of the dotfiles.

## Updating

`chezmoi update` pulls and applies. After a Hyprland update: `make -C ~/.config/hypr/plugins/lockguard reload` (rebuilds, swaps the loaded plugin, re-adds the binary to chezmoi).

## Pushing changes

```
chezmoi add ~/.config/hypr ~/.config/ags   # or any changed path
chezmoi git -- commit -m "..."
chezmoi git -- push origin master
```
