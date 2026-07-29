import type { Client } from "ssh2";
import type { Request } from "express";
import type { RefObject } from "react";

// ============================================================================
// SSO / AUTHENTICATION PROVIDER TYPES
// ============================================================================

export type SSOProviderType = "oidc" | "ldap" | "github" | "google";

export interface SSOProviderPublic {
  id: number;
  name: string;
  type: SSOProviderType;
  displayOrder: number;
}

export interface SSOProvider extends SSOProviderPublic {
  enabled: boolean;
  config: string | Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OIDCProviderConfig {
  client_id: string;
  client_secret: string;
  issuer_url: string;
  authorization_url: string;
  token_url: string;
  userinfo_url?: string;
  identifier_path: string;
  name_path: string;
  scopes: string;
  allowed_users?: string;
  admin_group?: string;
  group_claim?: string;
  ca_cert?: string;
}

export interface LDAPProviderConfig {
  host: string;
  port: number;
  useTLS: boolean;
  bindDN: string;
  bindPassword: string;
  userSearchBase: string;
  userSearchFilter: string;
  usernameAttribute: string;
  displayNameAttribute: string;
  groupSearchBase?: string;
  adminGroup?: string;
  allowedUsers?: string;
}

// ============================================================================
// HOST TYPES (SSH)
// ============================================================================

export type SSHAuthType =
  | "password"
  | "key"
  | "credential"
  | "none"
  | "opkssh"
  | "tailscale";

export interface HostFeatureFlags {
  enableTerminal: boolean; // SSH only
  enableTunnel: boolean; // SSH only
  enableFileManager: boolean; // SSH only
  enableTmuxMonitor: boolean; // SSH only
}

export interface JumpHost {
  hostId: number;
}

export interface QuickAction {
  name: string;
  snippetId: number;
}

export interface Host {
  id: number;
  name: string;
  ip: string;
  port: number;
  username: string;
  folder: string;
  tags: string[];
  pin: boolean;
  authType:
    | "password"
    | "key"
    | "credential"
    | "none"
    | "opkssh"
    | "tailscale"
    | "agent"
    | "vault";
  useWarpgate?: boolean;
  password?: string;
  key?: string;
  keyPassword?: string;
  keyType?: string;
  // Declared because `src/types` is shared with the retired Node backend in `src/backend`, whose
  // own schema has a `sudo_password` column and whose file-manager code reads this. Removing it
  // compiles fine for the SPA and breaks `npm run build`, which type-checks that tree —
  // `scripts/build-frontend.sh` runs only `vite build`, so nothing else notices.
  //
  // The ELIXIR server never returns it: it is in `@secret_fields`, no longer accepted on write,
  // and the column is nulled by migration 20260726210000. For any SPA code talking to this
  // server it is permanently `undefined` — use `hasSudoPassword` below. See
  // docs/BUG_REFERENCE.md in the server repo for why the feature behind it was removed.
  sudoPassword?: string;
  forceKeyboardInteractive?: boolean;

  autostartPassword?: string;
  autostartKey?: string;
  autostartKeyPassword?: string;

  credentialId?: number;
  vaultProfileId?: number | null;
  vaultProfile?: { id?: number | null };
  overrideCredentialUsername?: boolean;
  userId?: string;
  enableTerminal: boolean;
  enableSessionLogging: boolean;
  enableCommandHistory: boolean;
  enableTunnel: boolean;
  enableFileManager: boolean;
  scpLegacy?: boolean;
  enableTmuxMonitor: boolean;
  showTerminalInSidebar: boolean;
  showFileManagerInSidebar: boolean;
  showTunnelInSidebar: boolean;
  showServerStatsInSidebar: boolean;
  defaultPath: string;
  tunnelConnections: TunnelConnection[];
  jumpHosts?: JumpHost[];
  quickActions?: QuickAction[];
  statsConfig?: string | Record<string, unknown>;
  terminalConfig?: TerminalConfig;
  notes?: string;

  useSocks5?: boolean;
  socks5Host?: string;
  socks5Port?: number;
  socks5Username?: string;
  socks5Password?: string;
  socks5ProxyChain?: ProxyNode[];

