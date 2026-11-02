# 👻 Phantom Post: Dead Drop Courier

Real-world GPS hide-and-seek. **The Courier's phone is the game server.** Hunters join from anywhere with a 5-letter room code or link. No backend to deploy: this is a static site.

## How it works
- Courier taps **Host as Courier** and shares the room code or invite link.
- Hunters type the code (or open the link) and tap **Join as Hunter**. They can join at any time, even mid-game, on any Wi-Fi or mobile data.
- A free public matchmaking service (PeerJS cloud) only introduces the phones. Game data and GPS positions then flow directly phone to phone (WebRTC, encrypted).
- If a Hunter's connection drops, the app reconnects automatically and keeps their name and place in the game.

## Two game modes (the Courier picks when hosting)
**🗺 Treasure Trail (full treasure hunt)**
- The Courier walks the route and marks up to 8 stops. Each stop has a clue that leads hunters to it, a 4-digit code on a marker at the spot, and an optional hint.
- Every hunter races on their own: the first clue arrives when the hunt starts. Reach the stop (within 60 m), read the code, enter it, and the next clue unlocks. The last stop is the 🏆 treasure.
- Radar pings show hot/cold toward your current stop. Live leaderboard for everyone.
- Points: 100 per stop plus up to 50 speed bonus. A hint costs 30 points, a wrong code 5. Three wrong codes lock you out for 30 s.
- First to the treasure wins. If the time limit runs out, the standings decide.

**📦 Dead Drop (quick round)**
- The Courier hides one token and a clue. Hunters search; enter the code to win the drop, or the clock runs out and the drop is secured. 3 secured drops in a row: Courier wins.

**Powers (both modes):** Hunter sonar burst (1 per stop or drop, alerts the Courier); Courier jammer (1 per game, blanks the next radar ping).

## Deploy
Upload this folder to any static host with HTTPS (GitHub Pages, Netlify, Cloudflare Pages, Vercel). GPS and WebRTC need HTTPS. Local test: `python3 -m http.server 8000`.

## Reliability settings (top of the script in `index.html`)
- `CONFIG.ice` lists STUN/TURN servers. STUN works for most networks. Some strict mobile carriers need a TURN relay: the bundled public Open Relay entry is a free best-effort fallback; for dependable results create a free TURN account (Metered, Cloudflare, Twilio) and replace the credentials.
- Matchmaking uses PeerJS cloud by default. To self-host, run `npx peerjs --port 9000` somewhere and open the game with `?peerhost=YOUR_HOST&peerport=9000`.

## Known limits
- The Courier's app must stay open and awake (the game requests a screen wake lock). If it closes, the game ends for everyone.
- If the free matchmaking service is down, new rooms can't open (running games continue).

Files: `index.html` (the game), `peerjs.min.js` (bundled, no CDN), `sw.js`, `manifest.webmanifest`, `icon.svg`.
