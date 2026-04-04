const axios = require("axios");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const upload = multer({ dest: "uploads/" });
const express = require("express");
const fs = require('fs');
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY_HERE");
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Load interactions.json
let drugData = {};
try {
    if (fs.existsSync('interactions.json')) {
        drugData = JSON.parse(fs.readFileSync('interactions.json'));
        console.log('✓ interactions.json loaded');
    } else {
        console.log('⚠ interactions.json not found, using default data');
        drugData = {
            "aspirin": [
                { "drug": "warfarin", "severity": "high", "case": "Increased risk of bleeding. Avoid combination." },
                { "drug": "ibuprofen", "severity": "moderate", "case": "Reduced heart protection. Use with caution." }
            ],
            "paracetamol": [
                { "drug": "alcohol", "severity": "high", "case": "Risk of liver damage. Avoid alcohol." }
            ],
            "amoxicillin": [
                { "drug": "warfarin", "severity": "moderate", "case": "May increase bleeding risk. Monitor INR." }
            ]
        };
    }
} catch (err) {
    console.error('Error loading interactions.json:', err.message);
}

// 🏠 Home route
app.get("/", (req, res) => {
    res.send("Drug Interaction API Running ✅");
});

// 🔥 DRUG-DRUG INTERACTION CHECK
app.get("/check", async (req, res) => {
    const drug1 = req.query.drug1?.toLowerCase().trim();
    const drug2 = req.query.drug2?.toLowerCase().trim();

    if (!drug1 || !drug2) {
        return res.json({ severity: "Error", message: "Please enter both drug names" });
    }

    try {
        // ContraRadar API call - No API key needed
        const response = await fetch('https://contraradar.vercel.app/api/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drugs: [drug1, drug2] })
        });
        
        const data = await response.json();
        
        // Convert response to your frontend format
        let severity = "LOW";
        if (data.risk_level === "high") severity = "HIGH";
        else if (data.risk_level === "moderate") severity = "MODERATE";
        
        res.json({
            severity: severity,
            message: data.interaction_description || `Interaction found between ${drug1} and ${drug2}`
        });
        
    } catch (error) {
        console.error("ContraRadar error:", error);
        // Fallback response
        res.json({
            severity: "LOW",
            message: `No significant interaction found between ${drug1} and ${drug2}`
        });
    }
});

// 🍎 DRUG-FOOD INTERACTION CHECK
app.get("/foodcheck", (req, res) => {
    let drug = req.query.drug?.toLowerCase().trim();
    let food = req.query.food?.toLowerCase().trim();

    if (!drug || !food) {
        return res.json({ message: "Please enter both drug and food name" });
    }

    const foodInteractions = {
        "grapefruit": {
            "aspirin": "Moderate - May increase side effects",
            "paracetamol": "Low - Generally safe",
            "amoxicillin": "Low - No significant interaction"
        },
        "alcohol": {
            "paracetamol": "High - Risk of liver damage. Avoid alcohol",
            "aspirin": "Moderate - Increased risk of stomach bleeding",
            "ibuprofen": "Moderate - Increased risk of stomach bleeding"
        },
        "dairy": {
            "amoxicillin": "Moderate - May reduce absorption. Take 2 hours apart",
            "aspirin": "Low - No significant interaction"
        },
        "caffeine": {
            "aspirin": "Low - May increase stimulant effect",
            "paracetamol": "Low - Generally safe"
        }
    };

    if (foodInteractions[food] && foodInteractions[food][drug]) {
        return res.json({ 
            severity: "MODERATE",
            message: foodInteractions[food][drug]
        });
    } else {
        return res.json({ 
            severity: "LOW",
            message: `No known interaction between ${drug} and ${food}. However, always consult your doctor.`
        });
    }
});

// 🤖 AI CHATBOT
app.get("/ai", async (req, res) => {
    let msg = req.query.msg?.toLowerCase() || "";

    let drugsList = Object.keys(drugData);
    let foundDrugs = drugsList.filter(d => msg.includes(d.toLowerCase()));

    let localReply = "";

    if (foundDrugs.length >= 2) {
        let d1 = foundDrugs[0];
        let d2 = foundDrugs[1];
        let interactions = drugData[d1];
        let found = interactions?.find(x => x.drug.toLowerCase() === d2.toLowerCase());
        if (found) {
            localReply = `⚠️ ${d1} + ${d2}: ${found.case} (Severity: ${found.severity})`;
        } else {
            localReply = `✅ No major interaction found between ${d1} and ${d2}`;
        }
    }
    else if (msg.includes("food") || msg.includes("grapefruit") || msg.includes("alcohol")) {
        localReply = "🍎 Some foods like grapefruit and alcohol can interact with medicines. Always maintain a 2-hour gap.";
    }
    else if (foundDrugs.length === 1) {
        localReply = `💊 ${foundDrugs[0]} is a commonly used medicine. Always take as prescribed by your doctor.`;
    }
    else {
        localReply = "💡 Always take medicines as prescribed. Never share your medicines with others.";
    }

    try {
        let response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "google/gemini-2.0-flash-exp:free",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional medical AI assistant. Provide accurate, safe information about drugs, interactions, and general health. Always advise consulting a doctor."
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
        let finalReply = localReply + "\n\n🤖 AI Doctor:\n" + aiReply;
        res.json({ reply: finalReply });

    } catch (err) {
        res.json({ reply: localReply });
    }
});

// ========== AUTOCOMPLETE - FIXED ==========
app.get("/autocomplete", (req, res) => {
    const query = req.query.query?.toLowerCase().trim() || "";
    
    if (!query) {
        return res.json([]);
    }
    
    const drugNames = Object.keys(drugData);
    const matchedDrugs = drugNames.filter(name => name.toLowerCase().includes(query));
    const topResults = matchedDrugs.slice(0, 10);
    const formattedResults = topResults.map(name => ({ name: name }));
    
    res.json(formattedResults);
});

// ========== PRESCRIPTION SCAN ==========
app.post("/scan", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ drugs: [] });
        }
        let result = await Tesseract.recognize(req.file.path, "eng");
        let text = result.data.text.toLowerCase();
        let detected = Object.keys(drugData).filter(d => text.includes(d.toLowerCase()));
        res.json({ drugs: detected.slice(0, 5) });
    } catch (err) {
        console.error("Scan error:", err);
        res.json({ drugs: [] });
    }
});

// Debug log
console.log("📋 Available drugs for autocomplete:");
console.log(Object.keys(drugData));

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
