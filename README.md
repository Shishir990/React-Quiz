Deployed in vercel :
https://react-quiz-five-lovat.vercel.app/dashboard

## API documentation

Interactive docs (Swagger UI): https://react-quiz-five-lovat.vercel.app/api/docs/
(locally: http://localhost:8080/api/docs/). To call protected endpoints, sign in with
`POST /api/auth/login`, click **Authorize** and paste the returned token.

- The spec lives in [`QuizApp_Backend/Docs/openapi.yaml`](QuizApp_Backend/Docs/openapi.yaml)
  (OpenAPI 3.0). The raw JSON is served at `/api/docs/openapi.json`, which can be imported
  into Postman or Insomnia.
- After changing a route, run `npm run docs:check` in `QuizApp_Backend`. It fails if a
  route is missing from the spec, or the spec lists one that no longer exists.
- Set `API_DOCS=off` to hide the docs page.

## Live games

Live multiplayer (`/live`) runs on a separate Socket.IO server in
[`QuizApp_Live`](QuizApp_Live/README.md), because Vercel functions can't hold WebSocket
connections. Setup, deployment and the environment variables it shares with the backend
(`LIVE_TICKET_SECRET`, `LIVE_SERVER_URL`) are described there.
