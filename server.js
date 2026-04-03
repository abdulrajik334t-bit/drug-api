const axios = require("axios");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const upload = multer({ dest: "uploads/" });
const express = require("express");
const fs = require('fs');
// Safe loading for interaction.json
let drugs = {};
try {
    if (fs.existsSync('interaction.json')) {
        drugs = JSON.parse(fs.readFileSync('interaction.json'));
        console.log('✓ interaction.json loaded');
    } else {
        console.log('⚠ interaction.json not found');
    }
} catch (err) {
    console.error('Error loading interaction.json:', err.message);
}
const cors = require("cors");

const app = express();
app.use(cors());

// ✅ JSON load
// Safe loading for interactions.json
let data = {};
try {
    if (fs.existsSync('interactions.json')) {
        data = require("./interactions.json");
        console.log('✓ interactions.json loaded');
    } else {
        console.log('⚠ interactions.json not found');
    }
} catch (err) {
    console.error('Error loading interactions.json:', err.message);
}

// 🟢 Home route
app.get("/", (req, res) => {
  res.send("Drug Interaction API Running ✅");
});

// 🔥 MAIN CHECK API
app.get("/check", (req, res) => {
  let d1 = req.query.drug1;
  let d2 = req.query.drug2;

  if (!d1 || !d2) {
    return res.json({ severity: "Error", message: "Enter both drugs" });
  }

  let drugs = Object.keys(data);

  for (let key of drugs) {
    let interactions = data[key];

    for (let item of interactions) {
      if (
        (key.toLowerCase() === d1.toLowerCase() &&
         item.drug.toLowerCase() === d2.toLowerCase()) ||
        (key.toLowerCase() === d2.toLowerCase() &&
         item.drug.toLowerCase() === d1.toLowerCase())
      ) {
        return res.json({
          severity: item.severity.toUpperCase(),
          message: item.case
        });
      }
    }
  }

  res.json({
    severity: "LOW",
    message: "No significant interaction found"
  });
});

// 🤖 AI ROUTE (FINAL PRO VERSION)
app.get("/ai", async (req, res) => {
  let msg = req.query.msg?.toLowerCase() || "";

  let drugs = Object.keys(data);
  let foundDrugs = drugs.filter(d =>
    msg.includes(d.toLowerCase())
  );

  let localReply = "";
  let reply = "";

  // 🔥 Local drug interaction
  if (foundDrugs.length >= 2) {
    let d1 = foundDrugs[0];
    let d2 = foundDrugs[1];

    let interactions = data[d1];

    let found = interactions?.find(
      x => x.drug.toLowerCase() === d2.toLowerCase()
    );

    if (found) {
      localReply = `⚠️ ${d1} + ${d2}: ${found.case} (Severity: ${found.severity})`;
    } else {
      localReply = `✅ No major interaction between ${d1} and ${d2}`;
    }
  }

  // 🍎 Food interaction
  else if (msg.includes("food") || msg.includes("diet")) {
    localReply = "🍎 Some foods like grapefruit and alcohol can interact with medicines.";
  }

  // 🍺 Alcohol
  else if (msg.includes("alcohol")) {
    localReply = "🍺 Alcohol can increase side effects like drowsiness or liver damage.";
  }

  // 💊 Single drug info
  else if (foundDrugs.length === 1) {
    localReply = `💊 ${foundDrugs[0]} is a commonly used medicine. Always follow doctor's advice.`;
  }

  // 🤖 GPT AI (ALWAYS RUN)
  try {
    let response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: "You are a professional medical AI. Explain drug interactions, risks, food interactions, and precautions clearly in simple language."
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

    let aiReply = response.data.choices[0].message.content;

    reply = localReply + "\n\n🤖 AI Explanation:\n" + aiReply;

  } catch (err) {
    reply = localReply || "AI not available right now.";
  }

  res.json({ reply });
});

// 📷 Prescription Scan API
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
app.get('/autocomplete', (req, res) => {
    const query = req.query.query.toLowerCase();   // User ne kya type kiya
    const results = drugs.filter(d => d.name.toLowerCase().includes(query)).slice(0, 10);
    res.json(results);  // Browser ko JSON me bhej de
});
// 🚀 Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

