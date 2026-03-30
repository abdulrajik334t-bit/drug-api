const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const data = [
  { drug1: "aspirin", drug2: "warfarin", severity: "High", message: "Severe bleeding risk" },
  { drug1: "ibuprofen", drug2: "paracetamol", severity: "Low", message: "Safe in normal dose" }
];app.get("/", (req, res) => {
  res.send("Drug Interaction API Running ✅");
});

app.get("/check", (req, res) => {
  let d1 = req.query.drug1.toLowerCase();
  let d2 = req.query.drug2.toLowerCase();

  let found = data.find(i =>
    (i.drug1 === d1 && i.drug2 === d2) ||
    (i.drug1 === d2 && i.drug2 === d1)
  );

  if (found) res.json(found);
  else res.json({ severity: "Unknown", message: "Consult doctor" });
});
app.get("/ai", (req, res) => {
  let msg = req.query.msg.toLowerCase();

  let reply = "Sorry, I don't understand.";

  if (msg.includes("aspirin")) {
    reply = "Aspirin is a blood thinner. Avoid with warfarin.";
  } 
  else if (msg.includes("paracetamol")) {
    reply = "Paracetamol is generally safe in normal doses.";
  }

  res.json({ reply });
});

app.listen(3000);
