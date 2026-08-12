import type { ExtensionRequest, ExtensionResponse } from "@lobe/shared";

export async function sendExtensionMessage<T>(
  request: ExtensionRequest,
): Promise<T> {
  const response = (await browser.runtime.sendMessage(
    request,
  )) as ExtensionResponse<T>;

  if (!response?.ok) {
    throw new Error(response?.error ?? "Lobe did not respond.");
  }

  return response.data;
}
