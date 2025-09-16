import express from "express";
import cors from "cors";
import path from "path";
import { createWikiRouter } from "./routes/WikiFactory";
import configRouter from "./routes/Config"
import bodyParser from "body-parser";

const app = express();
const PORT = 3000;
app.use(cors({
  origin: "*",
  optionsSuccessStatus: 200,
  methods: ["POST", "GET", "UPDATE", "DELETE"],
}));

// --- API routes ---
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
// French Wikipedia (mobile)
app.use("/wikiPage", createWikiRouter("fr.m.wikipedia.org"));

// French Wiktionary (mobile)
app.use("/dicoPage", createWikiRouter("fr.m.wiktionary.org"));


// config routes 
app.use('/config',configRouter)

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../public")));

// Fallback for SPA (React Router)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
