import { JSDOM } from "jsdom";

export default async function polishData(
  html: string,
  selectedLetterOnLinks?: string,
  letterPosition?: number,
  finalPage?: string, // final page parameter
  pageType: "wikiPage" | "dicoPage" = "wikiPage"
): Promise<string> {
  // --- Hide Wikipedia header/navbar ---
  html = html
    .replace('<div class="vector-header-container">', '<div class="vector-header-container" style="display:none">')
    .replace('<header class="header-container header-chrome">', '<header class="header-container header-chrome" style="display:none">');

  const dom = new JSDOM(html);
  const document = dom.window.document;

  let keptCount = 0;
  let replacedCount = 0;
  let dicoLinkCount = 0;

  // --- Function to check if a word matches letter rule ---
  const shouldLinkWord = (word: string) => {
    if (!selectedLetterOnLinks || letterPosition === undefined) return false;
    if (word.length <= letterPosition) return false;
    return word[letterPosition].toLowerCase() === selectedLetterOnLinks.toLowerCase();
  };

  const wordRegex = /\b([a-zA-ZéèêàâîïôùûçœæÉÈÊÀÂÎÏÔÙÛÇŒÆ]{3,})\b/g;
  const SKIP_TAGS = new Set(["A", "SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "NOSCRIPT"]);

  const walker = document.createTreeWalker(document.body, dom.window.NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n.nodeValue && n.nodeValue.trim().length > 0) {
      const parent = n.parentNode as Element | null;
      if (parent && !SKIP_TAGS.has(parent.nodeName)) nodes.push(n);
    }
  }

  for (const textNode of nodes) {
    let text = textNode.nodeValue!;
    let replaced = "";
    let lastIndex = 0;

    wordRegex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      const start = match.index;
      const end = wordRegex.lastIndex;

      replaced += text.slice(lastIndex, start);

      if (shouldLinkWord(word)) {
        replaced += `<a href="/dico/${encodeURIComponent(word)}">${word}</a>`;
        dicoLinkCount++;
      } else if (finalPage && word.toLowerCase() === finalPage.toLowerCase()) {
        // Inject finalPage link if word matches finalPage
        const href = pageType === "dicoPage"
          ? `/dico/${encodeURIComponent(finalPage)}`
          : `/wiki/${encodeURIComponent(finalPage)}`;
        replaced += `<a href="${href}">${word}</a>`;
      } else {
        replaced += word;
      }

      lastIndex = end;
    }

    replaced += text.slice(lastIndex);

    if (replaced !== text) {
      const span = document.createElement("span");
      span.innerHTML = replaced;
      textNode.parentNode?.replaceChild(span, textNode);
    }
  }

  // --- Rewrite all external wiki links ---
  const anchors = document.querySelectorAll("a[href*='/wiki/']");
  anchors.forEach(a => {
    if (!a.getAttribute("href")) return;

    if (finalPage) {
      const finalHref =
        pageType === "dicoPage"
          ? `/dico/${encodeURIComponent(finalPage)}`
          : `/wiki/${encodeURIComponent(finalPage)}`;
      a.setAttribute("href", finalHref);
      return;
    }

    const href = a.getAttribute("href");
    if (!href) return;
    const match = href.match(/\/wiki\/([^"#?:]+)/);
    if (!match) return;

    const pageTitle = match[1];
    const decodedTitle = decodeURIComponent(pageTitle.replace(/_/g, " "));
    const newHref =
      pageType === "dicoPage"
        ? `/dico/${encodeURIComponent(pageTitle)}`
        : `/wiki/${encodeURIComponent(pageTitle)}`;

    if (selectedLetterOnLinks && letterPosition !== undefined) {
      if (decodedTitle.length > letterPosition && decodedTitle[letterPosition].toLowerCase() === selectedLetterOnLinks.toLowerCase()) {
        keptCount++;
        a.setAttribute("href", newHref);
      } else {
        replacedCount++;
        const span = document.createElement("span");
        span.style.textDecoration = "none";
        span.textContent = a.textContent || "";
        a.replaceWith(span);
      }
    } else {
      a.setAttribute("href", newHref);
    }
  });

  // console.log(`[polishData] Links kept: ${keptCount}, replaced: ${replacedCount}, /dico/ links added: ${dicoLinkCount}`);
  return dom.serialize();
}
