import { authApi, handleApiError } from "@/main-axios";
import type { UserInfo } from "@/main-axios";

// USER MANAGEMENT
// ============================================================================

export async function getUserList(): Promise<{ users: UserInfo[] }> {
  try {
    const response = await authApi.get("/users/list");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch user list");
  }
}

export async function getSessions(): Promise<{
  sessions: {
    id: string;
    userId: string;
    username?: string;
    deviceType: string;
    deviceInfo: string;
    createdAt: string;
    expiresAt: string;
    lastActiveAt: string;
    isRevoked?: boolean;
    isCurrentSession?: boolean;
  }[];
}> {
  try {
    const response = await authApi.get("/users/sessions");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch sessions");
  }
}

export async function revokeSession(
  sessionId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await authApi.delete(`/users/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "revoke session");
  }
}

export async function revokeAllUserSessions(
  userId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await authApi.post("/users/sessions/revoke-all", {
      targetUserId: userId,
      exceptCurrent: false,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "revoke all user sessions");
  }
}

/**
 * Agent credentials — `tmx_` keys that let an agent drive tmux on named hosts.
 *
 * These functions used to point at `/users/api-keys`, which does not exist on this server: the
 * path is a leftover from the Node implementation, so every call 404'd and the entire API-key
 * UI was dead in a way that looked like an ordinary request failure. The real routes are
 * `/api-keys`, and the shapes below are the ones `TermelixWeb.ApiKeyController` actually
 * returns.
 *
 * Two differences from the old client are deliberate server policy, not oversights:
 *
 *   * **A key is always the caller's own.** There is no `userId` parameter, because minting a
 *     credential for someone else is not something the server offers. The old signature took
 *     one and the admin UI passed another user's id, which could only ever have produced a key
 *     belonging to whoever was logged in.
 *   * **Scopes are mandatory.** A key with no scopes has no authority, so the server rejects
 *     the request rather than issuing something inert. Fixing only the path would still have
 *     failed every create with a 400.
 */
export interface ApiKey {
  id: string;
  name: string;
  /** The visible leading characters. The rest is stored only as a hash. */
  keyPrefix: string;
  scopes: string[];
  /** Empty means every host the owner can reach; otherwise the key is confined to these. */
  hostIds: number[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

export interface ApiKeyList {
  keys: ApiKey[];
  /** Offered by the server rather than hard-coded, so a new scope needs no client release. */
  availableScopes: string[];
}

export interface CreatedApiKey {
  key: ApiKey;
  /**
   * The plaintext token, which exists exactly once — here. The server keeps only a SHA-256 of
   * it and cannot return it again, so a UI that fails to show it has silently destroyed the
   * credential it just created.
   */
  token: string;
  warning: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  /** Omit or leave empty for "every host I can reach". */
  hostIds?: number[];
  expiresAt?: string | null;
}

export async function createApiKey(
  request: CreateApiKeyRequest,
): Promise<CreatedApiKey> {
  try {
    const response = await authApi.post("/api-keys", {
      name: request.name,
      scopes: request.scopes,
      hostIds: request.hostIds ?? [],
      expiresAt: request.expiresAt ?? null,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "create API key");
  }
}

export async function getApiKeys(): Promise<ApiKeyList> {
  try {
    const response = await authApi.get("/api-keys");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch API keys");
  }
}

export async function deleteApiKey(keyId: string): Promise<{ ok: boolean }> {
  try {
    const response = await authApi.delete(`/api-keys/${keyId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "delete API key");
  }
}

export async function makeUserAdmin(
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/users/make-admin", { userId });
    return response.data;
  } catch (error) {
    handleApiError(error, "make user admin");
  }
}

export async function removeAdminStatus(
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/users/remove-admin", { userId });
    return response.data;
  } catch (error) {
    handleApiError(error, "remove admin status");
  }
}

export async function deleteUser(
  username: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.delete("/users/delete-user", {
      data: { username },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "delete user");
  }
}

export async function deleteAccount(
  password: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.delete("/users/delete-account", {
      data: { password },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "delete account");
  }
}

