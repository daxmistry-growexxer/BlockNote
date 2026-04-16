import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ImagePlus } from "lucide-react";
import { getSharedDocument, listSharedBlocks } from "../api";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";

function getTextContent(block) {
  if (!block?.content || typeof block.content !== "object") return "";
  return String(block.content.text || "");
}

function renderReadOnlyBlock(block) {
  const text = getTextContent(block);

  if (block.type === "divider") {
    return (
      <hr className="w-full border-0 border-t border-border py-3" />
    );
  }

  if (block.type === "image") {
    const url = String(block.content?.url || "");
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="h-4 w-4" />
          <span>Image block</span>
        </div>
        {url ? (
          <img
            src={url}
            alt="Shared block preview"
            className="max-h-[420px] w-full rounded-2xl border border-border object-cover"
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
            No image URL provided.
          </div>
        )}
      </div>
    );
  }

  if (block.type === "todo") {
    return (
      <div className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3">
        <input
          type="checkbox"
          checked={Boolean(block.content?.checked)}
          className="mt-2 h-[18px] w-[18px] rounded border-border text-primary"
          readOnly
          aria-label="Read-only todo state"
        />
        <div className="editor-block editor-paragraph">{text}</div>
      </div>
    );
  }

  const classByType = {
    paragraph: "editor-block editor-paragraph",
    heading_1: "editor-block editor-heading-1",
    heading_2: "editor-block editor-heading-2",
    code: "editor-block editor-code"
  };

  if (block.type === "code") {
    return (
      <pre className="editor-block editor-code whitespace-pre-wrap">
        <code>{text}</code>
      </pre>
    );
  }

  return (
    <div className={classByType[block.type] || "editor-block editor-paragraph"}>
      <span>{text}</span>
    </div>
  );
}

export default function SharedDocumentPage() {
  const { token } = useParams();
  const [document, setDocument] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSharedDocument() {
      try {
        const docRes = await getSharedDocument(token);
        const blocksRes = await listSharedBlocks(token);
        setDocument(docRes.document);
        setBlocks(blocksRes.blocks || []);
      } catch (err) {
        setError(err.message || "Failed to load shared document");
      } finally {
        setLoading(false);
      }
    }

    loadSharedDocument();
  }, [token]);

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-sm border-border/80 bg-card/95">
          <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Loading shared document...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-lg border-border/80 bg-card/95">
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-lg font-semibold tracking-[-0.03em]">Shared document unavailable</p>
            <p className="text-sm leading-6 text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="page-shell py-6">
      <Card className="mx-auto max-w-4xl border-border/80 bg-background/95">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="space-y-3 border-b border-border/80 pb-5">
            <Badge variant="outline" className="rounded-full px-3 py-1">Shared view</Badge>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-balance">
              {document?.title || "Untitled"}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Read-only link. Editing is disabled for shared viewers.
            </p>
          </div>

          <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col gap-1 py-2">
            {blocks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">
                No content yet.
              </div>
            ) : null}

            {blocks.map((block) => (
              <article key={block.id} className="py-0.5">
                {renderReadOnlyBlock(block)}
              </article>
            ))}
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