  macAddress?: string;
  wolBroadcastAddress?: string;
  portKnockSequence?: Array<{
    port: number;
    protocol?: "tcp" | "udp";
    delay?: number;
  }>;

  connectionType?: "ssh";

  enableSsh?: boolean;
  sshPort?: number;
  createdAt: string;
  updatedAt: string;

  hasKey?: boolean;
  hasKeyPassword?: boolean;

  isShared?: boolean;
  permissionLevel?: "connect" | "view" | "edit" | "manage";
  sharedExpiresAt?: string;
  ownerUsername?: string;
}

export interface JumpHostData {
  hostId: number;
}

export interface QuickActionData {
  name: string;
  snippetId: number;
}

export interface ProxyNode {
  host: string;
  port: number;
  type: 4 | 5 | "http";
  username?: string;
  password?: string;
}

export interface HostData {
  name?: string;
  ip: string;
  port: number;
  username: string;
  folder?: string;
  tags?: string[];
  pin?: boolean;
  authType:
    | "password"
    | "key"
    | "credential"
    | "none"
    | "opkssh"
    | "tailscale"
    | "agent";
  useWarpgate?: boolean;
  password?: string;
  key?: File | string | null;
  keyPassword?: string;
  keyType?: string;
  credentialId?: number | null;
  overrideCredentialUsername?: boolean;
  enableTerminal?: boolean;
  enableSessionLogging?: boolean;
  enableCommandHistory?: boolean;
  enableTunnel?: boolean;
  enableFileManager?: boolean;
  scpLegacy?: boolean;
  enableTmuxMonitor?: boolean;
  showTerminalInSidebar?: boolean;
  showFileManagerInSidebar?: boolean;
  showTunnelInSidebar?: boolean;
  showServerStatsInSidebar?: boolean;
  defaultPath?: string;
  forceKeyboardInteractive?: boolean;
  tunnelConnections?: TunnelConnection[];
  jumpHosts?: JumpHostData[];
  quickActions?: QuickActionData[];
  statsConfig?: string | Record<string, unknown>;
  terminalConfig?: TerminalConfig;
  notes?: string;

  useSocks5?: boolean;
  socks5Host?: string;
  socks5Port?: number;
  socks5Username?: string;
  socks5Password?: string;
  socks5ProxyChain?: ProxyNode[];

  macAddress?: string;
  wolBroadcastAddress?: string;
  portKnockSequence?: Array<{
    port: number;
    protocol?: "tcp" | "udp";
    delay?: number;
  }>;

  connectionType?: "ssh";

