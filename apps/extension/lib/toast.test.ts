import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { LobeToast } from "./toast";

function installDom() {
  const testWindow = new Window({ url: "https://x.com/home" });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: testWindow,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: testWindow.document,
  });
  return testWindow;
}

describe("on-page feedback prompt", () => {
  test("stays non-blocking and submits the selected intent with a reason", async () => {
    installDom();
    const toast = new LobeToast();
    const submissions: Array<{ intent: string; reason: string }> = [];

    toast.showFeedback({
      intents: ["learn", "reference", "build"],
      selectedIntent: "learn",
      onSubmit: async (intent, reason) => {
        submissions.push({ intent, reason });
      },
      onDismiss: async () => undefined,
    });

    expect(toast.host.style.pointerEvents).toBe("none");
    expect(toast.host.style.position).toBe("fixed");
    expect(toast.isFeedbackVisible()).toBe(true);
    expect(toast.root.querySelector(".prompt-expiry")?.textContent).toContain(
      "30 seconds",
    );
    expect(toast.root.querySelector(".detail")?.textContent).not.toContain(
      "HNSW",
    );

    const buttons = [
      ...toast.root.querySelectorAll<HTMLButtonElement>(".intent-list button"),
    ];
    buttons[2]?.click();
    const reason = toast.root.querySelector<HTMLTextAreaElement>("textarea")!;
    reason.value = "I want to recreate the indexing approach.";
    toast.root.querySelector<HTMLButtonElement>(".submit")?.click();
    await Promise.resolve();

    expect(submissions[0]).toEqual({
      intent: "build",
      reason: "I want to recreate the indexing approach.",
    });
  });

  test("requires a useful explanation before submitting", async () => {
    installDom();
    const toast = new LobeToast();
    let submissions = 0;

    toast.showFeedback({
      intents: ["reference", "learn"],
      selectedIntent: "reference",
      onSubmit: async () => {
        submissions += 1;
      },
      onDismiss: async () => undefined,
    });

    toast.root.querySelector<HTMLButtonElement>(".submit")?.click();
    await Promise.resolve();

    expect(submissions).toBe(0);
    expect(toast.root.querySelector(".prompt-error")?.textContent).toContain(
      "short reason",
    );
  });

  test("closes immediately when the user chooses Not now", async () => {
    installDom();
    const toast = new LobeToast();
    let dismissals = 0;

    toast.showFeedback({
      intents: ["reference", "learn"],
      selectedIntent: "reference",
      onSubmit: async () => undefined,
      onDismiss: async () => {
        dismissals += 1;
        toast.dismiss();
      },
    });

    toast.root.querySelector<HTMLButtonElement>(".quiet")?.click();
    await Promise.resolve();

    expect(dismissals).toBe(1);
    expect(toast.isVisible()).toBe(false);
  });
});
