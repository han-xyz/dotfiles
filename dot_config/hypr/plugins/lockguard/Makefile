# This directory is copied whole to ~/.config/hypr/plugins/lockguard/ and
# built there. The plugin embeds the compositor commit hash and dependency
# versions, so a stale build refuses to load (Hyprland then shows a
# failed-to-load notification, nothing worse).

CXX ?= g++
CXXFLAGS := -std=c++26 -shared -fPIC --no-gnu-unique -O2 -Wno-narrowing -DWLR_USE_UNSTABLE $(shell pkg-config --cflags hyprland pixman-1 libdrm hyprutils hyprgraphics aquamarine hyprlang)

# Rebuild when Hyprland's headers change, not only the source: they carry the
# compositor hash the plugin embeds.
lockguard.so: lockguard.cpp /usr/include/hyprland/src/version.h
	$(CXX) $(CXXFLAGS) $< -o $@

SO := $(abspath lockguard.so)

# Rebuild if stale, swap the loaded copy (a config reload skips an unchanged
# plugin list, so unload+load is the only way in), show the result, and keep
# chezmoi's copy current when this is the live directory it manages.
reload: lockguard.so
	-hyprctl plugin unload $(SO) >/dev/null 2>&1
	hyprctl plugin load $(SO)
	hyprctl plugin list
	@case "$(CURDIR)" in "$(HOME)/.config/hypr/"*) command -v chezmoi >/dev/null && chezmoi add "$(SO)" || true ;; esac

clean:
	rm -f lockguard.so

.PHONY: reload clean
