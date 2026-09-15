-- Scrolling-layout actions (CONTEXT.md glossary): column, consume/expel (promote, consume_or_expel), fit.
return function(ctx)
	local mainMod = ctx.mainMod
	local columns = require("lua.columns")

	-- These reorder columns in a way Hyprland gives the bar no IPC event for,
	-- so each also sends the "bar-reorder" event on socket2 (columns.reorder).
	hl.bind(mainMod .. " + CTRL + left", columns.reorder(hl.dsp.layout("swapcol l")))
	hl.bind(mainMod .. " + CTRL + right", columns.reorder(hl.dsp.layout("swapcol r")))
	hl.bind(mainMod .. " + CTRL + up", columns.reorder(hl.dsp.window.move({ direction = "up" })))
	hl.bind(mainMod .. " + CTRL + down", columns.reorder(hl.dsp.window.move({ direction = "down" })))

	hl.bind(mainMod .. " + comma", columns.reorder(hl.dsp.layout("consume")))
	hl.bind(mainMod .. " + period", columns.reorder(hl.dsp.layout("promote")))
	hl.bind(mainMod .. " + bracketleft", columns.reorder(hl.dsp.layout("consume_or_expel prev")))
	hl.bind(mainMod .. " + bracketright", columns.reorder(hl.dsp.layout("consume_or_expel next")))

	hl.bind(mainMod .. " + minus", hl.dsp.layout("colresize -0.1"))
	hl.bind(mainMod .. " + equal", hl.dsp.layout("colresize +0.1"))
	hl.bind(mainMod .. " + SHIFT + R", hl.dsp.layout("colresize +conf"))

	hl.bind(mainMod .. " + A", columns.toggle_fit())
	hl.bind(mainMod .. " + Home", hl.dsp.layout("fit tobeg"))
	hl.bind(mainMod .. " + End", hl.dsp.layout("fit toend"))

	-- Tabbed column (Niri Mod+W) as a Hyprland group; Super+W itself stays btop.
	hl.bind(mainMod .. " + SHIFT + W", hl.dsp.group.toggle())
	hl.bind(mainMod .. " + ALT + left", hl.dsp.group.prev())
	hl.bind(mainMod .. " + ALT + right", hl.dsp.group.next())
end
