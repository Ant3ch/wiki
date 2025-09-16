import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { HOST } from '../Context/CONSTANTS';
import type {Config} from "../types/ConfigTypes";


// In-memory config

function SearchBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

 // Define covert pages

const [cachedConfig, setCachedConfig] = useState<Config | null>(null);
// WILL DECREMENT OF 1 WHEN CLICKING ON MAGNYFING GLASS IF USER DON4T FIND ANY LINKS
// because visiting a page add one to the current letter index , what we do is removing 1 and flagg the page so that it prevent from removing more than 1
const handleSearchButton = () => {
  const storedIndex = localStorage.getItem("currentLetterIndex");
  const currentPage = localStorage.getItem("lastFetchedPage"); // or whatever identifies the current page
  const decrementFlag = localStorage.getItem("decrementDoneForPage");

  // Only decrement if not already done for this page
  if (storedIndex && currentPage && decrementFlag !== currentPage) {
    let index = parseInt(storedIndex, 10);

    // Decrement by 1, minimum 0
    index = Math.max(index - 1, 0);
    localStorage.setItem("currentLetterIndex", index.toString());

    // Mark that we already decremented for this page
    localStorage.setItem("decrementDoneForPage", currentPage);
  }

  setMobileSearchOpen(true);
};
const handleBackButton = () => {
  const storedIndex = localStorage.getItem("currentLetterIndex");

  if (storedIndex) {
    let index = parseInt(storedIndex, 10);

    // Increment by 1
    index = index + 1;

    localStorage.setItem("currentLetterIndex", index.toString());

    // Clear the decrement flag for this page so it can decrement again later
    localStorage.removeItem("decrementDoneForPage");
  }

  setMobileSearchOpen(false);
};
useEffect(() => {
  // Fetch config only once
  if (!cachedConfig) {
    fetch(HOST + "/config/", { method: "GET" })
      .then((res) => res.json())
      .then((config: Config) => setCachedConfig(config))
      .catch(() => console.error("Failed to load config"));
  }
}, [cachedConfig]);

