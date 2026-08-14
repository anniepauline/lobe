function comesFromLobe(event: Event): boolean {
  return event.composedPath().some(
    (target) =>
      target instanceof HTMLElement && target.dataset.lobeUi === "toast",
  );
}

export default defineContentScript({
  matches: ["https://x.com/*", "https://twitter.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    for (const eventType of ["keydown", "keypress", "keyup"]) {
      window.addEventListener(
        eventType,
        (event) => {
          if (comesFromLobe(event)) {
            event.stopImmediatePropagation();
          }
        },
        true,
      );
    }
  },
});
