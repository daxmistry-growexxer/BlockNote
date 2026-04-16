const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000/api";

let accessToken = sessionStorage.getItem("accessToken") || "";

localStorage.removeItem("accessToken");
localStorage.removeItem("refreshToken");

export function saveTokens(tokens) {
  accessToken = tokens.accessToken || "";
  if (accessToken) sessionStorage.setItem("accessToken", accessToken);
  else sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function clearTokens() {
  saveTokens({ accessToken: "" });
}

export function hasToken() {
  return Boolean(accessToken);
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Server returned a non-JSON response");
  }
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
    credentials: "include",
    headers
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      return request(path, options, false);
    }
  }

  if (!response.ok) {
    let message = "Request failed";
    const bodyText = await response.text();
    if (bodyText) {
      try {
        const body = JSON.parse(bodyText);
        if (body?.message) {
          message = body.message;
        }
      } catch {
        message = bodyText.slice(0, 160);
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return parseJsonResponse(response);
}

export async function refreshAuthToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await parseJsonResponse(response);
    if (!data?.accessToken) {
      clearTokens();
      return false;
    }

    saveTokens(data);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function register(payload) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);

  if (!data?.accessToken) {
    throw new Error("Registration response is invalid. Check VITE_API_BASE_URL and backend auth route.");
  }

  saveTokens(data);
  return data;
}

export async function login(payload) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }, false);

  if (!data?.accessToken) {
    throw new Error("Login response is invalid. Check VITE_API_BASE_URL and backend auth route.");
  }

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

export async function getDocument(id) {
  return request(`/documents/${id}`);
}

export async function enableDocumentShare(id) {
  return request(`/documents/${id}/share`, {
    method: "POST"
  });
}

export async function disableDocumentShare(id) {
  return request(`/documents/${id}/share`, {
    method: "DELETE"
  });
}

export async function listBlocks(documentId) {
  return request(`/documents/${documentId}/blocks`);
}

export async function createBlock(documentId, payload) {
  return request(`/documents/${documentId}/blocks`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateBlock(documentId, blockId, payload, options = {}) {
  return request(`/documents/${documentId}/blocks/${blockId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    ...options,
    signal: options.signal
  });
}

export async function deleteBlock(documentId, blockId) {
  return request(`/documents/${documentId}/blocks/${blockId}`, {
    method: "DELETE"
  });
}

export async function reorderBlock(documentId, blockId, payload) {
  return request(`/documents/${documentId}/blocks/${blockId}/reorder`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function getSharedDocument(token) {
  return request(`/documents/share/${token}`, {}, false);
}

export async function listSharedBlocks(token) {
  return request(`/documents/share/${token}/blocks`, {}, false);
}
