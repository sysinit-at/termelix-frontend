import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HostCredentialList } from "../../sidebar/HostCredentialList";
import type { Credential } from "@/types/ui-types";

const api = vi.hoisted(() => ({
  getCredentialDetails: vi.fn(async () => ({})),
}));

vi.mock("@/main-axios", () => api);

const clipboard = vi.hoisted(() => ({
  copyToClipboard: vi.fn(async () => true),
}));
vi.mock("@/lib/clipboard", () => clipboard);

const toastMock = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => toastMock);

// The real hook, keyed straight through. The bug under test is a MISSING `useTranslation()`
// call inside a child component, so a mock that made `t` globally available would hide it.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const keyCredential: Credential = {
  id: "1",
  name: "deploy-key",
  username: "root",
  type: "key",
  publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5 test@example",
  folder: "Uncategorized",
};

function renderList(creds: Credential[]) {
  return render(
    <HostCredentialList
      credentialFolders={["Uncategorized"]}
      filteredCredentials={creds}
      credentialsLoading={false}
      allHosts={[]}
      editingFolderName={null}
      editingFolderValue=""
      onEditingFolderNameChange={vi.fn()}
      onEditingFolderValueChange={vi.fn()}
      onRenameFolder={vi.fn(async () => {})}
      onDeployCredential={vi.fn()}
      onEditCredential={vi.fn()}
      onDeleteCredential={vi.fn(async () => {})}
      onAddCredential={vi.fn()}
      onConfirmDialogChange={vi.fn()}
    />,
  );
}

/** The rows live inside a collapsed folder; open it so the action tray is mounted. */
async function openFolder(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Uncategorized"));
}

describe("HostCredentialList — key credential action tray", () => {
  beforeEach(() => {
    clipboard.copyToClipboard.mockClear();
    toastMock.toast.success.mockClear();
    toastMock.toast.error.mockClear();
  });

  it("copies the deploy command without throwing", async () => {
    // `CredentialItem` called `t(...)` in this handler while `useTranslation()` was only called
    // in the parent component, so the click raised `ReferenceError: t is not defined` — AFTER the
    // clipboard write, which is why asserting on the toast rather than the copy is what catches it.
    const user = userEvent.setup();
    renderList([keyCredential]);
    await openFolder(user);

    await user.click(screen.getByTitle("Copy deploy command"));

    await waitFor(() =>
      expect(clipboard.copyToClipboard).toHaveBeenCalledWith(
        expect.stringContaining(keyCredential.publicKey as string),
      ),
    );
    expect(toastMock.toast.success).toHaveBeenCalledWith(
      "credentials.deployCommandCopied",
    );
    expect(toastMock.toast.error).not.toHaveBeenCalled();
  });

  it("reports the missing public key instead of throwing", async () => {
    // The same `t` reference, reached on the branch where there is nothing to copy — this one
    // throws before any clipboard call, so the user got no feedback at all.
    const user = userEvent.setup();
    renderList([{ ...keyCredential, publicKey: undefined }]);
    await openFolder(user);

    await user.click(screen.getByTitle("Copy deploy command"));

    await waitFor(() =>
      expect(toastMock.toast.error).toHaveBeenCalledWith(
        "credentials.noPublicKeyAvailable",
      ),
    );
    expect(clipboard.copyToClipboard).not.toHaveBeenCalled();
  });
});
