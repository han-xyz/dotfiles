-- Keybinds, one sub-module per concern. ctx carries the values they share.
local ctx = { mainMod = "SUPER", terminal = "kitty", menu = "rofi -show drun" }
require("lua.binds.apps")(ctx)
require("lua.binds.media")(ctx)
require("lua.binds.workspaces")(ctx)
require("lua.binds.scrolling")(ctx)
