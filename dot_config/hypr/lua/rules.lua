-- Window rules.

-- Steam games and Minecraft (live class "Minecraft* 1.21.1"; Prism Launcher
-- stays where it is) go to workspace 10, the last slot of DP-1's set, so a
-- game never lands in the middle of a working strip.
hl.window_rule({
	name  = "games-workspace",
	match = { class = "^(steam_app_.*|Minecraft.*)$" },
	workspace = "10",
})

-- kitty 0.49 maximizes itself on map; on the scrolling layout that turns its
-- column full width. suppress_event keeps the configured column width.
hl.window_rule({
	name  = "kitty-no-maximize",
	match = { class = "^kitty$" },
	suppress_event = "maximize",
})

-- satty (screenshot annotator) opens floating, centered.
hl.window_rule({
	name   = "satty-float",
	match  = { class = "^com\\.gabm\\.satty$" },
	float  = true,
	center = true,
})
