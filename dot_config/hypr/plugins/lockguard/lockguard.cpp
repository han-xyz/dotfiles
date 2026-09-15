// lockguard: keep pointer locks alive across scrolling-layout relayouts.
//
// Hyprland 0.56.2's scrolling layout ends every relayout of a workspace with
// no covering fullscreen window in CScrollingFullscreenHandler::
// updateFullscreenFade(false), which calls CInputManager::unconstrainMouse().
// That drops every active pointer lock in the session (a game on another
// workspace or monitor included) on any layer map/unmap (notification popup),
// window map/unmap or resize touching a scrolling workspace. The unconstrain
// exists to stop a fullscreen window that was scrolled out of view from
// pinning the cursor; when the handler has no fullscreen target at all there
// is nothing to protect, so this plugin skips the unconstrain in exactly that
// case and leaves every other path untouched.
// Standard headers first: the access override below must not see them.
#include <algorithm>
#include <any>
#include <array>
#include <atomic>
#include <chrono>
#include <cmath>
#include <deque>
#include <expected>
#include <format>
#include <fstream>
#include <functional>
#include <iostream>
#include <list>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <ranges>
#include <regex>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <thread>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <variant>
#include <vector>
#define private public // reach m_fsTargets; the usual Hyprland-plugin trick
#include <hyprland/src/plugins/PluginAPI.hpp>
#include <hyprland/src/managers/input/InputManager.hpp>
#include <hyprland/src/layout/algorithm/tiled/scrolling/ScrollingFullscreenHandler.hpp>
#undef private

#include <stdexcept>
#include <string>

using Fullscreen::ScrollingFullscreenHandler::CScrollingFullscreenHandler;

inline HANDLE         PHANDLE           = nullptr;
inline CFunctionHook* g_fadeHook        = nullptr;
inline CFunctionHook* g_unconstrainHook = nullptr;
inline int            g_skipDepth       = 0;

using origFade_t        = void (*)(CScrollingFullscreenHandler*, bool);
using origUnconstrain_t = void (*)(CInputManager*);

static void hkUpdateFullscreenFade(CScrollingFullscreenHandler* self, bool coversMonitor) {
    const bool skip = !coversMonitor && self->m_fsTargets.empty();
    if (skip)
        g_skipDepth++;
    ((origFade_t)g_fadeHook->m_original)(self, coversMonitor);
    if (skip)
        g_skipDepth--;
}

static void hkUnconstrainMouse(CInputManager* self) {
    if (g_skipDepth > 0)
        return;
    ((origUnconstrain_t)g_unconstrainHook->m_original)(self);
}

static void* findExact(const std::string& name, const std::string& demangledNeedle) {
    for (const auto& m : HyprlandAPI::findFunctionsByName(PHANDLE, name)) {
        if (m.demangled.find(demangledNeedle) != std::string::npos)
            return m.address;
    }
    return nullptr;
}

static void fail(const std::string& why) {
    HyprlandAPI::addNotification(PHANDLE, "[lockguard] " + why + ", not loaded", CHyprColor{1.0, 0.2, 0.2, 1.0}, 6000);
    throw std::runtime_error("[lockguard] " + why);
}

APICALL EXPORT std::string PLUGIN_API_VERSION() {
    return HYPRLAND_API_VERSION;
}

APICALL EXPORT PLUGIN_DESCRIPTION_INFO PLUGIN_INIT(HANDLE handle) {
    PHANDLE = handle;

    if (std::string_view{__hyprland_api_get_hash()} != std::string_view{__hyprland_api_get_client_hash()})
        fail("built against a different Hyprland (rebuild the plugin)");

    void* fade = findExact("updateFullscreenFade", "CScrollingFullscreenHandler::updateFullscreenFade(bool)");
    void* unc  = findExact("unconstrainMouse", "CInputManager::unconstrainMouse()");
    if (!fade || !unc)
        fail("hook targets not found");

    g_fadeHook        = HyprlandAPI::createFunctionHook(PHANDLE, fade, (void*)&hkUpdateFullscreenFade);
    g_unconstrainHook = HyprlandAPI::createFunctionHook(PHANDLE, unc, (void*)&hkUnconstrainMouse);
    if (!g_fadeHook || !g_unconstrainHook || !g_fadeHook->hook() || !g_unconstrainHook->hook())
        fail("could not install hooks");

    return {"lockguard", "Keep pointer locks across scrolling-layout relayouts", "han", "0.1"};
}

APICALL EXPORT void PLUGIN_EXIT() {}
