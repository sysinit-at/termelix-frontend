import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * The tmux monitor's "Attach" opens this view in a new browser tab.
 *
 * It used to build `tmux attach-session -t '=<name>'` and hand it to `executeCommand` — i.e.
 * TYPE it into the shell. Since the tmux-first change, that shell is itself a tmux client on
 * any host that has tmux, so the typed attach nests and tmux refuses it:
 *
 *     sessions should be nested with care, unset $TMUX to force
 *
 * The click appeared to do nothing, and the operator was left in their own wrapper session
 * instead of the one they clicked. Reported from a real host, with that exact message.
 */

const terminalProps: Record<string, unknown>[] = [];

vi.mock("@/features/terminal/Terminal.tsx", () => ({
  Terminal: (props: Record<string, unknown>) => {
    terminalProps.push(props);
    return null;
  },
}));

vi.mock("@/features/FullScreenAppWrapper.tsx", () => ({
  FullScreenAppWrapper: ({
    children,
  }: {
    children: (host: unknown, loading: boolean) => React.ReactNode;
  }) =>
    children(
      { id: 1, name: "web-01", username: "alice", ip: "10.0.0.1" },
      false,
    ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const { default: TerminalApp } =
  await import("@/features/terminal/TerminalApp");

describe("the tmux monitor's pop-out attach", () => {
  it("asks the SERVER to make the session the shell, and never types an attach command", () => {
    terminalProps.length = 0;
    render(<TerminalApp hostId="1" tmuxSession="web-01 [sentry-update]" />);

    const props = terminalProps.at(-1)!;

    // The server verb: `new-session -A -s <name>` becomes the shell, so there is nothing to
    // nest.
    expect(props.tmuxAttachSession).toBe("web-01 [sentry-update]");

    // And nothing is typed. A shell that is already a tmux client refuses a nested attach.
    expect(props.executeCommand).toBeUndefined();
  });

  it("opens an ordinary shell when no session was requested", () => {
    terminalProps.length = 0;
    render(<TerminalApp hostId="1" />);

    const props = terminalProps.at(-1)!;
    expect(props.tmuxAttachSession).toBeUndefined();
    expect(props.executeCommand).toBeUndefined();
  });
});
