import { authApi, handleApiError, statsApi } from "@/main-axios";

// GLOBAL MONITORING SETTINGS
// ============================================================================

export async function getGlobalMonitoringSettings(): Promise<{
  statusCheckInterval: number;
  metricsInterval: number;
}> {
  try {
    const response = await statsApi.get("/global-settings");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch global monitoring settings");
  }
}

export async function updateGlobalMonitoringSettings(settings: {
  statusCheckInterval?: number;
  metricsInterval?: number;
}): Promise<void> {
  try {
    await statsApi.post("/global-settings", settings);
  } catch (error) {
    handleApiError(error, "update global monitoring settings");
  }
}

// ============================================================================
// LOG LEVEL SETTINGS
// ============================================================================

export async function getLogLevel(): Promise<{ level: string }> {
  try {
    const response = await authApi.get("/users/log-level");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch log level");
  }
}

export async function updateLogLevel(level: string): Promise<void> {
  try {
    await authApi.patch("/users/log-level", { level });
  } catch (error) {
    handleApiError(error, "update log level");
  }
}

// ============================================================================
// SESSION TIMEOUT SETTINGS
// ============================================================================

export async function getSessionTimeout(): Promise<{ timeoutHours: number }> {
  try {
    const response = await authApi.get("/users/session-timeout");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch session timeout");
  }
}

export async function updateSessionTimeout(
  timeoutHours: number,
): Promise<void> {
  try {
    await authApi.patch("/users/session-timeout", { timeoutHours });
  } catch (error) {
    handleApiError(error, "update session timeout");
  }
}

// ============================================================================
// TAILSCALE SETTINGS
// ============================================================================

export async function getTailscaleSettings(): Promise<{
  apiKey: string;
  hasApiKey: boolean;
}> {
  try {
    const response = await authApi.get("/users/tailscale-settings");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch Tailscale settings");
  }
}

export async function updateTailscaleSettings(
  apiKey: string,
): Promise<{ hasApiKey: boolean }> {
  try {
    const response = await authApi.patch("/users/tailscale-settings", {
      apiKey,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "update Tailscale settings");
  }
}

export async function getTailscaleDevices(): Promise<{
  devices: Array<{
    id: string;
    name: string;
    hostname: string;
    addresses: string[];
    os: string;
    lastSeen: string;
  }>;
  hasApiKey: boolean;
}> {
  try {
    const response = await authApi.get("/tailscale/devices");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch Tailscale devices");
  }
}

// ============================================================================
// HOST DEFAULTS SETTINGS
// ============================================================================

export type HostDefaults = {
  useSocks5?: boolean;
  socks5Host?: string;
  socks5Port?: number;
  socks5Username?: string;
  socks5Password?: string;
  credentialId?: number | null;
  metricsEnabled?: boolean;
  statusCheckEnabled?: boolean;
  fontSize?: number;
  fontFamily?: string;
  theme?: string;
  cursorStyle?: string;
  cursorBlink?: boolean;
  enableSessionLogging?: boolean;
  enableCommandHistory?: boolean;
};

export async function getHostDefaults(): Promise<HostDefaults> {
  try {
    const response = await authApi.get("/users/host-defaults");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch host defaults");
  }
}

export async function updateHostDefaults(
  defaults: HostDefaults,
): Promise<HostDefaults> {
  try {
    const response = await authApi.patch("/users/host-defaults", defaults);
    return response.data;
  } catch (error) {
    handleApiError(error, "update host defaults");
  }
}

// ============================================================================
// ERROR REPORTING (Sentry opt-in — admin only; off until explicitly enabled)

export async function getErrorReporting(): Promise<{
  enabled: boolean;
  decided: boolean;
  /** False when the server has no Sentry DSN configured. */
  available: boolean;
}> {
  try {
    const response = await authApi.get("/users/error-reporting");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch error reporting setting");
  }
}

export async function setErrorReporting(enabled: boolean): Promise<{
  enabled: boolean;
  decided: boolean;
  available: boolean;
}> {
  try {
    const response = await authApi.post("/users/error-reporting", { enabled });
    return response.data;
  } catch (error) {
    handleApiError(error, "update error reporting setting");
  }
}
