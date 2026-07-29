import { AxiosError } from "axios";
import {
  authApi,
  handleApiError,
  isElectron,
  markUserAuthenticated,
} from "@/main-axios";
import type { AuthResponse } from "@/main-axios";

// ALERTS
// ============================================================================

export async function setupTOTP(): Promise<{
  secret: string;
  qr_code: string;
}> {
  try {
    const response = await authApi.post("/users/totp/setup");
    return response.data;
  } catch (error) {
    handleApiError(error as AxiosError, "setup TOTP");
    throw error;
  }
}

export async function enableTOTP(
  totp_code: string,
): Promise<{ message: string; backup_codes: string[] }> {
  try {
    const response = await authApi.post("/users/totp/enable", { totp_code });
    return response.data;
  } catch (error) {
    handleApiError(error as AxiosError, "enable TOTP");
    throw error;
  }
}

export async function disableTOTP(
  password?: string,
  totp_code?: string,
): Promise<{ message: string }> {
  try {
    const response = await authApi.post("/users/totp/disable", {
      password,
      totp_code,
    });
    return response.data;
  } catch (error) {
    handleApiError(error as AxiosError, "disable TOTP");
    throw error;
  }
}

export async function verifyTOTPLogin(
  temp_token: string,
  totp_code: string,
  rememberMe: boolean = false,
): Promise<AuthResponse> {
  try {
    const response = await authApi.post("/users/totp/verify-login", {
      temp_token,
      totp_code,
      rememberMe,
    });

    const isInIframe =
      typeof window !== "undefined" && window.self !== window.top;

    if (isInIframe && isElectron() && response.data.success) {
      try {
        window.parent.postMessage(
          {
            type: "AUTH_SUCCESS",
            source: "totp_verify",
            platform: "desktop",
            timestamp: Date.now(),
          },
          window.location.origin,
        );
      } catch (e) {
        console.error("[main-axios] Error posting message to parent:", e);
      }
    }

    if (response.data.success) {
      markUserAuthenticated();
    }

    return response.data;
  } catch (error) {
    handleApiError(error as AxiosError, "verify TOTP login");
    throw error;
  }
}

export async function generateBackupCodes(
  password?: string,
  totp_code?: string,
): Promise<{ backup_codes: string[] }> {
  try {
    const response = await authApi.post("/users/totp/backup-codes", {
      password,
      totp_code,
    });
    return response.data;
  } catch (error) {
    handleApiError(error as AxiosError, "generate backup codes");
    throw error;
  }
}

export async function getUserAlerts(): Promise<{
  alerts: Array<Record<string, unknown>>;
}> {
  try {
    const response = await authApi.get(`/alerts`);
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch user alerts");
    throw error;
  }
}

export async function dismissAlert(
  alertId: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/alerts/dismiss", { alertId });
    return response.data;
  } catch (error) {
    handleApiError(error, "dismiss alert");
    throw error;
  }
}

// ============================================================================
// UPDATES & RELEASES
// ============================================================================

export async function getReleasesRSS(
  perPage: number = 100,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.get(`/releases/rss?per_page=${perPage}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch releases RSS");
  }
}

/**
 * `GET /version`. Two shapes, distinguished by `status`: the full payload when the update check
 * reached GitHub, and a `status: "update_check_disabled"` reduction (local version + build time)
 * when it is switched off or unreachable. Optional fields cover the reduced form.
 *
 * Typed rather than left as `Record<string, unknown>` because callers read fields off it —
 * `Record<string, unknown>` makes every one of those an `unknown`, which is where a good share of
 * this project's type errors come from, and it silently permits misspelling a key.
 */
export type VersionInfo = {
  status: "up_to_date" | "requires_update" | "beta" | "update_check_disabled";
  localVersion: string;
  buildTime: string;
  version?: string;
  remoteVersion?: string;
  latest_release?: {
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
  };
  cached?: boolean;
};

/** The three states the version badge can show. `update_check_disabled` is not one of them. */
export type VersionBadgeStatus = "up_to_date" | "requires_update" | "beta";

/**
 * Map a wire status onto the badge.
 *
 * Outbound update checks are OFF by default in this port (`config :termelix,
 * :update_check_enabled`), so `update_check_disabled` is the ordinary case rather than an edge
 * one, and it must read as "stable" — there is no newer version known, which is exactly what the
 * badge says. It used to land there only by falling off the end of a ternary chain, while the
 * state's own type claimed the value could not occur.
 */
export function versionBadgeStatus(
  status?: VersionInfo["status"],
): VersionBadgeStatus {
  return status === "beta" || status === "requires_update"
    ? status
    : "up_to_date";
}

export async function getVersionInfo(checkRemote = true): Promise<VersionInfo> {
  try {
    const response = await authApi.get(
      `/version${checkRemote ? "" : "?checkRemote=false"}`,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch version info");
  }
}

// ============================================================================
// DATABASE HEALTH
// ============================================================================

export async function getDatabaseHealth(): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.get("/health");
    return response.data;
  } catch (error) {
    handleApiError(error, "check database health");
  }
}

// ============================================================================
