# End-to-end tests

These drive a **real** browser against a **real** Termelix server, over **real** SSH into
**real** tmux. Nothing is mocked, because the bugs this project keeps hitting are the ones a
mock cannot have: frames the server accepts and silently ignores, and commands that only fail
once they reach a shell.

## Running them

`TERMELIX_E2E_URL` has no default. A suite that points at production when a variable is unset
is a suite that will eventually do something to production.

Against a throwaway local stack (what CI should do):

```sh
# 1. an sshd with tmux, on a high port, key auth only
#    (see the fixtures the tests assume: user "e2e", host "e2e-local")
# 2. a Termelix server on :4321 with DATA_DIR pointed somewhere disposable
# 3. /tmp/tmx-e2e/restart.sh must stop and restart that server — the resume test needs it

TERMELIX_E2E_URL=http://127.0.0.1:4321 npx playwright test
```

Against a deployed instance, only the boot tests are meaningful (they need no login):

```sh
TERMELIX_E2E_URL=https://termelix.example.com npx playwright test e2e/boot.spec.ts
```

## What they actually establish

`boot.spec.ts` checks claims that can only be checked against a server: a chunk can be small on
disk and still be fetched eagerly, and compression configured in the endpoint does nothing if
the files are not on disk. Both of those were true here and neither showed up in a build.

`terminal.spec.ts` restarts the server under a live terminal. Note what the first test does
**not** prove: running it with the resume path disabled still passes, because the tmux-first
default recovers the session anyway via a stable per-tab `instanceId`. The wire test is what
isolates the protocol — and it fails, correctly, when the client stops advertising support.

## Website screenshots (not tests)

`e2e-screenshots/showcase.spec.ts` drives the same stack to produce marketing shots for the
website — 3200×2000 retina PNGs in `screenshots/` (gitignored). It has its own config so the
test suite never runs it:

```sh
# 1. stack + fixtures (server repo, checked out next to this one)
../termelix/scripts/e2e-stack.sh
../termelix/scripts/seed-e2e.sh
# optional, needs sudo, once per boot: lo0 aliases so the whole fake fleet shows ONLINE
sudo ../termelix/scripts/e2e-net-aliases.sh
# (after first adding the aliases: wipe /tmp/tmx-e2e/data and re-run stack+seed so
#  web-01 is re-created on its fleet address instead of 127.0.0.1)

# 2. generate
TERMELIX_E2E_URL=http://127.0.0.1:4321 npx playwright test -c playwright.screenshots.config.ts
```

The fleet is fixture data seeded through the real API; `web-01` is a real SSH host (the
stack's own sshd), so terminal content is rendered by xterm over the wire. The terminal's
CONTENT is staged (`e2e-screenshots/assets/showcase-session.sh`) because anything live —
btop, a real prompt, the tmux status line — leaks the workstation's hostname, processes and
battery meter into marketing material.
