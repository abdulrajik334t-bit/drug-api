const axios = require("axios");
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
app.get("/ai", async (req, res) => {
  let msg = req.query.msg.toLowerCase();

  let reply = "Ask about drugs, food or interactions.";

  let drugs = Object.keys(data);

  let foundDrugs = drugs.filter(d =>
    msg.includes(d.toLowerCase())
  );

  // 🔥 1. Local drug interaction (FAST + ACCURATE)
  if (foundDrugs.length >= 2) {
    let d1 = foundDrugs[0];
    let d2 = foundDrugs[1];

    let interactions = data[d1];

    let found = interactions?.find(
      x => x.drug.toLowerCase() === d2.toLowerCase()
    );

    if (found) {
      reply = `⚠️ ${d1} + ${d2}: ${found.case} (Severity: ${found.severity})`;
      return res.json({ reply });
    } else {
      reply = `✅ No major interaction between ${d1} and ${d2}`;
      return res.json({ reply });
    }
  }

  // 🍎 Food interaction
  if (msg.includes("food") || msg.includes("diet")) {
    reply = "Some foods like grapefruit and alcohol can interact with medicines.";
    return res.json({ reply });
  }

  // 🍺 Alcohol
  if (msg.includes("alcohol")) {
    reply = "Alcohol can increase side effects like drowsiness or liver damage.";
    return res.json({ reply });
  }

  // 💊 Single drug info
  if (foundDrugs.length === 1) {
    reply = `${foundDrugs[0]} is a commonly used medicine. Always follow doctor's advice.`;
    return res.json({ reply });
  }

  // 🤖 2. GPT fallback (जब local fail हो)
  try {
    let response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: "You are a medical assistant. Give safe and simple advice."
          },
          {
            role: "user",
            content: msg
          }
        ]
      },
      {
        headers: {
          "Authorization": "Bearer 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",
          "Content-Type": "application/json"
        }
      }
    );

    reply = response.data.choices[0].message.content;

  } catch (err) {
    reply = "AI not available right now.";
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
