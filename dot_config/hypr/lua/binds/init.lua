-- Keybinds, one sub-module per concern. ctx carries the values they share.
local ctx = { mainMod = "SUPER", terminal = "kitty", menu = "rofi -show drun" }

-- Run `cmd` inside the terminal. `--` is kitty's end-of-options marker;
-- a terminal that takes `-e` (alacritty, foot) changes this one line.
function ctx.in_terminal(cmd)
	return ctx.terminal .. " -- " .. cmd
end

require("lua.binds.apps")(ctx)
require("lua.binds.media")(ctx)
require("lua.binds.workspaces")(ctx)
require("lua.binds.scrolling")(ctx)
