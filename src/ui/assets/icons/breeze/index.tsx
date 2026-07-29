/**
 * Breeze (KDE/Dolphin) icons for the file manager.
 *
 * The file browser is styled after Dolphin, so it uses Dolphin's own icon set rather than the
 * lucide glyphs the rest of Termelix uses. Exports are named after the lucide icons they
 * replace, so call sites only change their import specifier — which also keeps the two sets
 * mechanically comparable if a screen is ever moved back.
 *
 * Assets are vendored under this directory by `scripts/vendor-breeze-icons.mjs`; see NOTICE.md
 * for upstream provenance and the LGPL-3.0-or-later licence they ship under.
 *
 * Monochrome icons inherit `currentColor`, so Tailwind `text-*` classes tint them exactly as
 * they tinted the lucide icons. Mimetype icons carry Breeze's own colours and ignore tinting.
 */

import type { FC, SVGProps } from "react";

import ApplicationJavascriptSvg from "./application-javascript.svg?react";
import ApplicationJsonSvg from "./application-json.svg?react";
import ApplicationMswordSvg from "./application-msword.svg?react";
import ApplicationPdfSvg from "./application-pdf.svg?react";
import ApplicationPgpKeysSvg from "./application-pgp-keys.svg?react";
import ApplicationVndMsExcelSvg from "./application-vnd.ms-excel.svg?react";
import ApplicationX7zCompressedSvg from "./application-x-7z-compressed.svg?react";
import ApplicationXArchiveSvg from "./application-x-archive.svg?react";
import ApplicationXBzipSvg from "./application-x-bzip.svg?react";
import ApplicationXCdImageSvg from "./application-x-cd-image.svg?react";
import ApplicationXDebSvg from "./application-x-deb.svg?react";
import ApplicationXExecutableSvg from "./application-x-executable.svg?react";
import ApplicationXGzipSvg from "./application-x-gzip.svg?react";
import ApplicationXMsDosExecutableSvg from "./application-x-ms-dos-executable.svg?react";
import ApplicationXPhpSvg from "./application-x-php.svg?react";
import ApplicationXRarSvg from "./application-x-rar.svg?react";
import ApplicationXRpmSvg from "./application-x-rpm.svg?react";
import ApplicationXRubySvg from "./application-x-ruby.svg?react";
import ApplicationXShellscriptSvg from "./application-x-shellscript.svg?react";
import ApplicationXSqlite3Svg from "./application-x-sqlite3.svg?react";
import ApplicationXTarSvg from "./application-x-tar.svg?react";
import ApplicationXX509CaCertSvg from "./application-x-x509-ca-cert.svg?react";
import ApplicationXmlSvg from "./application-xml.svg?react";
import ApplicationZipSvg from "./application-zip.svg?react";
import ArchiveInsertSvg from "./archive-insert.svg?react";
import ArrowDownSvg from "./arrow-down.svg?react";
import ArrowLeftSvg from "./arrow-left.svg?react";
import ArrowRightSvg from "./arrow-right.svg?react";
import ArrowUpSvg from "./arrow-up.svg?react";
import AudioFlacSvg from "./audio-flac.svg?react";
import AudioMpegSvg from "./audio-mpeg.svg?react";
import AudioXGenericSvg from "./audio-x-generic.svg?react";
import AudioXWavSvg from "./audio-x-wav.svg?react";
import BookmarksSvg from "./bookmarks.svg?react";
import ClockSvg from "./clock.svg?react";
import CloudDownloadSvg from "./cloud-download.svg?react";
import CloudUploadSvg from "./cloud-upload.svg?react";
import ConfigureSvg from "./configure.svg?react";
import DialogCloseSvg from "./dialog-close.svg?react";
import DialogInformationSvg from "./dialog-information.svg?react";
import DialogWarningSvg from "./dialog-warning.svg?react";
import DocumentEditSvg from "./document-edit.svg?react";
import DocumentNewSvg from "./document-new.svg?react";
import DocumentSaveSvg from "./document-save.svg?react";
import EditCopySvg from "./edit-copy.svg?react";
import EditCutSvg from "./edit-cut.svg?react";
import EditDeleteSvg from "./edit-delete.svg?react";
import EditFindSvg from "./edit-find.svg?react";
import EditLinkSvg from "./edit-link.svg?react";
import EditMoveSvg from "./edit-move.svg?react";
import EditPasteSvg from "./edit-paste.svg?react";
import EditRenameSvg from "./edit-rename.svg?react";
import EditUndoSvg from "./edit-undo.svg?react";
import EmblemSymbolicLinkSvg from "./emblem-symbolic-link.svg?react";
import ExchangePositionsSvg from "./exchange-positions.svg?react";
import FavoriteSvg from "./favorite.svg?react";
import FolderSvg from "./folder.svg?react";
import FolderNewSvg from "./folder-new.svg?react";
import FolderOpenSvg from "./folder-open.svg?react";
import GoDownSvg from "./go-down.svg?react";
import GoUpSvg from "./go-up.svg?react";
import ImageBmpSvg from "./image-bmp.svg?react";
import ImageGifSvg from "./image-gif.svg?react";
import ImageJpegSvg from "./image-jpeg.svg?react";
import ImagePngSvg from "./image-png.svg?react";
import ImageSvgXmlSvg from "./image-svg-xml.svg?react";
import ImageXGenericSvg from "./image-x-generic.svg?react";
import InputKeyboardSvg from "./input-keyboard.svg?react";
import ListAddSvg from "./list-add.svg?react";
import ListRemoveSvg from "./list-remove.svg?react";
import MediaPlaybackStartSvg from "./media-playback-start.svg?react";
import ObjectLockedSvg from "./object-locked.svg?react";
import PackageXGenericSvg from "./package-x-generic.svg?react";
import SecurityHighSvg from "./security-high.svg?react";
import TextCssSvg from "./text-css.svg?react";
import TextHtmlSvg from "./text-html.svg?react";
import TextMarkdownSvg from "./text-markdown.svg?react";
import TextPlainSvg from "./text-plain.svg?react";
import TextRustSvg from "./text-rust.svg?react";
import TextXChdrSvg from "./text-x-chdr.svg?react";
import TextXCsharpSvg from "./text-x-csharp.svg?react";
import TextXCsrcSvg from "./text-x-csrc.svg?react";
import TextXCxxhdrSvg from "./text-x-cxxhdr.svg?react";
import TextXCxxsrcSvg from "./text-x-cxxsrc.svg?react";
import TextXGenericSvg from "./text-x-generic.svg?react";
import TextXGoSvg from "./text-x-go.svg?react";
import TextXJavaSvg from "./text-x-java.svg?react";
import TextXLogSvg from "./text-x-log.svg?react";
import TextXPythonSvg from "./text-x-python.svg?react";
import TextXScriptSvg from "./text-x-script.svg?react";
import UtilitiesTerminalSvg from "./utilities-terminal.svg?react";
import VcsDiffSvg from "./vcs-diff.svg?react";
import VideoMp4Svg from "./video-mp4.svg?react";
import VideoXGenericSvg from "./video-x-generic.svg?react";
import VideoXMatroskaSvg from "./video-x-matroska.svg?react";
import ViewFullscreenSvg from "./view-fullscreen.svg?react";
import ViewHiddenSvg from "./view-hidden.svg?react";
import ViewListDetailsSvg from "./view-list-details.svg?react";
import ViewListIconsSvg from "./view-list-icons.svg?react";
import ViewRefreshSvg from "./view-refresh.svg?react";
import ViewRestoreSvg from "./view-restore.svg?react";
import ViewSplitLeftRightSvg from "./view-split-left-right.svg?react";
import ViewVisibleSvg from "./view-visible.svg?react";
import WindowNewSvg from "./window-new.svg?react";
import XOfficePresentationSvg from "./x-office-presentation.svg?react";
import ZoomInSvg from "./zoom-in.svg?react";
import ZoomOutSvg from "./zoom-out.svg?react";

