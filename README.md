# Forgers Finger

A comedic art-forgery party game for 3–8 players. The TV is the auction room; each phone is a paintbrush and a bidding paddle.

## How it plays

1. **The Master** secretly gets the true title of a lost masterpiece (for example, *"The Duke of Wellington losing his sock to a duck"*).
2. **Everyone else** only sees a vague catalogue entry (*"Portrait, c.1803 — A nobleman in distress"*) and paints a forgery anyway.
3. All paintings hang on the TV. The true title is revealed, and everyone **bids 100, 200 or 300 guineas** on the one they think is genuine. They can also tap ♥ to admire a favourite.
4. **The reveal:** each painting is stamped FORGERY or GENUINE.

### Scoring (everyone starts with 1,000 guineas)

| What happens | Effect |
|---|---|
| You buy the genuine painting | You gain your bid |
| You buy a forgery | You lose your bid, and **the forger gets it** |
| Master: some but not all buyers find the genuine | +200 per buyer who found it |
| Master: everyone or nobody finds it | Nothing ("too obvious" / "too obscure") |
| Most ♥ admirers on your painting | +100 (ties all score) |

Scores can't go below zero. After every player has been the Master (once or twice), the TV shows the podium, four awards and a slideshow of the night's genuine paintings.

### Collections

- **Family Collection** — 54 silly, all-ages titles.
- **After Hours Collection (18+)** — 54 cheeky, innuendo-heavy titles. The Head Curator must confirm everyone is 18 or over before it starts. Changes the TV's look to the After Hours theme.

### Head Curator

The first person to join is the Head Curator (if they leave, it passes to the next player). Their phone has the settings (collection, painting time 60/90/120 s, once or twice each) and the Start / Next buttons. They can also give everyone 5 seconds to finish painting, or close bidding early. The TV has the same buttons if you're using a laptop with a mouse.

---

## Files

```
forgers-finger/
├── server.js            Game server (rooms, rounds, scoring)
├── decks.js             All painting titles + Lord Gavelby's lines (edit freely)
├── package.json
├── GRAPHICS_PROMPT.md   The ChatGPT art brief
└── public/
    ├── tv.html          TV screen   → yoursite/tv
    ├── index.html       Phone screen → yoursite/
    ├── shared.js        Shared drawing + connection code
    └── assets/          Put your art, sounds and fonts here
        ├── sfx/
        └── fonts/
```

---

## Run it on your computer (to test)

1. Install **Node.js** (version 18 or newer) from nodejs.org if you haven't already.
2. Open a terminal in the `forgers-finger` folder.
3. Run `npm install` (once only — it downloads the `ws` library).
4. Run `npm start`.
5. Open **http://localhost:3000/tv** in your browser. That's the TV.
6. Open **http://localhost:3000** in other browser tabs (or phones on the same Wi-Fi using your computer's IP address, e.g. `http://192.168.1.20:3000`). Join with the code on the TV.

## Put it online with Render (same as your other games)

1. Create a new GitHub repo (e.g. `connex222/FORGERS-FINGER`) and upload everything in this folder **except** `node_modules`.
2. In Render: **New → Web Service** → connect that repo.
3. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free is fine
4. Deploy. Your TV address is `https://your-app.onrender.com/tv`; players go to `https://your-app.onrender.com`.
5. Add it to your Game Night Hub page.

On Render's free plan the server sleeps when unused, so open the TV page a minute before people arrive.

---

## Adding the art

Follow `GRAPHICS_PROMPT.md`, then drop each file into `public/assets/` using **exactly** the filename listed. Until a file exists, the game shows a clean styled fallback, so you can add art one piece at a time and redeploy.

## Adding sound (optional, e.g. with Creative Claw)

Put MP3s in `public/assets/sfx/` with these names. Any missing file is simply silent. On the TV, click **Turn sound on** (browsers block sound until you click).

| File | When it plays |
|---|---|
| `music-lobby.mp3` | Looping lobby music (quiet) |
| `music-draw.mp3` | Looping painting-time music (quiet) |
| `join.mp3` | A player joins |
| `gavel.mp3` | New round, auction opens |
| `submit.mp3` | A painting is signed |
| `bid.mp3` | A bid is placed |
| `tick.mp3` | Each of the last 5 seconds |
| `drumroll.mp3` | Each painting before its stamp |
| `stamp-forgery.mp3` | FORGERY stamp |
| `stamp-genuine.mp3` | GENUINE seal |
| `applause.mp3` | People's Favourite |
| `coins.mp3` | The ledger appears |
| `fanfare.mp3` | Final results |
| `sad-trombone.mp3` | A lot is withdrawn |

## Fonts (optional)

To match your offline rule, bundle free fonts as woff2 files in `public/assets/fonts/`:
- `display.woff2` — headings (suggestion: **Abril Fatface** or **Playfair Display**, both free under the Open Font License)
- `body.woff2` — body text (suggestion: **Alegreya**)

Without them, the game falls back to Georgia-style serif fonts already on every device.

## Editing the titles

Open `decks.js`. Each line is:
```js
['Catalogue entry everyone sees', 'True title only the Master sees'],
```
Keep the catalogue entry vague but related, and the true title specific and silly. No limit on how many you add.
