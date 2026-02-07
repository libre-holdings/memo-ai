const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: ["http://localhost:8081", "http://localhost:19006"],
  })
);

app.get("/", (req, res) => {
  return res.send("hello");
});

app.listen(PORT, () => {
  console.log(`minetok-web listening on :${PORT}`);
});
