import { config } from "../config.ts";
import { logInfo, logWarn } from "../log.ts";

/** Well-known local OpenAI-compatible servers by default port. */
const LOCAL_LLM_BY_PORT: Record<number, string> = {
  1234: "LM Studio",
  11434: "Ollama",
};

const CHECK_TIMEOUT_MS = 5_000;

function parseBaseUrl(raw: string): URL {
  try {
    return new URL(raw);
  } catch {
    throw new Error(`Invalid LLM_BASE_URL: ${raw}`);
  }
}

function portFromUrl(url: URL): number {
  if (url.port) {
    return Number(url.port);
  }
  return url.protocol === "https:" ? 443 : 80;
}

function modelsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/models`;
}

function failureHint(url: URL, provider: string): string {
  const hints = [
    `Start ${provider} and confirm it is listening.`,
    "With Compose `network_mode: host`, use loopback in LLM_BASE_URL (e.g. http://127.0.0.1:11434/v1), not host.docker.internal.",
  ];
  if (url.hostname === "host.docker.internal" || url.hostname === "localhost") {
    hints.push(
      `Current host is ${url.hostname}; prefer 127.0.0.1 when the bot shares the host network.`,
    );
  }
  return hints.join(" ");
}

/**
 * If LLM_BASE_URL uses a known local LLM port (LM Studio / Ollama), probe /models
 * so misconfigured Docker networking fails fast at startup.
 */
export async function checkLocalLlmConnectivity(): Promise<void> {
  const url = parseBaseUrl(config.llmBaseUrl);
  const port = portFromUrl(url);
  const provider = LOCAL_LLM_BY_PORT[port];
  if (!provider) {
    return;
  }

  const probeUrl = modelsUrl(config.llmBaseUrl);
  logInfo("Checking local LLM connectivity", {
    provider,
    url: probeUrl,
  });

  const headers: Record<string, string> = {};
  if (config.llmApiKey) {
    headers.Authorization = `Bearer ${config.llmApiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(probeUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot reach ${provider} at ${config.llmBaseUrl} (${detail}). ${failureHint(url, provider)}`,
    );
  }

  if (!response.ok) {
    // Some local servers reject unauthenticated /models but still accept chat;
    // treat auth/method errors as "reachable" and only fail hard on connect issues.
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      logWarn("Local LLM responded but /models check was not fully successful", {
        provider,
        status: response.status,
      });
      return;
    }
    const body = await response.text().catch(() => "");
    throw new Error(
      `Cannot reach ${provider} at ${config.llmBaseUrl} (HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}). ${failureHint(url, provider)}`,
    );
  }

  logInfo("Local LLM reachable", { provider, port });
}
