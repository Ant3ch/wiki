// src/routes/wikiFactory.ts
import { Router } from "express";
import polishData from "../utils/PolishData";
import { ConsoleLogger } from "../utils/Console";

/**
 * Fetch, rewrite relative links, and polish the HTML
 */
async function fetchAndPolish(
  host: string,
  path: string,
  polishOptions: { letter?: string; position?: number, finalPage?:string } = {}
): Promise<string> {
  // Request the explicit /wiki/<title> path when a title is provided.
  // Some Wikipedia endpoints return desktop markup for the host root unless
  // the request looks like a mobile browser or targets the /wiki/... path.
  let url = `https://${host}/`;
  if (path) {
    url = `https://${host}/wiki/${encodeURIComponent(path)}`;
  }

  // Use a mobile user-agent and sensible Accept/Accept-Language headers so
  // the server returns the mobile-styled HTML (especially important for the main page).
  const MOBILE_UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1";
  const fetchOptions = {
    headers: {
      "User-Agent": MOBILE_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr",
    },
  };

  const response = await fetch(url, fetchOptions);
  let html = await response.text();

  // Rewrite all relative links to absolute
  html = html.replace(/href="\/wiki\//g, `href="https://${host}/wiki/`);
  html = html.replace(/href="\/w\//g, `href="https://${host}/w/`);
  html = html.replace(/src="\/w\//g, `src="https://${host}/w/`);
  if (polishOptions.finalPage){
  html = await polishData(html, undefined , undefined,polishOptions.finalPage);

  }else{
  html = await polishData(html, polishOptions.letter, polishOptions.position);

  }

  return html;
}

/**
 * Factory to generate a wiki-like router (Wikipedia / Wiktionary)
 */
export function createWikiRouter(host: string) {
  const wikiRouter = Router();

  // Get page by title
  wikiRouter.get("/:title", async (req, res) => {
    try {
      const title = req.params.title
      ConsoleLogger.info("WikiPage -> "+ title)
      const html = await fetchAndPolish(host, title);
      res.send(html);
    } catch (err) {
      console.error(err);
      res.status(500).send("Erreur serveur");
    }
  });

  // Get page + letter filtering
  wikiRouter.get("/:title/:letter/:position", async (req, res) => {
    try {
      const { title, letter, position } = req.params;
          console.info("Wiki Page -> " + title + " | Letter -> " + letter + " | Position -> "+ position )

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
    } catch (err) {
      console.error(err);
      res.status(500).send("Erreur serveur dans la récupération de la page");
    }
  });

wikiRouter.get("/:title/:finalPage", async (req, res) => {
  try {
    const { title, finalPage } = req.params;
    console.info("Wiki Page -> " + title + "\t + final page ->" + finalPage)

    // Fetch and polish the HTML, passing finalPage
    const html = await fetchAndPolish(host, title,{finalPage});

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur serveur pendant la récupération de la page avec page final");
  }
});


  // Search API
  wikiRouter.get("/search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      ConsoleLogger.info("Searched -> " +'"' +query+ '"')
      // ⚠️ For search, host must be without `m.` (mobile)
      const apiHost = host.replace("m.", "");
      // Use a desktop-like UA for API queries (or reuse the mobile UA if desired).
      const API_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36";
      const apiFetchOptions = {
        headers: {
          "User-Agent": API_UA,
          "Accept": "application/json",
        },
      };
      const response = await fetch(
        `https://${apiHost}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&format=json`,
        apiFetchOptions
      );
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).send("Erreur serveur pendant la recherche");
    }
  });
 
  return wikiRouter;
}
