export interface Connection {
  apiUrl: string;
  apiToken: string;
}

const STORAGE_KEY = "lobe:web:connection";

const environmentConnection: Connection = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  apiToken: import.meta.env.VITE_API_TOKEN ?? "",
};

export function loadConnection(): Connection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return environmentConnection;
    const parsed = JSON.parse(stored) as Partial<Connection>;
    return {
      apiUrl: parsed.apiUrl?.trim() || environmentConnection.apiUrl,
      apiToken: parsed.apiToken ?? environmentConnection.apiToken,
    };
  } catch {
    return environmentConnection;
  }
}

export function storeConnection(connection: Connection): Connection {
  const normalized = {
    apiUrl: connection.apiUrl.replace(/\/$/, ""),
    apiToken: connection.apiToken.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
