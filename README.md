# Planish

Branded PDF generator that turns markdown into professionally styled PDFs. Point it at a config file, list your documents, and get back a branded title page, a consistent header/footer, syntax-highlighted code, styled tables, and per-document confidentiality markings.

Two rendering pipelines are supported:

- **Puppeteer** (default) — headless Chromium + HTML/CSS template. No extra system dependencies beyond Node.
- **LaTeX** — Pandoc + XeLaTeX. Opt in with `--latex`. Gracefully skipped if `pandoc` or `xelatex` aren't on `PATH`.

## Install

```bash
npm install
```

Requirements:

- Node.js ≥ 18
- (Optional) `pandoc` and `xelatex` if you want the `--latex` pipeline. On macOS: `brew install pandoc` and install MacTeX or BasicTeX.

## Quick start

1. Copy the sample config:

   ```bash
   cp planish.config.sample.mjs planish.config.mjs
   ```

2. Edit `planish.config.mjs` — set brand info, (optionally) asset paths, and list your documents under the `documents` array. Each entry points at a markdown file and an output PDF path.

3. Generate:

   ```bash
   npm run generate                            # all documents, Puppeteer pipeline
   npx planish generate --doc "API Guide"     # one document by name
   npm run generate:latex                      # LaTeX pipeline (needs pandoc + xelatex)
   ```

The bundled `planish.config.mjs` is wired up to the two markdown files in `sample/`, so `npm run generate` works immediately out of the box and drops PDFs in `output/`.

## CLI

```
planish                            Generate all documents
planish generate                   Generate all documents
planish generate --doc "Name"      Generate a specific document by name
planish generate --latex           Use the LaTeX (pandoc + xelatex) pipeline
planish generate --config <path>   Use a specific config file (default: ./planish.config.mjs)
-h, --help                         Show help
```

`--doc` matches the `name` field in a `documents[]` entry (case-insensitive). `--config` is resolved relative to CWD; asset paths inside the config file are resolved relative to the config file's directory.

## Configuration

`planish.config.mjs` is a plain ES module that default-exports a config object. All fields are optional — sensible defaults are filled in — except `documents`, which is what tells Planish what to build.

```js
export default {
  brand: {
    name: "Acme Corp",
    tagline: "Developed by Acme Corp",
    copyrightHolder: "Acme Corp",
  },

  assets: {
    logo: "./assets/logo.svg",              // header + title page top-left
    productLogo: "./assets/product.svg",    // title page center (optional)
    titleGraphic: "./assets/halo.svg",      // decorative graphic (optional)
  },

  fonts: {
    body: {
      family: "'Ubuntu', 'Source Sans 3', sans-serif",
      googleImport: "Ubuntu:wght@400;500;700&family=Source+Sans+3:wght@400;600;700",
    },
    heading: {                                 // optional display font for headings
      family: "'Cormorant Garamond', Georgia, serif",
      googleImport: "Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700",
      style: "italic",                         // "normal" (default) or "italic"
    },
    code: {
      family: "'IBM Plex Mono', 'Roboto Mono', Menlo, Consolas, monospace",
      googleImport: "IBM+Plex+Mono:wght@400;700&family=Roboto+Mono:wght@400;700",
    },
  },

  colors: {
    body: "#2c3e50",
    heading: "#3b4e59",
    h2Border: "#0fb6e6",
    h3: "#4cbfb5",
    h4: "#f3ae18",
    link: "#0fb6e6",
    tableHeader: "#3b4e59",
    codeBackground: "#1e2a33",
    calloutBorder: "#4cbfb5",
    titleGradient: ["#6dc04b", "#4cbfb5", "#0fb6e6", "#008dd3"],
    // …plus table, code, callout, flowchart palettes — see the sample config
  },

  page: {
    format: "Letter",                        // "Letter" or "A4"
    margins: { top: "0.9in", bottom: "0.8in", left: "0.75in", right: "0.75in" },
  },

  documents: [
    {
      name: "API Guide",                     // matched by --doc
      input: "./docs/api-guide.md",
      output: "./output/api-guide.pdf",
      title: "API Guide",                    // shown on the title page
      subtitle: "Version 1.0 | Integration Reference",
      confidential: true,                    // appends "| CONFIDENTIAL" to footer
      internal: false,                       // appends "— Not for Customer Distribution"
      legal: false,                          // legal-document layout, see below
    },
  ],
};
```

See `planish.config.sample.mjs` for the full annotated reference — every supported color slot, gradient, and flowchart state is documented inline.

### Assets

`logo`, `productLogo`, and `titleGraphic` can each be set to `null` to omit that element. SVG is recommended for crispness; PNG/JPG/GIF/WEBP are also supported. Assets are base64-inlined into the HTML, so no HTTP requests are made at render time.

### Fonts

Any font referenced via `googleImport` is fetched over HTTPS at render time (the Puppeteer pipeline waits for `networkidle0` before printing). Set `googleImport` to `null` if you want to rely solely on locally installed fonts. Planish ships with the Ubuntu and IBM Plex Mono TTFs under `fonts/` for the LaTeX pipeline.

