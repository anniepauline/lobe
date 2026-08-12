import type { Screenshot } from "@lobe/shared";
import { toJpeg } from "html-to-image";

const MAX_SCREENSHOT_BYTES = 5_000_000;

export async function capturePostScreenshot(
  post: HTMLElement,
): Promise<Screenshot | null> {
  try {
    const bounds = post.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) {
      return null;
    }

    const dataUrl = await toJpeg(post, {
      backgroundColor: getComputedStyle(post).backgroundColor || "#ffffff",
      cacheBust: false,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      quality: 0.84,
      skipAutoScale: true,
    });

    if (dataUrl.length > MAX_SCREENSHOT_BYTES) {
      return null;
    }

    return {
      dataUrl,
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
  } catch (error) {
    console.debug("Lobe could not capture this post image", error);
    return null;
  }
}
