import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type {Config} from "../types/ConfigTypes";
import {HOST,DEBUG} from '../Context/CONSTANT'

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

  // Buffer used to detect multi-character triggers without relying on rawTyped state
  const detectionRef = useRef<string>('');
  const [maxTriggerLen, setMaxTriggerLen] = useState<number>(0);

  // instantReplace mode for the currently selected profile
  const [instantReplace, setInstantReplace] = useState<boolean>(false);

  useEffect(() => {
    if (!cachedConfig?.profiles) {
      setMaxTriggerLen(0);
      return;
    }
    let max = 0;
    for (const p of Object.values(cachedConfig.profiles)) {
      for (const t of (p.triggers || [])) {
        if (t.length > max) max = t.length;
      }
    }
    setMaxTriggerLen(max);
  }, [cachedConfig]);
 
  // ----- NEW state for hidden typing feature -----
  const [hiddenTypingActive, setHiddenTypingActive] = useState(false);
  const [rawTyped, setRawTyped] = useState(''); // includes trigger + subsequent secret keystrokes
  const [covertPage, setCovertPage] = useState(''); // cleaned covert page used for visible replacement
  const [triggerToken, setTriggerToken] = useState(''); // matched trigger string

  // Helper to clean a covert page entry into a simple page string
  const cleanCovert = (p: string) => {
    return p
      .toString()
      .toLocaleLowerCase()
      .replace("/wikipage/", "")
      .replace("/dicopage/", "")
      .replace("dicopage/", "")
      .replace("wikipage/", "");
  };

  // // Helper to find a profile by a trigger string
  // const findProfileForTrigger = (trig: string) => {
  //   if (!cachedConfig?.profiles) return null;
  //   for (const [name, profile] of Object.entries(cachedConfig.profiles)) {
  //     if (profile.triggers?.includes(trig)) return { name, profile };
  //   }
  //   return null;
  // };

  // When hidden typing starts: pick a covert page from that profile and persist minimal metadata
  const startHiddenTyping = (matchedTrigger: string, profileName: string, profileObj: any) => {
    const coverts = profileObj.coverts || [];
    if (!coverts.length) return;
    const randomPage = coverts[Math.floor(Math.random() * coverts.length)];
    const cleaned = cleanCovert(randomPage);
    setCovertPage(cleaned);

    // set the trigger and raw typed immediately (prevents race/stale state)
    setTriggerToken(matchedTrigger);
    setRawTyped(matchedTrigger);

    // set instantReplace mode from profile (default false) and persist
    const inst = Boolean(profileObj.instantReplace);
    setInstantReplace(inst);
    try { localStorage.setItem("instantReplace", inst ? "1" : "0"); } catch {}

    // Enter letter-by-letter hidden typing mode.
    setHiddenTypingActive(true);

    // persist profile metadata and reset per-reveal state
    try {
      if (profileObj.coverts) localStorage.setItem("coverts", JSON.stringify(profileObj.coverts));
      if (profileObj.triggers) localStorage.setItem("triggers", JSON.stringify(profileObj.triggers));
      localStorage.setItem("secret", matchedTrigger);
      localStorage.setItem("profileName", profileName);
      // reset per-reveal keys
      localStorage.removeItem("word");
      localStorage.removeItem("letterPosition");
      localStorage.removeItem("currentLetterIndex");
      localStorage.setItem("currentLetterIndex", "0");
      localStorage.setItem("covertPage", cleaned);
      localStorage.setItem("hiddenTyped", matchedTrigger);
    } catch (err) {
      DEBUG && console.log("localStorage error", err);
    }

    // For non-instant profiles: reveal covert prefix letter-by-letter.
    // For multi-char triggers reveal first N letters where N = trigger length.
    // For instantReplace profiles: show the typed trigger immediately (user-visible typing).
    if (inst) {
      setSearch(matchedTrigger);
    } else {
      setSearch(cleaned.slice(0, matchedTrigger.length));
    }

    // clear detection buffer (we've consumed the trigger)
    detectionRef.current = '';
  };
 
   // End hidden typing: allow normal typing from now on
   const endHiddenTyping = (terminatorKey: string) => {
     // rawTyped = trigger + positionToken + revealedWord
     const afterTrigger = rawTyped.slice((triggerToken || '').length);

     // Extract position token: either a letter a-f or a sequence of digits at start
     let positionToken = "";
     let revealed = afterTrigger;
     const posMatch = afterTrigger.match(/^([a-fA-F]|\d+)/);
     if (posMatch) {
       positionToken = posMatch[1];
       revealed = afterTrigger.slice(positionToken.length);
     }

     // Compute letterPosition: if letter a-f => 1..6, else use digits if present, otherwise default "1"
     let letterPosition = "1";
     if (positionToken) {
       if (/^[a-fA-F]$/.test(positionToken)) {
         letterPosition = ( "abcdef".indexOf(positionToken.toLowerCase()) + 1 ).toString();
       } else if (/^\d+$/.test(positionToken)) {
         letterPosition = positionToken;
       }
     }

     // Persist reveal-related metadata required by WikiPage
     try {
       if (revealed) localStorage.setItem("word", revealed);
       localStorage.setItem("letterPosition", letterPosition);
       if (triggerToken) localStorage.setItem("secret", triggerToken);
       localStorage.setItem("currentLetterIndex", "0");
       localStorage.setItem("hiddenTyped", rawTyped);
       if (covertPage) localStorage.setItem("covertPage", covertPage);
     } catch (err) {
       DEBUG && console.warn("localStorage write failed in endHiddenTyping", err);
     }

     // If instantReplace is enabled for this profile, do the full covert replacement only when the typed sequence
     // contains a position token + a non-empty revealed word and the user confirms with space.
     if (instantReplace && terminatorKey === " ") {
       if (revealed && revealed.length > 0) {
         setSearch(covertPage.toLowerCase());
         setHiddenTypingActive(false);
         return;
       } else {
         // Not a complete trigger+pos+word pattern: treat the space as a normal space in the visible input
         setSearch(prev => (prev || '') + ' ');
         setHiddenTypingActive(false);
         return;
       }
     }

     // Non-instant or other terminator: If the terminator is the first confirming space, do NOT insert that space into the visible input.
     if (terminatorKey === " ") {
       setSearch(covertPage.slice(0, rawTyped.length));
     } else {
       setSearch(covertPage.slice(0, rawTyped.length) + terminatorKey);
     }

     // End hidden typing: further input becomes normal
     setHiddenTypingActive(false);
   };
 
  // Key down handler: capture triggers and hidden typing keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    // ignore control/meta keys except Backspace/space/' which we handle
    if (key === 'Meta' || key === 'Control' || key === 'Alt' || key === 'Escape' || key === 'Tab') {
      return;
    }

    // If currently in hidden typing: intercept printable chars & backspace & terminators
    if (hiddenTypingActive) {
      if (key === 'Backspace') {
        e.preventDefault();
        setRawTyped(prev => {
          const next = prev.slice(0, -1);
          // if we removed all (including trigger), cancel hidden typing
          if (next.length === 0) {
            setHiddenTypingActive(false);
            setCovertPage('');
            setTriggerToken('');
            setSearch('');
            try { localStorage.removeItem("hiddenTyped"); } catch {}
            return '';
          }
          // update visible search:
          // - instantReplace: show what the user typed (rawTyped)
          // - non-instant: show covert prefix up to number of typed characters
          if (instantReplace) {
            setSearch(next);
          } else {
            setSearch(covertPage.slice(0, next.length));
          }
          try { localStorage.setItem("hiddenTyped", next); } catch {}
          return next;
        });
        return;
      }

      // terminators: space or apostrophe end hidden typing and let user continue normally
      if (key === ' ' || key === "'") {
        e.preventDefault();
        // Only replace on space when pattern matches and instantReplace is true (handled inside endHiddenTyping)
        endHiddenTyping(key);
        return;
      }

      // printable single-character: consume and update visible to match typed sequence or covert prefix
      if (key.length === 1) {
        e.preventDefault();
        setRawTyped(prev => {
          const next = prev + key;
          // - instantReplace: display raw typed sequence so user sees what they typed
          // - non-instant: reveal covert page letter-by-letter (prefix length = typed length)
          if (instantReplace) {
            setSearch(next);
          } else {
            setSearch(covertPage.slice(0, next.length));
          }
          try { localStorage.setItem("hiddenTyped", next); } catch {}
          return next;
        });
        return;
      }

      // any other key: ignore and let default behavior happen (arrows etc)
      return;
    }

    // Not currently in hidden typing: detect multi-char triggers using prospective input (only at start)
    if (key.length === 1) {
      const inputEl = e.currentTarget as HTMLInputElement;
      const caret = inputEl.selectionStart ?? inputEl.value.length;
      // prospective input value after this keypress
      const prospective = inputEl.value.slice(0, caret) + key + inputEl.value.slice(caret);

      // keep detectionRef updated for compatibility but do not rely on it for activation
      detectionRef.current = (detectionRef.current + key).slice(-Math.max(1, maxTriggerLen));

      if (cachedConfig?.profiles) {
        for (const [pname, p] of Object.entries(cachedConfig.profiles)) {
          for (const trig of (p.triggers || [])) {
            // only trigger if the prospective new value starts with the trigger (i.e. trigger at start)
            if (prospective.startsWith(trig)) {
              e.preventDefault();
              startHiddenTyping(trig, pname, p);
              return;
            }
          }
        }
      }
      // no trigger matched — do nothing special
    } else if (key === 'Backspace') {
      // remove last char from detection buffer (legacy, harmless)
      detectionRef.current = detectionRef.current.slice(0, -1);
    }
  };

  // onChange handler: when not in hidden typing, let typing flow into `search`
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hiddenTypingActive) {
      // when hidden typing is active we ignore onChange because we control visible output via keydown
      // Keep displayed `search` consistent (no-op)
      return;
    }
    setSearch(e.target.value);
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
          instantReplace: profile.instantReplace ?? defaultProfile.instantReplace,
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
          // Only clear per-reveal keys. Preserve profile metadata (finalpage, profileName, coverts, triggers)
          localStorage.removeItem("word");
          localStorage.removeItem("letterPosition");
          localStorage.removeItem("secret");
          localStorage.removeItem("currentLetterIndex");
          localStorage.removeItem("lastFetchedPage");
          localStorage.removeItem("decrementDoneForPage");
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
        DEBUG && console.log("localStorage after profile update:", localStorage);
      });
  }, [search, mobileSearchOpen, cachedConfig]);


  // helper to adjust currentLetterIndex in localStorage (clamped >= 0)
  const adjustCurrentLetterIndex = (delta: number) => {
    try {
      const cur = parseInt(localStorage.getItem("currentLetterIndex") || "0", 10) || 0;
      let next = cur + delta;
      if (next < 0) next = 0;
      localStorage.setItem("currentLetterIndex", String(next));
      DEBUG && console.log("adjustCurrentLetterIndex", cur, "=>", next);
    } catch (err) {
      DEBUG && console.warn("failed to adjust currentLetterIndex", err);
    }
  };

  // keep counter in sync when user navigates browser history (back/forward)
  useEffect(() => {
    const onPopState = () => {
      adjustCurrentLetterIndex(-1);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function handleBackButton(_event: React.MouseEvent<HTMLButtonElement>): void {
    // restore one when user closes the search modal with the back arrow
    adjustCurrentLetterIndex(1);
    setMobileSearchOpen(false);
  }
  
  function handleSearchButton(_event: React.MouseEvent<HTMLButtonElement>): void {
    // user is about to change/search — subtract one so the letter counter stays on track
    adjustCurrentLetterIndex(-1);
    setMobileSearchOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

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
        <form className="flex-1 items-center justify-center mx-4 hidden md:flex" role="search" onSubmit={(e)=>e.preventDefault()}>
          <div className="relative w-full max-w-md flex">
            <input
              type="search"
              className="w-full border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 z-10"
              placeholder="Rechercher sur Wikipédia"
              aria-label="Rechercher sur Wikipédia"
              style={{ height: "38px", fontSize: "1rem" }}
              value={search}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
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
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
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