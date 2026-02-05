# Immutable Runes

Platform for storing and visualizing Pixel Art immutably on the Hive blockchain.

## About

Immutable Runes allows users to upload optimized images (up to 18KB), fragment them, and store them in `custom_json` operations with id `pixel_image`. It also displays existing images by reconstructing them from the blockchain.

## Tech Stack

- **Framework**: Astro 5
- **Interactive Components**: Svelte 5
- **Styling**: Tailwind CSS v4
- **Blockchain**: @hiveio/wax
- **Wallet**: Hive Keychain (login + transaction signing)

## Routes

| Route | Description | Type |
|-------|-------------|------|
| `/` | Landing page with CTA to upload image | Static |
| `/@[username]` | Grid with all user images | Dynamic SSR |
| `/explore` | Latest 20 globally created images | SSR |
| `/upload` | Upload page (requires auth) | Protected |
| `/image/[txid]` | Individual image view | Dynamic SSR |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- [Hive Keychain](https://hive-keychain.com/) browser extension

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

## Project Structure

```
src/
├── components/
│   └── svelte/          # Interactive Svelte 5 components
├── layouts/
│   └── Layout.astro
├── pages/
│   ├── index.astro      # Landing
│   ├── explore.astro    # Explore images
│   ├── upload.astro     # Upload image (protected)
│   ├── @[username].astro # User profile
│   └── image/[txid].astro # Image detail
├── lib/
│   ├── hive-chain-manager.ts  # Wax connection + queries
│   ├── auth.ts                # Keychain login
│   ├── fragments.ts           # Image fragmentation
│   └── image-processor.ts     # Image optimization
├── protocol/
│   ├── hafsql-reader.ts  # HafSQL API reader
│   ├── payload-builder.ts # custom_json payload builder
│   └── payload-reader.ts  # Payload decoder
└── styles/
    └── global.css
```

## How It Works

1. User uploads an image (PNG, WebP, GIF)
2. Image is optimized to fit within 18KB
3. Image is fragmented into ~8KB chunks (base64)
4. Each fragment is broadcast as a `custom_json` operation
5. Images are reconstructed by fetching and joining all fragments

## Custom JSON Structure

```typescript
interface PixelImagePayload {
  imageId: string;          // UUID
  fragmentIndex: number;    // 0, 1, 2...
  totalFragments: number;   // Total fragments
  data: string;             // Base64 chunk
  mimeType: string;         // image/png, image/webp, image/gif
  author: string;           // Hive username
  createdAt: number;        // Timestamp
}
```

## Deployment

This project is configured for Vercel deployment with the `@astrojs/vercel` adapter.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/enrique89ve/immutablerunes)

## License

MIT
