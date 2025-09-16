# 🪄 Wiki Magic Trick Project

Welcome to your **Wiki Magic Trick** project!  
This project combines a custom Wikipedia frontend with a backend that lets you configure "profiles" for a unique, interactive experience.  
It's designed for playful exploration, learning, and maybe a little magic! ✨

---

## 🚀 Features

- **Custom Wikipedia frontend**: Browse Wikipedia with a personalized interface.
- **Profile system**: Configure profiles with triggers, covert pages, and a final page.
- **Letter-based magic**: Reveal pages or words based on letter positions and triggers.
- **Dico/Wiki page routing**: Supports both `/wikipage/` and `/dicopage/` for different types of content.
- **Configurable via UI**: Change profiles, triggers, and pages directly from the frontend.
- **Backend API**: Manage profiles and configuration via REST API.
- **Search bar**: Smart search with profile detection and localStorage magic.
- **Mobile & desktop friendly**: Responsive design, side menu, and more.

---

## 🧙 How does the magic trick work?

1. **Profiles**:  
   - Each profile has a set of "coverts" (hidden pages), "triggers" (special characters or strings), and a "finalpage".
   - You can switch profiles, create new ones, or delete them.

2. **Triggers**:  
   - When you type a trigger (like `!` or `kkk`) in the search bar, the app detects your profile and starts the magic.
   - After the trigger, you can specify a letter or number to reveal a word or page.

3. **Letter-based reveal**:  
   - The backend processes Wikipedia/Dico pages and highlights words based on the letter position you choose.
   - For example, trigger `!a` might reveal all words where the second letter is `a`.

4. **Covert pages**:  
   - When the magic is activated, a random covert page from your profile is shown.
   - Covert pages can be either `/wikipage/` or `/dicopage/` (dictionary).

5. **Final page**:  
   - When you reach the end of the trick, the final page is revealed (can be a wiki or dico page).

6. **Configurable UI**:  
   - Use the Config page to set up your profiles, triggers, and pages.
   - Choose the type for covert/final pages (Wiki or Dico) with a selector.

7. **Backend API**:  
   - Profiles and config are stored in `backend/src/config/config.json`.
   - You can manage profiles via REST endpoints (`/config`, `/config/:profile`, etc.).

---

## 🛠️ Installation & Usage

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/wiki-magic-trick.git
cd wiki-magic-trick
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the backend

```bash
cd backend
npm install
npm start
# or
node src/index.js
```

### 4. Start the frontend

```bash
cd ../frontend
npm install
npm start
```

### 5. Open in browser

Go to [http://localhost:3000](http://localhost:3000) for backend API  
Go to [http://localhost:5173](http://localhost:5173) (or your frontend port) for the UI

---

## 🧩 Project Structure

```
wiki-magic-trick/
├── backend/
│   ├── src/
│   │   ├── config/           # config.json (profiles, triggers, pages)
│   │   ├── routes/           # Express routes (Config, Dico, etc.)
│   │   ├── utils/            # PolishData.ts (magic HTML processing)
│   │   └── index.js          # Backend entrypoint
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (ConfigPage, SearchBar, etc.)
│   │   ├── Context/          # CONSTANTS.ts (HOST value)
│   │   └── App.tsx           # Main app
├── README.md                 # This file!
```

---

## 📝 API Endpoints

- `GET /config` — Get all profiles/config
- `GET /config/:profile` — Get a single profile
- `POST /config/:profile` — Create a new profile
- `POST /config/:profile/:param` — Update a profile parameter (`coverts`, `triggers`, `finalpage`)
- `DELETE /config/:profile` — Delete a profile

---

## ⚡ Tips & Tricks

- Use the **Config page** to easily manage your profiles and magic triggers.
- All covert/final pages must start with `/wikipage/` or `/dicopage/` for correct routing.
- Error messages are clear: `Error {number} : {message}`.
- The magic works best when you experiment with triggers and letter positions!

---

## 🧑‍💻 Contributing

Feel free to fork, improve, and share your own magic tricks!  
If you have questions about the trick logic, open an issue or ask for more documentation.

---

## 🦄 License

MIT — Use, remix, and share the magic!

---

## ✨ Enjoy your Wiki Magic Trick! ✨