`fonts.heading` is optional: when present, the title-page h1 and content h1–h3 use it (with `style: "italic"` if set) while h4+ stay in the body font. When omitted, all headings use the body font — the original behavior. Puppeteer pipeline only.

### Legal-document layout (`legal: true`)

The default layout is tuned for technical manuals: every `##` section starts a new page. Setting `legal: true` on a document switches to a layout tuned for contracts and agreements:

- `##` headings flow continuously (no forced page break) and stay attached to the paragraph that follows them;
- paragraphs are justified;
- markdown `---` horizontal rules are hidden (the h2 border already separates articles, and a stray trailing rule otherwise strands a near-blank page);
- a `## Signature` heading starts on its own final page, so the execution block prints cleanly;
- the title-page h1 is enlarged (30pt);
- a plain `**bold subtitle**` line immediately after the H1 is stripped along with it (the stock stripper only removes `**meta** | …` lines containing a pipe).

Default `false` keeps the manual-style layout exactly as before. Puppeteer pipeline only — the LaTeX pipeline ignores `legal` and `fonts.heading`.

### Confidential / internal markings

- `confidential: true` → footer reads `© YYYY {holder} | CONFIDENTIAL`
- `internal: true` → appends `— Not for Customer Distribution`
- Title page shows the same footer text below the divider.

## How it renders

### Puppeteer pipeline (`src/generate.mjs`)

Two-pass render, then merge:

1. **Pass 1** — full-bleed title page (no header/footer), using `src/template.html` with CSS variables substituted from `config.colors` / `config.fonts`.
2. **Pass 2** — content pages, with a top-right logo header and a left-aligned copyright + right-aligned page number footer. Markdown → HTML via [`marked`](https://marked.js.org) with a custom renderer that:
   - syntax-highlights fenced code with [`highlight.js`](https://highlightjs.org/), auto-detecting JSON and HTTP bodies even when no language tag is given;
   - adds `id`s to headings (slugified) for in-PDF anchor links;
   - tags tables with 8+ columns as `.wide-table` for narrower styling;
   - passes through raw HTML blocks that contain a `flowchart-box` class (so you can embed styled flowcharts in markdown).
3. **Merge** — `pdf-lib` concatenates the title PDF and content PDF into a single file.

The first `# H1` and its immediately-following `**meta** | line` are stripped from markdown before rendering (the title page already covers that).

### LaTeX pipeline (`src/generate-latex.mjs`)

Builds a custom `.tex` template from the same config (colors converted to XeLaTeX definitions, Ubuntu/IBM Plex Mono loaded from `fonts/`) and shells out to Pandoc. Useful when you need true print-quality typography, page numbers baked into the PDF index, or kerning that browsers won't give you. Skipped with a warning if `pandoc` or `xelatex` aren't installed.

## Project layout

```
.
├── src/
│   ├── index.mjs              CLI entry (argv parsing, config loader, dispatch)
│   ├── generate.mjs           Puppeteer pipeline
│   ├── generate-latex.mjs     Pandoc + XeLaTeX pipeline
│   └── template.html          HTML/CSS template with {{PLACEHOLDER}} tokens
├── planish.config.mjs         Your project's config (wired to sample/* by default)
├── planish.config.sample.mjs  Fully annotated config reference
├── sample/                    Example markdown (API Guide, Operations Guide)
├── assets/                    Drop your logo.svg / product.svg / halo.svg here
├── fonts/                     Bundled Ubuntu + IBM Plex Mono for the LaTeX pipeline
├── output/                    Generated PDFs (gitignored)
└── package.json
```

## Adding a new document

1. Write your markdown under `docs/` (or anywhere on disk).
2. Add an entry to `documents` in `planish.config.mjs`:
   ```js
   {
     name: "Runbook",
     input: "./docs/runbook.md",
     output: "./output/runbook.pdf",
     title: "Production Runbook",
     subtitle: "On-call Reference",
     confidential: true,
     internal: true,
   }
   ```
3. Run `npx planish generate --doc Runbook`.

## Troubleshooting

- **"Config file not found"** — run from a directory containing `planish.config.mjs`, or pass `--config /path/to/planish.config.mjs`.
- **"File not found: …"** for a document input — `input` paths are resolved relative to the config file, not CWD.
- **Puppeteer download fails in CI** — set `PUPPETEER_SKIP_DOWNLOAD=true` and point Puppeteer at an existing Chromium via `PUPPETEER_EXECUTABLE_PATH`.
- **LaTeX pipeline silently does nothing** — check that both `pandoc` and `xelatex` are on `PATH`; the pipeline skips with a warning rather than failing the build.
- **Fonts look wrong** — when rendering offline, either install the Google-imported fonts system-wide or set `fonts.body.googleImport` / `fonts.code.googleImport` to `null` and use fonts available on the host.

## License

MIT.
