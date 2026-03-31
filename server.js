const multer = require("multer");
const Tesseract = require("tesseract.js");
const upload = multer({ dest: "uploads/" });
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

// ✅ BIG JSON load
const data = require("./interactions.json");

// 🟢 Home route
app.get("/", (req, res) => {
  res.send("Drug Interaction API Running ✅");
});

// 🔥 MAIN CHECK API
app.get("/check", (req, res) => {
  let d1 = req.query.drug1;
  let d2 = req.query.drug2;

  if (!d1 || !d2) {
    return res.json({
      severity: "Error",
      message: "Enter both drugs"
    });
  }

  // 🔥 case-insensitive match
  let key = Object.keys(data).find(
    k => k.toLowerCase() === d1.toLowerCase()
  );

  if (key) {
    let interactions = data[key];

    let found = interactions.find(
      x => x.drug.toLowerCase() === d2.toLowerCase()
    );

    if (found) {
      return res.json({
        severity: found.severity.toUpperCase(),
        message: found.case
      });
    }
  }

  // ❌ not found
  res.json({
    severity: "LOW",
    message: "No significant interaction found"
  });
});

// 🤖 AI route (same रखो)
app.get("/ai", (req, res) => {
  let msg = req.query.msg.toLowerCase();

  let reply = "Ask about drugs, food or interactions.";

  // 🔥 Drug interaction detect
  let drugs = Object.keys(data);

  let foundDrugs = drugs.filter(d =>
    msg.includes(d.toLowerCase())
  );

  if (foundDrugs.length >= 2) {
    let d1 = foundDrugs[0];
    let d2 = foundDrugs[1];

    let interactions = data[d1];

    let found = interactions?.find(
      x => x.drug.toLowerCase() === d2.toLowerCase()
    );

    if (found) {
      reply = `⚠️ ${d1} + ${d2}: ${found.case} (Severity: ${found.severity})`;
    } else {
      reply = `✅ No major interaction between ${d1} and ${d2}`;
    }
  }

  // 🍎 Food interaction
  else if (msg.includes("food") || msg.includes("diet")) {
    reply = "Some foods like grapefruit and alcohol can interact with medicines.";
  }

  // 🍺 Alcohol special
  else if (msg.includes("alcohol")) {
    reply = "Alcohol can increase side effects like drowsiness or liver damage.";
  }

  // 💊 Single drug info
  else if (foundDrugs.length === 1) {
    reply = `${foundDrugs[0]} is a commonly used medicine. Always follow doctor's advice.`;
  }

  res.json({ reply });
});
// 📷 scan API
app.post("/scan", upload.single("image"), async (req, res) => {
    try {
        let result = await Tesseract.recognize(req.file.path, "eng");

        let text = result.data.text.toLowerCase();

        let detected = Object.keys(data).filter(d =>
            text.includes(d.toLowerCase())
        );

        res.json({
            drugs: detected.slice(0, 5)
        });

    } catch (err) {
        res.json({ drugs: [] });
    }
});
// 🚀 Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
