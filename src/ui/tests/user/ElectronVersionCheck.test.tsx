import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { ElectronVersionCheck } from "../../user/ElectronVersionCheck";

const api = vi.hoisted(() => ({ checkElectronUpdate: vi.fn() }));
vi.mock("@/main-axios.ts", () => api);
vi.mock("@/lib/electron", () => ({ isElectron: () => true }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ElectronVersionCheck", () => {
  beforeEach(() => {
    localStorage.clear();
    api.checkElectronUpdate.mockReset();
    (window as unknown as { electronAPI?: unknown }).electronAPI = {
      getAppVersion: async () => "2.5.1",
    };
  });

  it("lets the app through when the check throws", async () => {
    // The desktop app sat on an "Update Required" screen forever: the catch set
    // an error state and never continued, so a failed GitHub call locked the
    // client shut. Measured on this fork, where the check 404s every launch.
    api.checkElectronUpdate.mockRejectedValue(
      new Error("GitHub API error: 404"),
    );
    const onContinue = vi.fn();

    render(<ElectronVersionCheck onContinue={onContinue} />);

    await waitFor(() => expect(onContinue).toHaveBeenCalled());
  });

  it("lets the app through when the check returns no verdict", async () => {
    // `update_check_disabled` from a server with outbound checks off, or any
    // shape without a status: nothing there says this build needs updating.
    api.checkElectronUpdate.mockResolvedValue({ success: false });
    const onContinue = vi.fn();

    render(<ElectronVersionCheck onContinue={onContinue} />);

    await waitFor(() => expect(onContinue).toHaveBeenCalled());
  });

  it("continues when up to date", async () => {
    api.checkElectronUpdate.mockResolvedValue({
      success: true,
      status: "up_to_date",
    });
    const onContinue = vi.fn();

    render(<ElectronVersionCheck onContinue={onContinue} />);

    await waitFor(() => expect(onContinue).toHaveBeenCalled());
  });

  it("still holds the app when an update really is required", async () => {
    // The gate exists for a reason; this is the case it is for.
    api.checkElectronUpdate.mockResolvedValue({
      success: true,
      status: "requires_update",
      latest_release: { html_url: "https://example.invalid/releases/1" },
    });
    const onContinue = vi.fn();

    render(<ElectronVersionCheck onContinue={onContinue} />);

    await new Promise((r) => setTimeout(r, 50));
    expect(onContinue).not.toHaveBeenCalled();
  });
});
