import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { AudioPreview } from "./AudioPreview";

/**
 * Stands in for react-h5-audio-player, calling the prop the real component calls:
 * `onLoadedMetaData`, capital D. A component passing `onLoadedMetadata` gets nothing — which is
 * exactly what happened, so the preview pane never learned the size to give an audio file.
 */
vi.mock("react-h5-audio-player", () => ({
  default: (props: { onLoadedMetaData?: () => void }) => {
    props.onLoadedMetaData?.();
    return <div data-testid="audio-player" />;
  },
}));

vi.mock("react-h5-audio-player/lib/styles.css", () => ({}));

// The breeze icons are data-URI custom elements; jsdom rejects the tag name. Not what is under
// test here.
vi.mock("@/assets/icons/breeze", () => ({
  Music: () => <span data-testid="music-icon" />,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("AudioPreview", () => {
  it("reports its dimensions once metadata loads", () => {
    const onMediaDimensionsChange = vi.fn();

    render(
      <AudioPreview
        file={{ name: "song.mp3", size: 1024 }}
        content=""
        color="pink"
        onMediaDimensionsChange={onMediaDimensionsChange}
      />,
    );

    expect(onMediaDimensionsChange).toHaveBeenCalledWith({
      width: 600,
      height: 400,
    });
  });
});
