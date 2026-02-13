// src/routes/chatMessages.js
const express = require("express");

module.exports = function createChatMessagesRouter({ admin, db, requireAuth }) {
  const router = express.Router();

  const MAX_TITLE_LEN = 40;

  function makeTitleFromFirstMessage(text) {
    const t = String(text || "").trim().replace(/\s+/g, " ");
    if (!t) return "新規メモ";
    if (t.length > MAX_TITLE_LEN) return t.slice(0, MAX_TITLE_LEN) + "…";
    return t;
  }

  router.post("/chats/:chatId/messages", requireAuth, async (req, res) => {
    const { chatId } = req.params;
    const { content } = req.body || {};

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content_required" });
    }

    const trimmed = content.trim();
    const chatRef = db.collection("chats").doc(chatId);

    // ★ message ID を先に確保（レスポンスで返す・クライアントと整合させる）
    const msgRef = chatRef.collection("messages").doc();
    const msgId = msgRef.id;

    const startMs = Date.now();

    try {
      const now = admin.firestore.FieldValue.serverTimestamp();

      let nextTitle = null;
      let shouldSetTitle = false;

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(chatRef);
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
        if (shouldSetTitle) nextTitle = makeTitleFromFirstMessage(trimmed);

        tx.set(msgRef, {
          role: "user",
          content: trimmed,
          createdAt: now,
          uid: req.uid,
        });

        const update = { updatedAt: now };
        if (shouldSetTitle) update.title = nextTitle;

        tx.update(chatRef, update);
      });

      const tookMs = Date.now() - startMs;
      console.log("[POST /chats/:chatId/messages]", { tookMs, chatId, msgId, shouldSetTitle });

      // ✅ 返り値を改善：クライアントは再GET不要（最低限messageを返す）
      // createdAt は serverTimestamp なのでこの時点では未確定。必要なら後述の options を参照。
      return res.status(201).json({
        message: {
          id: msgId,
          role: "user",
          content: trimmed,
          // createdAt は未確定なので返さない or null にする
        },
        chat: shouldSetTitle ? { id: chatId, title: nextTitle } : { id: chatId },
      });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      return res.status(status).json({ error: e.message || "failed_to_create_message" });
    }
  });

  return router;
};
