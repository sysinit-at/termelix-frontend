import React from "react";

import { LazyBoundary, lazyChunk } from "@/lib/lazy-chunk.tsx";
import type { SSHAuthDialogProps } from "@/ssh/dialogs/SSHAuthDialog.tsx";

/**
 * The SSH auth dialog, loaded only when it is about to be shown.
 *
 * The dialog uses CodeMirror so a private key can be pasted with sane editing. CodeMirror is
 * 1.5 MB (540 KB gzipped). Because `Terminal.tsx` imported the dialog statically, and the
 * terminal is on the critical path, the bundler made CodeMirror part of the entry's static
 * graph — `modulepreload`ed on every page load, to support a dialog that appears only when a
 * server asks for credentials.
 *
 * `isOpen` is checked BEFORE the lazy boundary. The dialog already returned `null` when closed,
 * so nothing changes behaviourally, and the import is not even started until it will render.
 *
 * `lazyChunk`, not a bare `React.lazy`. Making this lazy also made it a deploy-time liability:
 * a page open across a `docker compose up -d` holds a chunk filename the server no longer has,
 * and a bare lazy import that 404s throws during render — which, with no error boundary
 * anywhere in this app, unmounts the whole tree. That failure would land precisely when
 * somebody is being asked for a password, on the rarest path in the app. `lazyChunk` retries,
 * then reloads once, and the boundary is there in case both are somehow not enough.
 */
const SSHAuthDialogImpl = lazyChunk(
  () =>
    import("@/ssh/dialogs/SSHAuthDialog.tsx").then((m) => ({
      default: m.SSHAuthDialog,
    })),
  "SSHAuthDialog",
);

export function SSHAuthDialog(props: SSHAuthDialogProps) {
  if (!props.isOpen) return null;

  return (
    <LazyBoundary name="SSHAuthDialog">
      <SSHAuthDialogImpl {...props} />
    </LazyBoundary>
  );
}
