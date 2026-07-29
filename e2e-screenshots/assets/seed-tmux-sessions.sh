#!/bin/sh
# Pre-populates the stack's ISOLATED tmux server (TMUX_TMPDIR from e2e-stack.sh's sshd)
# with named sessions so the sessions column and the tmux monitor have something to show.
# Every pane runs a generated script that prints staged content and then blocks: the
# monitor embeds a live terminal preview of the selected pane, so anything real — an
# actual prompt, a running command — would put the workstation into the shot.
#
# Pane content lives in generated per-pane script files rather than inline `sh -c`
# one-liners: the content is full of quotes and escapes, and a mis-nested quote makes the
# pane die instantly — tmux then reaps the whole session before anything can screenshot it.
#
# Idempotent: existing sessions are left alone.

# When this runs from a shell that itself lives inside tmux, $TMUX pins every tmux command
# to the DEVELOPER'S server and silently ignores TMUX_TMPDIR — unset it or the staging
# happens on their personal sessions' server.
unset TMUX TMUX_PANE
export TMUX_TMPDIR=/tmp/tmx-e2e/tmux
PANES=/tmp/tmx-e2e/panes
mkdir -p "$TMUX_TMPDIR" "$PANES"

# pane <file> — write a pane script from stdin, ending in a permanent block. The blocker
# is tail, not sleep: the monitor's pane rows display the running command, and "tail" reads
# like a real session where "sleep" reads like a demo.
pane() {
  cat > "$PANES/$1"
  printf 'exec tail -f /dev/null\n' >> "$PANES/$1"
}

pane deploy-release.sh <<'EOF'
P='\033[1;32mdeploy@web-01\033[0m:\033[1;34m~\033[0m$'
printf "$P ./deploy.sh v2.4.1\n"
printf '==> Building release \033[1mv2.4.1\033[0m\n'
printf '==> Uploading artifact (24.3 MB)\n'
printf '==> Rolling restart: web-01 \033[0;32mok\033[0m  web-02 \033[0;32mok\033[0m  web-03 \033[0;32mok\033[0m\n'
printf '==> Health checks passed (3/3)\n'
printf '\033[0;32mDeploy complete\033[0m in 2m 14s\n'
printf "$P "
EOF

pane deploy-shell.sh <<'EOF'
printf '\033[1;32mdeploy@web-01\033[0m:\033[1;34m~\033[0m$ '
EOF

pane logs-access.sh <<'EOF'
printf '\033[1;32mdeploy@web-01\033[0m:\033[1;34m~\033[0m$ tail -f /var/log/app/access.log\n'
printf '\033[0;90m2026-07-28T13:02:11Z\033[0m \033[0;32m200\033[0m GET  /api/v1/orders          11ms\n'
printf '\033[0;90m2026-07-28T13:02:14Z\033[0m \033[0;32m201\033[0m POST /api/v1/orders          28ms\n'
printf '\033[0;90m2026-07-28T13:02:19Z\033[0m \033[0;32m200\033[0m GET  /api/v1/customers/312   9ms\n'
printf '\033[0;90m2026-07-28T13:02:23Z\033[0m \033[0;33m304\033[0m GET  /assets/app.js          1ms\n'
printf '\033[0;90m2026-07-28T13:02:27Z\033[0m \033[0;32m200\033[0m GET  /healthz                2ms\n'
EOF

pane db-migration.sh <<'EOF'
printf 'psql (17.5) on \033[1mdb-primary\033[0m\n'
printf 'app=# \\i migrations/2026_07_add_orders_index.sql\n'
printf 'CREATE INDEX CONCURRENTLY\n'
printf 'Time: 84213.502 ms (01:24.214)\n'
printf 'app=# '
EOF

# stage <session> <window> <pane-script>  — started in / so the monitor's pane rows show a
# neutral path instead of the workstation's real working directory.
stage() {
  tmux has-session -t "$1" 2>/dev/null && return 0
  tmux new-session -d -s "$1" -n "$2" -c / "sh $PANES/$3"
  # The developer's ~/.tmux.conf leaks a hostname/user status line and pane title strip
  # into the preview; turn both off per staged session.
  tmux set-option -t "$1" status off
  tmux set-option -t "$1" pane-border-status off
}

# App-created sessions from previous generator runs accumulate (one per browser context);
# reap them so every run starts from the same picture. Isolated server — never the
# developer's own tmux.
tmux ls -F '#{session_name}' 2>/dev/null | grep '^termelix-' | while read -r s; do
  tmux kill-session -t "$s"
done

stage deploy-prod release deploy-release.sh
stage logs access logs-access.sh
stage db-migration psql db-migration.sh

# A second window on deploy-prod so the counts read like real use, not a demo.
if ! tmux list-windows -t deploy-prod -F '#{window_name}' 2>/dev/null | grep -q '^shell$'; then
  tmux new-window -d -t deploy-prod -n shell -c / "sh $PANES/deploy-shell.sh"
fi

echo "staged tmux sessions: $(tmux ls -F '#{session_name}' | tr '\n' ' ')"
