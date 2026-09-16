#!/bin/sh
# Claude Code statusLine hook: keeps the last status JSON where the bar can watch it.
# Prints nothing on purpose (han's choice: no terminal status line).
dir="${XDG_CACHE_HOME:-$HOME/.cache}/claude-usage"
mkdir -p "$dir" 2>/dev/null || exit 0
{ printf '{"received_at":%s,"data":' "$(date +%s)"; cat; printf '}\n'; } > "$dir/latest.json.tmp" 2>/dev/null \
  && mv -f "$dir/latest.json.tmp" "$dir/latest.json" 2>/dev/null
exit 0
