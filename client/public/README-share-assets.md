# Share preview & favicon assets

**Favicon (browser tab, Apple touch icon):**

- **File:** `client/public/favicon.svg` — CMC GO logo in circle, rotated 15°. Sole favicon; no other variants.

**Share preview & header logo:**

- **File:** `client/public/og-image.png`
- Used for: share preview (Open Graph / Twitter), **default header logo** (top-left on mobile, top-right on desktop), and Header Editor placeholder/fallback. 1200×630.

| File             | Purpose                                       |
| ---------------- | --------------------------------------------- |
| **favicon.svg**  | Browser tab icon and Apple touch icon.        |
| **og-image.png** | Share preview (Open Graph / Twitter), header. |

## How to see the assets

- **Locally:** Run the app (`pnpm dev`), then open:
  - Favicon: [http://localhost:5173/favicon.svg](http://localhost:5173/favicon.svg)
  - Share image: [http://localhost:5173/og-image.png](http://localhost:5173/og-image.png)
- **Production:** [https://cmcgo.app/favicon.svg](https://cmcgo.app/favicon.svg) and [https://cmcgo.app/og-image.png](https://cmcgo.app/og-image.png) after deploy.
