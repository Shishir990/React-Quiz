# QuizApp Live

The Socket.IO server behind **Live game** (`/live`): one player hosts a room, others join
with a 5-letter code, and everyone answers the same questions at the same time.

It runs separately from the Vercel deployment because serverless functions can't keep
WebSocket connections open.

## How it fits together

```
Browser ──(cookies)──▶ Vercel API   POST /api/live/ticket  →  { ticket, url }
   │
   └──(ticket)──────▶ QuizApp_Live  (Socket.IO) ──▶ same MongoDB
```

- The live server can't read the site's sign-in cookies (they belong to another domain),
  so the browser asks the API for a **one-minute ticket** and sends it when it connects.
  Tickets are signed with `LIVE_TICKET_SECRET`, which only the two servers know. The live
  server never sees `JWT_SECRET`, so it can't create real sign-in tokens.
- The server is the authority: it picks the questions, runs the clock, scores answers,
  and only sends a question's correct answer at the reveal.
- Scoring: a correct answer is worth 500–1000 points, more the faster it is. A wrong
  answer or no answer scores 0.
- When a game finishes, every player who answered at least once gets a normal result, so
  the game appears in Results, Analytics and the Leaderboard.
- Games can also be played from a quiz the host wrote in the **Quiz builder** (`/builder`,
  stored in the `userquizzes` collection). Only its owner can host it, every question is
  played in the order written, and these games are **not** saved to results or the
  leaderboard (anyone could write an easy quiz to farm points).
- Rooms are kept in memory, so **run one instance**. Restarting the server ends the games
  in progress.

## Run locally

```bash
cd QuizApp_Live
npm install
cp .env.example .env      # set MONGO_URI (same as the backend) and LIVE_TICKET_SECRET
npm run dev               # http://localhost:8090
```

Add the same `LIVE_TICKET_SECRET` to `QuizApp_Backend/.env`. Locally the backend points the
app at `http://localhost:8090` on its own, so `LIVE_SERVER_URL` isn't needed.

## Deploy (Render, Railway or Fly.io)

1. Create a web service from this repo with root directory `QuizApp_Live`,
   build command `npm install` and start command `npm start`. Health check path: `/health`.
2. Set its environment variables:
   - `MONGO_URI`: the same database as the backend
   - `LIVE_TICKET_SECRET`: a long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `LIVE_CORS_ORIGINS`: the site's address, e.g. `https://react-quiz-five-lovat.vercel.app`
   - `NODE_ENV=production`
3. On Vercel (the backend's environment variables), set:
   - `LIVE_TICKET_SECRET`: the same value
   - `LIVE_SERVER_URL`: the live server's public address, e.g. `https://quizapp-live.onrender.com`
4. Redeploy the Vercel project so the backend picks up the new variables.

If MongoDB Atlas restricts network access by IP, allow the live server's host as well.

Free tiers that put idle services to sleep (such as Render's) make the first connection
after a quiet period slow, up to about a minute. The app shows "Connecting…" until it's up.

## Limits

| | |
|---|---|
| Questions per game | 3–30 (the host picks 5, 10, 15 or 20) |
| Time per question | 10–60 seconds (the host picks 10, 20 or 30) |
| Players per room | 50 |
| Empty rooms | closed after 10 minutes with nobody connected |
| Finished rooms | final scores viewable for 15 minutes |
| Events per connection | 10 per second; extra ones are dropped |
