# Shawal Latif — Personal Site / Interactive Resume

Live, always-on personal site hosted free on GitHub Pages.

**Target URL:** `https://shawalkhan1.github.io`

---

## What's in this folder

| File | What it is |
|------|------------|
| `index.html` | The interactive resume (this is the page that loads) |
| `Shawal_Latif_Resume.pdf` | The downloadable CV (the "Download CV" button points here) |
| `og-image.png` | Social-preview image shown when the link is shared on LinkedIn/X |
| `favicon.svg` | Browser tab icon |
| `.nojekyll` | Tells GitHub to serve the files as-is (don't delete it) |
| `logos/` | Drop your institution logos here (see `logos/README.txt`) |
| `README.md` | This file |

---

## Host it (no command line, ~3 minutes)

1. Go to **github.com → New repository**.
2. Name it **exactly** `shawalkhan1.github.io` (this makes it live at the root URL with zero extra config). Set it to **Public**. Do **not** add a README (this folder already has one). Click **Create repository**.
3. On the new repo page click **Add file → Upload files**.
4. Drag in **everything inside this folder** — including the `logos` folder and the hidden `.nojekyll` file. (If your file browser hides dotfiles, enable "show hidden files" so `.nojekyll` uploads too. It's optional but recommended.)
5. Scroll down and click **Commit changes**.
6. Wait 1–2 minutes, then open **https://shawalkhan1.github.io** — you're live.

> If Pages doesn't turn on automatically: go to **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.

### "Live always"
Once deployed, GitHub Pages stays live indefinitely for free. Every time you upload a new `index.html` (or edit it in GitHub), the site updates within ~1 minute. No servers, no renewals, no cost.

---

## Use a project repo instead (optional)

If you'd rather keep your root `shawalkhan1.github.io` free, name the repo something like `resume` instead. Then:
- Enable Pages the same way (**Settings → Pages**).
- Your site will live at `https://shawalkhan1.github.io/resume/`.
- Everything still works because all links in `index.html` are relative.

---

## Add your real logos

The Experience and Education sections currently show clean text monograms (AeS, BMGF, AIH, LUMS, CUI). They **auto-upgrade to real logos** the moment you add image files — no code editing. See `logos/README.txt` for the exact filenames.

---

## Edit the "Ask my work" demo

The browser-side RAG demo answers from a small knowledge base defined in `index.html`. Search the file for `var CORPUS` — each entry has `tags` (keywords it matches) and `text` (the answer snippet). Add or edit entries to change what the demo can talk about.

---

## Custom domain (optional, later)

Buy a domain (e.g. `shawallatif.com`), then in **Settings → Pages → Custom domain** enter it and follow the DNS instructions. Add a file named `CNAME` containing just your domain to the repo. Update the `og:url`/`canonical`/`og:image` URLs in `index.html` to the new domain so social previews keep working.
