const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const data = [
  { drug1: "aspirin", drug2: "warfarin", severity: "High", message: "Severe bleeding risk" },
  { drug1: "ibuprofen", drug2: "paracetamol", severity: "Low", message: "Safe in normal dose" }
];

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

app.listen(3000);
