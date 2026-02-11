// src/libs/firebase/admin.js (CommonJS)
const admin = require("firebase-admin");

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("Missing env: FIREBASE_ADMIN_KEY");

  // JSON or base64(JSON)
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (_) {
    try {
      const jsonStr = Buffer.from(raw, "base64").toString("utf8");
      obj = JSON.parse(jsonStr);
    } catch (_) {
      throw new Error("FIREBASE_ADMIN_KEY is not valid JSON nor base64 JSON");
    }
  }

  if (typeof obj.private_key === "string") {
    obj.private_key = obj.private_key.replace(/\\n/g, "\n");
  }
  return obj;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  });
}

module.exports = admin;
