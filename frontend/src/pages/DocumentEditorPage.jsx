import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Blocks, CheckSquare, Code2, Copy, GripVertical, Heading1, Heading2, ImagePlus, Link2, Minus, Plus, Save, Slash, Trash2 } from "lucide-react";
import {
  createBlock,
  deleteBlock,
  disableDocumentShare,
  enableDocumentShare,
  getDocument,
  listBlocks,
  reorderBlock,
  updateBlock
} from "../api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";

const BLOCK_TYPES = [
  "paragraph",
  "heading_1",
  "heading_2",
  "todo",
  "code",
  "divider",
  "image"
];

const TEXT_LIKE_TYPES = new Set(["paragraph", "heading_1", "heading_2", "todo", "code"]);
const ENTER_SPLIT_TYPES = new Set(["paragraph", "heading_1", "heading_2", "todo"]);

const BLOCK_MENU_META = {
  paragraph: { label: "Paragraph", icon: Blocks },
  heading_1: { label: "Heading 1", icon: Heading1 },
  heading_2: { label: "Heading 2", icon: Heading2 },
  todo: { label: "Todo", icon: CheckSquare },
  code: { label: "Code", icon: Code2 },
  divider: { label: "Divider", icon: Minus },
  image: { label: "Image", icon: ImagePlus }
};

function getTextContent(block) {
  if (!block?.content || typeof block.content !== "object") return "";
  return String(block.content.text || "");
}

function defaultContentFor(type) {
  if (type === "todo") return { text: "", checked: false };
  if (type === "image") return { url: "" };
  if (type === "divider") return {};
  return { text: "" };
}

function getCaretOffset(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString().length;
}

function getSelectionOffsetsInElement(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) {
    return null;
  }

  const startRange = range.cloneRange();
  startRange.selectNodeContents(element);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(element);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    start: startRange.toString().length,
    end: endRange.toString().length
  };
}

function insertTextAtSelection(text, scopeElement = null) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  if (scopeElement && !scopeElement.contains(range.commonAncestorContainer)) {
    return false;
  }
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function setCaretOffset(element, offset) {
  if (!element) return;
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length || 0;
    if (remaining <= length) {
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
    node = walker.nextNode();
  }

  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getCurrentLineMeta(text, caret) {
  const safeCaret = Math.max(0, Math.min(caret, text.length));
  const lineStart = text.lastIndexOf("\n", safeCaret - 1) + 1;
  const lineEndIndex = text.indexOf("\n", safeCaret);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const lineText = text.slice(lineStart, lineEnd);
  const indent = (lineText.match(/^\s*/) || [""])[0];

  return { lineStart, lineEnd, lineText, indent, safeCaret };
}

function placeCaretAt(element, atEnd) {
  if (!element) return;
  element.focus();

  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(!atEnd);
  selection.removeAllRanges();
  selection.addRange(range);
}

function focusElementAtEnd(element, atEnd = true) {
  if (!element) return;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    const length = element.value.length;
    const caretPosition = atEnd ? length : 0;
    try {
      element.setSelectionRange(caretPosition, caretPosition);
    } catch {
      // Some controls do not support selection ranges.
    }
    return;
  }

  if (element.isContentEditable) {
    placeCaretAt(element, atEnd);
    return;
  }

  element.focus?.();
}

function getBlockClassName(type) {
  const classByType = {
    paragraph: "editor-block editor-paragraph",
    heading_1: "editor-block editor-heading-1",
    heading_2: "editor-block editor-heading-2",
    todo: "editor-block editor-paragraph",
    code: "editor-block editor-code"
  };

  return classByType[type] || "editor-block editor-paragraph";
}

function isBlockEmpty(block) {
  if (!block) return false;
  if (!TEXT_LIKE_TYPES.has(block.type)) return false;

  if (block.type === "todo") {
    const text = String(block.content?.text || "").trim();
    const checked = Boolean(block.content?.checked);
    return text === "" && !checked;
  }

  const text = String(block.content?.text || "").trim();
  return text === "";
}

