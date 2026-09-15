-- Window rules.

-- Steam games and Minecraft (live class "Minecraft* 1.21.1"; Prism Launcher
-- stays where it is) go to workspace 10, the last slot of DP-1's set, so a
-- game never lands in the middle of a working strip.
hl.window_rule({
	name  = "games-workspace",
	match = { class = "^(steam_app_.*|Minecraft.*)$" },
	workspace = "10",
})
