"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PolishData_1 = __importDefault(require("../../utils/old/PolishData"));
const router = (0, express_1.Router)();
router.get("/:title", async (req, res) => {
    try {
        let title = req.params.title;
        let url = "https://fr.m.wikipedia.org/";
        if (title && title !== "Main_Page") {
            url += "wiki/" + encodeURIComponent(title);
        }
        // else: fetch main page
        const response = await fetch(url);
        let html = await response.text();
        // Rewrite all relative links to absolute
        html = html.replace(/href="\/wiki\//g, 'href="https://fr.m.wikipedia.org/wiki/');
        html = html.replace(/href="\/w\//g, 'href="https://fr.m.wikipedia.org/w/');
        html = html.replace(/src="\/w\//g, 'src="https://fr.m.wikipedia.org/w/');
        html = await (0, PolishData_1.default)(html);
        res.send(html);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur");
    }
});
router.get("/:title/:letter/:position", async (req, res) => {
    try {
        let title = req.params.title;
        let letter = req.params.letter;
        let position = req.params.position;
        let letterposition = parseInt(position, 10) - 1; // Convert to zero-based index
        let url = "https://fr.m.wikipedia.org/";
        if (title && title !== "Main_Page") {
            url += "wiki/" + encodeURIComponent(title);
        }
        // else: fetch main page
        const response = await fetch(url);
        let html = await response.text();
        // Rewrite all relative links to absolute
        html = html.replace(/href="\/wiki\//g, 'href="https://fr.m.wikipedia.org/wiki/');
        html = html.replace(/href="\/w\//g, 'href="https://fr.m.wikipedia.org/w/');
        html = html.replace(/src="\/w\//g, 'src="https://fr.m.wikipedia.org/w/');
        html = await (0, PolishData_1.default)(html, letter, letterposition);
        res.send(html);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur");
    }
});
router.get("/main", async (req, res) => {
    try {
        const response = await fetch("https://fr.m.wikipedia.org/");
        let html = await response.text();
        html = html.replace(/href="\/wiki\//g, 'href="https://fr.m.wikipedia.org/wiki/');
        html = html.replace(/href="\/w\//g, 'href="https://fr.m.wikipedia.org/w/');
        html = html.replace(/src="\/w\//g, 'src="https://fr.m.wikipedia.org/w/');
        html = await (0, PolishData_1.default)(html);
        res.send(html);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur");
    }
});
router.get("/search/:query", async (req, res) => {
    try {
        let query = req.params.query;
        const response = await fetch(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`);
        const data = await response.json();
        res.json(data);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur");
    }
});
exports.default = router;
