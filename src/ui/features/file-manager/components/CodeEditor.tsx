import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  langs,
  loadLanguage,
  type LanguageName,
} from "@uiw/codemirror-extensions-langs";
import { EditorView, keymap } from "@codemirror/view";
import { searchKeymap, search, openSearchPanel } from "@codemirror/search";
import {
  defaultKeymap,
  history,
  historyKeymap,
  toggleComment,
} from "@codemirror/commands";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";

export interface CodeEditorHandle {
  openSearchPanel: () => void;
}

interface CodeEditorProps {
  fileName: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  fontSize?: number;
}

/**
 * `langs` is keyed by EXTENSION, not by language name — `js`, `ts`, `cs`, `rb`, `rs`, `sh`. The
 * previous map translated extensions into names first (`js -> "javascript"`, `sh -> "shell"`), and
 * ten of those names do not exist as keys, so `loadLanguage` returned null and JavaScript,
 * TypeScript, C#, Ruby, Rust, shell scripts and Dockerfile/Makefile/Rakefile/Gemfile opened with no
 * highlighting at all. TypeScript had been flagging it: `loadLanguage` takes a `LanguageName`
 * union, and a `Record<string, string>` is not assignable to it.
 *
 * So: look the extension up directly, and keep a table only for the cases where the file's name is
 * not the key. That also picks up the ~200 grammars the hand-written map never listed (lua, swift,
 * kt, nix, dart, toml, diff, …) instead of silently dropping them.
 */
const LANGUAGE_ALIASES: Record<string, LanguageName> = {
  zsh: "sh",
  conf: "sh",
  cnf: "sh",
  txt: "text",
  yml: "yaml",
  // Ruby by another name. Dockerfile and Makefile are deliberately absent: this package ships no
  // grammar for either, and guessing a near-miss (shell for a Makefile) mis-colours the file
  // rather than leaving it plain.
  rakefile: "rb",
  gemfile: "rb",
  podfile: "rb",
};

/** Exported for tests: which grammar a filename resolves to, or null for none. */
export function resolveLanguageName(filename: string): LanguageName | null {
  const baseName = filename.toLowerCase();
  const extension = baseName.split(".").pop() ?? "";

  for (const candidate of [
    LANGUAGE_ALIASES[baseName],
    LANGUAGE_ALIASES[extension],
    extension,
  ]) {
    if (candidate && candidate in langs) return candidate as LanguageName;
  }

  return null;
}

function getLanguageExtension(filename: string) {
  const name = resolveLanguageName(filename);
  return name ? loadLanguage(name) : null;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { fileName, value, placeholder, onChange, onFocus, onBlur, fontSize = 14 },
    ref,
  ) {
    const editorRef = useRef<{ view?: EditorView } | null>(null);

    const extensions = useMemo(() => {
      const languageExtension = getLanguageExtension(fileName);

      return [
        ...(languageExtension ? [languageExtension] : []),
        history(),
        search(),
        autocompletion(),
        keymap.of([
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          {
            key: "Mod-/",
            run: toggleComment,
            preventDefault: true,
          },
          {
            key: "Mod-h",
            run: () => false,
            preventDefault: true,
          },
        ]),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: `${fontSize}px`,
          },
          ".cm-scroller": {
            overflow: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--scrollbar-thumb) var(--scrollbar-track)",
          },
          ".cm-editor": {
            height: "100%",
          },
        }),
      ];
    }, [fileName, fontSize]);

    useImperativeHandle(
      ref,
      () => ({
        openSearchPanel: () => {
          const view = editorRef.current?.view;
          if (view) {
            openSearchPanel(view);
          }
        },
      }),
      [],
    );

    return (
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        extensions={extensions}
        theme={oneDark}
        placeholder={placeholder}
        className="h-full"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false,
        }}
      />
    );
  },
);
