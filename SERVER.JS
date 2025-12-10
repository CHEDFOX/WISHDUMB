// server.js
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve HTML/CSS/JS from project root
app.use(express.static(path.join(__dirname)));

// Serve avatar videos at /avatars/...
app.use(
  "/avatars",
  express.static(path.join(__dirname, "public", "avatars"))
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
