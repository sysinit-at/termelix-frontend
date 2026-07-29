import { describe, it, expect } from "vitest";
import {
  createHostEditorForm,
  buildHostEditorPayload,
} from "../../sidebar/HostEditorData";

describe("buildHostEditorPayload auth field isolation", () => {
  it("only sends the password when authType is password", () => {
    const form = {
      ...createHostEditorForm(null),
      authType: "password" as const,
      password: "hunter2",
      key: "PRIVATE KEY",
      keyPassword: "kp",
      credentialId: "5",
    };

    const payload = buildHostEditorPayload(form);

    expect(payload.password).toBe("hunter2");
    expect(payload.key).toBeNull();
    expect(payload.keyPassword).toBeNull();
    expect(payload.credentialId).toBeNull();
  });

  it("drops the credentialId when switching a cloned host away from credential auth", () => {
    const form = {
      ...createHostEditorForm(null),
      authType: "password" as const,
      password: "newpass",
      credentialId: "12",
    };

    const payload = buildHostEditorPayload(form);

    expect(payload.credentialId).toBeNull();
    expect(payload.password).toBe("newpass");
  });

  it("sends credentialId and optional password when authType is credential", () => {
    const form = {
      ...createHostEditorForm(null),
      authType: "credential" as const,
      credentialId: "7",
      password: "host-specific-password",
      key: "leftover-key",
    };

    const payload = buildHostEditorPayload(form);

    expect(payload.credentialId).toBe(7);
    expect(payload.password).toBe("host-specific-password");
    expect(payload.key).toBeNull();
  });

  it("sends key fields and optional password when authType is key", () => {
    const form = {
      ...createHostEditorForm(null),
      authType: "key" as const,
      key: "MY KEY",
      keyType: "ssh-ed25519",
      password: "leftover",
      credentialId: "3",
    };

    const payload = buildHostEditorPayload(form);

    expect(payload.key).toBe("MY KEY");
    expect(payload.keyType).toBe("ssh-ed25519");
    expect(payload.password).toBe("leftover");
    expect(payload.credentialId).toBeNull();
  });

  it("preserves agentSocketPath in terminalConfig when authType is agent", () => {
    const form = {
      ...createHostEditorForm(null),
      authType: "agent" as const,
      agentSocketPath: "/run/user/1000/gnupg/S.gpg-agent.ssh",
    };

    const payload = buildHostEditorPayload(form);
    const tc = payload.terminalConfig as Record<string, unknown> | null;

    expect(tc?.agentSocketPath).toBe("/run/user/1000/gnupg/S.gpg-agent.ssh");
    expect(payload.password).toBeNull();
    expect(payload.key).toBeNull();
  });

  it("sets agentSocketPath to null in payload when authType is agent but path is empty", () => {
    const form = {
      ...createHostEditorForm(null),
      authType: "agent" as const,
      agentSocketPath: "",
    };

    const payload = buildHostEditorPayload(form);
    const tc = payload.terminalConfig as Record<string, unknown> | null;

    expect(tc?.agentSocketPath).toBeNull();
  });

  it("nulls out agentSocketPath when switching away from agent auth", () => {
    const form = {
      ...createHostEditorForm(null),
      authType: "password" as const,
      password: "mypass",
      agentSocketPath: "/run/user/1000/gnupg/S.gpg-agent.ssh",
    };

    const payload = buildHostEditorPayload(form);
    const tc = payload.terminalConfig as Record<string, unknown> | null;

    expect(tc?.agentSocketPath).toBeNull();
  });

  it("does not collect a sudo password at all, from either position", () => {
    // The editor used to offer a "Sudo Password" field for auto-fill, and wrote the value INSIDE
    // `terminalConfig` — an unencrypted column the server returns in every host list. Auto-fill is
    // gone (having the server type a stored secret into the PTY is a credential-reveal primitive
    // however it is gated), so nothing can consume the value, and soliciting a credential that
    // nothing can use is liability rather than a feature.
    const form = createHostEditorForm(null) as Record<string, unknown>;

    expect(form).not.toHaveProperty("sudoPassword");
    expect(form).not.toHaveProperty("sudoPasswordAutoFill");

    const payload = buildHostEditorPayload(
      createHostEditorForm(null),
    ) as Record<string, unknown>;
    const tc = payload.terminalConfig as Record<string, unknown> | null;

    expect(payload).not.toHaveProperty("sudoPassword");
    expect(tc).not.toHaveProperty("sudoPassword");
    expect(tc).not.toHaveProperty("sudoPasswordAutoFill");
  });

  it("ignores a stored sudo password when loading a host", () => {
    // A host saved by an older client still has both in its blob. Neither may come back into the
    // form: one is a secret that must not be readable, the other toggles a feature that is gone.
    const form = createHostEditorForm({
      id: 1,
      terminalConfig: { sudoPasswordAutoFill: true, sudoPassword: "LEAKED" },
      hasSudoPassword: true,
    } as never) as unknown as Record<string, unknown>;

    expect(form).not.toHaveProperty("sudoPassword");
    expect(form).not.toHaveProperty("sudoPasswordAutoFill");
    expect(JSON.stringify(form)).not.toContain("LEAKED");
  });

  // SSH is the only protocol left, so the editor must never be able to save a host with it
  // off — that host would list but be unopenable, with no toggle left to switch it back on.
  // Re-saving a legacy `enableSsh: false` row in the editor is the escape hatch.
  it("always saves enableSsh true, including for a host stored with it off", () => {
    const legacy = {
      ...createHostEditorForm(null),
      enableSsh: false,
    } as ReturnType<typeof createHostEditorForm>;

    expect(buildHostEditorPayload(createHostEditorForm(null)).enableSsh).toBe(
      true,
    );
    expect(buildHostEditorPayload(legacy).enableSsh).toBe(true);
    expect(buildHostEditorPayload(legacy).connectionType).toBe("ssh");
  });
});
