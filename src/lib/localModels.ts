/**
 * The voice (Kokoro) and dictation (Whisper) models ship with the app in
 * public/models/, so nothing has to download from Hugging Face at runtime.
 * kokoro-js and transformers.js still *request* huggingface.co URLs
 * internally (some are hardcoded), so workers install this fetch wrapper:
 * requests for vendored repos are served from the app's own origin, and
 * anything else — or a missing local file — falls through to the network.
 */
const VENDORED = new Set([
  "onnx-community/Kokoro-82M-v1.0-ONNX",
  "onnx-community/whisper-base",
]);

const HF_FILE =
  /^https:\/\/huggingface\.co\/((?:[^/]+)\/(?:[^/]+))\/resolve\/[^/]+\/([^?]+)(?:\?.*)?$/;

export function installLocalModelFetch(): void {
  const original = self.fetch.bind(self);
  self.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const match = url.match(HF_FILE);
    if (match && VENDORED.has(match[1])) {
      const local = `${self.location.origin}${import.meta.env.BASE_URL}models/${match[1]}/${match[2]}`;
      try {
        const response = await original(local, init);
        if (response.ok) return response;
      } catch {
        // fall through to the network
      }
    }
    return original(input as RequestInfo, init);
  };
}
