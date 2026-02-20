# Klipy GIFs Extension

Vicinae extension for searching and using GIFs through the Klipy API.

## Commands

- `Search GIFs`: Search Klipy and copy/open results.
- `Trending GIFs`: Browse currently trending GIFs.
- `GIF Suggestions`: Query autocomplete and related suggestion terms.
- `Copy Random Trending GIF`: No-view quick command that performs your default action on a random trending GIF.
- `GIF From Selection`: No-view quick command that searches using selected text and performs your default action.

## Setup

1. Install dependencies:

```bash
pnpm install
```

1. Configure extension preferences:

- `Klipy API Key` (required)
- `Default Result Action` (`copy`, `open`, `browser`)
- Optional behavior/preferences (format, filters, locale, country, target app)

1. Run in development:

```bash
pnpm run dev
```

1. Build production bundle:

```bash
pnpm run build
```
