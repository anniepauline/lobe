import { useEffect, useState } from "react";

import type { LobeApi } from "./api";
import type { Save } from "@lobe/shared";

export function useDebouncedValue<T>(value: T, delay = 260): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debounced;
}

export function useSaveImage(save: Save, api: LobeApi): string | null {
  const mediaUrl =
    save.media.find((item) => item.type === "image")?.url ?? null;
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mediaUrl || !save.screenshotUrl) {
      setScreenshotUrl(null);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;
    void api
      .screenshotUrl(save, controller.signal)
      .then((url) => {
        objectUrl = url;
        setScreenshotUrl(url);
      })
      .catch(() => setScreenshotUrl(null));

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [api, mediaUrl, save]);

  return mediaUrl ?? screenshotUrl;
}
