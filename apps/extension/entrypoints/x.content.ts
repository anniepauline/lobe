import "@fontsource-variable/geist";

import {
  bundledXRecipe,
  DEFAULT_EXTENSION_SETTINGS,
  intentById,
  type CapturedPost,
  type ExtensionSettings,
  type Save,
  type SelectorRecipe,
} from "@lobe/shared";

import { sendExtensionMessage } from "../lib/messaging";
import { LobeToast } from "../lib/toast";
import { createRecipeFailure } from "../lib/x/dom-sketch";
import { extractPost } from "../lib/x/extract";
import { capturePostScreenshot } from "../lib/x/screenshot";

interface BookmarkInteraction {
  kind: "save" | "remove";
  post: HTMLElement;
  recipe: SelectorRecipe;
}

function closestElement(target: Element, selector: string): HTMLElement | null {
  try {
    return target.closest<HTMLElement>(selector);
  } catch {
    return null;
  }
}

function findInteraction(
  target: Element,
  activeRecipe: SelectorRecipe,
): BookmarkInteraction | null {
  for (const recipe of [activeRecipe, bundledXRecipe]) {
    const unsavedControl = closestElement(
      target,
      recipe.selectors.unsavedControl,
    );
    const savedControl = closestElement(target, recipe.selectors.savedControl);
    const control = unsavedControl ?? savedControl;
    const post = control
      ? closestElement(control, recipe.selectors.post)
      : null;

    if (post) {
      return {
        kind: unsavedControl ? "save" : "remove",
        post,
        recipe,
      };
    }
  }

  return null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function waitUntilOrganized(initial: Save): Promise<Save> {
  let current = initial;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (current.status === "ready" || current.status === "failed") {
      return current;
    }

    await delay(1_000);
    current = await sendExtensionMessage<Save>({
      type: "save:get",
      id: current.id,
    });
  }

  return current;
}

function showIntentReview(toast: LobeToast, save: Save): void {
  const candidates = [
    ...new Set(
      save.intent
        ? [save.intent, ...save.suggestedIntents]
        : save.suggestedIntents,
    ),
  ].slice(0, 3);
  const selectedIntent = save.intent ?? candidates[0];
  if (!selectedIntent || candidates.length === 0) {
    return;
  }

  toast.showFeedback({
    intents: candidates,
    selectedIntent,
    onSubmit: async (intent, reason) => {
      await sendExtensionMessage<Save>({
        type: "save:feedback",
        id: save.id,
        intent,
        reason,
      });
      toast.show({
        title: `Learning your ${intentById[intent].label.toLocaleLowerCase()} pattern`,
        detail: "This save is being reprocessed in the background.",
        tone: "success",
      });
    },
    onDismiss: async () => {
      toast.dismiss();
      await sendExtensionMessage<Save>({
        type: "save:feedback:dismiss",
        id: save.id,
      }).catch((error: unknown) => {
        console.debug("Lobe could not persist the dismissed review", error);
      });
    },
  });
}

function showOrganized(
  toast: LobeToast,
  save: Save,
  settings: ExtensionSettings,
): void {
  if (save.status === "failed") {
    toast.show({
      title: "Saved, but organization failed",
      detail: save.failureReason ?? "Lobe will keep the original post.",
      tone: "error",
    });
    return;
  }

  if (
    save.needsReview &&
    !save.reviewDismissedAt &&
    save.suggestedIntents.length > 0
  ) {
    showIntentReview(toast, save);
    return;
  }

  if (!settings.showConfirmation) {
    toast.dismiss();
    return;
  }

  if (save.status !== "ready" || !save.intent) {
    toast.show({
      title: "Saved to Lobe",
      detail: "Organization is continuing in the background.",
      tone: "success",
    });
    return;
  }

  toast.show({
    title: `Saved to ${intentById[save.intent].label}`,
    detail: save.summary ?? undefined,
    tone: "success",
  });
}