export default function DocumentEditorPage() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [slash, setSlash] = useState({
    open: false,
    blockId: null,
    query: "",
    activeIndex: 0
  });
  const [draggingBlockId, setDraggingBlockId] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);

  const blockRefs = useRef({});
  const blocksRef = useRef([]);
  const mountedRef = useRef(true);
  const saveTimers = useRef({});
  const saveInFlight = useRef({});
  const queuedSavePayloads = useRef({});
  const pendingSavePayloads = useRef({});
  const focusRequest = useRef(null);
  const caretRequest = useRef(null);
  const slashMenuRef = useRef(null);

  const slashOptions = useMemo(() => {
    const query = slash.query.trim().toLowerCase();
    if (!query) return BLOCK_TYPES;
    return BLOCK_TYPES.filter((type) => type.includes(query));
  }, [slash.query]);

  useEffect(() => {
    setSlash((prev) => {
      if (!prev.open) return prev;
      const maxIndex = Math.max(0, slashOptions.length - 1);
      return { ...prev, activeIndex: Math.min(prev.activeIndex, maxIndex) };
    });
  }, [slashOptions]);

  useEffect(() => {
    async function boot() {
      try {
        const docRes = await getDocument(documentId);
        setDocument(docRes.document);

        const blocksRes = await listBlocks(documentId);
        const loadedBlocks = blocksRes.blocks || [];

        if (loadedBlocks.length === 0) {
          const created = await createBlock(documentId, {
            type: "paragraph",
            content: { text: "" }
          });
          setBlocks([created.block]);
          focusRequest.current = { id: created.block.id, atEnd: false };
        } else {
          setBlocks(loadedBlocks);
        }
      } catch (err) {
        setError(err.message || "Failed to load editor");
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [documentId]);

  useEffect(() => {
    if (focusRequest.current) {
      const focusTarget = blockRefs.current[focusRequest.current.id];
      if (focusTarget) {
        focusElementAtEnd(focusTarget, focusRequest.current.atEnd);
        focusRequest.current = null;
      }
    }

    if (caretRequest.current) {
      const { id, offset } = caretRequest.current;
      const caretTarget = blockRefs.current[id];
      if (caretTarget) {
        caretTarget.focus?.();
        setCaretOffset(caretTarget, offset);
        caretRequest.current = null;
      }
    }
  }, [blocks]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;

      Object.entries(saveTimers.current).forEach(([blockId, timerId]) => {
        if (timerId) clearTimeout(timerId);
        delete saveTimers.current[blockId];
      });

      const pendingEntries = Object.entries(pendingSavePayloads.current);
      const queuedEntries = Object.entries(queuedSavePayloads.current);
      pendingSavePayloads.current = {};
      queuedSavePayloads.current = {};

      pendingEntries.forEach(([blockId, payload]) => {
        void updateBlock(documentId, blockId, payload, { keepalive: true }).catch(() => { });
      });

      queuedEntries.forEach(([blockId, payload]) => {
        void updateBlock(documentId, blockId, payload, { keepalive: true }).catch(() => { });
      });
    };
  }, [documentId]);

  function setBlockRef(blockId, el) {
    if (!el) return;
    blockRefs.current[blockId] = el;
  }

  function createDragPreview(block) {
    const preview = document.createElement("div");
    preview.style.position = "fixed";
    preview.style.top = "-1000px";
    preview.style.left = "-1000px";
    preview.style.pointerEvents = "none";
    preview.style.padding = "10px 14px";
    preview.style.border = "1px solid rgba(214, 206, 196, 0.96)";
    preview.style.borderRadius = "16px";
    preview.style.background = "rgba(255, 255, 255, 0.98)";
    preview.style.boxShadow = "0 18px 40px rgba(0, 0, 0, 0.16)";
    preview.style.fontFamily = "inherit";
    preview.style.fontSize = "14px";
    preview.style.lineHeight = "1.45";
    preview.style.color = "#2d2924";
    preview.style.maxWidth = "360px";
    preview.style.whiteSpace = "pre-wrap";

    const typeLabel = document.createElement("div");
    typeLabel.textContent = block.type.replace("_", " ");
    typeLabel.style.fontSize = "10px";
    typeLabel.style.fontWeight = "700";
    typeLabel.style.letterSpacing = "0.14em";
    typeLabel.style.textTransform = "uppercase";
    typeLabel.style.color = "#8d8276";
    typeLabel.style.marginBottom = "6px";

    const content = document.createElement("div");
    content.textContent = getTextContent(block) || (block.type === "image" ? String(block.content?.url || "") : "Empty block");
    content.style.overflow = "hidden";
    content.style.textOverflow = "ellipsis";
    content.style.display = "-webkit-box";
    content.style.webkitLineClamp = "4";
    content.style.webkitBoxOrient = "vertical";

    preview.appendChild(typeLabel);
    preview.appendChild(content);
    document.body.appendChild(preview);

    return preview;
  }

  function updateBlockLocal(blockId, updater) {
    setBlocks((prev) => prev.map((block) => (block.id === blockId ? updater(block) : block)));
  }

  function getShareUrl(nextDocument = document) {
    if (!nextDocument?.share_token) return "";
    return `${window.location.origin}/share/${nextDocument.share_token}`;
  }

  function getBlockTextValue(blockId, fallback = "") {
    const editable = blockRefs.current[blockId];
    if (!editable) return fallback;
    if (editable instanceof HTMLTextAreaElement) {
      return editable.value || fallback;
    }
    return editable.innerText || "";
  }

  function getLatestBlock(blockId) {
    return blocksRef.current.find((item) => String(item.id) === String(blockId)) || null;
  }

  function clearScheduledSave(blockId, dismissToast = false) {
    if (saveTimers.current[blockId]) {
      clearTimeout(saveTimers.current[blockId]);
      delete saveTimers.current[blockId];
    }

    if (pendingSavePayloads.current[blockId]) {
      delete pendingSavePayloads.current[blockId];
    }

    if (dismissToast) {
      toast.dismiss(`save-${blockId}`);
    }
  }

  function handleTextareaChange(event, block) {
    const nextText = event.target.value;
    updateBlockLocal(block.id, (current) => ({
      ...current,
      content: { ...current.content, text: nextText }
    }));
    scheduleTextSave(block, nextText);
  }

  async function handleTextareaKeyDown(event, block) {
    if (slash.open && slash.blockId === block.id) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlash((prev) => ({
          ...prev,
          activeIndex: Math.min(prev.activeIndex + 1, Math.max(0, slashOptions.length - 1))
        }));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlash((prev) => ({
          ...prev,
          activeIndex: Math.max(prev.activeIndex - 1, 0)
        }));
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSlashMenu(true);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selectedType = slashOptions[slash.activeIndex] || slashOptions[0];
        if (selectedType) await applySlashSelection(selectedType);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        if (slash.query.length === 0) {
          closeSlashMenu(true);
        } else {
          setSlash((prev) => ({
            ...prev,
            query: prev.query.slice(0, -1),
            activeIndex: 0
          }));
        }
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        if (/^[a-z0-9_\/]$/i.test(event.key)) {
          setSlash((prev) => ({
            ...prev,
            query: `${prev.query}${event.key.toLowerCase()}`,
            activeIndex: 0
          }));
        }
        return;
      }
    }

    if (event.key === "/") {
      const value = event.target.value || "";
      const selectionStart = event.target.selectionStart ?? 0;
      const selectionEnd = event.target.selectionEnd ?? 0;

      if (value.trim() === "" && selectionStart === 0 && selectionEnd === 0) {
        event.preventDefault();
        clearScheduledSave(block.id, true);
        setSlash({ open: true, blockId: block.id, query: "", activeIndex: 0 });
        return;
      }
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const start = event.target.selectionStart;
      const end = event.target.selectionEnd;
      const text = event.target.value;

      if (event.shiftKey) {
        const { lineStart, indent } = getCurrentLineMeta(text, start);
        if (indent.length > 0) {
          const removeCount = Math.min(2, indent.length);
          const nextText = `${text.slice(0, lineStart)}${text.slice(lineStart + removeCount)}`;
          const nextStart = Math.max(lineStart, start - removeCount);
          const nextEnd = Math.max(lineStart, end - removeCount);

          updateBlockLocal(block.id, (current) => ({
            ...current,
            content: { text: nextText }
          }));

          // Use setTimeout to allow state update to reflect before setting selection
          setTimeout(() => {
            event.target.selectionStart = nextStart;
            event.target.selectionEnd = nextEnd;
          }, 0);

          scheduleTextSave(block, nextText);
        }
        return;
      }

      const nextText = `${text.slice(0, start)}  ${text.slice(end)}`;
      const nextPos = start + 2;

      updateBlockLocal(block.id, (current) => ({
        ...current,
        content: { text: nextText }
      }));

      setTimeout(() => {
        event.target.selectionStart = nextPos;
        event.target.selectionEnd = nextPos;
      }, 0);

      scheduleTextSave(block, nextText);
      return;
    }

    if (event.key === "Backspace") {
      const value = event.target.value || "";
      const selectionStart = event.target.selectionStart ?? 0;
      const selectionEnd = event.target.selectionEnd ?? 0;

      // Rule parity with other blocks:
      // 1) If block has content, Backspace should not delete neighboring blocks.
      // 2) If block is empty and caret is at start, delete this empty block itself.
      if (value.trim() !== "" || selectionStart !== 0 || selectionEnd !== 0) {
        return;
      }

      const currentIndex = blocks.findIndex((item) => item.id === block.id);
      if (currentIndex <= 0) {
        return;
      }

      event.preventDefault();
      try {
        setSaving(true);
        await removeBlockAndFocus(block.id);
      } catch (err) {
        setError(err.message || "Failed to delete block");
      } finally {
        setSaving(hasPendingSaves());
      }
      return;
    }

    if (event.key === "Enter") {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        try {
          setSaving(true);
          const latestText = event.target.value || "";
          const nextContent = { text: latestText };
          clearScheduledSave(block.id, true);
          updateBlockLocal(block.id, (current) => ({
            ...current,
            content: nextContent
          }));
          await saveBlockNow(block.id, { content: nextContent });
          await handleInsertParagraphAfter(block.id);
        } catch (err) {
          setError(err.message || "Failed to add paragraph after code block");
        } finally {
          setSaving(hasPendingSaves());
        }
        return;
      }
      // Natural Enter behavior for textarea stays within the block.
    }
  }

  function hasPendingSaves() {
    const hasTimers = Object.values(saveTimers.current).some(Boolean);
    const hasRequests = Object.values(saveInFlight.current).some(Boolean);
    const hasQueued = Object.keys(queuedSavePayloads.current).length > 0;
    const hasPendingDrafts = Object.keys(pendingSavePayloads.current).length > 0;
    return hasTimers || hasRequests || hasQueued || hasPendingDrafts;
  }

  async function performSaveRequest(blockId, payload) {
    await updateBlock(documentId, blockId, payload);
  }

  async function saveBlockNow(blockId, payload) {
    clearScheduledSave(blockId);
    queuedSavePayloads.current[blockId] = payload;
    if (saveInFlight.current[blockId]) {
      if (mountedRef.current) {
        setSaving(hasPendingSaves());
      }
      return;
    }
    saveInFlight.current[blockId] = true;

    try {
      while (queuedSavePayloads.current[blockId]) {
        const nextPayload = queuedSavePayloads.current[blockId];
        delete queuedSavePayloads.current[blockId];
        await performSaveRequest(blockId, nextPayload);
      }
    } finally {
      delete saveInFlight.current[blockId];
      if (mountedRef.current) {
        setSaving(hasPendingSaves());
      }
    }
  }

  function scheduleTextSave(block, nextText) {
    clearScheduledSave(block.id);

    const nextContent = block.type === "todo"
      ? { ...(block.content || {}), text: nextText }
      : { text: nextText };

    pendingSavePayloads.current[block.id] = { content: nextContent };
    // Show saving immediately while debounce timer is pending.
    setSaving(true);

    saveTimers.current[block.id] = setTimeout(async () => {
      delete saveTimers.current[block.id];
      try {
        const payload = pendingSavePayloads.current[block.id];
        if (!payload) return;
        await saveBlockNow(block.id, payload);
      } catch (err) {
        setError(err.message || "Failed to save block");
      } finally {
        setSaving(hasPendingSaves());
      }
    }, 1000);
  }

  function closeSlashMenu(cleanCurrentBlock = true) {
    if (cleanCurrentBlock && slash.blockId) {
      updateBlockLocal(slash.blockId, (block) => ({
        ...block,
        content: block.type === "todo"
          ? { ...(block.content || {}), text: "" }
          : block.type === "image"
            ? { ...(block.content || {}), url: "" }
            : { ...block.content, text: "" }
      }));

      const editable = blockRefs.current[slash.blockId];
      if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        editable.value = "";
      } else if (editable) {
        editable.innerText = "";
      }
    }

    setSlash({
      open: false,
      blockId: null,
      query: "",
      activeIndex: 0
    });
  }

  async function applySlashSelection(type) {
    if (!slash.blockId) return;

    const targetBlockId = slash.blockId;

    try {
      setSaving(true);
      clearScheduledSave(targetBlockId, true);
      const editable = blockRefs.current[targetBlockId];
      if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        editable.value = "";
      } else if (editable) {
        editable.innerText = "";
      }

      // Request focus before local state update so the [blocks] effect can apply it
      // as soon as the new block type is rendered.
      if (type !== "divider") {
        focusRequest.current = { id: targetBlockId, atEnd: false };
      }

      updateBlockLocal(targetBlockId, (block) => ({
        ...block,
        type,
        content: defaultContentFor(type)
      }));

      await updateBlock(documentId, targetBlockId, {
        type,
        content: defaultContentFor(type)
      });
      toast.success(`Changed to ${type.replace("_", " ")}`);
    } catch (err) {
      setError(err.message || "Failed to change block type");
    } finally {
      setSaving(hasPendingSaves());
      setSlash({
        open: false,
        blockId: null,
        query: "",
        activeIndex: 0
      });
    }
  }

  async function handleCreateBelow(currentBlockId, nextBlockId, content = { text: "" }, focusAtStart = false) {
    const created = await createBlock(documentId, {
      type: "paragraph",
      content,
      prevBlockId: currentBlockId,
      nextBlockId
    });

    setBlocks((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === currentBlockId);
      const copy = [...prev];
      copy.splice(currentIndex + 1, 0, created.block);
      return copy;
    });

    focusRequest.current = { id: created.block.id, atEnd: !focusAtStart };
  }

  async function removeBlockAndFocus(blockId) {
    const currentIndex = blocks.findIndex((item) => item.id === blockId);
    if (currentIndex <= 0) {
      return false;
    }

    const previousBlock = blocks[currentIndex - 1] || null;
    const nextBlock = blocks[currentIndex + 1] || null;

    clearScheduledSave(blockId, true);
    delete queuedSavePayloads.current[blockId];

    await deleteBlock(documentId, blockId);
    setBlocks((prev) => prev.filter((item) => item.id !== blockId));

    if (previousBlock && TEXT_LIKE_TYPES.has(previousBlock.type)) {
      focusRequest.current = { id: previousBlock.id, atEnd: true };
      return true;
    }

    if (previousBlock && !TEXT_LIKE_TYPES.has(previousBlock.type)) {
      const created = await createBlock(documentId, {
        type: "paragraph",
        content: { text: "" },
        prevBlockId: previousBlock.id,
        nextBlockId: nextBlock?.id || null
      });

      setBlocks((prev) => {
        const nextBlocks = prev.filter((item) => item.id !== created.block.id);
        const insertAt = nextBlocks.findIndex((item) => item.id === previousBlock.id);
        const copy = [...nextBlocks];
        copy.splice(insertAt + 1, 0, created.block);
        return copy;
      });

      focusRequest.current = { id: created.block.id, atEnd: false };
      return true;
    }

    return false;
  }

  async function removeSpecificBlock(blockId, focusBlockId = null, focusAtEnd = false) {
    clearScheduledSave(blockId, true);
    delete queuedSavePayloads.current[blockId];

    await deleteBlock(documentId, blockId);
    setBlocks((prev) => prev.filter((item) => item.id !== blockId));

    if (focusBlockId) {
      focusRequest.current = { id: focusBlockId, atEnd: focusAtEnd };
    }
  }

  async function flushPendingSaves() {
    const entries = Object.entries(pendingSavePayloads.current);
    if (entries.length === 0) return;

    await Promise.all(entries.map(async ([blockId, payload]) => {
      await saveBlockNow(blockId, payload);
    }));
  }

  async function handleEnableShare() {
    try {
      setShareBusy(true);
      const res = await enableDocumentShare(documentId);
      setDocument(res.document);
      const shareUrl = getShareUrl(res.document);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Share link copied");
      } else {
        toast.success("Share link created");
      }
    } catch (err) {
      setError(err.message || "Failed to enable sharing");
    } finally {
      setShareBusy(false);
    }
  }

  async function handleDisableShare() {
    try {
      setShareBusy(true);
      const res = await disableDocumentShare(documentId);
      setDocument(res.document);
      toast.success("Sharing disabled");
    } catch (err) {
      setError(err.message || "Failed to disable sharing");
    } finally {
      setShareBusy(false);
    }
  }

  async function handleCopyShareUrl() {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      toast.success("Share link copied");
    } catch {
      toast.success("Share link ready");
    }
  }

  async function handleEditableKeyDown(event, block) {
    const currentTarget = event.currentTarget;
    const text = currentTarget.innerText || "";
    const selectionOffsets = getSelectionOffsetsInElement(currentTarget);
    const caret = selectionOffsets ? selectionOffsets.start : text.length;

    if (slash.open && slash.blockId === block.id) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlash((prev) => ({
          ...prev,
          activeIndex: Math.min(prev.activeIndex + 1, Math.max(0, slashOptions.length - 1))
        }));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlash((prev) => ({
          ...prev,
          activeIndex: Math.max(prev.activeIndex - 1, 0)
        }));
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSlashMenu(true);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selectedType = slashOptions[slash.activeIndex] || slashOptions[0];
        if (selectedType) await applySlashSelection(selectedType);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        if (slash.query.length === 0) {
          closeSlashMenu(true);
        } else {
          setSlash((prev) => ({
            ...prev,
            query: prev.query.slice(0, -1),
            activeIndex: 0
          }));
        }
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        if (/^[a-z0-9_\/]$/i.test(event.key)) {
          setSlash((prev) => ({
            ...prev,
            query: `${prev.query}${event.key.toLowerCase()}`,
            activeIndex: 0
          }));
        }
      }

      return;
    }

    if (event.key === "/" && caret === 0 && text.trim() === "") {
      event.preventDefault();
      clearScheduledSave(block.id, true);
      setSlash({ open: true, blockId: block.id, query: "", activeIndex: 0 });
      return;
    }

    if (event.key === "Tab" && block.type === "code") {
      event.preventDefault();
      const start = selectionOffsets ? selectionOffsets.start : text.length;
      const end = selectionOffsets ? selectionOffsets.end : start;

      const commitCodeText = (nextText, nextCaret) => {
        currentTarget.innerText = nextText;
        setCaretOffset(currentTarget, nextCaret);
        updateBlockLocal(block.id, (current) => ({
          ...current,
          content: { text: nextText }
        }));
        caretRequest.current = { id: block.id, offset: nextCaret };
        scheduleTextSave(block, nextText);
      };

      if (event.shiftKey) {
        const { lineStart, indent } = getCurrentLineMeta(text, start);
        if (indent.length > 0) {
          const removeCount = Math.min(2, indent.length);
          const nextText = `${text.slice(0, lineStart)}${text.slice(lineStart + removeCount)}`;
          const nextCaret = Math.max(lineStart, start - removeCount);
          commitCodeText(nextText, nextCaret);
        }
        return;
      }

      const nextText = `${text.slice(0, start)}  ${text.slice(end)}`;
      const nextCaret = start + 2;
      commitCodeText(nextText, nextCaret);
      return;
    }

    if (event.key === "Enter" && block.type === "code") {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        try {
          setSaving(true);
          const latestText = currentTarget.innerText || "";
          const nextContent = { text: latestText };
          clearScheduledSave(block.id, true);
          updateBlockLocal(block.id, (current) => ({
            ...current,
            content: nextContent
          }));
          await saveBlockNow(block.id, { content: nextContent });
          await handleInsertParagraphAfter(block.id);
        } catch (err) {
          setError(err.message || "Failed to add paragraph after code block");
        } finally {
          setSaving(hasPendingSaves());
        }
        return;
      }

      event.preventDefault();
      const start = selectionOffsets ? selectionOffsets.start : text.length;
      const { indent } = getCurrentLineMeta(text, start);
      const newlineText = `\n${indent}`;
      const nextFullText = `${text.slice(0, start)}${newlineText}${text.slice(start)}`;

      // Direct DOM update with HTML breaks ensures the browser renders the line immediately.
      // We use a trailing <br> nudge if we are at the end to force the block to expand.
      const html = nextFullText.replace(/\n/g, "<br>") + "<br>";
      currentTarget.innerHTML = html;

      const nextCaret = start + newlineText.length;
      setCaretOffset(currentTarget, nextCaret);

      // Save the text (which will eventually trigger a React re-render).
      scheduleTextSave(block, nextFullText);
      return;
    }

    if (event.key === "Enter") {
      if (!ENTER_SPLIT_TYPES.has(block.type)) {
        return;
      }

      event.preventDefault();
      clearScheduledSave(block.id, true);
      const currentIndex = blocks.findIndex((item) => item.id === block.id);
      const nextBlock = blocks[currentIndex + 1];

      const before = text.slice(0, caret);
      const after = text.slice(caret);

      try {
        setSaving(true);
        const latestBlock = getLatestBlock(block.id) || block;
        const baseContent = latestBlock.type === "todo" ? (latestBlock.content || {}) : {};
        const beforeContent = latestBlock.type === "todo"
          ? { ...baseContent, text: before }
          : { text: before };

        updateBlockLocal(block.id, (current) => ({
          ...current,
          content: beforeContent
        }));

        await saveBlockNow(block.id, { content: beforeContent });

        await handleCreateBelow(block.id, nextBlock?.id || null, { text: after }, true);
      } catch (err) {
        setError(err.message || "Failed to split block");
      } finally {
        setSaving(hasPendingSaves());
      }

      return;
    }

    const atStartForBackspace = caret === 0 || (text.trim() === "" && caret <= 1);
    if (event.key === "Backspace") {
      const start = selectionOffsets ? selectionOffsets.start : text.length;
      const end = selectionOffsets ? selectionOffsets.end : start;
      const hasSelection = end > start;

      if (block.type === "code" && text.trim() === "" && text.length > 0 && !hasSelection) {
        event.preventDefault();
        if (start === 0) {
          return;
        }
        const deleteIndex = Math.max(0, Math.min(text.length - 1, start - 1));
        const nextText = `${text.slice(0, deleteIndex)}${text.slice(deleteIndex + 1)}`;
        currentTarget.innerText = nextText;
        setCaretOffset(currentTarget, deleteIndex);
        updateBlockLocal(block.id, (current) => ({
          ...current,
          content: { text: nextText }
        }));
        caretRequest.current = { id: block.id, offset: deleteIndex };
        scheduleTextSave(block, nextText);
        return;
      }

      const currentIndex = blocks.findIndex((item) => item.id === block.id);
      const previousBlock = currentIndex > 0 ? blocks[currentIndex - 1] : null;

      const previousIsFocusTarget = previousBlock && (previousBlock.type === "divider" || previousBlock.type === "image");
      if (text.trim() === "" && previousIsFocusTarget && currentIndex > 0) {
        event.preventDefault();
        try {
          setSaving(true);
          await removeSpecificBlock(block.id, previousBlock.id, true);
        } catch (err) {
          setError(err.message || "Failed to delete block");
        } finally {
          setSaving(hasPendingSaves());
        }
        return;
      }

      const previousIsEmptyImage = previousBlock?.type === "image" && String(previousBlock?.content?.url || "").trim() === "";
      if (text.trim() === "" && previousIsEmptyImage && currentIndex > 0) {
        event.preventDefault();
        try {
          setSaving(true);
          await removeSpecificBlock(block.id);
        } catch (err) {
          setError(err.message || "Failed to delete block");
        } finally {
          setSaving(hasPendingSaves());
        }
        return;
      }

      if (!atStartForBackspace) {
        return;
      }

      event.preventDefault();

      // Rule: the very first block is the document anchor and is never deleted by Backspace at start.
      if (currentIndex === 0) {
        return;
      }

      // Do not delete neighboring blocks when current block has content.
      if (text.trim() !== "") {
        return;
      }

      if (previousBlock?.type === "code" && text.trim() === "") {
        try {
          setSaving(true);
          await removeSpecificBlock(block.id, previousBlock.id, true);
        } catch (err) {
          setError(err.message || "Failed to delete block");
        } finally {
          setSaving(hasPendingSaves());
        }
        return;
      }

      if (previousBlock && isBlockEmpty(previousBlock)) {
        try {
          setSaving(true);
          await removeSpecificBlock(previousBlock.id, block.id, false);
        } catch (err) {
          setError(err.message || "Failed to delete empty block");
        } finally {
          setSaving(hasPendingSaves());
        }
        return;
      }

      try {
        setSaving(true);
        const removed = await removeBlockAndFocus(block.id);
        if (!removed) return;
      } catch (err) {
        setError(err.message || "Failed to delete block");
      } finally {
        setSaving(hasPendingSaves());
      }
    }
  }

  function handleEditableBlur(blockId) {
    const editable = blockRefs.current[blockId];
    if (editable) {
      const nextText = editable instanceof HTMLTextAreaElement
        ? (editable.value || "")
        : (editable.innerText || "");
      updateBlockLocal(blockId, (current) => {
        if (current.type === "todo") {
          return { ...current, content: { ...(current.content || {}), text: nextText } };
        }
        return { ...current, content: { text: nextText } };
      });
    }

    if (!slash.open || slash.blockId !== blockId) return;

    setTimeout(() => {
      const activeElement = document.activeElement;
      const menuHasFocus = slashMenuRef.current?.contains(activeElement);
      const blockHasFocus = blockRefs.current[blockId]?.contains(activeElement);

      if (!menuHasFocus && !blockHasFocus) {
        closeSlashMenu(true);
      }
    }, 0);
  }

  function handleEditableInput(event, block) {
    const nextText = event.currentTarget.innerText || "";
    if (block.type === "code") {
      updateBlockLocal(block.id, (current) => ({
        ...current,
        content: { text: nextText }
      }));
    }
    scheduleTextSave(block, nextText);
  }

  async function handleTodoChecked(block, checked) {
    try {
      setSaving(true);
      clearScheduledSave(block.id, true);
      const latestBlock = getLatestBlock(block.id) || block;
      const latestText = getBlockTextValue(block.id, getTextContent(latestBlock));
      const nextContent = { ...(latestBlock.content || {}), text: latestText, checked };
      updateBlockLocal(block.id, (current) => ({ ...current, content: nextContent }));
      await saveBlockNow(block.id, { content: nextContent });
    } catch (err) {
      setError(err.message || "Failed to update todo");
    } finally {
      setSaving(hasPendingSaves());
    }
  }

  async function handleImageUrlChange(block, url) {
    const nextContent = { url };
    updateBlockLocal(block.id, (current) => ({ ...current, content: nextContent }));
    clearScheduledSave(block.id);
    pendingSavePayloads.current[block.id] = { content: nextContent };

    setSaving(true);
    toast.loading("Saving image...", { id: `save-${block.id}` });
    saveTimers.current[block.id] = setTimeout(async () => {
      delete saveTimers.current[block.id];
      try {
        const payload = pendingSavePayloads.current[block.id];
        if (!payload) return;
        await saveBlockNow(block.id, payload);
        toast.success("Image updated", { id: `save-${block.id}` });
      } catch (err) {
        toast.error("Failed to update image", { id: `save-${block.id}` });
        setError(err.message || "Failed to update image URL");
      } finally {
        setSaving(hasPendingSaves());
      }
    }, 1000);
  }

  async function handleImageInputKeyDown(event, block) {
    const value = String(event.currentTarget.value || "");

    if (slash.open && slash.blockId === block.id) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlash((prev) => ({
          ...prev,
          activeIndex: Math.min(prev.activeIndex + 1, Math.max(0, slashOptions.length - 1))
        }));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlash((prev) => ({
          ...prev,
          activeIndex: Math.max(prev.activeIndex - 1, 0)
        }));
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSlashMenu(true);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selectedType = slashOptions[slash.activeIndex] || slashOptions[0];
        if (selectedType) await applySlashSelection(selectedType);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        if (slash.query.length === 0) {
          closeSlashMenu(true);
        } else {
          setSlash((prev) => ({
            ...prev,
            query: prev.query.slice(0, -1),
            activeIndex: 0
          }));
        }
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        if (/^[a-z0-9_\/]$/i.test(event.key)) {
          setSlash((prev) => ({
            ...prev,
            query: `${prev.query}${event.key.toLowerCase()}`,
            activeIndex: 0
          }));
        }
        return;
      }
    }

    if (event.key === "/") {
      const selectionStart = event.currentTarget.selectionStart ?? 0;
      const selectionEnd = event.currentTarget.selectionEnd ?? 0;

      if (value.trim() === "" && selectionStart === 0 && selectionEnd === 0) {
        event.preventDefault();
        clearScheduledSave(block.id, true);
        setSlash({ open: true, blockId: block.id, query: "", activeIndex: 0 });
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      try {
        setSaving(true);
        await handleInsertParagraphAfter(block.id);
      } catch (err) {
        setError(err.message || "Failed to add paragraph");
      } finally {
        setSaving(hasPendingSaves());
      }
      return;
    }

    if (event.key !== "Backspace") return;

    const selectionStart = event.currentTarget.selectionStart ?? 0;
    const selectionEnd = event.currentTarget.selectionEnd ?? 0;
    if (value.trim() !== "" || selectionStart !== 0 || selectionEnd !== 0) {
      return;
    }

    const currentIndex = blocks.findIndex((item) => item.id === block.id);
    if (currentIndex <= 0) {
      return;
    }

    const previousBlock = blocks[currentIndex - 1] || null;
    event.preventDefault();

    try {
      setSaving(true);
      if (previousBlock) {
        await removeSpecificBlock(block.id, previousBlock.id, true);
      } else {
        await removeSpecificBlock(block.id);
      }
    } catch (err) {
      setError(err.message || "Failed to delete image block");
    } finally {
      setSaving(hasPendingSaves());
    }
  }

  async function handleDropBefore(targetBlockId) {
    if (!draggingBlockId || draggingBlockId === targetBlockId) return;

    const sourceIndex = blocks.findIndex((item) => item.id === draggingBlockId);
    const targetIndex = blocks.findIndex((item) => item.id === targetBlockId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const previousBlocks = [...blocks];
    const reordered = [...blocks];
    const [moved] = reordered.splice(sourceIndex, 1);
    const nextTargetIndex = reordered.findIndex((item) => item.id === targetBlockId);
    reordered.splice(nextTargetIndex, 0, moved);
    setBlocks(reordered);

    const newIndex = reordered.findIndex((item) => item.id === draggingBlockId);
    const prevBlock = reordered[newIndex - 1];
    const nextBlock = reordered[newIndex + 1];

    try {
      setSaving(true);
      const saved = await reorderBlock(documentId, draggingBlockId, {
        prevBlockId: prevBlock?.id || null,
        nextBlockId: nextBlock?.id || null
      });

      setBlocks((prev) => prev.map((item) => (item.id === draggingBlockId ? saved.block : item)));
    } catch (err) {
      setBlocks(previousBlocks);
      setError(err.message || "Failed to reorder block");
    } finally {
      setSaving(hasPendingSaves());
      setDraggingBlockId(null);
      setDropIndicator(null);
    }
  }

  function handleBlockDragOver(event, blockId) {
    if (!draggingBlockId || draggingBlockId === blockId) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropIndicator({ blockId, position });
  }

  async function handleDropAtIndicator(targetBlockId) {
    if (!dropIndicator || dropIndicator.blockId !== targetBlockId) {
      await handleDropBefore(targetBlockId);
      return;
    }

    if (dropIndicator.position === "before") {
      await handleDropBefore(targetBlockId);
      return;
    }

    const targetIndex = blocks.findIndex((item) => item.id === targetBlockId);
    if (targetIndex === -1) return;

    const nextBlock = blocks[targetIndex + 1] || null;
    if (nextBlock) {
      await handleDropBefore(nextBlock.id);
      return;
    }

    await handleDropAtEnd();
  }

  async function handleDropAtEnd() {
    if (!draggingBlockId) return;

    const sourceIndex = blocks.findIndex((item) => item.id === draggingBlockId);
    if (sourceIndex === -1 || sourceIndex === blocks.length - 1) return;

    const previousBlocks = [...blocks];
    const reordered = [...blocks];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.push(moved);
    setBlocks(reordered);

    const prevBlock = reordered[reordered.length - 2] || null;

    try {
      setSaving(true);
      const saved = await reorderBlock(documentId, draggingBlockId, {
        prevBlockId: prevBlock?.id || null,
        nextBlockId: null
      });

      setBlocks((prev) => prev.map((item) => (item.id === draggingBlockId ? saved.block : item)));
    } catch (err) {
      setBlocks(previousBlocks);
      setError(err.message || "Failed to reorder block");
    } finally {
      setSaving(hasPendingSaves());
      setDraggingBlockId(null);
      setDropIndicator(null);
    }
  }

  async function handleInsertParagraphAfter(blockId) {
    const currentIndex = blocks.findIndex((item) => item.id === blockId);
    if (currentIndex === -1) return;

    const nextBlock = blocks[currentIndex + 1] || null;

    try {
      setSaving(true);
      await handleCreateBelow(blockId, nextBlock?.id || null, { text: "" });
    } catch (err) {
      setError(err.message || "Failed to add paragraph");
    } finally {
      setSaving(hasPendingSaves());
    }
  }

  async function handleDeleteBlock(blockId) {
    const currentIndex = blocks.findIndex((item) => item.id === blockId);
    if (currentIndex <= 0) {
      setError("First block cannot be deleted");
      return;
    }

    try {
      setSaving(true);
      clearScheduledSave(blockId, true);
      delete queuedSavePayloads.current[blockId];
      await deleteBlock(documentId, blockId);
      setBlocks((prev) => prev.filter((item) => item.id !== blockId));
    } catch (err) {
      setError(err.message || "Failed to delete block");
    } finally {
      setSaving(hasPendingSaves());
    }
  }

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-sm border-border/80 bg-card/95">
          <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Loading editor...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="page-shell py-4 sm:py-6">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit border-border/80 bg-card/95 lg:sticky lg:top-4">
          <CardContent className="space-y-4 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl"
              onClick={async () => {
                await flushPendingSaves();
                navigate("/dashboard");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Button>

            <Separator />

            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full px-3 py-1">Editor</Badge>
              <div className="rounded-2xl border border-border/80 bg-secondary/50 p-4">
                <p className="text-sm font-medium">Tips</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Type "/" on an empty line for block types.</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Drag the handle to reorder blocks.</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={async () => {
                await flushPendingSaves();
                navigate("/dashboard");
              }}
            >
              Done
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/80 bg-background/95">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Editor</p>
                  <h1 className="text-4xl font-semibold tracking-[-0.06em] text-balance">
                    {document?.title || "Untitled"}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="subtle" className="w-fit gap-2 rounded-full px-3 py-1.5" aria-live="polite">
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving..." : "Saved"}
                  </Badge>
                  {document?.is_public && document?.share_token ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={handleCopyShareUrl}
                        disabled={shareBusy}
                      >
                        <Copy className="h-4 w-4" />
                        Copy share link
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full"
                        onClick={handleDisableShare}
                        disabled={shareBusy}
                      >
                        <Link2 className="h-4 w-4" />
                        Disable sharing
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={handleEnableShare}
                      disabled={shareBusy}
                    >
                      <Link2 className="h-4 w-4" />
                      Share
                    </Button>
                  )}
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="rounded-[28px] border border-border/80 bg-card shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
                <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col gap-1 px-4 py-8 sm:px-10">
                  {blocks.map((block) => (
                    <article
                      key={block.id}
                      className={`group relative py-1 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${draggingBlockId === block.id ? "z-20 scale-[0.985] translate-y-1 opacity-60 rounded-2xl bg-background/70 shadow-[0_18px_40px_rgba(0,0,0,0.12)] ring-1 ring-border/60 backdrop-blur-sm" : ""} ${slash.open && slash.blockId === block.id ? "z-30" : ""} ${dropIndicator?.blockId === block.id && dropIndicator.position === "before" ? "pt-4" : ""} ${dropIndicator?.blockId === block.id && dropIndicator.position === "after" ? "pb-4" : ""}`}
                      onDragOver={(event) => handleBlockDragOver(event, block.id)}
                      onDrop={() => handleDropAtIndicator(block.id)}
                    >
                      {dropIndicator?.blockId === block.id && dropIndicator.position === "before" && (
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center gap-2 px-2">
                          <div className="h-0.5 flex-1 rounded-full bg-primary/65 shadow-[0_0_0_1px_rgba(255,255,255,0.75)]" />
                        </div>
                      )}

                      <div className="absolute -left-20 top-1/2 z-10 -translate-y-1/2 text-muted-foreground sm:-left-24">
                        <div className="pointer-events-none flex flex-col items-center gap-1 rounded-full border border-border/60 bg-background/75 px-1 py-1 opacity-0 shadow-sm backdrop-blur-md transition-all duration-150 ease-out group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            title="Add paragraph below"
                            onClick={() => handleInsertParagraphAfter(block.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className={`inline-flex cursor-grab rounded-full p-1.5 transition-all duration-150 hover:scale-105 hover:bg-secondary/70 active:scale-95 ${draggingBlockId === block.id ? "cursor-grabbing bg-secondary/80" : ""}`}
                            title="Drag to reorder"
                            draggable
                            onDragStart={(event) => {
                              setDraggingBlockId(block.id);
                              event.dataTransfer.effectAllowed = "move";
                              const preview = createDragPreview(block);
                              event.dataTransfer.setDragImage(preview, 52, 22);
                              requestAnimationFrame(() => {
                                document.body.removeChild(preview);
                              });
                            }}
                            onDragEnd={() => setDraggingBlockId(null)}
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                        </div>
                      </div>

                      {blocks.findIndex((item) => item.id === block.id) > 0 && (
                        <div className="absolute -right-16 top-1/2 z-10 -translate-y-1/2 text-muted-foreground sm:-right-20">
                          <button
                            type="button"
                            className="pointer-events-none inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/75 text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition-all duration-150 ease-out hover:bg-red-100 hover:text-red-700 active:bg-red-200 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"
                            title="Delete block"
                            onClick={() => handleDeleteBlock(block.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {dropIndicator?.blockId === block.id && dropIndicator.position === "after" && (
                        <div className="pointer-events-none absolute left-0 right-0 bottom-0 z-20 flex items-center gap-2 px-2">
                          <div className="h-0.5 flex-1 rounded-full bg-primary/65 shadow-[0_0_0_1px_rgba(255,255,255,0.75)]" />
                        </div>
                      )}

                      <div className="relative min-w-0 w-full">
                        {renderBlock(block, {
                          handleTextareaChange,
                          handleTextareaKeyDown,
                          setBlockRef,
                          handleEditableKeyDown,
                          handleEditableInput,
                          handleEditableBlur,
                          handleTodoChecked,
                          handleImageUrlChange,
                          handleImageInputKeyDown,
                          handleInsertParagraphAfter
                        })}

                        {slash.open && slash.blockId === block.id && (
                          <Card
                            ref={slashMenuRef}
                            className="absolute left-0 top-full z-50 mt-2 w-full max-w-sm border-border/90 bg-popover shadow-sm"
                          >
                            <CardContent className="space-y-2 p-3">
                              <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                <Slash className="h-3.5 w-3.5" />
                                Slash commands
                              </div>
                              {slashOptions.length === 0 && (
                                <p className="px-1 text-sm text-muted-foreground">No block type found</p>
                              )}
                              {slashOptions.map((type, index) => {
                                const meta = BLOCK_MENU_META[type] || BLOCK_MENU_META.paragraph;
                                const Icon = meta.icon;

                                return (
                                  <Button
                                    key={type}
                                    variant={slash.activeIndex === index ? "secondary" : "ghost"}
                                    className="w-full justify-start rounded-lg"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => applySlashSelection(type)}
                                    type="button"
                                  >
                                    <Icon className="h-4 w-4" />
                                    <span>{meta.label}</span>
                                  </Button>
                                );
                              })}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </article>
                  ))}

                  <button
                    type="button"
                    className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-secondary/70"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDropAtEnd}
                  >
                    Drag here to move block to end
                  </button>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function renderBlock(block, handlers) {
  const text = getTextContent(block);

  if (block.type === "divider") {
    return (
      <div className="py-3">
        <hr
          ref={(el) => handlers.setBlockRef(block.id, el)}
          tabIndex={-1}
          className="w-full border-0 border-t border-border"
        />
      </div>
    );
  }

  if (block.type === "image") {
    const url = String(block.content?.url || "");
    return (
      <div className="space-y-3">
        <Input
          ref={(el) => handlers.setBlockRef(block.id, el)}
          className="rounded-xl"
          placeholder="Paste image URL"
          value={url}
          onChange={(event) => handlers.handleImageUrlChange(block, event.target.value)}
          onKeyDown={(event) => handlers.handleImageInputKeyDown(event, block)}
        />
        {url ? (
          <img
            src={url}
            alt="Block preview"
            className="max-h-[420px] w-full rounded-2xl border border-border object-cover"
          />
        ) : null}
      </div>
    );
  }

  if (block.type === "todo") {
    return (
      <div className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3">
        <input
          type="checkbox"
          checked={Boolean(block.content?.checked)}
          className="mt-2 h-[18px] w-[18px] rounded border-border text-primary focus:ring-ring"
          onChange={(event) => handlers.handleTodoChecked(block, event.target.checked)}
          aria-label="Todo completed"
        />
        <div
          ref={(el) => handlers.setBlockRef(block.id, el)}
          className={getBlockClassName(block.type)}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={(event) => handlers.handleEditableKeyDown(event, block)}
          onInput={(event) => handlers.handleEditableInput(event, block)}
          onBlur={() => handlers.handleEditableBlur(block.id)}
        >
          {text}
        </div>
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <div className="space-y-2">
        <textarea
          ref={(el) => handlers.setBlockRef(block.id, el)}
          className="editor-code w-full bg-stone-100 border border-stone-300 rounded-xl px-4 py-3 font-mono text-[13px] leading-6 text-stone-900 shadow-sm outline-none resize-none overflow-hidden"
          value={text}
          onChange={(e) => {
            handlers.handleTextareaChange(e, block);
            // Auto-resize
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={(e) => handlers.handleTextareaKeyDown(e, block)}
          onBlur={() => handlers.handleEditableBlur(block.id)}
          spellCheck={false}
          style={{ height: "auto" }}
          rows={Math.max(1, text.split("\n").length)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Tip: Ctrl+Enter / Cmd+Enter</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={(el) => handlers.setBlockRef(block.id, el)}
      className={getBlockClassName(block.type)}
      contentEditable
      suppressContentEditableWarning
      onKeyDown={(event) => handlers.handleEditableKeyDown(event, block)}
      onInput={(event) => handlers.handleEditableInput(event, block)}
      onBlur={() => handlers.handleEditableBlur(block.id)}
      spellCheck={block.type !== "code"}
    >
      {text}
    </div>
  );
}
