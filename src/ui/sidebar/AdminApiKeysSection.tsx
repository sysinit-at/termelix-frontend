import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { copyToClipboard } from "@/lib/clipboard";
import { deleteApiKey } from "@/main-axios";
import type { ApiKey } from "@/main-axios";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Copy, Network, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AccordionSection } from "./AdminSettingsShared";

type AdminApiKeysSectionProps = {
  open: boolean;
  onToggle: () => void;
  apiKeys: ApiKey[];
  setApiKeys: Dispatch<SetStateAction<ApiKey[]>>;
  loadApiKeys: () => void;
  showCreateKey: boolean;
  setShowCreateKey: Dispatch<SetStateAction<boolean>>;
  createdKeyToken: string | null;
  setCreatedKeyToken: Dispatch<SetStateAction<string | null>>;
  newKeyName: string;
  setNewKeyName: Dispatch<SetStateAction<string>>;
  availableScopes: string[];
  newKeyScopes: string[];
  setNewKeyScopes: Dispatch<SetStateAction<string[]>>;
  newKeyExpiry: string;
  setNewKeyExpiry: Dispatch<SetStateAction<string>>;
  handleCreateApiKey: () => void;
  newKeyLoading: boolean;
};

export function AdminApiKeysSection({
  open,
  onToggle,
  apiKeys,
  setApiKeys,
  loadApiKeys,
  showCreateKey,
  setShowCreateKey,
  createdKeyToken,
  setCreatedKeyToken,
  newKeyName,
  setNewKeyName,
  availableScopes,
  newKeyScopes,
  setNewKeyScopes,
  newKeyExpiry,
  setNewKeyExpiry,
  handleCreateApiKey,
  newKeyLoading,
}: AdminApiKeysSectionProps) {
  const { t } = useTranslation();

  return (
    <AccordionSection
      label={t("admin.sectionApiKeys")}
      icon={<Network className="size-3.5" />}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex flex-col pt-2">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-[10px] text-muted-foreground">
            {t("admin.apiKeysCount", { count: apiKeys.length })}{" "}
            <a
              href="https://docs.termelix.site/features/api/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-accent-brand hover:underline"
            >
              {t("admin.apiKeysDocsLink")}
            </a>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={loadApiKeys}
            >
              <RefreshCw className="size-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] border-accent-brand/40 text-accent-brand hover:bg-accent-brand/10 hover:text-accent-brand"
              onClick={() => {
                setShowCreateKey((o) => !o);
                setCreatedKeyToken(null);
              }}
            >
              <Plus className="size-3" />
              {t("admin.createRole")}
            </Button>
          </div>
        </div>
        {showCreateKey && (
          <div className="flex flex-col gap-2.5 py-3 border-b border-border">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("admin.newApiKey")}
            </span>
            {createdKeyToken ? (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-accent-brand font-semibold">
                  {t("admin.apiKeyCreatedWarning")}
                </span>
                <div className="flex items-center gap-2 bg-muted/30 border border-border px-2 py-1.5">
                  <span className="text-[10px] font-mono flex-1 truncate">
                    {createdKeyToken}
                  </span>
                  <button
                    onClick={() => {
                      copyToClipboard(createdKeyToken);
                      toast.info(t("admin.copiedToClipboard"));
                    }}
                    className="text-muted-foreground hover:text-accent-brand shrink-0"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs self-end"
                  onClick={() => {
                    setShowCreateKey(false);
                    setCreatedKeyToken(null);
                  }}
                >
                  {t("admin.done")}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {t("admin.apiKeyName")}{" "}
                    <span className="text-accent-brand">*</span>
                  </label>
                  <Input
                    placeholder="e.g., CI Pipeline"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                {/* Scopes, where the user selector used to be. A key is always issued to the
                    caller — the server has no endpoint for minting one on someone else's
                    behalf — so choosing a user here was inert. What the key may DO is the
                    decision that actually exists, and the server refuses a key with none. */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {t("admin.apiKeyScopes")}{" "}
                    <span className="text-accent-brand">*</span>
                  </label>
                  <div className="flex flex-col gap-1">
                    {availableScopes.map((scope) => (
                      <label
                        key={scope}
                        className="flex items-center gap-2 text-xs cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(scope)}
                          onChange={() =>
                            setNewKeyScopes((prev) =>
                              prev.includes(scope)
                                ? prev.filter((sc) => sc !== scope)
                                : [...prev, scope],
                            )
                          }
                          className="size-3.5 accent-[var(--accent-brand)]"
                        />
                        <span className="font-mono">{scope}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {t("admin.apiKeyExpiresAt")}
                  </label>
                  <Input
                    type="date"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowCreateKey(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-accent-brand/40 text-accent-brand hover:bg-accent-brand/10 hover:text-accent-brand"
                    onClick={handleCreateApiKey}
                    disabled={newKeyLoading}
                  >
                    {newKeyLoading ? t("admin.creating") : t("admin.createKey")}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        {apiKeys.map((key) => (
          <div
            key={key.id}
            className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-2"
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold truncate">
                  {key.name}
                </span>
                {!key.isActive && (
                  <span className="text-[9px] font-semibold px-1 py-px border border-destructive/40 bg-destructive/10 text-destructive">
                    {t("admin.revokedBadge")}
                  </span>
                )}
              </div>
              {/* Scopes, not an owner. A key is always the caller's own, so naming a user was
                  redundant at best; what distinguishes one key from another is what it may do
                  and which hosts it may do it on. */}
              <div className="flex items-center gap-1 flex-wrap">
                {key.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="text-[9px] font-mono px-1 py-px border border-border bg-muted/30 text-muted-foreground"
                  >
                    {scope}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {key.hostIds.length === 0
                  ? t("admin.apiKeyAllHosts")
                  : t("admin.apiKeyHostCount", { count: key.hostIds.length })}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                {key.keyPrefix}…
              </span>
              <span className="text-[10px] text-muted-foreground">
                {key.createdAt.split("T")[0]} ·{" "}
                {key.expiresAt
                  ? key.expiresAt.split("T")[0]
                  : t("admin.apiKeyNoExpiry")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-destructive shrink-0"
              onClick={async () => {
                try {
                  await deleteApiKey(key.id);
                  setApiKeys((prev) => prev.filter((k) => k.id !== key.id));
                  toast.success(
                    t("admin.revokeKeySuccess", { name: key.name }),
                  );
                } catch {
                  toast.error(t("admin.revokeKeyFailed"));
                }
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
      </div>
    </AccordionSection>
  );
}
