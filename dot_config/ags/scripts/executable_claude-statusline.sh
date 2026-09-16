#!/bin/sh
# Claude Code statusLine hook: keeps the last status JSON where the bar can watch it.
# Prints nothing on purpose (han's choice: no terminal status line).
dir="${XDG_CACHE_HOME:-$HOME/.cache}/claude-usage"
mkdir -p "$dir" 2>/dev/null || exit 0
tmp="$dir/latest.json.tmp.$$"
{ printf '{"received_at":%s,"data":' "$(date +%s)"; cat; printf '}\n'; } > "$tmp" 2>/dev/null \
  && mv -f "$tmp" "$dir/latest.json" 2>/dev/null
exit 0