// Raw axios errors propagate here so callers can detect the 409
// DATA_WIPE_REQUIRED code and re-submit with confirmDataWipe.
export async function adminResetUserPassword(
  userId: string,
  newPassword: string,
  confirmDataWipe = false,
): Promise<{ message: string; dataWiped?: boolean }> {
  const response = await authApi.post("/users/admin/reset-password", {
    userId,
    newPassword,
    confirmDataWipe,
  });
  return response.data;
}

export async function adminDisableUserTotp(
  userId: string,
): Promise<{ message: string }> {
  try {
    const response = await authApi.post("/users/admin/totp/disable", {
      userId,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "disable user TOTP");
  }
}

// The cross-user export returns another user's decrypted hosts and credentials, so the server
// requires the admin's own password at request time — `isAdmin` alone is a standing capability
// that a stolen session or an unattended browser would inherit. It goes in a header, not a query
// param: this is a GET, and `?password=` lands in every reverse-proxy access log.
export async function adminExportUserData(
  userId: string,
  reauthPassword: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.get(
      `/users/admin/export/${encodeURIComponent(userId)}`,
      {
        timeout: 120000,
        headers: { "x-reauth-password": reauthPassword },
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "export user data");
  }
}

export async function updateRegistrationAllowed(
  allowed: boolean,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.patch("/users/registration-allowed", {
      allowed,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "update registration allowed");
  }
}

export async function getOidcAutoProvision(): Promise<{ enabled: boolean }> {
  try {
    const response = await authApi.get("/users/oidc-auto-provision");
    return response.data;
  } catch (error) {
    handleApiError(error, "check OIDC auto-provision status");
  }
}

export async function updateOidcAutoProvision(
  enabled: boolean,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.patch("/users/oidc-auto-provision", {
      enabled,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "update OIDC auto-provision");
  }
}

export async function getOidcSilentLoginDefault(): Promise<{
  enabled: boolean;
}> {
  try {
    const response = await authApi.get("/users/oidc-silent-login-default");
    return response.data;
  } catch (error) {
    handleApiError(error, "get OIDC silent login default");
  }
}

export async function updateOidcSilentLoginDefault(
  enabled: boolean,
): Promise<{ enabled: boolean }> {
  try {
    const response = await authApi.patch("/users/oidc-silent-login-default", {
      enabled,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "update OIDC silent login default");
  }
}

export async function updatePasswordLoginAllowed(
  allowed: boolean,
): Promise<{ allowed: boolean }> {
  try {
    const response = await authApi.patch("/users/password-login-allowed", {
      allowed,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "update password login allowed");
  }
}

export async function getPasswordResetAllowed(): Promise<boolean> {
  try {
    const response = await authApi.get("/users/password-reset-allowed");
    return response.data.allowed;
  } catch (error) {
    handleApiError(error, "get password reset allowed");
  }
}

export async function updatePasswordResetAllowed(
  allowed: boolean,
): Promise<{ allowed: boolean }> {
  try {
    const response = await authApi.patch("/users/password-reset-allowed", {
      allowed,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "update password reset allowed");
  }
}

export async function getCommandHistoryEnabled(): Promise<{
  enabled: boolean;
}> {
  try {
    const response = await authApi.get("/users/command-history-enabled");
    return response.data;
  } catch (error) {
    handleApiError(error, "get command history enabled");
  }
}

export async function updateCommandHistoryEnabled(
  enabled: boolean,
): Promise<{ enabled: boolean }> {
  try {
    const response = await authApi.patch("/users/command-history-enabled", {
      enabled,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "update command history enabled");
  }
}

export async function updateOIDCConfig(
  config: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/users/oidc-config", config);
    return response.data;
  } catch (error) {
    handleApiError(error, "update OIDC config");
  }
}

export async function disableOIDCConfig(): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.delete("/users/oidc-config");
    return response.data;
  } catch (error) {
    handleApiError(error, "disable OIDC config");
  }
}

// ============================================================================
