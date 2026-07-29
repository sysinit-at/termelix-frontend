export type BellStyle = "none" | "sound" | "visual" | "both";

/** The subset of the xterm terminal this needs — keeps the tests free of a real terminal. */
export interface BellCapableTerminal {
  onBell(listener: () => void): { dispose(): void };
}

const FLASH_CLASS = "termelix-bell-flash";
const FLASH_MS = 120;

/**
 * Make the terminal bell work.
 *
 * xterm removed `bellStyle` from `ITerminalOptions` in v5, and this SPA is on v6, so the option
 * the host editor writes was being assigned to a property nothing reads: users could pick "sound"
 * or "visual" and the bell did nothing at all. `onBell` is the supported replacement — the styles
 * have to be implemented here rather than configured.
 *
 * The style is read through a callback at fire time, not captured, so changing it in the host
 * editor takes effect on the open terminal without re-attaching.
 */
export function attachBell(
  terminal: BellCapableTerminal,
  element: HTMLElement | null,
  getStyle: () => BellStyle | undefined,
  audio: { play: () => void } = { play: playBeep },
): () => void {
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  const subscription = terminal.onBell(() => {
    const style = getStyle() ?? "none";
    if (style === "none") return;

    if (style === "sound" || style === "both") audio.play();

    if ((style === "visual" || style === "both") && element) {
      element.classList.add(FLASH_CLASS);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(
        () => element.classList.remove(FLASH_CLASS),
        FLASH_MS,
      );
    }
  });

  return () => {
    clearTimeout(flashTimer);
    element?.classList.remove(FLASH_CLASS);
    subscription.dispose();
  };
}

/**
 * A short beep from WebAudio rather than an audio asset: nothing to bundle, nothing to fetch, and
 * it still works on an air-gapped install. Failures are swallowed — a browser that blocks audio
 * until it sees a gesture must not take the terminal down with it.
 */
function playBeep(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const context = new Ctor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain).connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
    oscillator.onended = () => void context.close();
  } catch {
    // No audio available. The visual style still applies if it was asked for.
  }
}
