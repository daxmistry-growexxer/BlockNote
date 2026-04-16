import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FilePlus2, FileText, LogOut, PencilLine, Search, Trash2, X } from "lucide-react";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  logout,
  me,
  renameDocument
} from "../api";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getInitials(email) {
  if (!email) return "BN";
  return email.slice(0, 2).toUpperCase();
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc) => String(doc.title || "").toLowerCase().includes(query));
  }, [documents, searchQuery]);

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
      toast.success("Document created");
      await refreshDocuments();
    } catch (err) {
      toast.error(err.message || "Failed to create document");
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
      toast.success("Document deleted");
      await refreshDocuments();
    } catch (err) {
      toast.error(err.message || "Failed to delete document");
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
      toast.success("Title updated");
      await refreshDocuments();
    } catch (err) {
      toast.error(err.message || "Failed to rename document");
      setError(err.message || "Failed to rename document");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-sm border-border/80 bg-card/95">
          <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Loading your workspace...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="page-shell py-4 sm:py-6">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit border-border/80 bg-card/95 lg:sticky lg:top-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 rounded-xl px-2 py-1">
              <Avatar>
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.email || "Unknown user"}</p>
                <p className="text-xs text-muted-foreground">Personal workspace</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Button className="w-full justify-start rounded-xl" onClick={handleCreateDocument} disabled={busy}>
                <FilePlus2 className="h-4 w-4" />
                New document
              </Button>
              <Button variant="ghost" className="w-full justify-start rounded-xl" onClick={handleLogout} disabled={busy}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full px-3 py-1">Workspace</Badge>
              <div className="rounded-2xl border border-border/80 bg-secondary/50 p-4">
                <p className="text-sm font-medium">Documents</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Create, rename, and open pages without changing any existing logic.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[80vh] border-border/80 bg-background/95">
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 border-b border-border/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Documents</p>
                <h1 className="text-3xl font-semibold tracking-[-0.05em]">Your documents</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  Same functionality, cleaner hierarchy. Click a title to rename it.
                </p>
              </div>
              <div className="flex items-center gap-2">
                  <div className="relative w-full md:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search documents"
                      className="h-11 rounded-xl border-border/80 bg-secondary/40 pl-9 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/80 focus-visible:bg-background"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                <Button onClick={handleCreateDocument} disabled={busy} className="rounded-xl">
                  <FilePlus2 className="h-4 w-4" />
                  New
                </Button>
              </div>
            </div>

            {error ? (
              <div className="px-5 pt-5">
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </div>
              </div>
            ) : null}

            <ScrollArea className="h-[calc(80vh-120px)]">
              <div className="space-y-2 p-4">
                {documents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-foreground">No documents yet</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Create your first one to start writing.</p>
                  </div>
                ) : null}

                {documents.length > 0 && filteredDocuments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-foreground">No matching documents</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Try a different name or clear the search field.
                    </p>
                  </div>
                ) : null}

                {filteredDocuments.map((doc) => (
                  <article
                    key={doc.id}
                    className="grid gap-4 rounded-2xl border border-border/80 bg-card px-4 py-4 transition-colors hover:bg-secondary/40 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {editingDocId === doc.id ? (
                            <Input
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
                              className="h-9 max-w-md rounded-lg"
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-left text-base font-medium tracking-[-0.02em] hover:text-primary"
                              onClick={() => {
                                setEditingDocId(doc.id);
                                setEditingTitle(doc.title);
                              }}
                              title="Click to rename"
                            >
                              {doc.title}
                            </button>
                          )}
                          <p className="mt-1 text-sm text-muted-foreground">Updated {formatDate(doc.updated_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link to={`/documents/${doc.id}`}>
                          <PencilLine className="h-4 w-4" />
                          Open
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
