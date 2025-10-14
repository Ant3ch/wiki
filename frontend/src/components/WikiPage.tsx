import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import {HOST,DEBUG} from '../Context/CONSTANT'
interface WikiPageProps {
  pageType?: "wikiPage" | "dicoPage";
  pageName?: string;
}

const WikiPage: React.FC<WikiPageProps> = ({
  pageType = "wikiPage",
  pageName,
}) => {
  const { key: paramKey } = useParams<{ key: string }>();
  const key = pageName ?? paramKey;

  useEffect(() => {
    document.title = key ? `${key} — Wikipedia` : "Wikipedia";
  }, [key]);

  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setError("Erreur: clé de page manquante");
      return;
    }
    if (!key.trim()) {
      setError("Erreur: clé de page vide");
      return;
    }

    const word = localStorage.getItem("word") || "";
    const wordLength = word.length;

    let currentLetterIndex = parseInt(localStorage.getItem("currentLetterIndex") || "0", 10);
    if (isNaN(currentLetterIndex) || currentLetterIndex < 0) currentLetterIndex = 0;

    const letter = word ? word.charAt(currentLetterIndex) : "";
    if (word) localStorage.setItem("currentLetter", letter);

    // Use presence check for letterPosition key so we can detect per-letter requests
    const posNumStr = localStorage.getItem("letterPosition"); // null if not set
    let posNum = posNumStr !== null ? parseInt(posNumStr, 10) : null;
    if (posNum !== null && (isNaN(posNum) || posNum < 0)) posNum = 0;

    // Determine finalPage and target type
    let finalPage = localStorage.getItem("finalpage") ?? "philosophie";
    let target: "wikiPage" | "dicoPage" = "wikiPage";
    if (finalPage.includes("dicoPage")) target = "dicoPage";

    // Clean finalPage string
    finalPage = finalPage.replace(new RegExp(`/?${target}/?`, "gi"), "");

    let endpoint: string;

    // Determine whether this request should fetch a letter page or the final page.
    const isFinal = Boolean(word && currentLetterIndex >= wordLength);
    if (isFinal) {
      // Finished all letters → final page
      endpoint = `${HOST}/${target}/${key}/${finalPage}/`;
    } else if (word && posNumStr !== null) {
      // Per-letter request (use posNumStr as stored)
      endpoint = `${HOST}/${pageType}/${key}/${letter}/${posNumStr}`;
    } else {
      // Regular page endpoint
      endpoint = `${HOST}/${pageType}/${key}`;
    }

    const clientStart = performance.now();
    fetch(endpoint)
      .then((res) => {
        const clientFirstByte = performance.now();
        // Read server timing headers if present
        const serverFetch = res.headers.get("X-Fetch-Ms");
        const serverRead = res.headers.get("X-Read-Ms");
        const serverPolish = res.headers.get("X-Polish-Ms");
        const serverTotal = res.headers.get("X-Total-Ms");
        const serverSize = res.headers.get("X-Result-Size");
        DEBUG && console.info(`[WikiPage] request to ${endpoint} first byte after ${(clientFirstByte - clientStart).toFixed(0)}ms; server fetch=${serverFetch}ms read=${serverRead}ms polish=${serverPolish}ms total=${serverTotal}ms size=${serverSize}B`);
        if (!res.ok) throw new Error("Erreur lors du chargement");
        return res.text().then(text => {
          const clientEnd = performance.now();
          DEBUG && console.info(`[WikiPage] full body received ${(clientEnd - clientStart).toFixed(0)}ms`);
          return text;
        });
      })
      .then((val) => {
        // On success, set HTML and update reveal state.
        setHtml(val);
        localStorage.setItem("lastFetchedPage", key);

        if (!isFinal && word) {
          // Increment currentLetterIndex for next letter request
          const nextIndex = currentLetterIndex + 1;
          localStorage.setItem("currentLetterIndex", nextIndex.toString());
          currentLetterIndex = nextIndex;
        }

        if (isFinal) {
          // Clear only reveal-related keys after final page has been shown
          localStorage.removeItem("word");
          localStorage.removeItem("letterPosition");
          localStorage.removeItem("secret");
          localStorage.removeItem("currentLetterIndex");
          localStorage.removeItem("decrementDoneForPage");
          // keep global profile metadata (coverts/triggers/finalpage/profileName) intact
        }

      })
      .catch((err) => setError(err.message));
  }, [key, pageType]);

  if (error) return <div>{error}</div>;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default WikiPage;
