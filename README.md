# dotfiles

han's Arch desktop, managed with chezmoi.

## What is here

- `~/.config/hypr` — Hyprland ≥0.55 Lua config on the native scrolling layout, per-monitor workspace sets (DP-1 owns 1–10, DP-2 owns 11–20), and the lockguard plugin (`plugins/lockguard/`: source, Makefile, built `.so`) that keeps games' pointer locks alive across relayouts.
- `~/.config/ags` — the GTK4 status bar (AGS 3 / gnim).
- `~/.config/alacritty`, `~/.config/rofi` — terminal and launcher configs.
- `~/.config/waybar` — kept, not used by the Hyprland config (the bar is AGS).
- `~/.config/pipewire`, `~/.config/wireplumber` — audio.
- `~/.config/yay` — yay v13 Lua hooks (`init.lua`).

## Packages

Arch package lists below come from what the configs actually call: Hyprland binds, autostart, the bar, and the plugin build.

```
sudo pacman -S --needed hyprland hyprpaper xdg-desktop-portal-hyprland xdg-desktop-portal-gtk swaync libnotify kitty alacritty rofi cliphist wl-clipboard grim slurp satty pipewire pipewire-pulse pipewire-alsa wireplumber pavucontrol playerctl udiskie polkit-kde-agent firefox calcurse btop gjs gtk4-layer-shell dart-sass ttf-jetbrains-mono otf-font-awesome chezmoi git make gcc pkgconf
```

Optional official: `lua` and `jq` for the config's tests and helper commands; `waybar` only if you use that config; `brightnessctl` for the brightness keys on laptops.

```
sudo pacman -S --needed lua jq waybar brightnessctl
```

yay bootstrap:

```
git clone https://aur.archlinux.org/yay-bin.git && cd yay-bin && makepkg -si
```

AUR (`aylurs-gtk-shell-git` pulls libastal, libastal-4 and libastal-io; `bubblejail` is the Firefox sandbox behind Super+F):

```
yay -S --needed aylurs-gtk-shell-git libastal-apps-git libastal-hyprland-git libastal-tray-git bubblejail
```

Optional AUR (`polychromatic-git`, the Razer tray applet in autostart):

```
yay -S --needed polychromatic-git
```

## Fresh machine

1. `sudo pacman -S --needed chezmoi git`
2. `chezmoi init --apply https://codeberg.org/hanxyz/dotfiles.git`
3. `make -B -C ~/.config/hypr/plugins/lockguard lockguard.so` — forced, because the applied binary is newer than Hyprland's headers, so a plain make would keep the stale build; the plugin embeds the compositor hash and refuses to load when it does not match.
4. `ags types -u -d ~/.config/ags` — recreates the ignored `node_modules` links to `/usr/share/ags/js` (and the `@girs` types); the bar does not start without them.
5. `bubblejail create --profile firefox FirefoxInstance` — the instance Super+F launches.
6. If the outputs are not `DP-1` and `DP-2`: edit `~/.config/hypr/lua/monitors.lua` and the `M.base` table in `~/.config/hypr/lua/workspaces.lua`.
7. Log in on a TTY and run `Hyprland` (no display manager, no login-shell launcher). Then `hyprctl configerrors` prints nothing and `hyprctl plugin list` shows lockguard.

`hyprpaper` runs without a managed config; the wallpaper is not part of the dotfiles.

## Updating

`chezmoi update` pulls and applies. After a Hyprland update: `make -C ~/.config/hypr/plugins/lockguard reload` (rebuilds, swaps the loaded plugin, re-adds the binary to chezmoi).

## Pushing changes

```
chezmoi add ~/.config/hypr ~/.config/ags   # or any changed path
chezmoi git -- commit -m "..."
chezmoi git -- push origin master
```
