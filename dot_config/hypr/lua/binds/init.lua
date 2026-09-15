-- Keybinds, one sub-module per concern. ctx carries the values they share.
local terminal = require("lua.terminal")
local ctx = { mainMod = "SUPER", terminal = terminal.cmd, menu = "rofi -show drun" }
ctx.in_terminal = terminal.run

require("lua.binds.apps")(ctx)
require("lua.binds.media")(ctx)
require("lua.binds.workspaces")(ctx)
require("lua.binds.scrolling")(ctx)
