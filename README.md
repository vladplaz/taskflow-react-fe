# TaskFlow frontend

The web client for a Trello-style board app. Boards of columns, columns of
cards; drag a card to move it, open one to write a description, attach files,
assign people, and talk in the comments. Filter a board by assignee, label,
priority, or status. Two people on the same board see each other's changes
without refreshing.

It does nothing on its own — everything comes from the Django API, which lives
in its own repository.

## Stack

- **React 19** with the React Compiler, **TypeScript**, **Vite 8**.
- **TanStack Query** — all server state. There is no Redux and no global store.
- **react-router** for routing; pages are lazy-loaded.
- **Tailwind CSS 4** and **Radix UI** primitives, shadcn-style, in `components/ui`.
- **TipTap** for the rich-text description editor.
- **docx-preview**, **SheetJS**, **pptxviewjs** — Office previews, each behind a
  dynamic `import()`.
- **Vitest** for tests, ESLint + Prettier for lint and formatting.

## Getting it running

Start the backend first, then:

```bash
npm install
npm run dev
```

That serves <http://localhost:5173>, the origin the backend's default CORS and
CSRF settings allow. `npm test`, `npm run lint`, `npm run build`.

## Decisions worth knowing

**One file talks to the server.** `src/lib/api.ts` owns every request: session
cookie, CSRF header on unsafe methods, pagination unwrapped so callers get plain
arrays, and error bodies turned into an `ApiError` with a readable message and
per-field errors. Nothing else calls `fetch`.

**The client never re-decides authorization.** It renders what the API returns
and hides what the API says it may not edit. Every real check is on the server.

**Logic worth testing lives in `features/` as pure functions** — filters, route
state, mention parsing, the card-creation lock — so the tests need no DOM and
components stay thin enough to read.

**4xx is not retried.** `403` and `404` are how this API says "not signed in",
"not yours", and "gone". A `403` re-runs the session query instead of guessing:
if the session really expired, the app drops to sign-in rather than leaving a
signed-in shell whose every request fails.

**Realtime is invalidation, not patching.** One WebSocket per board; an event
says which queries are stale and TanStack Query refetches them. No second copy
of the data to keep in sync.

**Office previews are treated as hostile.** None of those renderers sanitize —
`docx-preview` copies hyperlink hrefs verbatim, so `javascript:` survives, which
on a shared board is stored XSS. Their output never enters this app's document;
it goes into an `<iframe sandbox="">` with no permissions at all, where scripts
cannot run and the origin is opaque. `features/attachments/office-preview.ts` is
the whole story and a test guards the sandbox against being loosened.

**SheetJS comes from its vendor CDN, not npm.** Every npm-published version is
frozen at 0.18.5 with two unfixed high-severity advisories. The URL is pinned and
the lockfile records its integrity hash.
