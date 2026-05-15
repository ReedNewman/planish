/**
 * Planish Configuration — Global Paint for Charity
 */

export default {
  brand: {
    name: "Global Paint for Charity",
    tagline: "Global Paint IT Team 2026",
    copyrightHolder: "Global Paint for Charity",
  },

  assets: {
    logo: null,
    productLogo: null,
    titleGraphic: null,
  },

  fonts: {
    body: {
      family: "'Source Sans 3', 'Ubuntu', sans-serif",
      googleImport: "Source+Sans+3:wght@400;600;700&family=Ubuntu:wght@400;500;700",
    },
    code: {
      family: "'IBM Plex Mono', 'Roboto Mono', Menlo, Consolas, monospace",
      googleImport: "IBM+Plex+Mono:wght@400;700&family=Roboto+Mono:wght@400;700",
    },
  },

  colors: {
    // Text
    body: "#2c3e50",
    heading: "#1a5c2a",
    subtle: "#4a5a3a",
    muted: "#8a9a7a",

    // Headings — GPC brand green/orange
    h2Border: "#61a60e",
    h3: "#4e8a0b",
    h4: "#f26524",

    // Links
    link: "#61a60e",

    // Tables
    tableHeader: "#1a5c2a",
    tableHeaderText: "#ffffff",
    tableBorder: "#d4d9cf",
    tableStripe: "#f7f9f4",

    // Code
    codeBackground: "#1a2e05",
    codeText: "#e4ece0",
    inlineCodeBackground: "#f0f4ec",
    inlineCodeText: "#1a5c2a",

    // Blockquote / callout
    calloutBorder: "#61a60e",
    calloutBackground: "#f7f9f4",
    calloutAccent: "#4e8a0b",

    // Title page — GPC brand gradient
    titleGradient: ["#61a60e", "#4e8a0b", "#2d8a39", "#1a5c2a"],
    titleDividerGradient: ["#f26524", "#61a60e", "#2d8a39"],

    // Flowchart
    flowchartBackground: "linear-gradient(135deg, #f7f9f4, #f0f4ec)",
    flowchartBorder: "#61a60e",
    flowchartSuccess: { bg: "#e8f5e9", border: "#61a60e" },
    flowchartWarning: { bg: "#fff8e1", border: "#f26524" },
    flowchartError: { bg: "#ffeef0", border: "#d63031" },
  },

  page: {
    format: "Letter",
    margins: { top: "0.9in", bottom: "0.8in", left: "0.75in", right: "0.75in" },
  },

  documents: [
    {
      name: "Chatbot Evaluation",
      input: "../palette/docs/chatbot-evaluation.md",
      output: "./output/chatbot-evaluation.pdf",
      title: "Chatbot Evaluation",
      subtitle: "WordPress Plugins & Custom AI",
      date: "April 2026",
      confidential: false,
      internal: false,
    },
  ],
};
