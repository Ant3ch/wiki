"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWikiRouter = createWikiRouter;
// src/routes/wikiFactory.ts
const express_1 = require("express");
const PolishData_1 = __importDefault(require("../utils/PolishData"));
const Console_1 = require("../utils/Console");
/**
 * Fetch, rewrite relative links, and polish the HTML
 */
async function fetchAndPolish(host, path, polishOptions = {}) {
    let url = `https://${host}/`;
    if (path && path !== "Main_Page") {
        url += `wiki/${encodeURIComponent(path)}`;
    }
    const response = await fetch(url);
    let html = await response.text();
    // Rewrite all relative links to absolute
    html = html.replace(/href="\/wiki\//g, `href="https://${host}/wiki/`);
    html = html.replace(/href="\/w\//g, `href="https://${host}/w/`);
    html = html.replace(/src="\/w\//g, `src="https://${host}/w/`);
    if (polishOptions.finalPage) {
        html = await (0, PolishData_1.default)(html, undefined, undefined, polishOptions.finalPage);
    }
    else {
        html = await (0, PolishData_1.default)(html, polishOptions.letter, polishOptions.position);
    }
    return html;
}
/**
 * Factory to generate a wiki-like router (Wikipedia / Wiktionary)
 */
function createWikiRouter(host) {
    const wikiRouter = (0, express_1.Router)();
    // Get page by title
    wikiRouter.get("/:title", async (req, res) => {
        try {
            const title = req.params.title;
            Console_1.ConsoleLogger.info("WikiPage -> " + title);
            const html = await fetchAndPolish(host, title);
            res.send(html);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("Erreur serveur");
        }
    });
    // Get page + letter filtering
    wikiRouter.get("/:title/:letter/:position", async (req, res) => {
        try {
            const { title, letter, position } = req.params;
            console.info("Wiki Page -> " + title + " | Letter -> " + letter + " | Position -> " + position);
            const letterposition = parseInt(position, 10) - 1;
            if (letterposition < 0) {
                return res.status(400).send("Invalid position parameter");
            }
            if (letter.length !== 1 || !/[a-zA-Z]/.test(letter)) {
                return res.status(400).send("Invalid letter parameter");
            }
            const html = await fetchAndPolish(host, title, {
                letter,
                position: letterposition,
            });
            res.send(html);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("Erreur serveur dans la récupération de la page");
        }
    });
    wikiRouter.get("/:title/:finalPage", async (req, res) => {
        try {
            const { title, finalPage } = req.params;
            console.info("Wiki Page -> " + title + "\t + final page ->" + finalPage);
            // Fetch and polish the HTML, passing finalPage
            const html = await fetchAndPolish(host, title, { finalPage });
            res.send(html);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("Erreur serveur pendant la récupération de la page avec page final");
        }
    });
    // Search API
    wikiRouter.get("/search/:query", async (req, res) => {
        try {
            const { query } = req.params;
            Console_1.ConsoleLogger.info("Searched -> " + '"' + query + '"');
            // ⚠️ For search, host must be without `m.` (mobile)
            const apiHost = host.replace("m.", "");
            const response = await fetch(`https://${apiHost}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`);
            const data = await response.json();
            res.json(data);
        }
        catch (err) {
            console.error(err);
            res.status(500).send("Erreur serveur pendant la recherche");
        }
    });
    return wikiRouter;
}
