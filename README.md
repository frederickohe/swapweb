# SwapPro Web (`swappro-web`)

Member-facing web app for SwapPro: guest browse, auth for list/swap.

## Features

- **Guest browse** — search and view listings without signing in
- **Auth** — sign in / sign up to create listings, view Swap Bay, and manage profile
- **MVP** — Home, listing detail, my listings, create listing, Swap Bay, profile

## Development

```bash
npm install
npm run dev
```

Runs at [http://localhost:5174](http://localhost:5174). Vite proxies `/api` to `https://api.swappro.store`.

## Production

Deployed to [https://swappro.store](https://swappro.store).

```bash
npm run build
npm run preview
```
