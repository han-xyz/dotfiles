-- The one place the terminal is chosen. binds/init.lua puts it on ctx; the
-- AGS bar runs in its own process and reaches it through
-- `hyprctl dispatch 'hl.dsp.exec_cmd(require("lua.terminal").run(...))'`.
local M = { cmd = "kitty" }

-- Run `cmd` inside the terminal. `--` is kitty's end-of-options marker;
-- a terminal that takes `-e` (alacritty, foot) changes this one line.
function M.run(cmd)
	return M.cmd .. " -- " .. cmd
end

return M
