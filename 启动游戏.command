#!/bin/zsh
cd "${0:A:h}"
NODE_BIN="$(command -v node)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$NODE_BIN" ]]; then
  print '未找到 Node.js。请安装 Node.js 20 或更新版本后重新打开。'
  read '?按回车退出'
  exit 1
fi
ECHO_GAME_PORT="${PORT:-8788}"
export PORT="$ECHO_GAME_PORT"
print '废土回声 v0.2 · 地堡与联机' 
print "地址：http://localhost:$ECHO_GAME_PORT"
print '保持此窗口打开。按 Control+C 停止服务。'
(sleep 1; open "http://localhost:$ECHO_GAME_PORT") &
exec "$NODE_BIN" server.mjs
