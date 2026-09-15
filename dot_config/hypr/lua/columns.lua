-- Column helpers for the scrolling layout.
local M = {}

local function default_width()
	local width = hl.get_config("scrolling.column_width")
	if type(width) ~= "number" or width <= 0 then
		return 0.5
	end
	return width
end

-- Bind function: fit the active column to the screen, or restore the
-- configured default width if it's already at full width. The state comes
-- from window.layout.column.width (Hyprland 0.56.2's live layout data), not
-- a remembered table, so a workspace move or manual resize can't go stale.
function M.toggle_fit()
	return function()
		local win = hl.get_active_window()
		if not win then return end
		local col = type(win.layout) == "table" and type(win.layout.column) == "table" and win.layout.column or nil
		if col and type(col.width) == "number" and col.width >= 0.999 then
			hl.dispatch(hl.dsp.layout("colresize " .. default_width()))
		else
			hl.dispatch(hl.dsp.layout("fit active"))
		end
	end
end

-- Bind function: run `dispatcher`, then tell the bar the column order changed.
-- Hyprland emits no IPC event for layout moves; the bar re-sorts its icons
-- when it sees the resulting socket2 line "custom>>bar-reorder".
function M.reorder(dispatcher)
	return function()
		hl.dispatch(dispatcher)
		hl.dispatch(hl.dsp.event("bar-reorder"))
	end
end

return M
