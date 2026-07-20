export type LogMeta = Record<string, string | number | boolean | null | undefined>;

function stamp(level: string, message: string, meta?: LogMeta): string {
  const base = `[${new Date().toISOString()}] ${level} ${message}`;
  if (!meta || Object.keys(meta).length === 0) {
    return base;
  }
  return `${base} ${JSON.stringify(meta)}`;
}

export function logInfo(message: string, meta?: LogMeta): void {
  console.log(stamp("INFO", message, meta));
}

export function logWarn(message: string, meta?: LogMeta): void {
  console.warn(stamp("WARN", message, meta));
}

export function logError(message: string, meta?: LogMeta, error?: unknown): void {
  console.error(stamp("ERROR", message, meta), error ?? "");
}
