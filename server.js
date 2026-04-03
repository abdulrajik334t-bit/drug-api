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

  console.log("🔍 Checking interaction between:", d1, "and", d2);

  if (!d1 || !d2) {
    return res.json({ severity: "Error", message: "Please enter both drug names" });
  }

  // Agar data empty hai
  if (!data || Object.keys(data).length === 0) {
    console.log("⚠️ No data loaded in interactions.json");
    return res.json({ 
      severity: "INFO", 
      message: "Drug interaction database is empty. Please check interactions.json file." 
    });
  }

  let drugsList = Object.keys(data);
  console.log("📚 Available drugs:", drugsList);

  for (let key of drugsList) {
    let interactions = data[key];

    // Agar interactions array hai
    if (Array.isArray(interactions)) {
      for (let item of interactions) {
        if (
          (key.toLowerCase() === d1.toLowerCase() &&
           item.drug?.toLowerCase() === d2.toLowerCase()) ||
          (key.toLowerCase() === d2.toLowerCase() &&
           item.drug?.toLowerCase() === d1.toLowerCase())
        ) {
          console.log("✅ Interaction found:", item);
          return res.json({
            severity: item.severity?.toUpperCase() || "MODERATE",
            message: item.case || "Interaction exists between these drugs"
          });
        }
      }
    }
  }

  console.log("❌ No interaction found");
  res.json({
    severity: "LOW",
    message: `No significant interaction found between ${d1} and ${d2}`
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
          "Authorization": "Bearer sk-or-v1-a535177886caa9a2b8dc5adf",
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
    const query = req.query.query?.toLowerCase() || "";
    
    // Drugs ke saare keys (names) nikal lo
    const drugNames = Object.keys(data);  // data hai interactions.json
    
    // Filter karo
    const results = drugNames.filter(name => name.toLowerCase().includes(query)).slice(0, 10);
    
    // Array of objects banao
    const formattedResults = results.map(name => ({ name: name }));
    
    res.json(formattedResults);
});
// 🚀 Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

