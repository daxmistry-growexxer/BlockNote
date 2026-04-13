import express from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.use(authRequired);

async function getDocumentById(documentId) {
  const result = await query(
    `SELECT id, user_id, title, share_token, is_public, updated_at
     FROM documents
     WHERE id = $1`,
    [documentId]
  );
  return result.rows[0] || null;
}

async function getOwnedDocumentOrRespond(req, res) {
  const doc = await getDocumentById(req.params.id);
  if (!doc) {
    res.status(404).json({ message: "Document not found" });
    return null;
  }

  if (doc.user_id !== req.user.id) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }

  return doc;
}

router.get("/", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, updated_at, is_public
       FROM documents
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    );

    return res.json({ documents: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const title = String(req.body.title || "Untitled").trim() || "Untitled";

    const result = await query(
      `INSERT INTO documents (user_id, title)
       VALUES ($1, $2)
       RETURNING id, title, updated_at, is_public`,
      [req.user.id, title]
    );

    return res.status(201).json({ document: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    return res.json({ document: doc });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    if (!title) {
      return res.status(422).json({ message: "Title is required" });
    }

    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    const result = await query(
      `UPDATE documents
       SET title = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, updated_at, is_public`,
      [title, req.params.id]
    );

    return res.json({ document: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    await query("DELETE FROM documents WHERE id = $1", [req.params.id]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
