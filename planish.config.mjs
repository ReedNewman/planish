/**
 * Planish Configuration
 *
 * This file controls all branding, colors, fonts, and document definitions
 * for PDF generation. All paths are relative to this config file's directory.
 */

export default {
  // Branding
  brand: {
    name: "Acme Corp",
    tagline: "Developed by Acme Corp",
    copyrightHolder: "Acme Corp",
  },

  // Logos (paths relative to this config file, or absolute)
  assets: {
    logo: null,               // Main company logo (header + title page) — e.g., "./assets/logo.svg"
    productLogo: null,        // Product logo (title page center, optional)
    titleGraphic: null,       // Decorative graphic above product logo (optional)
  },

  // Fonts
  fonts: {
    body: {
      family: "'Ubuntu', 'Source Sans 3', sans-serif",
      googleImport: "Ubuntu:wght@400;500;700&family=Source+Sans+3:wght@400;600;700",
    },
    code: {
      family: "'IBM Plex Mono', 'Roboto Mono', Menlo, Consolas, monospace",
      googleImport: "IBM+Plex+Mono:wght@400;700&family=Roboto+Mono:wght@400;700",
    },
  },

  // Colors (all CSS color values)
  colors: {
    // Text
    body: "#2c3e50",
    heading: "#3b4e59",
    subtle: "#697d90",
    muted: "#8f8f8f",

    // Headings
    h2Border: "#0fb6e6",
    h3: "#4cbfb5",
    h4: "#f3ae18",

    // Links
    link: "#0fb6e6",

    // Table
    tableHeader: "#3b4e59",
    tableHeaderText: "#ffffff",
    tableBorder: "#e3eaef",
    tableStripe: "#f7fafb",

    // Code
    codeBackground: "#1e2a33",
    codeText: "#e6edf3",
    inlineCodeBackground: "#eef2f5",
    inlineCodeText: "#3b4e59",

    // Blockquote / callout
    calloutBorder: "#4cbfb5",
    calloutBackground: "#f0faf9",
    calloutAccent: "#4cbfb5",

    // Title page
    titleGradient: ["#6dc04b", "#4cbfb5", "#0fb6e6", "#008dd3"],
    titleDividerGradient: ["#6dc04b", "#4cbfb5", "#0fb6e6"],

    // Flowchart
    flowchartBackground: "linear-gradient(135deg, #f0faf9, #eef6f8)",
    flowchartBorder: "#4cbfb5",
    flowchartSuccess: { bg: "#e8f5e9", border: "#6dc04b" },
    flowchartWarning: { bg: "#fff8e1", border: "#f3ae18" },
    flowchartError: { bg: "#ffeef0", border: "#f44336" },
  },

  // Page layout
  page: {
    format: "Letter",
    margins: { top: "0.9in", bottom: "0.8in", left: "0.75in", right: "0.75in" },
  },

  // Documents to generate
  documents: [
    {
      name: "API Guide",
      input: "./sample/api-guide.md",
      output: "./output/api-guide.pdf",
      title: "API Guide",
      subtitle: "Version 1.0 | Integration Reference",
      confidential: true,
      internal: false,
    },
    {
      name: "Operations Guide",
      input: "./sample/operations-guide.md",
      output: "./output/operations-guide.pdf",
      title: "Operations Guide",
      subtitle: "System Administration Reference",
      confidential: true,
      internal: true,
    },
  ],
};
