"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const WikiFactory_1 = require("./routes/WikiFactory");
const Config_1 = __importDefault(require("./routes/Config"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
const PORT = 80;
app.use((0, cors_1.default)({
    origin: "*",
    optionsSuccessStatus: 200,
    methods: ["POST", "GET", "UPDATE", "DELETE"],
}));
// --- API routes ---
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// French Wikipedia (mobile)
app.use("/wikiPage", (0, WikiFactory_1.createWikiRouter)("fr.m.wikipedia.org"));
// French Wiktionary (mobile)
app.use("/dicoPage", (0, WikiFactory_1.createWikiRouter)("fr.m.wiktionary.org"));
// config routes 
app.use('/config', Config_1.default);
// Serve static frontend files
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
// Fallback for SPA (React Router)
app.use((req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
