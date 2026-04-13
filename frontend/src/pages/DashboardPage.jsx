import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  logout,
  me,
  renameDocument
} from "../api";

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingDocId, setEditingDocId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    async function boot() {
      try {
        const meRes = await me();
        setUser(meRes.user);
        const docsRes = await listDocuments();
        setDocuments(docsRes.documents || []);
      } catch (err) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, []);

  async function refreshDocuments() {
    const res = await listDocuments();
    setDocuments(res.documents || []);
  }

  async function handleCreateDocument() {
    setBusy(true);
    setError("");
    try {
      await createDocument("Untitled");
      await refreshDocuments();
    } catch (err) {
      setError(err.message || "Failed to create document");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDocument(id) {
    setBusy(true);
    setError("");
    try {
      await deleteDocument(id);
      await refreshDocuments();
    } catch (err) {
      setError(err.message || "Failed to delete document");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveRename(id) {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      setError("Title cannot be empty");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await renameDocument(id, nextTitle);
      setEditingDocId("");
      setEditingTitle("");
      await refreshDocuments();
    } catch (err) {
      setError(err.message || "Failed to rename document");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return <div className="center-card">Loading...</div>;
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h1>Your Documents</h1>
          <p className="subtle">Signed in as {user?.email || "Unknown"}</p>
        </div>
        <div className="actions">
          <button onClick={handleCreateDocument} disabled={busy}>New Document</button>
          <button className="ghost" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="doc-list">
        {documents.length === 0 && <p className="subtle">No documents yet. Create your first one.</p>}

        {documents.map((doc) => (
          <article className="doc-row" key={doc.id}>
            <div>
              {editingDocId === doc.id ? (
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleSaveRename(doc.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveRename(doc.id);
                    }
                    if (e.key === "Escape") {
                      setEditingDocId("");
                      setEditingTitle("");
                    }
                  }}
                />
              ) : (
                <h2
                  className="inline-edit"
                  onClick={() => {
                    setEditingDocId(doc.id);
                    setEditingTitle(doc.title);
                  }}
                >
                  {doc.title}
                </h2>
              )}
              <p className="subtle">Updated {formatDate(doc.updated_at)}</p>
            </div>
            <button className="danger" onClick={() => handleDeleteDocument(doc.id)} disabled={busy}>
              Delete
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