async function savePost(
  toast: LobeToast,
  capture: CapturedPost,
  post: HTMLElement,
  settings: ExtensionSettings,
  isCancelled: () => boolean,
): Promise<void> {
  if (!settings.apiToken.trim()) {
    toast.show({
      title: "Connect Lobe to start saving",
      detail: "Add your server token once, then use X normally.",
      buttons: [
        {
          label: "Open settings",
          onClick: () => void browser.runtime.openOptionsPage(),
        },
      ],
    });
    return;
  }

  if (settings.showConfirmation) {
    toast.show({ title: "Saving to Lobe…", duration: 0 });
  }

  const saved = await sendExtensionMessage<Save>({
    type: "save:create",
    capture,
  });

  if (settings.showConfirmation) {
    toast.show({
      title: "Saved to Lobe",
      detail: "Organization is continuing in the background.",
      tone: "success",
    });
  }

  if (settings.captureScreenshot) {
    void capturePostScreenshot(post)
      .then(async (captured) => {
        if (!captured || isCancelled()) return;
        await sendExtensionMessage({
          type: "save:screenshot",
          id: saved.id,
          screenshot: captured,
        });
      })
      .catch((error: unknown) => {
        console.debug("Lobe could not attach the post screenshot", error);
      });
  }

  void waitUntilOrganized(saved)
    .then((organized) => {
      if (!isCancelled()) {
        showOrganized(toast, organized, settings);
      }
    })
    .catch((error: unknown) => {
      if (!isCancelled()) {
        toast.show({
          title: "Saved, but the result is not ready yet",
          detail: error instanceof Error ? error.message : undefined,
          tone: "error",
        });
      }
    });
}

async function removePost(
  toast: LobeToast,
  canonicalUrl: string,
  settings: ExtensionSettings,
  pendingSave: Promise<void> | undefined,
): Promise<void> {
  if (!settings.apiToken.trim()) {
    return;
  }

  await pendingSave?.catch(() => undefined);
  await sendExtensionMessage<{ removed: true }>({
    type: "save:remove",
    canonicalUrl,
  });

  if (settings.showConfirmation) {
    toast.show({ title: "Removed from Lobe" });
  }
}

function hasSelector(document: Document, selector: string): boolean {
  try {
    return Boolean(document.querySelector(selector));
  } catch {
    return false;
  }
}

export default defineContentScript({
  matches: ["https://x.com/*", "https://twitter.com/*"],
  runAt: "document_start",
  main() {
    const toast = new LobeToast();
    let activeRecipe = bundledXRecipe;
    const pendingSaves = new Map<string, Promise<void>>();
    const cancelledSaves = new Set<string>();
    const reportedLayouts = new Set<string>();

    void sendExtensionMessage<SelectorRecipe>({ type: "recipe:get" }).then(
      (recipe) => {
        activeRecipe = recipe;
      },
    );
    document.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) {
          return;
        }

        const interaction = findInteraction(event.target, activeRecipe);
        if (!interaction) {
          return;
        }

        const capture = extractPost(
          interaction.post,
          interaction.recipe,
          location.href,
        );
        if (!capture) {
          toast.show({
            title: "Lobe could not read this post",
            detail: "The X layout will be checked in the background.",
            tone: "error",
          });
          return;
        }

        if (interaction.kind === "save") {
          if (pendingSaves.has(capture.canonicalUrl)) {
            return;
          }

          cancelledSaves.delete(capture.canonicalUrl);
          const task = sendExtensionMessage<ExtensionSettings>({
            type: "settings:get",
          })
            .catch(() => DEFAULT_EXTENSION_SETTINGS)
            .then((settings) =>
              savePost(toast, capture, interaction.post, settings, () =>
                cancelledSaves.has(capture.canonicalUrl),
              ),
            )
            .catch((error: unknown) => {
              if (!cancelledSaves.has(capture.canonicalUrl)) {
                toast.show({
                  title: "Could not sync this bookmark",
                  detail: error instanceof Error ? error.message : undefined,
                  tone: "error",
                });
              }
            })
            .finally(() => pendingSaves.delete(capture.canonicalUrl));
          pendingSaves.set(capture.canonicalUrl, task);
          return;
        }

        cancelledSaves.add(capture.canonicalUrl);
        void sendExtensionMessage<ExtensionSettings>({ type: "settings:get" })
          .catch(() => DEFAULT_EXTENSION_SETTINGS)
          .then((settings) =>
            removePost(
              toast,
              capture.canonicalUrl,
              settings,
              pendingSaves.get(capture.canonicalUrl),
            ),
          )
          .catch((error: unknown) => {
            toast.show({
              title: "Could not remove this bookmark",
              detail: error instanceof Error ? error.message : undefined,
              tone: "error",
            });
          });
      },
      true,
    );

    const checkRecipe = async () => {
      if (
        !document.querySelector("article, [role=article]") ||
        hasSelector(document, activeRecipe.selectors.unsavedControl) ||
        hasSelector(document, activeRecipe.selectors.savedControl)
      ) {
        return;
      }

      const failure = await createRecipeFailure(document, activeRecipe);
      if (!failure || reportedLayouts.has(failure.layoutFingerprint)) {
        return;
      }

      reportedLayouts.add(failure.layoutFingerprint);
      await sendExtensionMessage({ type: "recipe:failure", failure }).catch(
        () => undefined,
      );
    };

    window.setTimeout(() => void checkRecipe(), 8_000);
    window.setInterval(() => void checkRecipe(), 30_000);
  },
});
