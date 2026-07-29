import { TERMINAL_THEMES } from "@/lib/terminal-themes";
import type { Host } from "@/types/ui-types";
import type { SSHHostData } from "@/types";
import type { HostDefaults } from "@/api/settings-api";

type HostSocks5ProxyNode = NonNullable<Host["socks5ProxyChain"]>[number];

export type HostAuthType = Host["authType"];
export type HostCursorStyle = NonNullable<
  Host["terminalConfig"]
>["cursorStyle"];
export type HostBellStyle = NonNullable<Host["terminalConfig"]>["bellStyle"];
export type HostBackspaceMode = NonNullable<
  Host["terminalConfig"]
>["backspaceMode"];
export type HostFastScrollModifier = NonNullable<
  Host["terminalConfig"]
>["fastScrollModifier"];

export function createHostEditorForm(
  host: Host | null,
  defaults?: HostDefaults,
) {
  const d = host ? undefined : defaults;
  const rawTheme = host?.terminalConfig?.theme ?? d?.theme;
  const normalizedTheme =
    !rawTheme ||
    [
      "Termelix Dark",
      "Termelix Light",
      "termelixDark",
      "termelixLight",
    ].includes(rawTheme)
      ? "termelix"
      : rawTheme === "custom" || TERMINAL_THEMES[rawTheme]
        ? rawTheme
        : "termelix";

  return {
    name: host?.name ?? "",
    ip: host?.ip ?? "",
    username: host?.username ?? (host ? "" : "root"),
    sshPort: host?.sshPort ?? host?.port ?? 22,
    authType: host?.authType ?? "password",
    useWarpgate: host?.useWarpgate ?? false,
    password: host?.password ?? "",
    key: host?.key ?? (host?.hasKey ? "existing_key" : ""),
    keyPassword: host?.hasKeyPassword
      ? "existing_key_password"
      : (host?.keyPassword ?? ""),
    keyType: host?.keyType ?? "auto",
    keySubTab: "paste" as "paste" | "upload",
    credentialId:
      host?.credentialId ??
      (d?.credentialId != null ? String(d.credentialId) : ""),
    vaultProfileId: host?.vaultProfileId ?? "",
    overrideCredentialUsername: host?.overrideCredentialUsername ?? false,
    folder: host?.folder ?? "",
    tags: host?.tags ?? ([] as string[]),
    tagInput: "",
    notes: host?.notes ?? "",
    pin: host?.pin ?? false,
    macAddress: host?.macAddress ?? "",
    wolBroadcastAddress: host?.wolBroadcastAddress ?? "",
    useSocks5: host?.useSocks5 ?? d?.useSocks5 ?? false,
    socks5Host: host?.socks5Host ?? d?.socks5Host ?? "",
    socks5Port: host?.socks5Port ?? d?.socks5Port ?? 1080,
    socks5Username: host?.socks5Username ?? d?.socks5Username ?? "",
    socks5Password: host?.socks5Password ?? d?.socks5Password ?? "",
    socks5ProxyMode: ((host?.socks5ProxyChain ?? []).length > 0
      ? "chain"
      : "single") as "single" | "chain",
    socks5ProxyChain: (host?.socks5ProxyChain ?? []) as HostSocks5ProxyNode[],
    enableTerminal: host?.enableTerminal ?? true,
    enableSessionLogging:
      host?.enableSessionLogging ?? d?.enableSessionLogging ?? true,
    enableCommandHistory:
      host?.enableCommandHistory ?? d?.enableCommandHistory ?? true,
    enableFileManager: host?.enableFileManager ?? false,
    scpLegacy: host?.scpLegacy ?? false,
    enableTmuxMonitor: host?.enableTmuxMonitor ?? true,
    enableTunnel: host?.enableTunnel ?? false,
    defaultPath: host?.defaultPath ?? "/",
    forceKeyboardInteractive: host?.forceKeyboardInteractive ?? false,
    fontSize: host?.terminalConfig?.fontSize ?? d?.fontSize ?? 14,
    fontFamily:
      host?.terminalConfig?.fontFamily ??
      d?.fontFamily ??
      "Caskaydia Cove Nerd Font Mono",
    theme: normalizedTheme,
    cursorStyle: (host?.terminalConfig?.cursorStyle ??
      d?.cursorStyle ??
      "bar") as "block" | "underline" | "bar",
    cursorBlink: host?.terminalConfig?.cursorBlink ?? d?.cursorBlink ?? true,
    scrollback: host?.terminalConfig?.scrollback ?? 10000,
    letterSpacing: host?.terminalConfig?.letterSpacing ?? 0,
    lineHeight: host?.terminalConfig?.lineHeight ?? 1.0,
    bellStyle: (host?.terminalConfig?.bellStyle ?? "none") as
      | "none"
      | "sound"
      | "visual"
      | "both",
    rightClickSelectsWord: host?.terminalConfig?.rightClickSelectsWord ?? false,
    fastScrollModifier: (host?.terminalConfig?.fastScrollModifier ?? "alt") as
      | "alt"
      | "ctrl"
      | "shift",
    fastScrollSensitivity: host?.terminalConfig?.fastScrollSensitivity ?? 5,
    minimumContrastRatio: host?.terminalConfig?.minimumContrastRatio ?? 1,
    backspaceMode: (host?.terminalConfig?.backspaceMode ?? "normal") as
      | "normal"
      | "control-h",
    startupSnippetId: host?.terminalConfig?.startupSnippetId ?? null,
    moshCommand: host?.terminalConfig?.moshCommand ?? "",
    agentForwarding: host?.terminalConfig?.agentForwarding ?? false,
    autoMosh: host?.terminalConfig?.autoMosh ?? false,
    autoTmux: host?.terminalConfig?.autoTmux ?? false,
    keepaliveInterval: host?.terminalConfig?.keepaliveInterval ?? 60,
    keepaliveCountMax: host?.terminalConfig?.keepaliveCountMax ?? 5,
    backgroundImage: host?.terminalConfig?.backgroundImage ?? "",
    backgroundImageOpacity:
      host?.terminalConfig?.backgroundImageOpacity ?? 0.15,
    customThemeColors: host?.terminalConfig?.customThemeColors ?? null,
    allowLegacyAlgorithms: host?.terminalConfig?.allowLegacyAlgorithms ?? true,
    linkClickBehavior: (host?.terminalConfig?.linkClickBehavior ??
      "default") as "default" | "confirm" | "direct",
    agentSocketPath: host?.terminalConfig?.agentSocketPath ?? "",
    useSSHTitle: host?.terminalConfig?.useSSHTitle ?? false,
    syntaxHighlighting: host?.terminalConfig?.syntaxHighlighting ?? true,
    syntaxHighlightingOptions: {
      logLevels:
        host?.terminalConfig?.syntaxHighlightingOptions?.logLevels ?? true,
      paths: host?.terminalConfig?.syntaxHighlightingOptions?.paths ?? true,
      timestamps:
        host?.terminalConfig?.syntaxHighlightingOptions?.timestamps ?? true,
      ipAddresses:
        host?.terminalConfig?.syntaxHighlightingOptions?.ipAddresses ?? true,
      urls: host?.terminalConfig?.syntaxHighlightingOptions?.urls ?? true,
      numbers: host?.terminalConfig?.syntaxHighlightingOptions?.numbers ?? true,
    },
    environmentVariables:
      host?.terminalConfig?.environmentVariables ??
      ([] as { key: string; value: string }[]),
    serverTunnels: host?.serverTunnels ?? ([] as Host["serverTunnels"]),
    jumpHosts: host?.jumpHosts ?? ([] as { hostId: string }[]),
    portKnockSequence:
      host?.portKnockSequence ??
      ([] as { port: number; protocol: "tcp" | "udp"; delay: number }[]),
    quickActions:
      host?.quickActions ?? ([] as { name: string; snippetId: string }[]),
    statsConfig: host?.statsConfig ?? {
      statusCheckEnabled: d?.statusCheckEnabled ?? true,
      statusCheckInterval: 60,
      useGlobalStatusInterval: true,
      metricsEnabled: d?.metricsEnabled ?? true,
      metricsInterval: 30,
      useGlobalMetricsInterval: true,
      enabledWidgets: [
        "cpu",
        "memory",
        "disk",
        "network",
        "uptime",
        "system",
        "login_stats",
        "processes",
        "ports",
        "firewall",
        "temperature",
      ],
    },
  };
}

