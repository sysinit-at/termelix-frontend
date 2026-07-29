import React from "react";
import { useTranslation } from "react-i18next";
import { Terminal } from "@/features/terminal/Terminal.tsx";
import { FullScreenAppWrapper } from "@/features/FullScreenAppWrapper.tsx";

interface TerminalAppProps {
  hostId?: string;
  /** tmux session to attach to once the shell is ready (tmux monitor "Attach"). */
  tmuxSession?: string;
}

const TerminalApp: React.FC<TerminalAppProps> = ({ hostId, tmuxSession }) => {
  const { t } = useTranslation();
  return (
    <FullScreenAppWrapper hostId={hostId}>
      {(hostConfig, loading) => {
        if (loading) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-muted-foreground">
                  {t("hosts.loadingHost")}
                </p>
              </div>
            </div>
          );
        }

        if (!hostConfig) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-500 mb-4">{t("hosts.hostNotFound")}</p>
              </div>
            </div>
          );
        }

        return (
          <Terminal
            hostConfig={hostConfig}
            isVisible={true}
            title={hostConfig.name || `${hostConfig.username}@${hostConfig.ip}`}
            showTitle={false}
            splitScreen={false}
            // This view IS the browser tab (opened via window.open from the tmux
            // monitor / app shell), so closing the terminal closes the tab.
            onClose={() => window.close()}
            // `tmuxAttachSession`, NOT a typed `tmux attach-session` command.
            //
            // This used to build `tmux attach-session -t '=<name>'` and hand it to
            // `executeCommand`, i.e. type it into the shell. Since the tmux-first change that
            // shell is ITSELF a tmux client on any host that has tmux, so the typed attach
            // nests and tmux refuses it outright:
            //
            //     sessions should be nested with care, unset $TMUX to force
            //
            // The click then appeared to do nothing — the operator was left in their own
            // wrapper session rather than the one they asked for.
            //
            // The server has a first-class verb for this: `tmuxAttachSession` makes the
            // requested session the shell itself (`new-session -A -s <name>`), so there is
            // nothing to nest. It is also what the in-app preview has always used; only this
            // pop-out window was doing it by hand.
            tmuxAttachSession={tmuxSession}
          />
        );
      }}
    </FullScreenAppWrapper>
  );
};

export default TerminalApp;