export type BreezeIconProps = SVGProps<SVGSVGElement> & {
  /** Pixel size; omit and size with CSS (`className="size-4"`), as the call sites do. */
  size?: number | string;
  /** Accepted and ignored — a lucide-only prop, so call sites need no edits. */
  strokeWidth?: number | string;
};

function breezeIcon(
  Svg: FC<SVGProps<SVGSVGElement>>,
  name: string,
): FC<BreezeIconProps> {
  const Icon = ({
    size,
    strokeWidth: _strokeWidth,
    ...props
  }: BreezeIconProps) => (
    <Svg
      aria-hidden={props["aria-label"] === undefined ? true : undefined}
      focusable="false"
      {...(size === undefined ? {} : { width: size, height: size })}
      {...props}
    />
  );
  Icon.displayName = `Breeze(${name})`;
  return Icon;
}

// --- icons, named after the lucide glyphs they replace ---

export const AlertCircle = breezeIcon(DialogWarningSvg, "dialog-warning");
export const Archive = breezeIcon(ArchiveInsertSvg, "archive-insert");
export const ArrowDown = breezeIcon(GoDownSvg, "go-down");
export const ArrowLeftRight = breezeIcon(
  ExchangePositionsSvg,
  "exchange-positions",
);
export const ArrowRightLeft = breezeIcon(
  ExchangePositionsSvg,
  "exchange-positions",
);
export const ArrowUp = breezeIcon(GoUpSvg, "go-up");
export const Bookmark = breezeIcon(BookmarksSvg, "bookmarks");
export const ChevronDown = breezeIcon(ArrowDownSvg, "arrow-down");
export const ChevronLeft = breezeIcon(ArrowLeftSvg, "arrow-left");
export const ChevronRight = breezeIcon(ArrowRightSvg, "arrow-right");
export const ChevronUp = breezeIcon(ArrowUpSvg, "arrow-up");
export const Clipboard = breezeIcon(EditPasteSvg, "edit-paste");
export const Clock = breezeIcon(ClockSvg, "clock");
export const Code = breezeIcon(TextXScriptSvg, "text-x-script");
export const Copy = breezeIcon(EditCopySvg, "edit-copy");
export const Download = breezeIcon(CloudDownloadSvg, "cloud-download");
export const Edit = breezeIcon(DocumentEditSvg, "document-edit");
export const Edit3 = breezeIcon(EditRenameSvg, "edit-rename");
export const ExternalLink = breezeIcon(WindowNewSvg, "window-new");
export const Eye = breezeIcon(ViewVisibleSvg, "view-visible");
export const EyeOff = breezeIcon(ViewHiddenSvg, "view-hidden");
export const File = breezeIcon(TextXGenericSvg, "text-x-generic");
export const FileArchive = breezeIcon(
  ApplicationXArchiveSvg,
  "application-x-archive",
);
export const FileAudio = breezeIcon(AudioXGenericSvg, "audio-x-generic");
export const FileImage = breezeIcon(ImageXGenericSvg, "image-x-generic");
export const FilePlus = breezeIcon(DocumentNewSvg, "document-new");
export const FileSymlink = breezeIcon(
  EmblemSymbolicLinkSvg,
  "emblem-symbolic-link",
);
export const FileText = breezeIcon(TextPlainSvg, "text-plain");
export const FileVideo = breezeIcon(VideoXGenericSvg, "video-x-generic");
export const Film = breezeIcon(VideoXGenericSvg, "video-x-generic");
export const Folder = breezeIcon(FolderSvg, "folder");
export const FolderPlus = breezeIcon(FolderNewSvg, "folder-new");
export const GitCompare = breezeIcon(VcsDiffSvg, "vcs-diff");
export const Grid3X3 = breezeIcon(ViewListIconsSvg, "view-list-icons");
export const Image = breezeIcon(ImageXGenericSvg, "image-x-generic");
export const Info = breezeIcon(DialogInformationSvg, "dialog-information");
export const Keyboard = breezeIcon(InputKeyboardSvg, "input-keyboard");
export const Layout = breezeIcon(
  ViewSplitLeftRightSvg,
  "view-split-left-right",
);
export const Link = breezeIcon(EditLinkSvg, "edit-link");
export const List = breezeIcon(ViewListDetailsSvg, "view-list-details");
export const Lock = breezeIcon(ObjectLockedSvg, "object-locked");
export const Maximize2 = breezeIcon(ViewFullscreenSvg, "view-fullscreen");
export const Minimize2 = breezeIcon(ViewRestoreSvg, "view-restore");
export const Minus = breezeIcon(ListRemoveSvg, "list-remove");
export const Move = breezeIcon(EditMoveSvg, "edit-move");
export const Music = breezeIcon(AudioXGenericSvg, "audio-x-generic");
export const Package = breezeIcon(PackageXGenericSvg, "package-x-generic");
export const Play = breezeIcon(MediaPlaybackStartSvg, "media-playback-start");
export const Plus = breezeIcon(ListAddSvg, "list-add");
export const RefreshCw = breezeIcon(ViewRefreshSvg, "view-refresh");
export const RotateCcw = breezeIcon(EditUndoSvg, "edit-undo");
export const Save = breezeIcon(DocumentSaveSvg, "document-save");
export const Scissors = breezeIcon(EditCutSvg, "edit-cut");
export const Search = breezeIcon(EditFindSvg, "edit-find");
export const Settings = breezeIcon(ConfigureSvg, "configure");
export const Shield = breezeIcon(SecurityHighSvg, "security-high");
export const Star = breezeIcon(FavoriteSvg, "favorite");
export const Terminal = breezeIcon(UtilitiesTerminalSvg, "utilities-terminal");
export const Trash2 = breezeIcon(EditDeleteSvg, "edit-delete");
export const Upload = breezeIcon(CloudUploadSvg, "cloud-upload");
export const X = breezeIcon(DialogCloseSvg, "dialog-close");
export const ZoomIn = breezeIcon(ZoomInSvg, "zoom-in");
export const ZoomOut = breezeIcon(ZoomOutSvg, "zoom-out");

