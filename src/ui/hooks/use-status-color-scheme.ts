import { useState, useEffect } from "react";

export type StatusColorScheme = "accent" | "status";

/**
 * Semantic by default: green is up, red is down.
 *
 * The default used to be "accent", which painted every online host in the brand colour and every
 * offline one in grey. That reads as decoration rather than state — the same orange as the logo,
 * the buttons and the active tab — and it makes "down" the absence of a colour rather than a
 * colour of its own. The accent scheme is still there for anyone who preferred it.
 */
const DEFAULT_SCHEME: StatusColorScheme = "status";

export function useStatusColorScheme(): StatusColorScheme {
  const [scheme, setScheme] = useState<StatusColorScheme>(
    () =>
      (localStorage.getItem("statusColorScheme") as StatusColorScheme) ??
      DEFAULT_SCHEME,
  );

  useEffect(() => {
    const handler = () => {
      setScheme(
        (localStorage.getItem("statusColorScheme") as StatusColorScheme) ??
          DEFAULT_SCHEME,
      );
    };
    window.addEventListener("statusColorSchemeChanged", handler);
    return () =>
      window.removeEventListener("statusColorSchemeChanged", handler);
  }, []);

  return scheme;
}

/** Returns Tailwind class names for a status dot/stripe. */
export function getStatusClasses(
  online: boolean,
  scheme: StatusColorScheme,
  variant: "dot" | "stripe" | "badge",
  loading = false,
): string {
  if (loading) {
    if (scheme === "status") {
      if (variant === "dot") return "bg-yellow-400 animate-pulse";
      if (variant === "stripe") return "bg-yellow-400/40 animate-pulse";
      return "border-yellow-400/40 text-yellow-400 bg-yellow-400/10 animate-pulse";
    }
    if (variant === "dot") return "bg-muted-foreground/40 animate-pulse";
    if (variant === "stripe") return "bg-muted-foreground/20 animate-pulse";
    return "border-border/50 text-muted-foreground/50 bg-muted/20 animate-pulse";
  }
  if (scheme === "status") {
    if (variant === "dot") return online ? "bg-emerald-500" : "bg-red-500";
    if (variant === "stripe")
      return online ? "bg-emerald-500" : "bg-red-500/40";
    // badge
    return online
      ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
      : "border-red-500/40 text-red-500 bg-red-500/10";
  }
  // accent scheme
  if (variant === "dot")
    return online ? "bg-accent-brand" : "bg-muted-foreground/25";
  if (variant === "stripe")
    return online ? "bg-accent-brand" : "bg-transparent";
  // badge
  return online
    ? "border-accent-brand/40 text-accent-brand bg-accent-brand/10"
    : "border-border/50 text-muted-foreground/60 bg-muted/30";
}
