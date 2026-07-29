import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { attachBell, type BellStyle } from "./terminal-bell";

function fakeTerminal() {
  let listener: (() => void) | undefined;
  const dispose = vi.fn(() => {
    listener = undefined;
  });
  return {
    terminal: {
      onBell(fn: () => void) {
        listener = fn;
        return { dispose };
      },
    },
    ring: () => listener?.(),
    dispose,
    get attached() {
      return listener !== undefined;
    },
  };
}

describe("terminal bell", () => {
  let style: BellStyle;
  const audio = { play: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    audio.play.mockClear();
    style = "none";
  });

  afterEach(() => vi.useRealTimers());

  function setup(element: HTMLElement | null = document.createElement("div")) {
    const term = fakeTerminal();
    const detach = attachBell(term.terminal, element, () => style, audio);
    return { ...term, element, detach };
  }

  it("does nothing on 'none'", () => {
    const { ring, element } = setup();
    ring();
    expect(audio.play).not.toHaveBeenCalled();
    expect(element?.className).toBe("");
  });

  it("plays on 'sound' without flashing", () => {
    style = "sound";
    const { ring, element } = setup();
    ring();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(element?.className).toBe("");
  });

  it("flashes on 'visual' without playing, and clears itself", () => {
    style = "visual";
    const { ring, element } = setup();
    ring();
    expect(audio.play).not.toHaveBeenCalled();
    expect(element?.classList.contains("termelix-bell-flash")).toBe(true);

    vi.advanceTimersByTime(200);
    expect(element?.classList.contains("termelix-bell-flash")).toBe(false);
  });

  it("does both on 'both'", () => {
    style = "both";
    const { ring, element } = setup();
    ring();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(element?.classList.contains("termelix-bell-flash")).toBe(true);
  });

  it("follows a style changed after attaching", () => {
    // The host editor can change this while the terminal is open; the style is read at fire time
    // rather than captured, so no re-attach is needed.
    const { ring } = setup();
    ring();
    expect(audio.play).not.toHaveBeenCalled();

    style = "sound";
    ring();
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it("restarts the flash timer rather than ending it early on a second bell", () => {
    style = "visual";
    const { ring, element } = setup();
    ring();
    vi.advanceTimersByTime(100);
    ring();
    vi.advanceTimersByTime(100);

    // The first bell's timer would have fired by now; the second must still be flashing.
    expect(element?.classList.contains("termelix-bell-flash")).toBe(true);
    vi.advanceTimersByTime(100);
    expect(element?.classList.contains("termelix-bell-flash")).toBe(false);
  });

  it("survives a missing element", () => {
    style = "both";
    const { ring } = setup(null);
    expect(() => ring()).not.toThrow();
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it("detaches cleanly mid-flash", () => {
    style = "visual";
    const { ring, element, detach, dispose } = setup();
    ring();
    detach();

    expect(dispose).toHaveBeenCalled();
    expect(element?.classList.contains("termelix-bell-flash")).toBe(false);
    vi.advanceTimersByTime(200);
    expect(element?.classList.contains("termelix-bell-flash")).toBe(false);
  });
});