/** Dolphin shows open folders differently in tree views; exported for the sidebar. */
export const FolderOpen = breezeIcon(FolderOpenSvg, "folder-open");

// --- file-type mapping ---

/**
 * Extension -> icon. Far wider than the eight categories the lucide version could express,
 * which is most of the visible gain: a .deb, a .sqlite and a .pem now look like themselves.
 *
 * A handful of extensions map to a generic icon because Breeze ships no specific one
 * (yaml, xz, webp, quicktime); that is deliberate, not an oversight.
 */
const EXTENSION_ICONS: Record<string, FC<BreezeIconProps>> = {
  "7z": breezeIcon(ApplicationX7zCompressedSvg, "application-x-7z-compressed"),
  appimage: breezeIcon(ApplicationXExecutableSvg, "application-x-executable"),
  avi: breezeIcon(VideoXGenericSvg, "video-x-generic"),
  bash: breezeIcon(ApplicationXShellscriptSvg, "application-x-shellscript"),
  bin: breezeIcon(ApplicationXExecutableSvg, "application-x-executable"),
  bmp: breezeIcon(ImageBmpSvg, "image-bmp"),
  bz2: breezeIcon(ApplicationXBzipSvg, "application-x-bzip"),
  c: breezeIcon(TextXCsrcSvg, "text-x-csrc"),
  cc: breezeIcon(TextXCxxsrcSvg, "text-x-cxxsrc"),
  cer: breezeIcon(ApplicationXX509CaCertSvg, "application-x-x509-ca-cert"),
  cjs: breezeIcon(ApplicationJavascriptSvg, "application-javascript"),
  conf: breezeIcon(TextXScriptSvg, "text-x-script"),
  config: breezeIcon(TextXScriptSvg, "text-x-script"),
  cpp: breezeIcon(TextXCxxsrcSvg, "text-x-cxxsrc"),
  crt: breezeIcon(ApplicationXX509CaCertSvg, "application-x-x509-ca-cert"),
  cs: breezeIcon(TextXCsharpSvg, "text-x-csharp"),
  css: breezeIcon(TextCssSvg, "text-css"),
  csv: breezeIcon(ApplicationVndMsExcelSvg, "application-vnd.ms-excel"),
  db: breezeIcon(ApplicationXSqlite3Svg, "application-x-sqlite3"),
  deb: breezeIcon(ApplicationXDebSvg, "application-x-deb"),
  doc: breezeIcon(ApplicationMswordSvg, "application-msword"),
  docx: breezeIcon(ApplicationMswordSvg, "application-msword"),
  env: breezeIcon(TextXScriptSvg, "text-x-script"),
  ex: breezeIcon(TextXScriptSvg, "text-x-script"),
  exe: breezeIcon(
    ApplicationXMsDosExecutableSvg,
    "application-x-ms-dos-executable",
  ),
  exs: breezeIcon(TextXScriptSvg, "text-x-script"),
  fish: breezeIcon(ApplicationXShellscriptSvg, "application-x-shellscript"),
  flac: breezeIcon(AudioFlacSvg, "audio-flac"),
  gif: breezeIcon(ImageGifSvg, "image-gif"),
  go: breezeIcon(TextXGoSvg, "text-x-go"),
  gz: breezeIcon(ApplicationXGzipSvg, "application-x-gzip"),
  h: breezeIcon(TextXChdrSvg, "text-x-chdr"),
  hpp: breezeIcon(TextXCxxhdrSvg, "text-x-cxxhdr"),
  htm: breezeIcon(TextHtmlSvg, "text-html"),
  html: breezeIcon(TextHtmlSvg, "text-html"),
  ico: breezeIcon(ImageXGenericSvg, "image-x-generic"),
  img: breezeIcon(ApplicationXCdImageSvg, "application-x-cd-image"),
  ini: breezeIcon(TextXScriptSvg, "text-x-script"),
  iso: breezeIcon(ApplicationXCdImageSvg, "application-x-cd-image"),
  java: breezeIcon(TextXJavaSvg, "text-x-java"),
  jpeg: breezeIcon(ImageJpegSvg, "image-jpeg"),
  jpg: breezeIcon(ImageJpegSvg, "image-jpeg"),
  js: breezeIcon(ApplicationJavascriptSvg, "application-javascript"),
  json: breezeIcon(ApplicationJsonSvg, "application-json"),
  jsx: breezeIcon(ApplicationJavascriptSvg, "application-javascript"),
  key: breezeIcon(ApplicationPgpKeysSvg, "application-pgp-keys"),
  log: breezeIcon(TextXLogSvg, "text-x-log"),
  m4a: breezeIcon(AudioXGenericSvg, "audio-x-generic"),
  markdown: breezeIcon(TextMarkdownSvg, "text-markdown"),
  md: breezeIcon(TextMarkdownSvg, "text-markdown"),
  mjs: breezeIcon(ApplicationJavascriptSvg, "application-javascript"),
  mkv: breezeIcon(VideoXMatroskaSvg, "video-x-matroska"),
  mov: breezeIcon(VideoXGenericSvg, "video-x-generic"),
  mp3: breezeIcon(AudioMpegSvg, "audio-mpeg"),
  mp4: breezeIcon(VideoMp4Svg, "video-mp4"),
  ogg: breezeIcon(AudioXGenericSvg, "audio-x-generic"),
  pdf: breezeIcon(ApplicationPdfSvg, "application-pdf"),
  pem: breezeIcon(ApplicationPgpKeysSvg, "application-pgp-keys"),
  php: breezeIcon(ApplicationXPhpSvg, "application-x-php"),
  png: breezeIcon(ImagePngSvg, "image-png"),
  ppt: breezeIcon(XOfficePresentationSvg, "x-office-presentation"),
  pptx: breezeIcon(XOfficePresentationSvg, "x-office-presentation"),
  pub: breezeIcon(ApplicationPgpKeysSvg, "application-pgp-keys"),
  py: breezeIcon(TextXPythonSvg, "text-x-python"),
  rar: breezeIcon(ApplicationXRarSvg, "application-x-rar"),
  rb: breezeIcon(ApplicationXRubySvg, "application-x-ruby"),
  readme: breezeIcon(TextMarkdownSvg, "text-markdown"),
  rpm: breezeIcon(ApplicationXRpmSvg, "application-x-rpm"),
  rs: breezeIcon(TextRustSvg, "text-rust"),
  scss: breezeIcon(TextCssSvg, "text-css"),
  sh: breezeIcon(ApplicationXShellscriptSvg, "application-x-shellscript"),
  sqlite: breezeIcon(ApplicationXSqlite3Svg, "application-x-sqlite3"),
  svg: breezeIcon(ImageSvgXmlSvg, "image-svg-xml"),
  tar: breezeIcon(ApplicationXTarSvg, "application-x-tar"),
  text: breezeIcon(TextPlainSvg, "text-plain"),
  tgz: breezeIcon(ApplicationXGzipSvg, "application-x-gzip"),
  toml: breezeIcon(TextXScriptSvg, "text-x-script"),
  ts: breezeIcon(TextXScriptSvg, "text-x-script"),
  tsx: breezeIcon(TextXScriptSvg, "text-x-script"),
  txt: breezeIcon(TextPlainSvg, "text-plain"),
  wav: breezeIcon(AudioXWavSvg, "audio-x-wav"),
  webm: breezeIcon(VideoXGenericSvg, "video-x-generic"),
  webp: breezeIcon(ImageXGenericSvg, "image-x-generic"),
  xls: breezeIcon(ApplicationVndMsExcelSvg, "application-vnd.ms-excel"),
  xlsx: breezeIcon(ApplicationVndMsExcelSvg, "application-vnd.ms-excel"),
  xml: breezeIcon(ApplicationXmlSvg, "application-xml"),
  xz: breezeIcon(ApplicationXArchiveSvg, "application-x-archive"),
  yaml: breezeIcon(TextXScriptSvg, "text-x-script"),
  yml: breezeIcon(TextXScriptSvg, "text-x-script"),
  zip: breezeIcon(ApplicationZipSvg, "application-zip"),
  zsh: breezeIcon(ApplicationXShellscriptSvg, "application-x-shellscript"),
};

/**
 * The icon for a directory entry. `type` mirrors the SFTP listing's own classification, so
 * symlinks and directories win over whatever the name happens to end in.
 */
export function getFileTypeIcon(
  name: string,
  type?: "file" | "directory" | "link" | string,
): FC<BreezeIconProps> {
  if (type === "directory") return Folder;
  if (type === "link") return FileSymlink;

  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === undefined || extension === name.toLowerCase()) return File;

  return EXTENSION_ICONS[extension] ?? File;
}
