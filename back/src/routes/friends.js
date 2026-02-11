// src/routes/friends.js (CommonJS)
module.exports = function createFriendsRouter({ admin, db, requireAuth }) {
    const express = require("express");
    const router = express.Router();
  
    // GET /friends
    // res: [{ uid, status, createdAt, displayName? }]
    router.get("/friends", requireAuth, async (req, res) => {
      try {
        const snap = await db.collection(`users/${req.uid}/friends`).limit(500).get();
  
        const friends = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            uid: d.id,
            status: data.status || "",
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
            displayName: data.displayName || "", // キャッシュしてるなら
          };
        });
  
        // まずは active だけ返す
        return res.json(friends.filter((f) => f.status === "active"));
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "failed_to_fetch_friends" });
      }
    });
  
    return router;
  };
  