import React from "react";
import { useTranslation } from "react-i18next";
import { FullScreenAppWrapper } from "@/features/FullScreenAppWrapper.tsx";
import { TunnelTab } from "@/features/tunnel/TunnelTab.tsx";
import type { Host } from "@/types/ui-types";
import type { SSHHost } from "@/types";

interface TunnelAppProps {
  hostId?: string;
}

function sshHostToMinimalHost(h: SSHHost): Host {
  return {
    id: String(h.id),
    name: h.name,
    ip: h.ip,
    port: h.port,
    username: h.username,
    folder: h.folder ?? "",
    online: false,
    cpu: null,
    ram: null,
    lastAccess: "",
    tags: h.tags ?? [],
    pin: h.pin ?? false,
    authType: h.authType,
    enableTerminal: h.enableTerminal ?? false,
    enableTunnel: h.enableTunnel ?? false,
    enableFileManager: h.enableFileManager ?? false,
    enableSsh: h.enableSsh ?? true,
    sshPort: h.sshPort ?? h.port,
    serverTunnels: [],
    quickActions: [],
  };
}

const TunnelApp: React.FC<TunnelAppProps> = ({ hostId }) => {
  const { t } = useTranslation();
  return (
    <FullScreenAppWrapper hostId={hostId}>
      {(hostConfig, loading) => {
        if (loading) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
            </div>
          );
        }

        if (!hostConfig) {
          return (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{t("hosts.hostNotFound")}</p>
            </div>
          );
        }

        return (
          <TunnelTab
            label={hostConfig.name}
            host={sshHostToMinimalHost(hostConfig)}
          />
        );
      }}
    </FullScreenAppWrapper>
  );
};

export default TunnelApp;
