# Breeze icons (vendored)

The file manager uses the KDE Breeze icon theme — the icon set Dolphin ships with.
Breeze is not published to npm, so the SVGs below are checked in.

|          |                                            |
| -------- | ------------------------------------------ |
| Upstream | https://github.com/KDE/breeze-icons.git    |
| Branch   | `Frameworks/6.24`                          |
| Commit   | `3264ddc07cea5d6a0029196b9fd404bdc1a2003f` |
| Icons    | 107                                        |

## Licence

Breeze icons are licensed **LGPL-3.0-or-later**. The upstream licence texts are vendored
alongside the assets as `COPYING-ICONS` and `COPYING.LIB`; do not remove them.

Copyright (C) 2014 Uri Herrera <uri_herrera@nitrux.in> and others.

## Modifications

Monochrome icons had their embedded `current-color-scheme` stylesheet removed so that the
`fill:currentColor` paths inherit the ambient CSS colour, making one asset work in both light
and dark themes. No other changes. Full-colour mimetype icons are byte-identical to upstream.

## Refreshing

```sh
node scripts/vendor-breeze-icons.mjs
```

## Vendored icons

| File                                  | Upstream path                                            |
| ------------------------------------- | -------------------------------------------------------- |
| `application-javascript.svg`          | `icons/mimetypes/22/application-javascript.svg`          |
| `application-json.svg`                | `icons/mimetypes/22/application-json.svg`                |
| `application-msword.svg`              | `icons/mimetypes/22/application-msword.svg`              |
| `application-pdf.svg`                 | `icons/mimetypes/22/application-pdf.svg`                 |
| `application-pgp-keys.svg`            | `icons/mimetypes/22/application-pgp-keys.svg`            |
| `application-vnd.ms-excel.svg`        | `icons/mimetypes/22/application-vnd.ms-excel.svg`        |
| `application-x-7z-compressed.svg`     | `icons/mimetypes/22/application-x-7z-compressed.svg`     |
| `application-x-archive.svg`           | `icons/mimetypes/22/application-x-archive.svg`           |
| `application-x-bzip.svg`              | `icons/mimetypes/22/application-x-bzip.svg`              |
| `application-x-cd-image.svg`          | `icons/mimetypes/22/application-x-cd-image.svg`          |
| `application-x-deb.svg`               | `icons/mimetypes/22/application-x-deb.svg`               |
| `application-x-executable.svg`        | `icons/mimetypes/22/application-x-executable.svg`        |
| `application-x-gzip.svg`              | `icons/mimetypes/22/application-x-gzip.svg`              |
| `application-x-ms-dos-executable.svg` | `icons/mimetypes/22/application-x-ms-dos-executable.svg` |
| `application-x-php.svg`               | `icons/mimetypes/22/application-x-php.svg`               |
| `application-x-rar.svg`               | `icons/mimetypes/22/application-x-rar.svg`               |
| `application-x-rpm.svg`               | `icons/mimetypes/22/application-x-rpm.svg`               |
| `application-x-ruby.svg`              | `icons/mimetypes/22/application-x-ruby.svg`              |
| `application-x-shellscript.svg`       | `icons/mimetypes/22/application-x-shellscript.svg`       |
| `application-x-sqlite3.svg`           | `icons/mimetypes/22/application-x-sqlite3.svg`           |
| `application-x-tar.svg`               | `icons/mimetypes/22/application-x-tar.svg`               |
| `application-x-x509-ca-cert.svg`      | `icons/mimetypes/22/application-x-x509-ca-cert.svg`      |
| `application-xml.svg`                 | `icons/mimetypes/22/application-xml.svg`                 |
| `application-zip.svg`                 | `icons/mimetypes/22/application-zip.svg`                 |
| `archive-insert.svg`                  | `icons/actions/22/archive-insert.svg`                    |
| `arrow-down.svg`                      | `icons/actions/22/arrow-down.svg`                        |
| `arrow-left.svg`                      | `icons/actions/22/arrow-left.svg`                        |
| `arrow-right.svg`                     | `icons/actions/22/arrow-right.svg`                       |
| `arrow-up.svg`                        | `icons/actions/22/arrow-up.svg`                          |
| `audio-flac.svg`                      | `icons/mimetypes/22/audio-flac.svg`                      |
| `audio-mpeg.svg`                      | `icons/mimetypes/22/audio-mpeg.svg`                      |
| `audio-x-generic.svg`                 | `icons/mimetypes/22/audio-x-generic.svg`                 |
| `audio-x-wav.svg`                     | `icons/mimetypes/22/audio-x-wav.svg`                     |
| `bookmarks.svg`                       | `icons/actions/22/bookmarks.svg`                         |
| `clock.svg`                           | `icons/actions/22/clock.svg`                             |
| `cloud-download.svg`                  | `icons/actions/22/cloud-download.svg`                    |
| `cloud-upload.svg`                    | `icons/actions/22/cloud-upload.svg`                      |
| `configure.svg`                       | `icons/actions/22/configure.svg`                         |
| `dialog-close.svg`                    | `icons/actions/22/dialog-close.svg`                      |
| `dialog-information.svg`              | `icons/status/22/dialog-information.svg`                 |
| `dialog-warning.svg`                  | `icons/status/22/dialog-warning.svg`                     |
| `document-edit.svg`                   | `icons/actions/22/document-edit.svg`                     |
| `document-new.svg`                    | `icons/actions/22/document-new.svg`                      |
| `document-save.svg`                   | `icons/actions/22/document-save.svg`                     |
| `edit-copy.svg`                       | `icons/actions/22/edit-copy.svg`                         |
| `edit-cut.svg`                        | `icons/actions/22/edit-cut.svg`                          |
| `edit-delete.svg`                     | `icons/actions/22/edit-delete.svg`                       |
| `edit-find.svg`                       | `icons/actions/22/edit-find.svg`                         |
| `edit-link.svg`                       | `icons/actions/22/edit-link.svg`                         |
| `edit-move.svg`                       | `icons/actions/22/edit-move.svg`                         |
| `edit-paste.svg`                      | `icons/actions/22/edit-paste.svg`                        |
| `edit-rename.svg`                     | `icons/actions/22/edit-rename.svg`                       |
| `edit-undo.svg`                       | `icons/actions/22/edit-undo.svg`                         |
| `emblem-symbolic-link.svg`            | `icons/emblems/22/emblem-symbolic-link.svg`              |
| `exchange-positions.svg`              | `icons/actions/22/exchange-positions.svg`                |
| `favorite.svg`                        | `icons/actions/22/favorite.svg`                          |
| `folder.svg`                          | `icons/places/22/folder.svg`                             |
| `folder-new.svg`                      | `icons/actions/22/folder-new.svg`                        |
| `folder-open.svg`                     | `icons/places/22/folder-open.svg`                        |
| `go-down.svg`                         | `icons/actions/22/go-down.svg`                           |
| `go-up.svg`                           | `icons/actions/22/go-up.svg`                             |
| `image-bmp.svg`                       | `icons/mimetypes/22/image-bmp.svg`                       |
| `image-gif.svg`                       | `icons/mimetypes/22/image-gif.svg`                       |
| `image-jpeg.svg`                      | `icons/mimetypes/22/image-jpeg.svg`                      |
| `image-png.svg`                       | `icons/mimetypes/22/image-png.svg`                       |
| `image-svg-xml.svg`                   | `icons/mimetypes/22/image-svg+xml.svg`                   |
| `image-x-generic.svg`                 | `icons/mimetypes/22/image-x-generic.svg`                 |
| `input-keyboard.svg`                  | `icons/devices/22/input-keyboard.svg`                    |
| `list-add.svg`                        | `icons/actions/22/list-add.svg`                          |
| `list-remove.svg`                     | `icons/actions/22/list-remove.svg`                       |
| `media-playback-start.svg`            | `icons/actions/22/media-playback-start.svg`              |
| `object-locked.svg`                   | `icons/actions/22/object-locked.svg`                     |
| `package-x-generic.svg`               | `icons/mimetypes/22/package-x-generic.svg`               |
| `security-high.svg`                   | `icons/status/22/security-high.svg`                      |
| `text-css.svg`                        | `icons/mimetypes/22/text-css.svg`                        |
| `text-html.svg`                       | `icons/mimetypes/22/text-html.svg`                       |
| `text-markdown.svg`                   | `icons/mimetypes/22/text-markdown.svg`                   |
| `text-plain.svg`                      | `icons/mimetypes/22/text-plain.svg`                      |
| `text-rust.svg`                       | `icons/mimetypes/22/text-rust.svg`                       |
| `text-x-cxxhdr.svg`                   | `icons/mimetypes/22/text-x-c++hdr.svg`                   |
| `text-x-cxxsrc.svg`                   | `icons/mimetypes/22/text-x-c++src.svg`                   |
| `text-x-chdr.svg`                     | `icons/mimetypes/22/text-x-chdr.svg`                     |
| `text-x-csharp.svg`                   | `icons/mimetypes/22/text-x-csharp.svg`                   |
| `text-x-csrc.svg`                     | `icons/mimetypes/22/text-x-csrc.svg`                     |
| `text-x-generic.svg`                  | `icons/mimetypes/22/text-x-generic.svg`                  |
| `text-x-go.svg`                       | `icons/mimetypes/16/text-x-go.svg`                       |
| `text-x-java.svg`                     | `icons/mimetypes/22/text-x-java.svg`                     |
| `text-x-log.svg`                      | `icons/mimetypes/22/text-x-log.svg`                      |
| `text-x-python.svg`                   | `icons/mimetypes/22/text-x-python.svg`                   |
| `text-x-script.svg`                   | `icons/mimetypes/22/text-x-script.svg`                   |
| `utilities-terminal.svg`              | `icons/apps/22/utilities-terminal.svg`                   |
| `vcs-diff.svg`                        | `icons/actions/22/vcs-diff.svg`                          |
| `video-mp4.svg`                       | `icons/mimetypes/22/video-mp4.svg`                       |
| `video-x-generic.svg`                 | `icons/mimetypes/22/video-x-generic.svg`                 |
| `video-x-matroska.svg`                | `icons/mimetypes/22/video-x-matroska.svg`                |
| `view-fullscreen.svg`                 | `icons/actions/22/view-fullscreen.svg`                   |
| `view-hidden.svg`                     | `icons/actions/22/view-hidden.svg`                       |
| `view-list-details.svg`               | `icons/actions/22/view-list-details.svg`                 |
| `view-list-icons.svg`                 | `icons/actions/22/view-list-icons.svg`                   |
| `view-refresh.svg`                    | `icons/actions/22/view-refresh.svg`                      |
| `view-restore.svg`                    | `icons/actions/22/view-restore.svg`                      |
| `view-split-left-right.svg`           | `icons/actions/22/view-split-left-right.svg`             |
| `view-visible.svg`                    | `icons/actions/22/view-visible.svg`                      |
| `window-new.svg`                      | `icons/actions/22/window-new.svg`                        |
| `x-office-presentation.svg`           | `icons/mimetypes/22/x-office-presentation.svg`           |
| `zoom-in.svg`                         | `icons/actions/22/zoom-in.svg`                           |
| `zoom-out.svg`                        | `icons/actions/22/zoom-out.svg`                          |
