-- Launchers and window operations.
return function(ctx)
	local mainMod = ctx.mainMod

	hl.bind(mainMod .. " + Q", hl.dsp.exec_cmd(ctx.terminal))
	hl.bind(mainMod .. " + C", hl.dsp.window.close())
	hl.bind(mainMod .. " + M", hl.dsp.exit())
	hl.bind(mainMod .. " + V", hl.dsp.window.float({ action = "toggle" }))
	hl.bind(mainMod .. " + R", hl.dsp.exec_cmd(ctx.menu))

	hl.bind(mainMod .. " + left", hl.dsp.focus({ direction = "left" }))
	hl.bind(mainMod .. " + right", hl.dsp.focus({ direction = "right" }))
	hl.bind(mainMod .. " + up", hl.dsp.focus({ direction = "up" }))
	hl.bind(mainMod .. " + down", hl.dsp.focus({ direction = "down" }))

	hl.bind(mainMod .. " + mouse:272", hl.dsp.window.drag(), { mouse = true })
	hl.bind(mainMod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

	hl.bind(mainMod .. " + SHIFT + F", hl.dsp.window.fullscreen())
	hl.bind(mainMod .. " + W", hl.dsp.exec_cmd(ctx.in_terminal("btop")))
	hl.bind("Print", hl.dsp.exec_cmd([[grim -g "$(slurp -d)" - | satty --filename -]]))
	hl.bind(mainMod .. " + F", hl.dsp.exec_cmd("bubblejail run -- FirefoxInstance /usr/lib/firefox/firefox --no-remote"))
	hl.bind(mainMod .. " + ALT + F", hl.dsp.exec_cmd("bubblejail run -- FirefoxInstance /usr/lib/firefox/firefox --no-remote --private-window"))
	hl.bind(mainMod .. " + X", hl.dsp.exec_cmd("cliphist list | rofi -dmenu | cliphist decode | wl-copy"))
	hl.bind(mainMod .. " + SHIFT + X", hl.dsp.exec_cmd("cliphist wipe"))
	hl.bind(mainMod .. " + SHIFT + N", hl.dsp.exec_cmd("makoctl dismiss -a"))
	hl.bind(mainMod .. " + E", hl.dsp.exec_cmd(ctx.in_terminal("calcurse")))
end
