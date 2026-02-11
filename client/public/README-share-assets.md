# Share preview & favicon assets

These files are used when **cmcgo.app** is shared (e.g. link previews) and as the browser tab icon.

| File             | Purpose                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| **og-image.png** | Preview image when sharing the site (Open Graph / Twitter Card). 1200×630. |
| **favicon.svg**  | Browser tab icon and Apple touch icon.                                     |

## How to see the preview picture

- **Locally:** Run the app (`pnpm dev`), then open:
  - Share image: [http://localhost:5173/og-image.png](http://localhost:5173/og-image.png)
  - Favicon: [http://localhost:5173/favicon.svg](http://localhost:5173/favicon.svg)
- **In the repo:** Open `client/public/og-image.png` or `client/public/favicon.svg` in your editor or file explorer (PNG will show in image viewers, SVG in browser or editor).
- **Production:** [https://cmcgo.app/og-image.png](https://cmcgo.app/og-image.png) and [https://cmcgo.app/favicon.svg](https://cmcgo.app/favicon.svg) after deploy.
