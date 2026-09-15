-- Workspace focus/move (per-monitor, via lua.workspaces), special workspace,
-- mouse-wheel column/workspace/window switching, Niri workspace and monitor keys.
return function(ctx)
	local mainMod = ctx.mainMod
	local ws = require("lua.workspaces")

	for i = 1, 10 do
		local key = i % 10
		hl.bind(mainMod .. " + " .. key, ws.focus(i))
		hl.bind(mainMod .. " + SHIFT + " .. key, ws.move_window(i))
	end

	hl.bind(mainMod .. " + S", hl.dsp.workspace.toggle_special("magic"))
	hl.bind(mainMod .. " + SHIFT + S", hl.dsp.window.move({ workspace = "special:magic" }))

	-- Wheel: Super steps columns (the user's "switch windows"), Shift steps this
	-- monitor's workspaces, Ctrl carries the window to the next/previous workspace.
	hl.bind(mainMod .. " + mouse_down", hl.dsp.layout("focus r"))
	hl.bind(mainMod .. " + mouse_up", hl.dsp.layout("focus l"))
	hl.bind(mainMod .. " + SHIFT + mouse_down", ws.step(1))
	hl.bind(mainMod .. " + SHIFT + mouse_up", ws.step(-1))
	-- Wheel keeps moving silently; the keyboard binds below follow (focus goes with the window).
	hl.bind(mainMod .. " + CTRL + mouse_down", ws.move_window_step(1))
	hl.bind(mainMod .. " + CTRL + mouse_up", ws.move_window_step(-1))

	-- Niri workspace keys: Page_Down/U next, Page_Up/I previous, Ctrl moves the window, Tab = previous workspace.
	for _, key in ipairs({ "Page_Down", "U" }) do
		hl.bind(mainMod .. " + " .. key, ws.step(1))
		hl.bind(mainMod .. " + CTRL + " .. key, ws.move_window_step(1, true))
	end
	for _, key in ipairs({ "Page_Up", "I" }) do
		hl.bind(mainMod .. " + " .. key, ws.step(-1))
		hl.bind(mainMod .. " + CTRL + " .. key, ws.move_window_step(-1, true))
	end
	hl.bind(mainMod .. " + Tab", hl.dsp.focus({ workspace = "previous" }))

	-- Monitors (Niri Mod+Shift+arrows / Mod+Shift+Ctrl+arrows), nearest by x position.
	hl.bind(mainMod .. " + SHIFT + left", ws.focus_monitor("l"))
	hl.bind(mainMod .. " + SHIFT + right", ws.focus_monitor("r"))
	hl.bind(mainMod .. " + SHIFT + CTRL + left", ws.move_window_to_monitor("l"))
	hl.bind(mainMod .. " + SHIFT + CTRL + right", ws.move_window_to_monitor("r"))
end
