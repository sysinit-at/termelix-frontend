import { useTranslation } from "react-i18next";
import { Activity, LayoutDashboard, Server } from "lucide-react";

import { Input } from "@/components/input";
import { SectionCard, SettingRow, FakeSwitch } from "@/components/section-card";
import type { HostEditorForm } from "./HostEditorData";

type SetHostField = <K extends keyof HostEditorForm>(
  key: K,
  value: HostEditorForm[K],
) => void;

export function HostStatsTab({
  form,
  setField,
}: {
  form: HostEditorForm;
  setField: SetHostField;
}) {
  const { t } = useTranslation();

  return (
    <>
      <SectionCard
        title={t("hosts.statusChecksLabel")}
        icon={<Activity className="size-3.5" />}
      >
        <div className="flex flex-col gap-0 py-1">
          <SettingRow
            label={t("hosts.enableStatusChecks")}
            description={t("hosts.enableStatusChecksDesc")}
          >
            <FakeSwitch
              checked={form.statsConfig.statusCheckEnabled}
              onChange={(v) =>
                setField("statsConfig", {
                  ...form.statsConfig,
                  statusCheckEnabled: v,
                })
              }
            />
          </SettingRow>
          {form.statsConfig.statusCheckEnabled && (
            <SettingRow
              label={t("hosts.useGlobalInterval")}
              description={t("hosts.useGlobalIntervalDesc")}
            >
              <FakeSwitch
                checked={form.statsConfig.useGlobalStatusInterval}
                onChange={(v) =>
                  setField("statsConfig", {
                    ...form.statsConfig,
                    useGlobalStatusInterval: v,
                  })
                }
              />
            </SettingRow>
          )}
          {form.statsConfig.statusCheckEnabled &&
            !form.statsConfig.useGlobalStatusInterval && (
              <SettingRow
                label={t("hosts.checkIntervalS")}
                description={t("hosts.checkIntervalDesc")}
              >
                <Input
                  type="number"
                  value={form.statsConfig.statusCheckInterval}
                  onChange={(e) =>
                    setField("statsConfig", {
                      ...form.statsConfig,
                      statusCheckInterval: Number(e.target.value),
                    })
                  }
                  className="w-20 h-7 text-xs text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </SettingRow>
            )}
        </div>
      </SectionCard>
      <SectionCard
        title={t("hosts.metricsCollectionLabel")}
        icon={<Server className="size-3.5" />}
      >
        <div className="flex flex-col gap-0 py-1">
          <SettingRow
            label={t("hosts.enableMetricsLabel")}
            description={t("hosts.enableMetricsDesc")}
          >
            <FakeSwitch
              checked={form.statsConfig.metricsEnabled}
              onChange={(v) =>
                setField("statsConfig", {
                  ...form.statsConfig,
                  metricsEnabled: v,
                })
              }
            />
          </SettingRow>
          {form.statsConfig.metricsEnabled && (
            <SettingRow
              label={t("hosts.useGlobalMetrics")}
              description={t("hosts.useGlobalMetricsDesc")}
            >
              <FakeSwitch
                checked={form.statsConfig.useGlobalMetricsInterval}
                onChange={(v) =>
                  setField("statsConfig", {
                    ...form.statsConfig,
                    useGlobalMetricsInterval: v,
                  })
                }
              />
            </SettingRow>
          )}
          {form.statsConfig.metricsEnabled &&
            !form.statsConfig.useGlobalMetricsInterval && (
              <SettingRow
                label={t("hosts.metricsIntervalS")}
                description={t("hosts.metricsIntervalDesc2")}
              >
                <Input
                  type="number"
                  value={form.statsConfig.metricsInterval}
                  onChange={(e) =>
                    setField("statsConfig", {
                      ...form.statsConfig,
                      metricsInterval: Number(e.target.value),
                    })
                  }
                  className="w-20 h-7 text-xs text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </SettingRow>
            )}
        </div>
      </SectionCard>
      <SectionCard
        title={t("hosts.visibleWidgets")}
        icon={<LayoutDashboard className="size-3.5" />}
      >
        <div className="flex flex-col gap-2 py-3">
          <p className="text-xs text-muted-foreground">
            {t("hosts.widgetsMovedToHostMetrics")}
          </p>
        </div>
      </SectionCard>
    </>
  );
}