useEffect(() => {
  if (!mobileSearchOpen || !search.trim() || !cachedConfig) {
    setResults([]);
    return;
  }

  let newSearch = search;
  let shouldReplace = false;

  const profiles = cachedConfig.profiles || {};
  const defaultProfile = profiles.default || {};

  // 🔹 Keep existing profile if already set in localStorage
  let activeProfileName: string = localStorage.getItem("profileName") || "default";
  let activeProfile = profiles[activeProfileName] || defaultProfile;

  // 🔹 Detect profile by trigger in the current search
  for (const [name, profile] of Object.entries(profiles)) {
    if (profile.triggers?.some((trigger) => search.startsWith(trigger))) {
      activeProfileName = name;
      activeProfile = {
        coverts: profile.coverts ?? defaultProfile.coverts,
        triggers: profile.triggers ?? defaultProfile.triggers,
        finalpage: profile.finalpage, // optional
      };
      break; // stop at first matched trigger
    }
  }

  // 🔹 Save profile info to localStorage
  if (activeProfile.coverts) localStorage.setItem("coverts", JSON.stringify(activeProfile.coverts));
  if (activeProfile.triggers) localStorage.setItem("triggers", JSON.stringify(activeProfile.triggers));
  if (activeProfile.finalpage !== undefined) {
    localStorage.setItem("finalpage", activeProfile.finalpage);
  } else {
    localStorage.removeItem("finalpage"); // remove old value if any
  }
  localStorage.setItem("profileName", activeProfileName);

  // 🔹 Parse trigger + position (letter or number)
  const matchedTrigger = activeProfile.triggers?.find((trigger) =>
    search.startsWith(trigger)
  );

  if (matchedTrigger) {
    const afterTrigger = search.slice(matchedTrigger.length);
    let letterPosition = "";

    if (/^[a-f]/i.test(afterTrigger[0])) {
      // If first char after trigger is a letter a-f
      letterPosition = String("abcdef".indexOf(afterTrigger[0].toLowerCase()) + 1);
    } else {
      // If first char(s) after trigger is a number
      const match = afterTrigger.match(/^(\d+)/);
      if (match) letterPosition = match[1];
    }

    // Extract revealed word
    const rest = afterTrigger.slice(letterPosition.length);
    const revealedMatch = rest.match(/^([^\s]*)/);
    const revealedString = revealedMatch ? revealedMatch[1] : "";
    const afterRevealed = rest.slice(revealedString.length);

    if (afterRevealed.startsWith(" ")) {
      // If a space follows, reset & set localStorage
      const oldWord = localStorage.getItem("word");
      const oldLetter = localStorage.getItem("letterPosition");
      const oldSecret = localStorage.getItem("secret");
      if (
        oldWord !== revealedString ||
        oldLetter !== letterPosition ||
        oldSecret !== matchedTrigger
      ) {
        localStorage.clear();
      }

      if (revealedString) localStorage.setItem("word", revealedString);
      if (letterPosition) localStorage.setItem("letterPosition", letterPosition);
      localStorage.setItem("secret", matchedTrigger);
      localStorage.setItem("currentLetterIndex", "0");

      shouldReplace = true;
    }

    if (shouldReplace && activeProfile.coverts) {
      let randomPage =
        activeProfile.coverts[
          Math.floor(Math.random() * activeProfile.coverts.length)
        ];
      randomPage = randomPage
        .toLocaleLowerCase()
        .replace("/wikipage/", "")
        .replace("/dicopage/", "")
        .replace("dicopage/", "")
        .replace("wikipage/", "");
      newSearch = randomPage;
      setSearch(randomPage.toLowerCase());
    }
  }

  // 🔹 Wikipedia search
  setLoading(true);
  fetch(
    `https://fr.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(
      newSearch
    )}&limit=10&suggest=true`
  )
    .then((res) => res.json())
    .then((data) => setResults(data.pages || []))
    .catch(() => setResults([]))
    .finally(() => {
      setLoading(false);
      console.log("localStorage after profile update:", localStorage);
    });
}, [search, mobileSearchOpen, cachedConfig]);


  return (
      <header
        className="w-full flex items-center px-4 py-2 border-1 border-gray-300 gap-3"
        style={{
          background: window.innerWidth >= 768 ? "#f8f9fa" : "#e5e7eb",
          boxShadow: "none",
          marginTop: 0,
          paddingTop: 0,
          position: "relative",
          zIndex: 50
        }}
      >
        {/* Burger menu button */}
        <button
          className="flex items-center justify-center mr-2 p-1.5 rounded border-gray-300 hover:bg-gray-100"
          aria-label="Open menu"
          style={{ width: "38px", height: "38px", minWidth: "38px", minHeight: "38px" }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <rect y="5" width="24" height="2" rx="1" fill="#222" />
            <rect y="11" width="24" height="2" rx="1" fill="#222" />
            <rect y="17" width="24" height="2" rx="1" fill="#222" />
          </svg>
        </button>
        {/* Icons */}
        <div className="flex items-center gap-2" onClick={()=>navigate('/')}>
          {/* Mobile: Only wordmark */}
          <img
            src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-fr.svg"
            alt="Wikipédia"
            className="h-8 block md:hidden"
            style={{ minHeight: "18px", width: "119px" }}
          />
          {/* Desktop: Logo, wordmark, tagline */}
          <div className="hidden md:flex items-center gap-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png"
              alt="Wikipedia logo"
              className="w-10 h-10"
              style={{ minWidth: "40px", minHeight: "40px" }}
            />
            <div className="flex flex-col justify-center">
              <img
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-fr.svg"
                alt="Wikipédia"
                className="h-8"
                style={{ minHeight: "18px", width: "119px", display: "block" }}
              />
              <img
                src="https://fr.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-fr.svg"
                alt="L'encyclopédie libre"
                className="h-4"
                style={{ minHeight: "13px", width: "120px", display: "block", marginTop: "2px" }}
              />
            </div>
          </div>
        </div>
        {/* Desktop search bar */}
        <form className="flex-1 items-center justify-center mx-4 hidden md:flex" role="search">
          <div className="relative w-full max-w-md flex">
            <input
              type="search"
              className="w-full border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 z-10"
              placeholder="Rechercher sur Wikipédia"
              aria-label="Rechercher sur Wikipédia"
              style={{ height: "38px", fontSize: "1rem" }}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-r font-semibold border border-l-0 border-gray-300 hover:bg-gray-100 text-center flex justify-center z-20"
              style={{
                background: "#f8f9fa",
                color: "#202122",
                height: "38px",
                minWidth: "90px",
                fontSize: "1rem",
                boxShadow: "none"
              }}
            >
              Rechercher
            </button>
            {/* Add a transparent overlay to the right of the input to allow the ring to show */}
            <span
              className="pointer-events-none absolute right-[90px] top-0 h-full w-2 rounded-r"
              style={{ background: "transparent", zIndex: 15 }}
            />
          </div>
        </form>
        {/* Magnifying glass icon on mobile */}
        <div className="flex md:hidden items-center ml-auto">
          <button
            className="flex items-center justify-center p-2 rounded hover:bg-gray-100"
            aria-label="Open search"
            style={{ width: "38px", height: "38px", minWidth: "38px", minHeight: "38px" }}
            onClick={handleSearchButton}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" stroke="#222" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#222" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {/* User links (desktop only) */}
        <nav className="items-center gap-4 ml-2 hidden md:flex">
          <a href="/w/index.php?title=Special:CreateAccount" className="text-blue-700 hover:underline text-sm">
            Créer un compte
          </a>
          <a href="/w/index.php?title=Special:UserLogin" className="text-blue-700 hover:underline text-sm">
            Se connecter
          </a>
        </nav>
        {/* Replace dropdown menu with side menu */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-50 flex"
            style={{ background: "rgba(0,0,0,0.15)" }}
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="bg-white w-72 max-w-full h-full flex flex-col shadow-xl"
              style={{ minWidth: "260px" }}
              onClick={e => e.stopPropagation()}
            >
              <nav className="flex-1 overflow-y-auto">
                <ul className="py-4">
                  <li>
                    <a href="/" className="flex items-center px-6 py-3 text-gray-900 font-medium hover:bg-gray-100">
                      <span className="mr-3">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 12L12 4l9 8" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 10v10h14V10" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      Accueil
                    </a>
                  </li>
                  <li>
                    <a href="/wiki/Sp%C3%A9cial:Page_au_hasard" className="flex items-center px-6 py-3 text-gray-900 font-medium hover:bg-gray-100">
                      <span className="mr-3">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="2"/></svg>
                      </span>
                      Au hasard
                    </a>
                  </li>
                  <li>
                    <a href="/wiki/Sp%C3%A9cial:Nearby" className="flex items-center px-6 py-3 text-gray-900 font-medium hover:bg-gray-100">
                      <span className="mr-3">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="10" r="3" stroke="#888" strokeWidth="2"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m12.02 0l-1.41-1.41M6.34 6.34L4.93 4.93" stroke="#888" strokeWidth="2"/></svg>
                      </span>
                      À proximité
                    </a>
                  </li>
                  <li>
                    <a href="/w/index.php?title=Special:UserLogin" className="flex items-center px-6 py-3 text-gray-900 font-medium hover:bg-gray-100">
                      <span className="mr-3">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-8 0v2" stroke="#888" strokeWidth="2"/><circle cx="12" cy="7" r="4" stroke="#888" strokeWidth="2"/></svg>
                      </span>
                      Se connecter
                    </a>
                  </li>
                  <li>
                    <a href="/wiki/Special:Preferences" className="flex items-center px-6 py-3 text-gray-900 font-medium hover:bg-gray-100">
                      <span className="mr-3">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 8.6 15a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 15 8.6c.22.22.5.37.82.4.32.03.65-.07.9-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 15z" stroke="#888" strokeWidth="2"/></svg>
                      </span>
                      Configuration
                    </a>
                  </li>
                </ul>
                {/* Add reset button here */}
                <div className="px-6 py-3 border-t border-gray-200">
                  <button
                    className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-4 rounded mb-2"
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                  >
                    Réinitialiser (localStorage)
                  </button>
                  <a href="https://donate.wikimedia.org" className="block text-blue-700 font-semibold mb-2">Faites un don dès maintenant</a>
                  <div className="text-gray-700 text-sm mb-2">
                    Si Wikipédia vous est utile, pensez à donner aujourd'hui.
                  </div>
                </div>
                <div className="flex justify-between px-6 py-2 text-xs text-gray-500 border-t border-gray-200">
                  <a href="/wiki/Wikip%C3%A9dia:À_propos" className="hover:underline">À propos de Wikipédia</a>
                  <a href="/wiki/Wikip%C3%A9dia:Avertissements_généraux" className="hover:underline">Avertissements</a>
                </div>
              </nav>
            </aside>
            {/* Click outside closes the menu */}
            <div className="flex-1" onClick={() => setMenuOpen(false)} />
          </div>
        )}
      {/* Mobile search modal */}
      {mobileSearchOpen && (
        <div
          className="w-full flex flex-col items-center justify-start"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            background: "#fff",
            zIndex: 100,
            minHeight: "100vh"
          }}
        >
          <div className="w-full flex items-center px-2 py-4 border-b border-gray-200" style={{ background: "#f8f9fa" }}>
            {/* Back arrow */}
            <button
              className="flex items-center justify-center mr-2 p-2 rounded hover:bg-gray-100"
              aria-label="Fermer la recherche"
              onClick={handleBackButton}
              style={{ width: "38px", height: "38px", minWidth: "38px", minHeight: "38px" }}
            >
              <svg width="800px" height="800px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none">
                <path stroke="black" strokeLinecap="round" strokeWidth="3" d="M6 16h21"/>
                <path stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 8l-8 8 8 8"/>
              </svg>
            </button>
            {/* Search input */}
            <input
              ref={inputRef}
              type="search"
              className="flex-1 border-0 border-gray-400 rounded-xs px-3 py-2 focus:outline-none focus:border-blue-600 bg-white"
              placeholder="Rechercher sur Wikipédia"
              aria-label="Rechercher sur Wikipédia"
              style={{
                fontSize: "1.1rem",
                height: "40px",
                borderWidth: "2px"
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Search results and sticky bar */}
          <div className="w-full max-w-lg mx-auto bg-white flex-1 flex flex-col" style={{ position: "relative" }}>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                maxHeight: "calc(100vh - 110px)" // adjust for header and sticky bar
              }}
            >
              {loading && (
                <div className="p-4 text-center text-gray-500">Chargement...</div>
              )}
              {!loading && search && results.length === 0 && (
                <div className="p-4 text-center text-gray-500">Aucun résultat</div>
              )}
              <ul>
                {results.map(result => (
                  <li key={result.id} className="flex items-start px-2 py-2 border-b border-gray-100 hover:bg-gray-200">
      {/* Thumbnail or fallback icon */}
      <div className="flex-shrink-0 w-10 h-10 mr-3 flex items-center justify-center bg-gray-100 rounded overflow-hidden border-gray-400 border-1">
        {result.thumbnail && result.thumbnail.url ? (
          <img
            src={result.thumbnail.url.startsWith('http') ? result.thumbnail.url : `https:${result.thumbnail.url}`}
            alt=""
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          <span className="flex items-center justify-center w-10 h-10 text-[#72777d]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="#72777d" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <g>
                <path d="M19 3H1v14h18zM3 14l3.5-4.5 2.5 3L12.5 8l4.5 6z"></path>
                <path d="M19 5H1V3h18zm0 12H1v-2h18z"></path>
              </g>
            </svg>
          </span>
        )}
      </div>
      <a
        href={`/wiki/${encodeURIComponent(result.key)}`}
        className="flex-1 min-w-0 cursor-pointer decoration-0"
        style={{ textDecoration: "none" }}
        onClick={e => {
          e.preventDefault();
          setMobileSearchOpen(false);
          setTimeout(() => navigate(`/wiki/${encodeURIComponent(result.key)}`), 100);

        }}
        
      >
        <div className="font-semibold text-base leading-tight truncate">{result.title}</div>
        {result.description && (
          <div className="text-xs text-gray-500 leading-snug">{result.description}</div>
        )}
        <div
          className="text-xs text-gray-500 leading-snug mt-0.5"
          dangerouslySetInnerHTML={{ __html: result.excerpt }}
        />
      </a>
    </li>
                ))}
                  {/* "Rechercher les pages contenant ..." link */}
            {search && (
              <div
                className="bg-white border-t border-gray-300"
                style={{
                  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.01)",
                
                  bottom: 0,
                  zIndex: 10
                }}
              >
                <a
                  href={`https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(search)}`}
                  className="flex items-center px-4 py-3 text-gray-900 text-sm font-normal decoration-0"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "none",
                    borderLeft: "4px solid #cfd2d7",
                    background: "#fff"
                  }}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 mr-3">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" stroke="#888" strokeWidth="2" />
                      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  Rechercher les pages contenant <span className="font-bold ml-1">{search}</span>
                </a>
              </div>
            )}

               
              </ul>
            </div>
           
          </div>
        </div>
      )}
      </header>
  );
}

export default SearchBar;