  enableSsh?: boolean;
  sshPort?: number;
}

export type SSHHost = Host;
export type SSHHostData = HostData;

export interface SSHFolder {
  id: number;
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CREDENTIAL TYPES
// ============================================================================

export interface Credential {
  id: number;
  name: string;
  description?: string;
  folder?: string;
  tags: string[];
  authType: "password" | "key";
  username?: string;
  password?: string;
  key?: string;
  publicKey?: string;
  /** CA-signed certificate file content (e.g. id_ed25519-cert.pub) */
  certPublicKey?: string;
  /** True when a cert is stored but certPublicKey content is redacted in list responses */
  hasCertPublicKey?: boolean;
  keyPassword?: string;
  keyType?: string;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialBackend {
  id: number;
  userId: string;
  name: string;
  description: string | null;
  folder: string | null;
  tags: string;
  authType: "password" | "key";
  username: string | null;
  password: string | null;
  key: string;
  privateKey?: string;
  publicKey?: string;
  /** CA-signed certificate file content (e.g. id_ed25519-cert.pub) */
  certPublicKey?: string;
  keyPassword: string | null;
  keyType?: string;
  detectedKeyType: string;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialData {
  name: string;
  description?: string;
  folder?: string;
  tags: string[];
  authType: "password" | "key";
  username?: string;
  password?: string;
  key?: string;
  publicKey?: string;
  /** CA-signed certificate file content (e.g. id_ed25519-cert.pub) */
  certPublicKey?: string | null;
  keyPassword?: string;
  keyType?: string;
}

// ============================================================================
// TUNNEL TYPES
// ============================================================================

export type TunnelScope = "s2s" | "c2s";
export type TunnelMode = "local" | "remote" | "dynamic";

export interface TunnelConnection {
  scope?: TunnelScope;
  mode?: TunnelMode;
  tunnelType?: "local" | "remote";
  bindHost?: string;
  sourceHostId?: number;
  sourceHostName?: string;
  sourcePort: number;
  endpointPort: number;
  endpointHost?: string;
  targetHost?: string;

  endpointPassword?: string;
  endpointKey?: string;
  endpointKeyPassword?: string;
  endpointAuthType?: string;
  endpointKeyType?: string;

  maxRetries: number;
  retryInterval: number;
  autoStart: boolean;
}

export interface TunnelConfig {
  name: string;
  scope?: TunnelScope;
  mode?: TunnelMode;
  tunnelType?: "local" | "remote";
  bindHost?: string;
  targetHost?: string;

  sourceHostId: number;
  tunnelIndex: number;

  requestingUserId?: string;

  hostName: string;
  sourceIP: string;
  sourceSSHPort: number;
  sourceUsername: string;
  sourcePassword?: string;
  sourceAuthMethod: string;
  sourceSSHKey?: string;
  sourceKeyPassword?: string;
  sourceKeyType?: string;
  sourceCredentialId?: number;
  sourceUserId?: string;
  endpointIP: string;
  endpointSSHPort: number;
  endpointUsername: string;
  endpointHost: string;
  endpointPassword?: string;
  endpointAuthMethod: string;
  endpointSSHKey?: string;
  endpointKeyPassword?: string;
  endpointKeyType?: string;
  endpointCredentialId?: number;
  endpointUserId?: string;
  sourcePort: number;
  endpointPort: number;
  maxRetries: number;
  retryInterval: number;
  autoStart: boolean;
  isPinned: boolean;

  useSocks5?: boolean;
  socks5Host?: string;
  socks5Port?: number;
  socks5Username?: string;
  socks5Password?: string;
  socks5ProxyChain?: ProxyNode[];

  keepaliveInterval?: number;
  keepaliveCountMax?: number;
}

export interface C2STunnelPreset {
  id: number;
  userId: string;
  name: string;
  config: TunnelConnection[];
  platform?: string | null;
  computerName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TunnelStatus {
  connected: boolean;
  status: ConnectionState;
  retryCount?: number;
  maxRetries?: number;
  nextRetryIn?: number;
  reason?: string;
  errorType?: ErrorType;
  manualDisconnect?: boolean;
  retryExhausted?: boolean;
  connectionLogs?: Array<{
    type: "info" | "success" | "warning" | "error";
    stage: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
}

// ============================================================================
// FILE MANAGER TYPES
// ============================================================================

export interface Tab {
  id: string | number;
  title: string;
  fileName: string;
  content: string;
  isSSH?: boolean;
  sshSessionId?: string;
  filePath?: string;
  loading?: boolean;
  dirty?: boolean;
}

export interface FileManagerFile {
  name: string;
  path: string;
  type?: "file" | "directory";
  isSSH?: boolean;
  sshSessionId?: string;
}

export interface FileManagerShortcut {
  name: string;
  path: string;
}

export interface FileItem {
  name: string;
  path: string;
  isPinned?: boolean;
  type: "file" | "directory" | "link";
  sshSessionId?: string;
  size?: number;
  modified?: string;
  modifiedTimestamp?: number;
  permissions?: string;
  owner?: string;
  group?: string;
  linkTarget?: string;
  executable?: boolean;
}

export interface ShortcutItem {
  name: string;
  path: string;
}

export interface SSHConnection {
  id: number;
  name: string;
  ip: string;
  port: number;
  username: string;
  isPinned?: boolean;
}

// ============================================================================
// HOST INFO TYPES
// ============================================================================

export interface HostInfo {
  id: number;
  name?: string;
  ip: string;
  port: number;
  createdAt: string;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export interface TermelixAlert {
  id: string;
  title: string;
  message: string;
  expiresAt: string;
  priority?: "low" | "medium" | "high" | "critical";
  type?: "info" | "warning" | "error" | "success";
  actionUrl?: string;
  actionText?: string;
}

// ============================================================================
// TERMINAL CONFIGURATION TYPES
// ============================================================================

export interface TerminalConfig {
  cursorBlink: boolean;
  cursorStyle: "block" | "underline" | "bar";
  fontSize: number;
  fontFamily: string;
  letterSpacing: number;
  lineHeight: number;
  theme: string;

  scrollback: number;
  bellStyle: "none" | "sound" | "visual" | "both";
  rightClickSelectsWord: boolean;
  fastScrollModifier: "alt" | "ctrl" | "shift";
  fastScrollSensitivity: number;
  minimumContrastRatio: number;

  backspaceMode: "normal" | "control-h";
  agentForwarding: boolean;
  environmentVariables: Array<{ key: string; value: string }>;
  startupSnippetId: number | null;
  autoMosh: boolean;
  moshCommand: string;
  keepaliveInterval?: number;
  keepaliveCountMax?: number;
  autoTmux: boolean;
  syntaxHighlighting: boolean;
  syntaxHighlightingOptions?: {
    logLevels: boolean;
    paths: boolean;
    timestamps: boolean;
    ipAddresses: boolean;
    urls: boolean;
    numbers: boolean;
  };
  backgroundImage?: string;
  backgroundImageOpacity?: number;
  allowLegacyAlgorithms?: boolean;
  linkClickBehavior?: "confirm" | "direct";
  useSSHTitle?: boolean;
  agentSocketPath?: string;
  customThemeColors?: {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent: string;
    selectionBackground: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
}

// ============================================================================
// TAB TYPES
// ============================================================================

export interface TabContextTab {
  id: number;
  instanceId?: string;
  type:
    | "home"
    | "terminal"
    | "ssh_manager"
    | "server_stats"
    | "admin"
    | "file_manager"
    | "user_profile"
    | "network_graph"
    | "tmux_monitor"; // --- tmux-monitor ---
  title: string;
  hostConfig?: SSHHost;
  terminalRef?: RefObject<TerminalRefHandle | null>;
  initialTab?: string;
  _updateTimestamp?: number;
  connectionConfig?: Record<string, unknown>;
}

export interface TerminalRefHandle {
  disconnect?: () => void;
  reconnect?: () => void;
  isConnected?: () => boolean;
  fit?: () => void;
  sendInput?: (data: string) => void;
  notifyResize?: () => void;
  refresh?: () => void;
  openFileManager?: () => void;
}

export type SplitLayout = "2h" | "2v" | "3l" | "3r" | "3t" | "4grid";

export interface SplitConfiguration {
  layout: SplitLayout;
  positions: Map<number, number>;
}

export interface SplitLayoutOption {
  id: SplitLayout;
  name: string;
  description: string;
  cellCount: number;
  icon: string;
}

// ============================================================================
// CONNECTION STATES
// ============================================================================

export const CONNECTION_STATES = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  VERIFYING: "verifying",
  FAILED: "failed",
  UNSTABLE: "unstable",
  RETRYING: "retrying",
  WAITING: "waiting",
  DISCONNECTING: "disconnecting",
} as const;

export type ConnectionState =
  (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];

export type ErrorType =
  | "CONNECTION_FAILED"
  | "AUTHENTICATION_FAILED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "UNKNOWN";

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export type AuthType =
  | "password"
  | "key"
  | "credential"
  | "none"
  | "opkssh"
  | "tailscale";

export type KeyType = "rsa" | "ecdsa" | "ed25519";

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface CredentialsManagerProps {
  onEditCredential?: (credential: Credential) => void;
  onAddCredential?: () => void;
}

export interface CredentialEditorProps {
  editingCredential?: Credential | null;
  onFormSubmit?: () => void;
  onBack?: () => void;
}

export interface CredentialViewerProps {
  credential: Credential;
  onClose: () => void;
  onEdit: () => void;
}

export interface CredentialSelectorProps {
  value?: number | null;
  onValueChange: (value: number | null) => void;
}

export interface HostManagerProps {
  onSelectView?: (view: string) => void;
  isTopbarOpen?: boolean;
  initialTab?: string;
  hostConfig?: SSHHost;
  _updateTimestamp?: number;
  rightSidebarOpen?: boolean;
  rightSidebarWidth?: number;
  currentTabId?: number;
  updateTab?: (tabId: number, updates: Partial<Omit<Tab, "id">>) => void;
}

export interface SSHManagerHostEditorProps {
  editingHost?: SSHHost | null;
  onFormSubmit?: () => void;
}

export interface SSHManagerHostViewerProps {
  onEditHost?: (host: SSHHost) => void;
  onAddHost?: () => void;
}

export interface HostProps {
  host: SSHHost;
  onHostConnect?: () => void;
}

export interface SSHTunnelProps {
  filterHostKey?: string;
}

export interface SSHTunnelViewerProps {
  hosts?: SSHHost[];
  tunnelStatuses?: Record<string, TunnelStatus>;
  tunnelActions?: Record<
    string,
    (
      action: "connect" | "disconnect" | "cancel",
      host: SSHHost,
      tunnelIndex: number,
    ) => Promise<void>
  >;
  onTunnelAction?: (
    action: "connect" | "disconnect" | "cancel",
    host: SSHHost,
    tunnelIndex: number,
  ) => Promise<void>;
}

export interface FileManagerProps {
  onSelectView?: (view: string) => void;
  embedded?: boolean;
  initialHost?: SSHHost | null;
}

export interface AlertCardProps {
  alert: TermelixAlert;
  onDismiss: (alertId: string) => void;
}

export interface AlertManagerProps {
  alerts: TermelixAlert[];
  onDismiss: (alertId: string) => void;
  loggedIn: boolean;
}

export interface SSHTunnelObjectProps {
  host: SSHHost;
  tunnelIndex?: number;
  tunnelStatuses: Record<string, TunnelStatus>;
  tunnelActions: Record<string, boolean>;
  onTunnelAction: (
    action: "connect" | "disconnect" | "cancel",
    host: SSHHost,
    tunnelIndex: number,
  ) => Promise<void>;
  compact?: boolean;
  bare?: boolean;
}

export interface FolderStats {
  totalHosts: number;
  hostsByType: Array<{
    type: string;
    count: number;
  }>;
}

// ============================================================================
// SNIPPETS TYPES
// ============================================================================

export interface Snippet {
  id: number;
  userId: string;
  name: string;
  content: string;
  description?: string;
  folder?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SnippetData {
  name: string;
  content: string;
  description?: string;
  folder?: string;
  order?: number;
}

export interface SnippetFolder {
  id: number;
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// BACKEND TYPES
// ============================================================================

export interface HostConfig {
  host: SSHHost;
  tunnels: TunnelConfig[];
}

export interface VerificationData {
  conn: Client;
  timeout: NodeJS.Timeout;
  startTime: number;
  attempts: number;
  maxAttempts: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// ============================================================================
// EXPRESS REQUEST TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  userId: string;
  sessionId?: string;
  apiKeyId?: string;
  actingAdminUserId?: string;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}

// ============================================================================
// GITHUB API TYPES
// ============================================================================

export interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
  prerelease: boolean;
  draft: boolean;
}

export interface GitHubAPIResponse<T> {
  data: T;
  cached: boolean;
  cache_age?: number;
  timestamp?: number;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// ============================================================================
// DATABASE EXPORT/IMPORT TYPES
// ============================================================================

export interface ExportSummary {
  sshHostsImported: number;
  sshCredentialsImported: number;
  fileManagerItemsImported: number;
  dismissedAlertsImported: number;
  credentialUsageImported: number;
  settingsImported: number;
  skippedItems: number;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  summary: ExportSummary;
}

export interface ExportRequestBody {
  password: string;
}

export interface ImportRequestBody {
  password: string;
}

export interface ExportPreviewBody {
  scope?: string;
  includeCredentials?: boolean;
}

export interface RestoreRequestBody {
  backupPath: string;
  targetPath?: string;
}
