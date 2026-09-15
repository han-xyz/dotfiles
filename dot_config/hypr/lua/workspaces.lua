-- Per-monitor workspace sets, replacing the split-monitor-workspaces plugin.
local M = {}

-- Ids match what the old plugin produced, so the bar's per-monitor
-- filter (ags/widget/Workspaces.tsx, by monitor connector) still works.
M.base = { ["DP-1"] = 0, ["DP-2"] = 10 }
M.count = 10

function M.id_for(monitor_name, n)
	local base = M.base[monitor_name]
	if base then
		return base + n
	end
	return n
end

function M.focus(n)
	return function()
		local mon = hl.get_active_monitor()
		local id = M.id_for(mon and mon.name, n)
		hl.dispatch(hl.dsp.focus({ workspace = id }))
	end
end

function M.move_window(n)
	return function()
		local mon = hl.get_active_monitor()
		local id = M.id_for(mon and mon.name, n)
		hl.dispatch(hl.dsp.window.move({ workspace = id }))
		-- Niri's move-column-to-workspace follows; Hyprland's move does not, so
		-- focus is dispatched separately.
		hl.dispatch(hl.dsp.focus({ workspace = id }))
	end
end

-- n (1..count) and base of the workspace the active monitor shows, or nil when
-- that workspace is outside the monitor's set (special or foreign workspace).
local function active_n()
	local mon = hl.get_active_monitor()
	local wsp = mon and mon.active_workspace
	if not wsp then return nil end
	local base = M.base[mon.name]
	if not base then return nil end
	local n = wsp.id - base
	if n < 1 or n > M.count then return nil end
	return n, base
end

local function clamp_step(n, delta)
	return math.max(1, math.min(M.count, n + delta))
end

-- Niri's focus-workspace-down/up: step inside this monitor's set, stop at the ends.
function M.step(delta)
	return function()
		local n, base = active_n()
		if not n then return end
		local target = clamp_step(n, delta)
		if target == n then return end
		hl.dispatch(hl.dsp.focus({ workspace = base + target }))
	end
end

-- Niri's move-column-to-workspace-down/up, for the active window. follow
-- dispatches a focus to the target too (keyboard binds); wheel binds omit it
-- to stay silent.
function M.move_window_step(delta, follow)
	return function()
		local n, base = active_n()
		if not n then return end
		local target = clamp_step(n, delta)
		if target == n then return end
		hl.dispatch(hl.dsp.window.move({ workspace = base + target }))
		if follow then
			hl.dispatch(hl.dsp.focus({ workspace = base + target }))
		end
	end
end

-- Nearest monitor on the given side ("l" or "r") of the active one, by x position.
-- On 0.56.2 hl.window.move has no monitor key (the upstream wiki documents one
-- for newer builds) and hl.focus({ monitor }) takes a name, not a direction, so
-- the neighbour is resolved here by x position. When a later Hyprland accepts
-- monitor = "l"|"r" directly, these two helpers can become one-line dispatches.
local function neighbour_monitor(direction)
	local current = hl.get_active_monitor()
	if not current then return nil end
	local best
	for _, mon in ipairs(hl.get_monitors()) do
		local dx = mon.x - current.x
		local on_side = (direction == "l" and dx < 0) or (direction == "r" and dx > 0)
		if on_side and (not best or math.abs(dx) < math.abs(best.x - current.x)) then
			best = mon
		end
	end
	return best
end

function M.focus_monitor(direction)
	return function()
		local mon = neighbour_monitor(direction)
		if not mon then return end
		hl.dispatch(hl.dsp.focus({ monitor = mon.name }))
	end
end

function M.move_window_to_monitor(direction)
	return function()
		local mon = neighbour_monitor(direction)
		local wsp = mon and mon.active_workspace
		if not wsp then return end
		hl.dispatch(hl.dsp.window.move({ workspace = wsp.id }))
	end
end

function M.apply_rules()
	local names = {}
	for name in pairs(M.base) do
		table.insert(names, name)
	end
	table.sort(names)

	for _, name in ipairs(names) do
		local base = M.base[name]
		for n = 1, M.count do
			hl.workspace_rule({
				workspace = tostring(base + n),
				monitor = name,
				default = (n == 1) or nil,
			})
		end
	end
end

M.apply_rules()

return M
