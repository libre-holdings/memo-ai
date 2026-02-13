// src/routes/chatMessages.js
const express = require("express");

module.exports = function createChatMessagesRouter({
  admin,
  db,
  requireAuth,
  // generateTitleFromText, // ✅ もう使わない（ChatGPTっぽいタイトル生成を封じる）
}) {
  const router = express.Router();

  // タイトルに使う最大文字数（必要に応じて調整）
  const MAX_TITLE_LEN = 40;

  function makeTitleFromFirstMessage(text) {
    // 先頭メッセージをそのままタイトルにするが、改行や連続空白は整形して短くする
    const t = String(text || "")
      .trim()
      .replace(/\s+/g, " "); // 改行/タブ含む連続空白を1スペースへ

    if (!t) return "新規メモ";

    // 長い場合は切る（UI都合）
    if (t.length > MAX_TITLE_LEN) {
      return t.slice(0, MAX_TITLE_LEN) + "…";
    }
    return t;
  }

  router.post("/chats/:chatId/messages", requireAuth, async (req, res) => {
    const { chatId } = req.params;
    const { content } = req.body || {};
  
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content_required" });
    }
  
    try {
      const chatRef = db.collection("chats").doc(chatId);
      const snap = await chatRef.get();
      if (!snap.exists) return res.status(404).json({ error: "chat_not_found" });
  
      const chat = snap.data();
      if (chat.ownerUid !== req.uid) {
        return res.status(403).json({ error: "forbidden" });
      }
  
      const now = admin.firestore.FieldValue.serverTimestamp();
      const trimmed = content.trim();
  
      // message create
      const msgRef = await chatRef.collection("messages").add({
        role: "user",
        content: trimmed,
        createdAt: now,
        uid: req.uid,
      });
  
      // chat update payload
      const updates = {
        updatedAt: now,
        lastAt: now,
        lastMessage: trimmed, // 長すぎるならここで切るのもアリ
      };
  
      // 初回タイトル生成
      const shouldSetTitle = !chat.title || chat.title === "新規メモ";
      if (shouldSetTitle) {
        updates.title = makeTitleFromFirstMessage(trimmed);
      }
  
      await chatRef.update(updates);
  
      return res.status(201).json({ id: msgRef.id });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "failed_to_create_message" });
    }
  });
  

  return router;
};