export type HostEditorForm = ReturnType<typeof createHostEditorForm>;

export function buildHostEditorPayload(form: HostEditorForm): SSHHostData {
  // Only carry the auth fields that belong to the selected method so switching
  // method (e.g. on a cloned host) doesn't leave a stale credentialId or key
  // behind that the backend would keep resolving.
  const usesCredential = form.authType === "credential";
  const usesKey = form.authType === "key";
  const usesPassword = form.authType === "password";
  const usesAgent = form.authType === "agent";

  return {
    connectionType: "ssh",
    name: form.name,
    ip: form.ip,
    port: Number(form.sshPort),
    username: form.username,
    folder: form.folder,
    tags: form.tags,
    pin: form.pin,
    authType: form.authType,
    useWarpgate: form.useWarpgate,
    password:
      usesPassword || usesKey || usesCredential ? form.password || null : null,
    key: usesKey
      ? form.key === "existing_key"
        ? undefined
        : form.key || null
      : null,
    keyPassword: usesKey
      ? form.keyPassword === "existing_key_password"
        ? undefined
        : form.keyPassword || null
      : null,
    keyType: usesKey && form.keyType !== "auto" ? form.keyType : null,
    credentialId:
      usesCredential && form.credentialId ? Number(form.credentialId) : null,
    vaultProfileId: form.vaultProfileId ? Number(form.vaultProfileId) : null,
    overrideCredentialUsername: form.overrideCredentialUsername,
    notes: form.notes,
    macAddress: form.macAddress || null,
    wolBroadcastAddress: form.wolBroadcastAddress || null,
    enableTerminal: form.enableTerminal,
    enableSessionLogging: form.enableSessionLogging,
    enableCommandHistory: form.enableCommandHistory,
    enableTunnel: form.enableTunnel,
    enableFileManager: form.enableFileManager,
    scpLegacy: form.scpLegacy,
    enableTmuxMonitor: form.enableTmuxMonitor,
    defaultPath: form.defaultPath || "/",
    useSocks5: form.useSocks5,
    socks5Host:
      form.socks5ProxyMode === "single" ? form.socks5Host || null : null,
    socks5Port:
      form.socks5ProxyMode === "single" ? form.socks5Port || null : null,
    socks5Username:
      form.socks5ProxyMode === "single" ? form.socks5Username || null : null,
    socks5Password:
      form.socks5ProxyMode === "single" ? form.socks5Password || null : null,
    socks5ProxyChain:
      form.socks5ProxyMode === "chain" ? form.socks5ProxyChain : null,
    // SSH is the only protocol, and `connectionType` is server-pinned to "ssh" anyway.
    // Pinning this true is also the escape hatch for legacy rows that stored
    // `connection_type = "ssh"` with `enable_ssh = 0` (SSH off, RDP/VNC on): the server-side
    // fold deliberately leaves those alone, so re-saving in the editor is the only way to
    // make them openable again.
    enableSsh: true,
    sshPort: Number(form.sshPort),
    forceKeyboardInteractive: form.forceKeyboardInteractive,
    jumpHosts: form.jumpHosts,
    portKnockSequence: form.portKnockSequence,
    tunnelConnections: form.serverTunnels,
    quickActions: form.quickActions.map((a) => ({
      name: a.name,
      snippetId: Number(a.snippetId),
    })),
    statsConfig: form.statsConfig,
    terminalConfig: {
      theme: form.theme,
      cursorBlink: form.cursorBlink,
      cursorStyle: form.cursorStyle,
      fontSize: Number(form.fontSize),
      fontFamily: form.fontFamily,
      scrollback: Number(form.scrollback),
      letterSpacing: Number(form.letterSpacing),
      lineHeight: Number(form.lineHeight),
      bellStyle: form.bellStyle,
      rightClickSelectsWord: form.rightClickSelectsWord,
      fastScrollModifier: form.fastScrollModifier,
      fastScrollSensitivity: Number(form.fastScrollSensitivity),
      minimumContrastRatio: Number(form.minimumContrastRatio),
      backspaceMode: form.backspaceMode,
      startupSnippetId: form.startupSnippetId ?? null,
      moshCommand: form.moshCommand || null,
      agentForwarding: form.agentForwarding,
      autoMosh: form.autoMosh,
      autoTmux: form.autoTmux,
      keepaliveInterval: Number(form.keepaliveInterval),
      keepaliveCountMax: Number(form.keepaliveCountMax),
      environmentVariables: form.environmentVariables,
      useSSHTitle: form.useSSHTitle,
      syntaxHighlighting: form.syntaxHighlighting,
      syntaxHighlightingOptions: form.syntaxHighlightingOptions,
      backgroundImage: form.backgroundImage || null,
      backgroundImageOpacity: Number(form.backgroundImageOpacity),
      customThemeColors:
        form.theme === "custom" ? form.customThemeColors : null,
      allowLegacyAlgorithms: form.allowLegacyAlgorithms,
      linkClickBehavior:
        form.linkClickBehavior !== "default"
          ? form.linkClickBehavior
          : undefined,
      agentSocketPath: usesAgent ? form.agentSocketPath || null : null,
    },
  };
}
