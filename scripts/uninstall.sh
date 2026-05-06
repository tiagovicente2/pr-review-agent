#!/usr/bin/env bash
set -euo pipefail
APP_NAME="pr-review-agent"
INSTALL_DIR="${PR_REVIEW_AGENT_INSTALL_DIR:-$HOME/.local/share/pr-review-agent}"
BIN_DIR="${PR_REVIEW_AGENT_BIN_DIR:-$HOME/.local/bin}"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
rm -rf "$INSTALL_DIR"
rm -f "$BIN_DIR/$APP_NAME"
rm -f "$DESKTOP_DIR/pr-review-agent.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
printf '[pr-review-agent] uninstalled\n'
