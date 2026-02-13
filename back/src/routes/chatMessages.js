// src/routes/chatMessages.js
const express = require("express");

module.exports = function createChatMessagesRouter({ admin, db, requireAuth }) {
  const router = express.Router();

  const MAX_TITLE_LEN = 40;
  const MAX_LAST_LEN = 60; // 一覧プレビュー用（好みで調整）

  function normalizeOneLine(text) {
    return String(text || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function clip(text, max) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  function makeTitleFromFirstMessage(text) {
    const t = normalizeOneLine(text);
    if (!t) return "新規メモ";
    return clip(t, MAX_TITLE_LEN);
  }

  router.post("/chats/:chatId/messages", requireAuth, async (req, res) => {
    const { chatId } = req.params;
    const { content } = req.body || {};
  
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content_required" });
    }
  
    const trimmed = content.trim();
    const oneLine = normalizeOneLine(trimmed);
    const lastMessage = clip(oneLine, MAX_LAST_LEN);
  
    const chatRef = db.collection("chats").doc(chatId);
    const msgRef = chatRef.collection("messages").doc();
    const msgId = msgRef.id;
  
    const t0 = Date.now();
  
    try {
      const now = admin.firestore.FieldValue.serverTimestamp();
  
      let nextTitle = null;
      let shouldSetTitle = false;
  
      // tx 内訳計測用
      let txGetMs = null;
      let txBodyMs = null;
  
      const tTxStart = Date.now();
      await db.runTransaction(async (tx) => {
        const tGet0 = Date.now();
        const snap = await tx.get(chatRef);
        txGetMs = Date.now() - tGet0;
  
        if (!snap.exists) {
          const err = new Error("chat_not_found");
          err.status = 404;
          throw err;
        }
  
        const chat = snap.data();
        if (chat.ownerUid !== req.uid) {
          const err = new Error("forbidden");
          err.status = 403;
          throw err;
        }
  
        shouldSetTitle = !chat.title || chat.title === "新規メモ";
        if (shouldSetTitle) nextTitle = makeTitleFromFirstMessage(oneLine);
  
        tx.set(msgRef, {
          role: "user",
          content: trimmed,
          createdAt: now,
          uid: req.uid,
        });
  
        const update = {
          updatedAt: now,
          lastAt: now,
          lastMessage,
        };
        if (shouldSetTitle) update.title = nextTitle;
  
        tx.update(chatRef, update);
  
        txBodyMs = Date.now() - tGet0; // tx.get後〜tx内処理終わりまで（参考）
      });
      const txTotalMs = Date.now() - tTxStart;
  
      const totalMs = Date.now() - t0;
      console.log("[perf-srv] POST /messages", {
        totalMs,
        txTotalMs,
        txGetMs,
        txBodyMs,
        chatId,
        msgId,
        shouldSetTitle,
      });
  
      return res.status(201).json({
        message: { id: msgId, role: "user", content: trimmed },
        chat: {
          id: chatId,
          ...(shouldSetTitle ? { title: nextTitle } : {}),
          lastMessage,
        },
      });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      console.log("[perf-srv] POST /messages error", {
        status,
        totalMs: Date.now() - t0,
        chatId,
        msgId,
      });
      return res.status(status).json({ error: e.message || "failed_to_create_message" });
    }
  });
  

  return router;
};
