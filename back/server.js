// server.js (CommonJS)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const admin =
  require("./src/libs/firebase/admin").default ||
  require("./src/libs/firebase/admin");
const createChatMessagesRouter = require("./src/routes/chatMessages");
const createFriendsRouter = require("./src/routes/friends");

const app = express();
const PORT = 8000;

app.use(express.json());


// ✅ ここに入れる（全ルート共通）
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log("[http]", req.method, req.originalUrl, res.statusCode, Date.now() - t0, "ms");
  });
  next();
});

/**
 * CORS:
 * - Expo/React Native は origin が付かないことがある（null/undefined）
 * - 開発中は「origin 未指定は許可」にしておくと詰まりにくい
 * - 可能なら LAN のIP:8081 なども追加
 */
const allowedOrigins = new Set([
  "http://localhost:8081",
  "http://localhost:19006",
  // 例: Expo dev server が LAN の場合（必要なら追加）
  // "http://192.168.0.103:8081",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // RN/Expo の一部環境対策
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

async function generateTitleFromText(text) {
  console.log(text);
  const prompt = `次の文章から、メモ帳のタイトルとして自然な日本語を1つ作ってください。

  条件:
  - 12〜18文字くらい（長くても22文字まで）
  - 「まとめ」「基本」「について」など説明っぽい語は避ける
  - 体言止め（名詞で終える）
  - 1行のみ（改行なし）
  - 入力が箇条書き/単語列なら、先頭2〜3語を「・」や「、」で並べた形を優先
  - 日付や時間が入っている場合は文頭の【】の中に必ず含めて
  
  文章:
  ${text}`;

  try {
    const resp = await openai.responses.create({
      // まずは確実に存在が確認できるモデル名に寄せる
      model: "gpt-4.1-mini", // ← いったんこれに（後で mini に戻してOK）
      input: prompt,
    });

    const raw = (resp.output_text || "").trim();
    const title = raw.replace(/\s+/g, " ").slice(0, 40);

    console.log("generated title:", title);
    return title;
  } catch (e) {
    console.error("===========================");
    console.error("generateTitleFromText failed:", e);
    console.error("===========================");
    return "";
  }
}

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const m = h.match(/^Bearer\s+(.+)$/);
    if (!m) return res.status(401).json({ error: "missing_bearer_token" });

    const decoded = await admin.auth().verifyIdToken(m[1]);
    req.uid = decoded.uid;
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

app.get("/", (req, res) => res.send("hello"));

const db = admin.firestore();

// server.js に追加（CommonJS）
// requireAuth は既にある前提

function genCode(len = 8) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 紛らわしい文字除外
  let out = "";
  for (let i = 0; i < len; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}


app.use(
  createChatMessagesRouter({
    admin,
    db,
    requireAuth,
    generateTitleFromText,
  })
);

/**
 * POST /chats
 * res: { id }
 */
app.post("/chats", requireAuth, async (req, res) => {
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = await db.collection("chats").add({
      ownerUid: req.uid,
      title: "新規メモ", // 任意
      createdAt: now,
      updatedAt: now,
    });
    return res.status(201).json({ id: ref.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_create_chat" });
  }
});

/**
 * GET /chats
 * res: [{ id, title, updatedAt, createdAt }]
 * - ChatSidebar がこれを想定
 */
app.get("/chats", requireAuth, async (req, res) => {
  try {
    const snap = await db
      .collection("chats")
      .where("ownerUid", "==", req.uid)
      .orderBy("updatedAt", "desc")
      .limit(200)
      .get();

    const chats = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        title: data.title || "",
        lastMessage: data.lastMessage || "",
        favorite: !!data.favorite,
        favoriteAt: data.favoriteAt?.toDate
          ? data.favoriteAt.toDate().toISOString()
          : null,
          lastAt: data.lastAt?.toDate
          ? data.lastAt.toDate().toISOString()
          : null,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : null,
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : null,
      };
    });

    return res.json(chats);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_fetch_chats" });
  }
});


/**
 * PATCH /chats/:chatId/title
 * body: { title: string }
 * res: { ok: true, title }
 */
