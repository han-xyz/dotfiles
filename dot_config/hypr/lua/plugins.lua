-- Plugins built from hypr/plugins/<name>/, loaded when the .so exists next
-- to this config. A missing .so is skipped, so verify-config on the repo
-- passes without a build, and a build that is stale after a Hyprland update
-- only produces Hyprland's failed-to-load notification, never a config error.
local dir = debug.getinfo(1, "S").source:match("^@(.*)/lua/[^/]+$")

local M = {}

function M.load_if_built(name)
	local path = dir .. "/plugins/" .. name .. "/" .. name .. ".so"
	local f = io.open(path, "rb")
	if not f then return false end
	f:close()
	hl.plugin.load(path)
	return true
end

-- lockguard keeps games' pointer locks alive across scrolling-layout relayouts.
M.load_if_built("lockguard")

return M
