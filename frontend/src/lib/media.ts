const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";
let apiOrigin: string;

try {
  const parsed = new URL(apiUrl);
  apiOrigin = parsed.origin;
} catch {
  apiOrigin = "http://localhost:8080";
}

const MEDIA_PROTOCOL_REGEX = /^(https?:)?\/\//i;

export function resolveMediaUrl(input?: string | null): string {
  if (!input) {
    return "";
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (MEDIA_PROTOCOL_REGEX.test(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${apiOrigin}${normalizedPath}`;
}
