import crypto from "crypto";
import express from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "todo",
  "code",
  "divider",
  "image"
]);

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

  if (String(doc.user_id) !== String(req.user.id)) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }

  return doc;
}

async function getBlockById(documentId, blockId) {
  const result = await query(
    `SELECT id, document_id, type, content, order_index, parent_id, created_at
     FROM blocks
     WHERE id = $1 AND document_id = $2`,
    [blockId, documentId]
  );
  return result.rows[0] || null;
}

async function listBlocksForDocument(documentId) {
  const result = await query(
    `SELECT id, document_id, type, content, order_index, parent_id, created_at
     FROM blocks
     WHERE document_id = $1
     ORDER BY order_index ASC, created_at ASC`,
    [documentId]
  );
  return result.rows;
}

function generateShareToken() {
  return crypto.randomBytes(24).toString("hex");
}

router.get("/share/:token", async (req, res, next) => {
  try {
    const token = String(req.params.token || "");
    if (!token) {
      return res.status(404).json({ message: "Shared document not found" });
    }

    const result = await query(
      `SELECT id, title, updated_at, share_token, is_public
       FROM documents
       WHERE share_token = $1 AND is_public = TRUE`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Shared document not found" });
    }

    return res.json({ document: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/share/:token/blocks", async (req, res, next) => {
  try {
    const token = String(req.params.token || "");
    if (!token) {
      return res.status(404).json({ message: "Shared document not found" });
    }

    const docResult = await query(
      `SELECT id
       FROM documents
       WHERE share_token = $1 AND is_public = TRUE`,
      [token]
    );

    if (docResult.rowCount === 0) {
      return res.status(404).json({ message: "Shared document not found" });
    }

    const blocks = await listBlocksForDocument(docResult.rows[0].id);
    return res.json({ blocks });
  } catch (err) {
    return next(err);
  }
});

router.use(authRequired);

async function renormalizeOrderIndexes(documentId) {
  const result = await query(
    `SELECT id
     FROM blocks
     WHERE document_id = $1
     ORDER BY order_index ASC, id ASC`,
    [documentId]
  );

  for (let i = 0; i < result.rows.length; i += 1) {
    const nextValue = (i + 1) * 1000;
    await query(
      `UPDATE blocks
       SET order_index = $1
       WHERE id = $2`,
      [nextValue, result.rows[i].id]
    );
  }
}

async function getOrderForNeighbor(documentId, neighborId) {
  if (!neighborId) return null;
  const result = await query(
    `SELECT order_index
     FROM blocks
     WHERE document_id = $1 AND id = $2`,
    [documentId, neighborId]
  );
  return result.rows[0]?.order_index ?? null;
}

async function getNextOrderIndex(documentId, prevBlockId, nextBlockId) {
  let prevOrder = await getOrderForNeighbor(documentId, prevBlockId);
  let nextOrder = await getOrderForNeighbor(documentId, nextBlockId);

  if (prevOrder === null && nextOrder === null) {
    const maxResult = await query(
      `SELECT MAX(order_index) AS max_order
       FROM blocks
       WHERE document_id = $1`,
      [documentId]
    );

    const maxOrder = Number(maxResult.rows[0].max_order || 0);
    return maxOrder > 0 ? maxOrder + 1000 : 1000;
  }

  if (prevOrder === null && nextOrder !== null) {
    return Number(nextOrder) - 1000;
  }

  if (prevOrder !== null && nextOrder === null) {
    return Number(prevOrder) + 1000;
  }

  const gap = Number(nextOrder) - Number(prevOrder);
  if (gap < 0.001) {
    await renormalizeOrderIndexes(documentId);
    prevOrder = await getOrderForNeighbor(documentId, prevBlockId);
    nextOrder = await getOrderForNeighbor(documentId, nextBlockId);
  }

  return (Number(prevOrder) + Number(nextOrder)) / 2;
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

router.get("/:id/blocks", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    const blocks = await listBlocksForDocument(req.params.id);
    return res.json({ blocks });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/share", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    let token = doc.share_token;
    if (!token) {
      token = generateShareToken();
    }

    const result = await query(
      `UPDATE documents
       SET share_token = $1, is_public = TRUE, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, updated_at, share_token, is_public`,
      [token, req.params.id]
    );

    return res.json({ document: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id/share", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    const result = await query(
      `UPDATE documents
       SET share_token = NULL, is_public = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, updated_at, share_token, is_public`,
      [req.params.id]
    );

    return res.json({ document: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.post("/:id/blocks", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    const type = String(req.body.type || "paragraph");
    if (!BLOCK_TYPES.has(type)) {
      return res.status(422).json({ message: "Invalid block type" });
    }

    const content = req.body.content && typeof req.body.content === "object"
      ? req.body.content
      : {};

    const prevBlockId = req.body.prevBlockId || null;
    const nextBlockId = req.body.nextBlockId || null;

    const orderIndex = await getNextOrderIndex(req.params.id, prevBlockId, nextBlockId);

    const result = await query(
      `INSERT INTO blocks (document_id, type, content, order_index, parent_id)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       RETURNING id, document_id, type, content, order_index, parent_id, created_at`,
      [req.params.id, type, JSON.stringify(content), orderIndex, req.body.parentId || null]
    );

    await query("UPDATE documents SET updated_at = NOW() WHERE id = $1", [req.params.id]);
    return res.status(201).json({ block: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/blocks/:blockId", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    const block = await getBlockById(req.params.id, req.params.blockId);
    if (!block) {
      return res.status(404).json({ message: "Block not found" });
    }

    const type = req.body.type ? String(req.body.type) : block.type;
    if (!BLOCK_TYPES.has(type)) {
      return res.status(422).json({ message: "Invalid block type" });
    }

    const content = req.body.content && typeof req.body.content === "object"
      ? req.body.content
      : block.content;

    const result = await query(
      `UPDATE blocks
       SET type = $1, content = $2::jsonb
       WHERE id = $3 AND document_id = $4
       RETURNING id, document_id, type, content, order_index, parent_id, created_at`,
      [type, JSON.stringify(content), req.params.blockId, req.params.id]
    );

    await query("UPDATE documents SET updated_at = NOW() WHERE id = $1", [req.params.id]);
    return res.json({ block: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/blocks/:blockId/reorder", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    const block = await getBlockById(req.params.id, req.params.blockId);
    if (!block) {
      return res.status(404).json({ message: "Block not found" });
    }

    const prevBlockId = req.body.prevBlockId || null;
    const nextBlockId = req.body.nextBlockId || null;

    if (
      (prevBlockId && String(prevBlockId) === String(req.params.blockId)) ||
      (nextBlockId && String(nextBlockId) === String(req.params.blockId))
    ) {
      return res.status(422).json({ message: "Invalid reorder position" });
    }

    const orderIndex = await getNextOrderIndex(req.params.id, prevBlockId, nextBlockId);

    const result = await query(
      `UPDATE blocks
       SET order_index = $1
       WHERE id = $2 AND document_id = $3
       RETURNING id, document_id, type, content, order_index, parent_id, created_at`,
      [orderIndex, req.params.blockId, req.params.id]
    );

    await query("UPDATE documents SET updated_at = NOW() WHERE id = $1", [req.params.id]);
    return res.json({ block: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id/blocks/:blockId", async (req, res, next) => {
  try {
    const doc = await getOwnedDocumentOrRespond(req, res);
    if (!doc) return;

    const block = await getBlockById(req.params.id, req.params.blockId);
    if (!block) {
      return res.status(404).json({ message: "Block not found" });
    }

    await query("DELETE FROM blocks WHERE id = $1 AND document_id = $2", [
      req.params.blockId,
      req.params.id
    ]);
    await query("UPDATE documents SET updated_at = NOW() WHERE id = $1", [req.params.id]);

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
