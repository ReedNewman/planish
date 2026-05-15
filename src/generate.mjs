/**
 * Planish — Puppeteer-based PDF Generator
 *
 * Two-pass approach:
 *   Pass 1: Title page rendered without header/footer
 *   Pass 2: Content pages rendered with branded header + copyright footer
 *   Merge: Combined via pdf-lib
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Marked } from 'marked';
import hljs from 'highlight.js';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== SVG/image to data URI =====
function fileToDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath);

  const mimeTypes = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  const mime = mimeTypes[ext] || 'application/octet-stream';
  const encoded = content.toString('base64');
  return `data:${mime};base64,${encoded}`;
}

// ===== Resolve asset path relative to config directory =====
function resolveAsset(assetPath, configDir) {
  if (!assetPath) return null;
  if (path.isAbsolute(assetPath)) return assetPath;
  return path.resolve(configDir, assetPath);
}

// ===== Load brand assets =====
function loadAssets(config, configDir) {
  const assets = {};
  if (config.assets?.logo) {
    assets.logo = fileToDataUri(resolveAsset(config.assets.logo, configDir));
  }
  if (config.assets?.productLogo) {
    assets.productLogo = fileToDataUri(resolveAsset(config.assets.productLogo, configDir));
  }
  if (config.assets?.titleGraphic) {
    assets.titleGraphic = fileToDataUri(resolveAsset(config.assets.titleGraphic, configDir));
  }
  return assets;
}

// ===== Build gradient CSS from color array =====
function buildGradient(colors, direction = 'to bottom') {
  if (!colors || colors.length === 0) return 'transparent';
  if (colors.length === 1) return colors[0];
  return `linear-gradient(${direction}, ${colors.join(', ')})`;
}

// ===== Build font import statement =====
function buildFontImport(config) {
  const imports = [];
  if (config.fonts?.body?.googleImport) {
    imports.push(config.fonts.body.googleImport);
  }
  if (config.fonts?.code?.googleImport) {
    imports.push(config.fonts.code.googleImport);
  }
  if (imports.length === 0) return '';
  return `@import url('https://fonts.googleapis.com/css2?family=${imports.join('&family=')}&display=swap');`;
}

// ===== Inject CSS variables into template =====
function injectCssVars(templateHtml, config) {
  const c = config.colors || {};
  const replacements = {
    '{{BODY_COLOR}}': c.body || '#2c3e50',
    '{{HEADING_COLOR}}': c.heading || '#3b4e59',
    '{{SUBTLE_COLOR}}': c.subtle || '#697d90',
    '{{MUTED_COLOR}}': c.muted || '#8f8f8f',
    '{{H2_BORDER}}': c.h2Border || '#0fb6e6',
    '{{H3_COLOR}}': c.h3 || '#4cbfb5',
    '{{H4_COLOR}}': c.h4 || '#f3ae18',
    '{{LINK_COLOR}}': c.link || '#0fb6e6',
    '{{TABLE_HEADER}}': c.tableHeader || '#3b4e59',
    '{{TABLE_HEADER_TEXT}}': c.tableHeaderText || '#ffffff',
    '{{TABLE_BORDER}}': c.tableBorder || '#e3eaef',
    '{{TABLE_STRIPE}}': c.tableStripe || '#f7fafb',
    '{{CODE_BACKGROUND}}': c.codeBackground || '#1e2a33',
    '{{CODE_TEXT}}': c.codeText || '#e6edf3',
    '{{INLINE_CODE_BG}}': c.inlineCodeBackground || '#eef2f5',
    '{{INLINE_CODE_TEXT}}': c.inlineCodeText || '#3b4e59',
    '{{CALLOUT_BORDER}}': c.calloutBorder || '#4cbfb5',
    '{{CALLOUT_BG}}': c.calloutBackground || '#f0faf9',
    '{{CALLOUT_ACCENT}}': c.calloutAccent || '#4cbfb5',
    '{{BODY_FONT}}': config.fonts?.body?.family || "'Ubuntu', 'Source Sans 3', sans-serif",
    '{{CODE_FONT}}': config.fonts?.code?.family || "'IBM Plex Mono', 'Roboto Mono', Menlo, Consolas, monospace",
    '{{TITLE_GRADIENT}}': buildGradient(c.titleGradient || ['#6dc04b', '#4cbfb5', '#0fb6e6', '#008dd3']),
    '{{TITLE_DIVIDER}}': buildGradient(c.titleDividerGradient || ['#6dc04b', '#4cbfb5', '#0fb6e6'], 'to right'),
    '{{FLOWCHART_BG}}': c.flowchartBackground || 'linear-gradient(135deg, #f0faf9, #eef6f8)',
    '{{FLOWCHART_BORDER}}': c.flowchartBorder || '#4cbfb5',
    '{{FLOWCHART_SUCCESS_BG}}': c.flowchartSuccess?.bg || '#e8f5e9',
    '{{FLOWCHART_SUCCESS_BORDER}}': c.flowchartSuccess?.border || '#6dc04b',
    '{{FLOWCHART_WARNING_BG}}': c.flowchartWarning?.bg || '#fff8e1',
    '{{FLOWCHART_WARNING_BORDER}}': c.flowchartWarning?.border || '#f3ae18',
    '{{FLOWCHART_ERROR_BG}}': c.flowchartError?.bg || '#ffeef0',
    '{{FLOWCHART_ERROR_BORDER}}': c.flowchartError?.border || '#f44336',
    '{{FONT_IMPORT}}': buildFontImport(config),
  };

  let result = templateHtml;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

// ===== Configure marked with syntax highlighting =====
function createMarkedInstance() {
  const marked = new Marked();

  marked.use({
    renderer: {
      code(code, lang, _escaped) {
        // Pass through raw HTML (flowcharts)
        if (code.includes('flowchart-box')) {
          return code;
        }

        let highlighted;
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(code, { language: lang }).value;
        } else {
          const trimmed = code.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              highlighted = hljs.highlight(code, { language: 'json' }).value;
            } catch {
              highlighted = hljs.highlightAuto(code).value;
            }
          } else if (
            trimmed.startsWith('Authorization:') ||
            trimmed.startsWith('GET ') ||
            trimmed.startsWith('POST ') ||
            trimmed.startsWith('PUT ') ||
            trimmed.startsWith('DELETE ') ||
            trimmed.includes('Content-Type:')
          ) {
            highlighted = hljs.highlight(code, { language: 'http' }).value;
          } else {
            highlighted = hljs.highlightAuto(code).value;
          }
        }

        return `<pre><code class="hljs${lang ? ` language-${lang}` : ''}">${highlighted}</code></pre>`;
      },

      table(headerHtml, bodyHtml) {
        const colCount = (headerHtml.match(/<th/g) || []).length;
        const isWide = colCount > 8;
        const tableClass = isWide ? ' class="wide-table"' : '';
        return `<table${tableClass}>\n<thead>\n${headerHtml}</thead>\n<tbody>\n${bodyHtml}</tbody>\n</table>\n`;
      },

      heading(text, depth, _raw) {
        const id = text
          .toLowerCase()
          .replace(/<[^>]*>/g, '')
          .replace(/&[^;]+;/g, '')
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
    },
  });

  return marked;
}

// ===== Build footer text from doc config =====
function buildFooterText(doc, config) {
  const year = new Date().getFullYear();
  const holder = config.brand?.copyrightHolder || config.brand?.name || 'Company';
  let text = `\u00A9 ${year} ${holder}`;
  if (doc.confidential) {
    text += ' | CONFIDENTIAL';
  }
  if (doc.internal) {
    text += ' \u2014 Not for Customer Distribution';
  }
  return text;
}

// ===== Build title page HTML =====
function buildTitleHtml(styledTemplate, doc, config, assets) {
  const styleMatch = styledTemplate.match(/<style>([\s\S]*?)<\/style>/);
  const style = styleMatch ? styleMatch[1] : '';
  const footerText = buildFooterText(doc, config);

  // Build optional sections
  const logoSection = assets.logo
    ? `<div class="title-logo"><img src="${assets.logo}" alt="${config.brand?.name || ''}"></div>`
    : '';

  const graphicSection = assets.titleGraphic
    ? `<div class="title-graphic"><img src="${assets.titleGraphic}" alt=""></div>`
    : '';

  const productLogoSection = assets.productLogo
    ? `<div class="title-product-logo"><img src="${assets.productLogo}" alt=""></div>`
    : '';

  const tagline = config.brand?.tagline || '';
  const taglineSection = tagline
    ? `<div class="title-developed">${tagline}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${style}</style></head>
<body>
<div class="title-page" style="page-break-after: avoid;">
  ${logoSection}
  ${graphicSection}
  ${productLogoSection}
  <div class="title-divider"></div>
  <h1>${doc.title}</h1>
  <div class="subtitle">${doc.subtitle || ''}</div>
  ${doc.date ? `<div class="title-date">${doc.date}</div>` : ''}
  <div class="title-divider"></div>
  ${taglineSection}
  <div class="title-copyright">${footerText}</div>
</div>
</body></html>`;
}

// ===== Build content HTML =====
function buildContentHtml(styledTemplate, contentHtml) {
  const styleMatch = styledTemplate.match(/<style>([\s\S]*?)<\/style>/);
  const style = styleMatch ? styleMatch[1] : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${style}
/* Override: no page break on first h2 in content-only mode */
.content-body > h2:first-child { page-break-before: avoid; }
</style></head>
<body>
<div class="content-body">
${contentHtml}
</div>
</body></html>`;
}

// ===== Strip the first H1 and metadata line from content =====
function stripTitleFromMarkdown(markdown) {
  markdown = markdown.replace(/^#\s+.+\n+/, '');
  markdown = markdown.replace(/^\*\*[^*]+\*\*\s*\|[\s\S]*?\n+/, '');
  markdown = markdown.replace(/^---\n+/, '');
  return markdown;
}

// ===== Merge two PDFs =====
async function mergePdfs(titlePdfBytes, contentPdfBytes) {
  const mergedDoc = await PDFDocument.create();
  const titleDoc = await PDFDocument.load(titlePdfBytes);
  const contentDoc = await PDFDocument.load(contentPdfBytes);

  const titlePages = await mergedDoc.copyPages(titleDoc, titleDoc.getPageIndices());
  for (const page of titlePages) {
    mergedDoc.addPage(page);
  }

  const contentPages = await mergedDoc.copyPages(contentDoc, contentDoc.getPageIndices());
  for (const page of contentPages) {
    mergedDoc.addPage(page);
  }

  return mergedDoc.save();
}

// ===== Generate a single document =====
async function generateDocument(browser, doc, config, configDir, assets, styledTemplate) {
  const inputPath = resolveAsset(doc.input, configDir);
  const outputPath = resolveAsset(doc.output, configDir);

  if (!fs.existsSync(inputPath)) {
    console.error(`  ERROR: File not found: ${inputPath}`);
    return false;
  }

  let markdown = fs.readFileSync(inputPath, 'utf-8');
  console.log(`  Read ${markdown.length} bytes of markdown`);

  markdown = stripTitleFromMarkdown(markdown);

  const marked = createMarkedInstance();
  const contentHtml = await marked.parse(markdown);
  console.log(`  Converted to HTML (${contentHtml.length} chars)`);

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pageFormat = config.page?.format || 'Letter';
  const margins = config.page?.margins || { top: '0.9in', bottom: '0.8in', left: '0.75in', right: '0.75in' };
  const footerText = buildFooterText(doc, config);

  // ---- Pass 1: Title page ----
  console.log('  Pass 1: Generating title page...');
  const titleHtml = buildTitleHtml(styledTemplate, doc, config, assets);
  const titlePage = await browser.newPage();
  await titlePage.setContent(titleHtml, { waitUntil: 'networkidle0' });

  const titlePdfBytes = await titlePage.pdf({
    format: pageFormat,
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: '0in', bottom: '0in', left: '0in', right: '0in' },
  });
  await titlePage.close();

  // ---- Pass 2: Content pages ----
  console.log('  Pass 2: Generating content pages...');
  const contentOnlyHtml = buildContentHtml(styledTemplate, contentHtml);
  const contentPage = await browser.newPage();
  await contentPage.setContent(contentOnlyHtml, { waitUntil: 'networkidle0' });

  // Build header template — Puppeteer header/footer only supports inline styles
  const headerLogoImg = assets.logo
    ? `<img src="${assets.logo}" style="height: 24px;" />`
    : '';

  const headerTemplate = `
    <div style="width: 100%; padding: 0 ${margins.right}; display: flex; justify-content: flex-end; align-items: center; padding-top: 4px;">
      ${headerLogoImg}
    </div>
  `;

  const subtleColor = config.colors?.subtle || '#697d90';
  const borderColor = config.colors?.tableBorder || '#e3eaef';

  const footerTemplate = `
    <div style="width: 100%; padding: 0 ${margins.left}; display: flex; justify-content: space-between; align-items: center; font-size: 7.5pt; color: ${subtleColor}; border-top: 1px solid ${borderColor}; padding-top: 6px; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
      <span>${footerText}</span>
      <span>Page <span class="pageNumber"></span></span>
    </div>
  `;

  const contentPdfBytes = await contentPage.pdf({
    format: pageFormat,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: {
      top: margins.top,
      bottom: margins.bottom,
      left: margins.left,
      right: margins.right,
    },
  });
  await contentPage.close();

  // ---- Merge ----
  console.log('  Merging title + content...');
  const mergedPdfBytes = await mergePdfs(titlePdfBytes, contentPdfBytes);
  fs.writeFileSync(outputPath, mergedPdfBytes);
  console.log(`  PDF saved: ${outputPath}`);
  return true;
}

// ===== Main entry point =====
export async function generate(config, configDir, options = {}) {
  const { docFilter } = options;

  console.log('Planish PDF Generator');
  console.log('='.repeat(50));

  const assets = loadAssets(config, configDir);
  const templatePath = path.join(__dirname, 'template.html');
  const rawTemplate = fs.readFileSync(templatePath, 'utf-8');
  const styledTemplate = injectCssVars(rawTemplate, config);

  // Filter documents
  let documents = config.documents || [];
  if (docFilter) {
    documents = documents.filter(
      (d) => d.name.toLowerCase() === docFilter.toLowerCase()
    );
    if (documents.length === 0) {
      console.error(`No document found matching "${docFilter}"`);
      console.error(
        'Available documents:',
        (config.documents || []).map((d) => d.name).join(', ')
      );
      process.exit(1);
    }
  }

  if (documents.length === 0) {
    console.log('No documents configured. Add entries to the "documents" array in planish.config.mjs');
    return;
  }

  console.log(`\nGenerating ${documents.length} document(s)...`);
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let successCount = 0;
  for (const doc of documents) {
    console.log(`\nProcessing: ${doc.name}`);
    console.log('-'.repeat(40));

    const ok = await generateDocument(browser, doc, config, configDir, assets, styledTemplate);
    if (ok) successCount++;
  }

  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log(`Done! ${successCount}/${documents.length} PDFs generated successfully.`);
}
