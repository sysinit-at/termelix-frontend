import { authApi, handleApiError, sshHostApi } from "@/main-axios";
import type { SSHFolder } from "@/types/index";
import { sshLogger } from "@/lib/frontend-logger";

export async function getCredentials(): Promise<
  Record<string, unknown>[] | Record<string, unknown>
> {
  try {
    const response = await authApi.get("/credentials");
    return response.data;
  } catch (error) {
    throw handleApiError(error, "fetch credentials");
  }
}

export async function getCredentialDetails(
  credentialId: number,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.get(`/credentials/${credentialId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, "fetch credential details");
  }
}

export async function createCredential(
  credentialData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/credentials", credentialData);
    return response.data;
  } catch (error) {
    throw handleApiError(error, "create credential");
  }
}

export async function updateCredential(
  credentialId: number,
  credentialData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.put(
      `/credentials/${credentialId}`,
      credentialData,
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, "update credential");
  }
}

export async function deleteCredential(
  credentialId: number,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.delete(`/credentials/${credentialId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, "delete credential");
  }
}

export async function getCredentialHosts(
  credentialId: number,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.get(`/credentials/${credentialId}/hosts`);
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch credential hosts");
  }
}

export async function getCredentialFolders(): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.get("/credentials/folders");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch credential folders");
  }
}

export async function getSSHHostWithCredentials(
  hostId: number,
): Promise<Record<string, unknown>> {
  try {
    const response = await sshHostApi.get(
      `/db/host/${hostId}/with-credentials`,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch SSH host with credentials");
  }
}

// `getHostPassword` is deliberately gone.
//
// It fetched a stored host/sudo password back to the browser — the read-back the
// write-only-secrets rule exists to forbid. It also never worked: `GET /db/host/:id/password`
// is not routed on this server, so the request landed on the SPA's catch-all and returned
// index.html, `response.data?.value` was undefined, and every caller silently got null.
//
// The need behind it — typing a stored password at a prompt — is NOT served by anything else, and
// deliberately so. Having the server type it into the PTY was tried twice and is a
// credential-reveal primitive either way: whether the secret gets echoed back is decided by the
// remote's terminal settings, which the server cannot see, and gating on a detected prompt fails
// because the client chooses what the remote prints. See docs/BUG_REFERENCE.md in the server repo.

export async function applyCredentialToHost(
  hostId: number,
  credentialId: number,
): Promise<Record<string, unknown>> {
  try {
    const response = await sshHostApi.post(
      `/db/host/${hostId}/apply-credential`,
      { credentialId },
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, "apply credential to host");
  }
}

export async function removeCredentialFromHost(
  hostId: number,
): Promise<Record<string, unknown>> {
  try {
    const response = await sshHostApi.delete(`/db/host/${hostId}/credential`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, "remove credential from host");
  }
}

export async function migrateHostToCredential(
  hostId: number,
  credentialName: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await sshHostApi.post(
      `/db/host/${hostId}/migrate-to-credential`,
      { credentialName },
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, "migrate host to credential");
  }
}

export async function getFoldersWithStats(): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.get("/host/db/folders/with-stats");
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch folders with statistics");
  }
}

export async function renameFolder(
  oldName: string,
  newName: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.put("/host/folders/rename", {
      oldName,
      newName,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "rename folder");
  }
}

export async function getSSHFolders(): Promise<SSHFolder[]> {
  try {
    sshLogger.info("Fetching SSH folders", {
      operation: "fetch_ssh_folders",
    });

    const response = await authApi.get("/host/folders");

    sshLogger.success("SSH folders fetched successfully", {
      operation: "fetch_ssh_folders",
      count: response.data.length,
    });

    return response.data;
  } catch (error) {
    sshLogger.error("Failed to fetch SSH folders", error, {
      operation: "fetch_ssh_folders",
    });
    handleApiError(error, "fetch SSH folders");
    throw error;
  }
}

export async function updateFolderMetadata(
  name: string,
  color?: string,
  icon?: string,
): Promise<void> {
  try {
    sshLogger.info("Updating folder metadata", {
      operation: "update_folder_metadata",
      name,
      color,
      icon,
    });

    await authApi.put("/host/folders/metadata", {
      name,
      color,
      icon,
    });

    sshLogger.success("Folder metadata updated successfully", {
      operation: "update_folder_metadata",
      name,
    });
  } catch (error) {
    sshLogger.error("Failed to update folder metadata", error, {
      operation: "update_folder_metadata",
      name,
    });
    handleApiError(error, "update folder metadata");
    throw error;
  }
}

export async function deleteAllHostsInFolder(
  folderName: string,
): Promise<{ deletedCount: number }> {
  try {
    sshLogger.info("Deleting all hosts in folder", {
      operation: "delete_folder_hosts",
      folderName,
    });

    const response = await authApi.delete(
      `/host/folders/${encodeURIComponent(folderName)}/hosts`,
    );

    sshLogger.success("All hosts in folder deleted successfully", {
      operation: "delete_folder_hosts",
      folderName,
      deletedCount: response.data.deletedCount,
    });

    return response.data;
  } catch (error) {
    sshLogger.error("Failed to delete hosts in folder", error, {
      operation: "delete_folder_hosts",
      folderName,
    });
    handleApiError(error, "delete hosts in folder");
    throw error;
  }
}

export async function renameCredentialFolder(
  oldName: string,
  newName: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.put("/credentials/folders/rename", {
      oldName,
      newName,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, "rename credential folder");
  }
}

export async function detectKeyType(
  privateKey: string,
  keyPassword?: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/credentials/detect-key-type", {
      privateKey,
      keyPassword,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, "detect key type");
  }
}

export async function detectPublicKeyType(
  publicKey: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/credentials/detect-public-key-type", {
      publicKey,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, "detect public key type");
  }
}

export async function validateKeyPair(
  privateKey: string,
  publicKey: string,
  keyPassword?: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/credentials/validate-key-pair", {
      privateKey,
      publicKey,
      keyPassword,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, "validate key pair");
  }
}

export async function generatePublicKeyFromPrivate(
  privateKey: string,
  keyPassword?: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/credentials/generate-public-key", {
      privateKey,
      keyPassword,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, "generate public key from private key");
  }
}

export async function generateKeyPair(
  keyType: "ssh-ed25519" | "ssh-rsa" | "ecdsa-sha2-nistp256",
  keySize?: number,
  passphrase?: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post("/credentials/generate-key-pair", {
      keyType,
      keySize,
      passphrase,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, "generate SSH key pair");
  }
}

export async function deployCredentialToHost(
  credentialId: number,
  targetHostId: number,
): Promise<Record<string, unknown>> {
  try {
    const response = await authApi.post(
      `/credentials/${credentialId}/deploy-to-host`,
      { targetHostId },
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, "deploy credential to host");
  }
}
