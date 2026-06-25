## Quick orientation for code generation agents

This repository is a small Next.js (app directory) chat demo that integrates Solana wallets and Supabase as the realtime backend. The UI and most business logic live client-side in `app/page.tsx`.

- Key files
  - `app/page.tsx` — single, large client component containing chat UI, state, and Supabase calls (presence, typing, messages, reactions, profiles, friends, notifications).
  - `components/WalletProvider.tsx` — provides Solana `ConnectionProvider` / `WalletProvider` and configures Phantom wallet (autoConnect). Example: endpoint set to `https://api.mainnet-beta.solana.com` and wallets include `PhantomWalletAdapter`.
  - `lib/supabase.ts` — Supabase client created with a public URL and anon key. This file is used directly across the app for DB operations.
  - `package.json` / `README.md` — dev scripts and quick start.

- Big-picture data flows and patterns
  - Authentication/identity is the connected Solana wallet (no separate OAuth). Code reads wallet via `useWallet()` and uses `publicKey.toBase58()` as the wallet id.
  - Realtime-like behavior is implemented with Supabase table operations + polling and lightweight event CRUD. Examples from the code:
    - Typing: `supabase.from("typing").upsert({ wallet, receiver, updated_at })`
    - Reactions: `supabase.from("reactions").select("*").in("message_id", messageIds)` then `upsert` / `delete` to toggle
    - Presence: `supabase.from("presence").upsert({ wallet, last_seen })`
    - Messages: updates use `.update(...)` with fields like `deleted_for_all`, `deleted_for_sender` and filters via `.eq("id", msgId)`

- Developer workflows (commands)
  - Start dev server: `npm run dev` (Next.js serves at http://localhost:3000)
  - Build: `npm run build` and start production: `npm run start`
  - Lint: `npm run lint`
  - Note: there are no test scripts in package.json; add tests to a new `test` script if needed.

- Project-specific conventions and gotchas
  - Many React files are client components — they start with `"use client"`. When moving logic into new files, preserve this directive for client-only code.
  - The main chat page (`app/page.tsx`) keeps a lot of state and effects (polling with `setInterval`, refs for latest state like `activeChatRef`). When editing, keep or update the ref-based patterns to avoid stale closures.
  - UI wallet button is dynamically imported with `ssr: false` (see dynamic import of `WalletMultiButton`) — keep server-side rendering in mind.
  - Tailwind + Tailwind config are used; prefer utility classes already present in UI when adding styles.

- External dependencies to be aware of
  - Solana: `@solana/web3.js`, `@solana/wallet-adapter-*` stack — wallet interactions (sign/send) are triggered client-side via `sendTransaction` from `useWallet()`.
  - Supabase: `@supabase/supabase-js` is used directly for DB calls. `lib/supabase.ts` currently contains a public anon key — treat it as a secret that should not be duplicated in new files.

- Safe-edit examples (how to implement small changes)
  - To add a UI reaction flow: update `toggleReaction` in `app/page.tsx` — it already shows the pattern: check local `reactions` map, call `supabase.from("reactions").upsert(...)` or `.delete(...)`, then refresh with `fetchReactions([msgId])`.
  - To add presence checks: follow `fetchPresence()` which queries `presence` table with `.gte("last_seen", cutoff)` and converts results into a `Set` of online wallets.

- Security and maintenance notes
  - `lib/supabase.ts` exposes the anon key; don't commit other service keys into the repo. If you change the Supabase setup, prefer using environment variables and update references.

If anything above looks incomplete or you'd like more examples (for instance, exact DB schema inference from `app/page.tsx` or a suggested refactor plan to split the big `page.tsx`), tell me which area to expand and I'll iterate.
