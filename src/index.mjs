#!/usr/bin/env node

/**
 * Planish — Branded PDF Generator
 *
 * Converts markdown documentation to professionally styled PDFs
 * with customizable branding, colors, and fonts.
 *
 * Usage:
 *   planish                          Generate all documents (Puppeteer)
 *   planish generate                 Generate all documents (Puppeteer)
 *   planish generate --doc "Name"    Generate a specific document
 *   planish generate --latex         Generate via LaTeX (requires pandoc + xelatex)
 *   planish generate --config path   Use a specific config file
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// ===== Parse CLI arguments =====
function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    command: 'generate',
    docFilter: null,
    latex: false,
    configPath: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === 'generate') {
      options.command = 'generate';
    } else if (arg === '--doc' && i + 1 < args.length) {
      options.docFilter = args[++i];
    } else if (arg === '--latex') {
      options.latex = true;
    } else if (arg === '--config' && i + 1 < args.length) {
      options.configPath = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Treat unknown positional arg as command
      options.command = arg;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Planish — Branded PDF Generator

Usage:
  planish                            Generate all documents
  planish generate                   Generate all documents
  planish generate --doc "Name"      Generate a specific document by name
  planish generate --latex           Generate via LaTeX (needs pandoc + xelatex)
  planish generate --config <path>   Use a specific config file

Options:
  --doc <name>      Generate only the document with this name
  --latex           Use the LaTeX pipeline instead of Puppeteer
  --config <path>   Path to config file (default: ./planish.config.mjs)
  -h, --help        Show this help message

Configuration:
  Create a planish.config.mjs in your project root.
  See planish.config.sample.mjs for all available options.
`);
}

// ===== Load config =====
async function loadConfig(configPath) {
  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Config file not found: ${resolvedPath}`);
    console.error('Create a planish.config.mjs or specify one with --config');
    process.exit(1);
  }

  const configUrl = pathToFileURL(resolvedPath).href;
  const configModule = await import(configUrl);
  return {
    config: configModule.default,
    configDir: path.dirname(resolvedPath),
  };
}

// ===== Main =====
async function main() {
  const options = parseArgs(process.argv);

  if (options.command !== 'generate') {
    console.error(`Unknown command: ${options.command}`);
    printHelp();
    process.exit(1);
  }

  const configFile = options.configPath || path.join(process.cwd(), 'planish.config.mjs');
  const { config, configDir } = await loadConfig(configFile);

  if (options.latex) {
    const { generateLatex } = await import('./generate-latex.mjs');
    await generateLatex(config, configDir, { docFilter: options.docFilter });
  } else {
    const { generate } = await import('./generate.mjs');
    await generate(config, configDir, { docFilter: options.docFilter });
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