app.patch("/chats/:chatId/title", requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const { title } = req.body || {};

  if (typeof title !== "string") {
    return res.status(400).json({ error: "title_must_be_string" });
  }

  const next = title.trim();
  if (!next) {
    return res.status(400).json({ error: "title_must_not_be_empty" });
  }
  if (next.length > 80) {
    return res.status(400).json({ error: "title_too_long" });
  }

  try {
    const ref = db.collection("chats").doc(chatId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "chat_not_found" });

    const chat = snap.data() || {};
    if (chat.ownerUid !== req.uid) {
      return res.status(403).json({ error: "forbidden" });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(
      {
        title: next,
        updatedAt: now,
      },
      { merge: true }
    );

    return res.json({ ok: true, title: next });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_update_title" });
  }
});

/**
 * DELETE /chats/:chatId
 * res: { ok: true }
 */
app.delete("/chats/:chatId", requireAuth, async (req, res) => {
  const { chatId } = req.params;

  try {
    const ref = db.collection("chats").doc(chatId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "chat_not_found" });

    const chat = snap.data() || {};
    if (chat.ownerUid !== req.uid) {
      return res.status(403).json({ error: "forbidden" });
    }

    // messages サブコレ削除（まずは確実に）
    const msgSnap = await ref.collection("messages").limit(5000).get();
    if (!msgSnap.empty) {
      const batch = db.batch();
      msgSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await ref.delete();

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_delete_chat" });
  }
});



/**
 * PATCH /chats/:chatId
 * body: { favorite: boolean }
 * res: { ok: true, favorite: boolean }
 */
app.patch("/chats/:chatId", requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const { favorite } = req.body || {};

  // 入力バリデーション
  if (typeof favorite !== "boolean") {
    return res.status(400).json({ error: "favorite_must_be_boolean" });
  }

  try {
    const ref = db.collection("chats").doc(chatId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "chat_not_found" });

    const chat = snap.data() || {};
    if (chat.ownerUid !== req.uid) return res.status(403).json({ error: "forbidden" });

    const now = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(
      {
        favorite,
        // favorite を true にした時だけ favoriteAt を更新（解除時は残す/消すは好み）
        ...(favorite ? { favoriteAt: now } : {}),
        updatedAt: now, // メタ更新として updatedAt を動かすかは好み（動かさない運用もあり）
      },
      { merge: true }
    );

    return res.json({ ok: true, favorite });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_update_chat" });
  }
});


/**
 * GET /chats/:chatId
 * res: { id, title, favorite, favoriteAt, createdAt, updatedAt }
 */
app.get("/chats/:chatId", requireAuth, async (req, res) => {
  const { chatId } = req.params;

  try {
    const ref = db.collection("chats").doc(chatId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "chat_not_found" });

    const chat = snap.data() || {};
    if (chat.ownerUid !== req.uid) return res.status(403).json({ error: "forbidden" });

    return res.json({
      id: snap.id,
      title: chat.title || "",
      favorite: !!chat.favorite,
      favoriteAt: chat.favoriteAt?.toDate ? chat.favoriteAt.toDate().toISOString() : null,
      createdAt: chat.createdAt?.toDate ? chat.createdAt.toDate().toISOString() : null,
      updatedAt: chat.updatedAt?.toDate ? chat.updatedAt.toDate().toISOString() : null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_fetch_chat" });
  }
});

/**
 * GET /chats/:chatId/messages
 * res: [{ id, role, content, createdAt }]
 * - フロントは reverse して inverted で表示しているので
 *   ここでは createdAt 昇順（古い→新しい）で返すのが自然
 */
app.get("/chats/:chatId/messages", requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 30, 100); // 30推奨、最大100
  const cursor = req.query.cursor || null; // 前回の最後のdocId

  try {
    const chatRef = db.collection("chats").doc(chatId);
    const snap = await chatRef.get();
    if (!snap.exists) return res.status(404).json({ error: "chat_not_found" });

    const chat = snap.data();
    if (chat.ownerUid !== req.uid) {
      return res.status(403).json({ error: "forbidden" });
    }

    let q = chatRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (cursor) {
      const cursorDoc = await chatRef.collection("messages").doc(cursor).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const msgSnap = await q.get();

    const items = msgSnap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        content: data.content || "",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const nextCursor =
      msgSnap.docs.length === limit ? msgSnap.docs[msgSnap.docs.length - 1].id : null;

    return res.json({ items, nextCursor });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed_to_fetch_messages" });
  }
});


app.use(createFriendsRouter({ admin, db, requireAuth }));

app.listen(PORT, () => console.log(`listening on :${PORT}`));
