import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog.tsx";
import { Button } from "@/components/button.tsx";
import { setErrorReporting } from "@/api/settings-api";

interface ErrorReportingOptInDialogProps {
  open: boolean;
  /** Called after a decision was persisted (or the dialog was dismissed for now). */
  onClose: () => void;
}

/**
 * First-admin-login prompt for the Sentry opt-in. Reporting is off by default; the two
 * buttons persist an explicit decision (changeable later under Admin → General →
 * "Error Reporting"). Dismissing without choosing records nothing, so the prompt
 * reappears on the next login until someone decides.
 */
export function ErrorReportingOptInDialog({
  open,
  onClose,
}: ErrorReportingOptInDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const decide = async (enabled: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      await setErrorReporting(enabled);
      toast.success(
        enabled
          ? t("errorReporting.enabledToast")
          : t("errorReporting.disabledToast"),
      );
      onClose();
    } catch {
      toast.error(t("errorReporting.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("errorReporting.title")}</DialogTitle>
          <DialogDescription>{t("errorReporting.body")}</DialogDescription>
          <DialogDescription>
            {t("errorReporting.changeLater")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => decide(false)}
          >
            {t("errorReporting.decline")}
          </Button>
          <Button disabled={saving} onClick={() => decide(true)}>
            {t("errorReporting.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
