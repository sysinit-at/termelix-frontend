#!/bin/sh
# Paints a plausible Linux ops session into the terminal for website screenshots.
# The shots run over real SSH into the local stack — a Mac — so anything live (btop, htop,
# fastfetch) leaks the workstation's processes, hostname and battery meter into marketing
# material. This stages believable web-01 content instead: fake prompt, fake services.
#
# `tmux set ...`: the session runs inside real tmux, which inherits the developer's
# ~/.tmux.conf — a status line printing the real hostname/user, and a pane title strip.
tmux set status off 2>/dev/null
tmux set pane-border-status off 2>/dev/null
# zsh's title hook has already named this window after the real user; pin a neutral name
# (the monitor and sessions column both display window names).
tmux set-window-option automatic-rename off 2>/dev/null
tmux rename-window shell 2>/dev/null
clear

G() { printf '\033[1;32m%s\033[0m' "$1"; }
prompt() { printf '\033[1;32mdeploy@web-01\033[0m:\033[1;34m~\033[0m$ '; }
cmd() { prompt; printf '%s\n' "$1"; }

cmd "systemctl status caddy"
printf '\033[0;32m●\033[0m caddy.service - Caddy web server\n'
printf '     Loaded: loaded (/lib/systemd/system/caddy.service; \033[0;32menabled\033[0m; preset: \033[0;32menabled\033[0m)\n'
printf '     Active: \033[0;32mactive (running)\033[0m since Mon 2026-07-27 06:12:04 UTC; 9h ago\n'
printf '       Docs: https://caddyserver.com/docs/\n'
printf '   Main PID: 812 (caddy)\n'
printf '      Tasks: 9 (limit: 4915)\n'
printf '     Memory: 38.2M\n'
printf '        CPU: 4min 12.480s\n'
printf '     CGroup: /system.slice/caddy.service\n'
printf '             └─812 /usr/bin/caddy run --config /etc/caddy/Caddyfile\n'
printf '\n'

cmd "docker compose ps"
printf '\033[1mNAME        IMAGE                      STATUS         PORTS\033[0m\n'
printf 'app         registry.local/app:2.4.1   Up 9 hours     0.0.0.0:8080->8080/tcp\n'
printf 'postgres    postgres:17-alpine         Up 9 hours     5432/tcp\n'
printf 'redis       redis:8-alpine             Up 9 hours     6379/tcp\n'
printf 'worker      registry.local/app:2.4.1   Up 9 hours\n'
printf '\n'

cmd "tail -n 5 /var/log/app/access.log"
printf '\033[0;90m2026-07-27T15:41:02Z\033[0m \033[0;32m200\033[0m GET  /api/v1/orders          12ms\n'
printf '\033[0;90m2026-07-27T15:41:04Z\033[0m \033[0;32m200\033[0m GET  /api/v1/orders/8412     8ms\n'
printf '\033[0;90m2026-07-27T15:41:07Z\033[0m \033[0;32m201\033[0m POST /api/v1/orders          31ms\n'
printf '\033[0;90m2026-07-27T15:41:11Z\033[0m \033[0;33m304\033[0m GET  /assets/app.css         1ms\n'
printf '\033[0;90m2026-07-27T15:41:13Z\033[0m \033[0;32m200\033[0m GET  /healthz                2ms\n'
printf '\n'

cmd "df -h /srv"
printf '\033[1mFilesystem      Size  Used Avail Use%% Mounted on\033[0m\n'
printf '/dev/nvme0n1p2  438G  187G  229G  45%% /srv\n'
printf '\n'

prompt
# Block instead of exiting: returning would print the REAL shell prompt (user@mac) right
# under the staged one. Enter releases it after the shot.
read -r _line
