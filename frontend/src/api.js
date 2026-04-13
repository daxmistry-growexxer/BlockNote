const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

let accessToken = localStorage.getItem("accessToken") || "";
let refreshToken = localStorage.getItem("refreshToken") || "";

export function saveTokens(tokens) {
  accessToken = tokens.accessToken || "";
  refreshToken = tokens.refreshToken || "";
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  else localStorage.removeItem("accessToken");
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  else localStorage.removeItem("refreshToken");
}

export function clearTokens() {
  saveTokens({ accessToken: "", refreshToken: "" });
}

export function hasToken() {
  return Boolean(accessToken);
}

async function request(path, options = {}, retry = true) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && retry && refreshToken) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      return request(path, options, false);
    }
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      // Ignore JSON parse errors for non-JSON responses.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function refreshAuthToken() {
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    saveTokens(data);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
}

export async function login(payload) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);
  saveTokens(data);
  return data;
}

export async function me() {
  return request("/auth/me");
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    clearTokens();
  }
}

export async function listDocuments() {
  return request("/documents");
}

export async function createDocument(title = "Untitled") {
  return request("/documents", {
    method: "POST",
    body: JSON.stringify({ title })
  });
}

export async function renameDocument(id, title) {
  return request(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title })
  });
}

export async function deleteDocument(id) {
  return request(`/documents/${id}`, {
    method: "DELETE"
  });
}
