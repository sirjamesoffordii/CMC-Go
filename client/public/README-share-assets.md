# Share preview & favicon assets

**The image used for link previews and the main toolbar logo is:**

- **File:** `client/public/og-image.png`
- Same file is used for: share preview (Open Graph / Twitter), **default header logo** (top-left on mobile, top-right on desktop), and Header Editor placeholder/fallback.

| File             | Purpose                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| **og-image.png** | Share preview (Open Graph / Twitter). **Default logo in main toolbar.** 1200×630. |
| **favicon.svg**  | Browser tab icon and Apple touch icon.                                            |

## How to see the preview picture

- **Locally:** Run the app (`pnpm dev`), then open:
  - Share image: [http://localhost:5173/og-image.png](http://localhost:5173/og-image.png)
  - Favicon: [http://localhost:5173/favicon.svg](http://localhost:5173/favicon.svg)
- **In the repo:** Open `client/public/og-image.png` or `client/public/favicon.svg` in your editor or file explorer (PNG will show in image viewers, SVG in browser or editor).
- **Production:** [https://cmcgo.app/og-image.png](https://cmcgo.app/og-image.png) and [https://cmcgo.app/favicon.svg](https://cmcgo.app/favicon.svg) after deploy.
