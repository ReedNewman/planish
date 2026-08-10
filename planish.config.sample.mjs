/**
 * Planish Configuration — Sample
 *
 * Copy this file to `planish.config.mjs` and customize for your project.
 * All paths are relative to this config file's directory unless absolute.
 *
 * Run: npx planish generate
 */

export default {
  // =========================================================================
  // Branding
  // =========================================================================
  brand: {
    name: "Acme Corp",                        // Company name (used in title page attribution)
    tagline: "Developed by Acme Corp",         // Title page attribution line
    copyrightHolder: "Acme Corp",              // Footer copyright: (c) 2026 Acme Corp
  },

  // =========================================================================
  // Logo Assets
  // All paths relative to this config file. SVG recommended for crisp output.
  // Set to null to omit that element from the title page.
  // =========================================================================
  assets: {
    logo: "./assets/logo.svg",                 // Company logo — appears in header + title page top-left
    productLogo: "./assets/product-logo.svg",  // Product logo — title page center (optional)
    titleGraphic: "./assets/halo.svg",         // Decorative graphic above product logo (optional)
  },

  // =========================================================================
  // Fonts
  // Google Fonts are imported automatically. For local-only fonts, set
  // googleImport to null and ensure the font files are available on the system.
  // =========================================================================
  fonts: {
    body: {
      family: "'Ubuntu', 'Source Sans 3', sans-serif",
      googleImport: "Ubuntu:wght@400;500;700&family=Source+Sans+3:wght@400;600;700",
    },
    // Optional display font for headings (title page h1 and content h1–h3).
    // Omit entirely to keep headings in the body font (default behavior).
    // heading: {
    //   family: "'Cormorant Garamond', Georgia, serif",
    //   googleImport: "Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700",
    //   style: "italic",                     // "normal" (default) or "italic"
    // },
    code: {
      family: "'IBM Plex Mono', 'Roboto Mono', Menlo, Consolas, monospace",
      googleImport: "IBM+Plex+Mono:wght@400;700&family=Roboto+Mono:wght@400;700",
    },
  },

  // =========================================================================
  // Colors
  // All values are CSS color strings. Gradients use arrays of color stops.
  // =========================================================================
  colors: {
    // --- Text ---
    body: "#2c3e50",                           // Main body text
    heading: "#3b4e59",                        // H1, H2, H5, strong tags
    subtle: "#697d90",                         // Subtitle, arrows, secondary text
    muted: "#8f8f8f",                          // Copyright, very low-emphasis text

    // --- Headings ---
    h2Border: "#0fb6e6",                       // H2 bottom border color
    h3: "#4cbfb5",                             // H3 heading color
    h4: "#f3ae18",                             // H4 heading color

    // --- Links ---
    link: "#0fb6e6",                           // Hyperlink color

    // --- Tables ---
    tableHeader: "#3b4e59",                    // Table header row background
    tableHeaderText: "#ffffff",                // Table header text color
    tableBorder: "#e3eaef",                    // Table cell borders
    tableStripe: "#f7fafb",                    // Even-row stripe background

    // --- Code ---
    codeBackground: "#1e2a33",                 // Code block background (dark theme)
    codeText: "#e6edf3",                       // Code block text color
    inlineCodeBackground: "#eef2f5",           // Inline `code` background
    inlineCodeText: "#3b4e59",                 // Inline `code` text color

    // --- Blockquote / Callout ---
    calloutBorder: "#4cbfb5",                  // Left border of blockquotes
    calloutBackground: "#f0faf9",              // Blockquote background
    calloutAccent: "#4cbfb5",                  // Bold text inside blockquotes

    // --- Title Page ---
    titleGradient: ["#6dc04b", "#4cbfb5", "#0fb6e6", "#008dd3"],  // Right bar gradient (top to bottom)
    titleDividerGradient: ["#6dc04b", "#4cbfb5", "#0fb6e6"],       // Horizontal divider (left to right)

    // --- Flowchart ---
    flowchartBackground: "linear-gradient(135deg, #f0faf9, #eef6f8)",
    flowchartBorder: "#4cbfb5",
    flowchartSuccess: { bg: "#e8f5e9", border: "#6dc04b" },
    flowchartWarning: { bg: "#fff8e1", border: "#f3ae18" },
    flowchartError: { bg: "#ffeef0", border: "#f44336" },
  },

  // =========================================================================
  // Page Layout
  // =========================================================================
  page: {
    format: "Letter",                          // "Letter" (8.5x11) or "A4"
    margins: {
      top: "0.9in",
      bottom: "0.8in",
      left: "0.75in",
      right: "0.75in",
    },
  },

  // =========================================================================
  // Documents
  // Each entry defines one markdown-to-PDF conversion.
  // =========================================================================
  documents: [
    {
      name: "API Guide",                       // Display name (used with --doc filter)
      input: "./docs/api-guide.md",            // Source markdown file
      output: "./output/api-guide.pdf",        // Output PDF path
      title: "API Guide",                      // Title page heading
      subtitle: "Version 1.0 | Integration Reference",  // Title page subheading
      confidential: true,                      // Adds "CONFIDENTIAL" to footer
      internal: false,                         // Adds "Not for Customer Distribution" to footer
      legal: false,                            // Legal-document layout: continuous h2 flow
                                               // (no page break per section), justified
                                               // paragraphs, markdown --- rules hidden, and
                                               // a "## Signature" heading starts its own
                                               // final page. Also strips a plain bold
                                               // subtitle line after the H1. Default false
                                               // keeps the manual-style chapter-per-page
                                               // layout. (Puppeteer pipeline only.)
    },
    {
      name: "Operations Guide",
      input: "./docs/operations-guide.md",
      output: "./output/operations-guide.pdf",
      title: "Operations Guide",
      subtitle: "System Administration Reference",
      confidential: true,
      internal: true,
    },
  ],
};
