/**
 * Planish — LaTeX-based PDF Generator
 *
 * Uses Pandoc + XeLaTeX to convert markdown to PDF with custom branding.
 * This is an alternative to the Puppeteer path for environments that
 * have pandoc and xelatex installed.
 *
 * Gracefully skips if prerequisites are not available.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Check if a command exists =====
function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ===== Resolve asset path relative to config directory =====
function resolveAsset(assetPath, configDir) {
  if (!assetPath) return null;
  if (path.isAbsolute(assetPath)) return assetPath;
  return path.resolve(configDir, assetPath);
}

// ===== Convert hex color to LaTeX-friendly format =====
function hexToLatexColor(hex) {
  return hex.replace('#', '');
}

// ===== Build footer text from doc config =====
function buildFooterText(doc, config) {
  const year = new Date().getFullYear();
  const holder = config.brand?.copyrightHolder || config.brand?.name || 'Company';
  let text = `\\u00A9 ${year} ${holder}`;
  if (doc.confidential) {
    text += ' | CONFIDENTIAL';
  }
  if (doc.internal) {
    text += ' --- Not for Customer Distribution';
  }
  return text;
}

// ===== Generate LaTeX template dynamically =====
function buildLatexTemplate(config, fontsDir) {
  const c = config.colors || {};
  const page = config.page || {};
  const format = page.format === 'A4' ? 'a4paper' : 'letterpaper';
  const m = page.margins || { top: '0.9in', bottom: '0.8in', left: '0.75in', right: '0.75in' };

  return `%% Planish LaTeX Template (auto-generated)
\\documentclass[11pt,${format}]{article}

% ===== Encoding & Fonts =====
\\usepackage{fontspec}
\\setmainfont{Ubuntu}[
  Path = ${fontsDir}/,
  Extension = .ttf,
  UprightFont = Ubuntu-Regular,
  BoldFont = Ubuntu-Bold,
  ItalicFont = Ubuntu-Italic,
  BoldItalicFont = Ubuntu-BoldItalic,
]
\\setmonofont{IBMPlexMono}[
  Path = ${fontsDir}/,
  Extension = .ttf,
  UprightFont = IBMPlexMono-Regular,
  BoldFont = IBMPlexMono-Bold,
  ItalicFont = IBMPlexMono-Italic,
  BoldItalicFont = IBMPlexMono-BoldItalic,
  Scale=0.85,
]

% ===== Page Geometry =====
\\usepackage[
  ${format},
  left=${m.left},
  right=${m.right},
  top=${m.top},
  bottom=${m.bottom},
  headheight=30pt,
  headsep=12pt,
  footskip=30pt,
]{geometry}

% ===== Core Packages =====
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{longtable}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{colortbl}
\\usepackage{tcolorbox}
\\usepackage{listings}
\\usepackage{calc}
\\usepackage{etoolbox}
\\usepackage{float}
\\usepackage{microtype}
\\usepackage{parskip}

\\tcbuselibrary{listings,breakable,skins}

% ===== Brand Colors =====
\\definecolor{brandheading}{HTML}{${hexToLatexColor(c.heading || '#3b4e59')}}
\\definecolor{brandteal}{HTML}{${hexToLatexColor(c.h3 || '#4cbfb5')}}
\\definecolor{brandcyan}{HTML}{${hexToLatexColor(c.h2Border || '#0fb6e6')}}
\\definecolor{brandgreen}{HTML}{${hexToLatexColor((c.titleGradient || [])[0] || '#6dc04b')}}
\\definecolor{brandgold}{HTML}{${hexToLatexColor(c.h4 || '#f3ae18')}}
\\definecolor{brandblue}{HTML}{${hexToLatexColor((c.titleGradient || [])[3] || '#008dd3')}}
\\definecolor{brandsubtle}{HTML}{${hexToLatexColor(c.subtle || '#697d90')}}
\\definecolor{brandmuted}{HTML}{${hexToLatexColor(c.muted || '#8f8f8f')}}
\\definecolor{brandrule}{HTML}{${hexToLatexColor(c.tableBorder || '#e3eaef')}}
\\definecolor{codebg}{HTML}{${hexToLatexColor(c.codeBackground || '#1e2a33')}}
\\definecolor{codefg}{HTML}{${hexToLatexColor(c.codeText || '#e6edf3')}}
\\definecolor{inlinecodebg}{HTML}{${hexToLatexColor(c.inlineCodeBackground || '#eef2f5')}}
\\definecolor{blockquotebg}{HTML}{${hexToLatexColor(c.calloutBackground || '#f0faf9')}}
\\definecolor{stripebg}{HTML}{${hexToLatexColor(c.tableStripe || '#f7fafb')}}
\\definecolor{tableheaderbg}{HTML}{${hexToLatexColor(c.tableHeader || '#3b4e59')}}

% ===== Hyperlinks =====
\\hypersetup{
  colorlinks=true,
  linkcolor=brandcyan,
  urlcolor=brandcyan,
  citecolor=brandcyan,
  pdfborder={0 0 0},
}

% ===== Paragraph Spacing =====
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt plus 2pt minus 1pt}

% ===== Header & Footer =====
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\fancyfoot[L]{%
  \\footnotesize\\color{brandsubtle}$footer-text$%
}
\\fancyfoot[R]{%
  \\footnotesize\\color{brandsubtle}Page \\thepage%
}
\\renewcommand{\\footrule}{%
  {\\color{brandrule}\\hrule width\\textwidth height 0.5pt}%
  \\vskip 6pt%
}

% ===== Heading Styles =====
\\titleformat{\\section}
  {\\fontsize{20pt}{24pt}\\selectfont\\bfseries\\color{brandheading}}
  {}{0pt}{}

\\titleformat{\\subsection}
  {\\fontsize{16pt}{20pt}\\selectfont\\bfseries\\color{brandheading}}
  {}{0pt}{}
  [{\\color{brandcyan}\\titlerule[2.5pt]}]

\\titlespacing*{\\subsection}{0pt}{0pt}{14pt}

\\newbool{firstsubsection}
\\booltrue{firstsubsection}
\\let\\origsubsection\\subsection
\\renewcommand{\\subsection}[1]{%
  \\ifbool{firstsubsection}{%
    \\boolfalse{firstsubsection}%
  }{%
    \\clearpage%
  }%
  \\origsubsection{#1}%
}

\\titleformat{\\subsubsection}
  {\\fontsize{13pt}{16pt}\\selectfont\\bfseries\\color{brandteal}}
  {}{0pt}{}
\\titlespacing*{\\subsubsection}{0pt}{22pt}{10pt}

\\titleformat{\\paragraph}
  {\\fontsize{11pt}{14pt}\\selectfont\\bfseries\\color{brandgold}}
  {}{0pt}{}
\\titlespacing*{\\paragraph}{0pt}{18pt}{8pt}

\\titleformat{\\subparagraph}
  {\\fontsize{10pt}{13pt}\\selectfont\\bfseries\\color{brandheading}}
  {}{0pt}{}
\\titlespacing*{\\subparagraph}{0pt}{14pt}{6pt}

% ===== Code Blocks =====
\\lstset{
  basicstyle=\\ttfamily\\small\\color{codefg},
  backgroundcolor=\\color{codebg},
  breaklines=true,
  breakatwhitespace=false,
  columns=fullflexible,
  keepspaces=true,
  showstringspaces=false,
  tabsize=2,
  frame=none,
  xleftmargin=14pt,
  xrightmargin=14pt,
  aboveskip=10pt,
  belowskip=10pt,
  keywordstyle=\\color[HTML]{ff7b72},
  stringstyle=\\color[HTML]{a5d6ff},
  commentstyle=\\color[HTML]{8b949e}\\itshape,
  numberstyle=\\color[HTML]{8b949e},
}

\\newtcolorbox{codeblock}{
  colback=codebg,
  colframe=codebg,
  sharp corners,
  boxrule=0pt,
  left=14pt,
  right=14pt,
  top=12pt,
  bottom=12pt,
  breakable,
}

% ===== Inline Code =====
\\let\\oldtexttt\\texttt
\\renewcommand{\\texttt}[1]{%
  \\colorbox{inlinecodebg}{\\oldtexttt{\\small\\color{brandheading}#1}}%
}

% ===== Blockquotes =====
\\newtcolorbox{planishquote}{
  colback=blockquotebg,
  colframe=brandteal,
  leftrule=4pt,
  rightrule=0pt,
  toprule=0pt,
  bottomrule=0pt,
  sharp corners=east,
  arc=4pt,
  left=12pt,
  right=12pt,
  top=8pt,
  bottom=8pt,
  breakable,
  fontupper=\\small\\color{brandheading},
}

\\renewenvironment{quote}
  {\\begin{planishquote}}
  {\\end{planishquote}}

% ===== Tables =====
\\arrayrulecolor{brandrule}
\\newcounter{tablerow}

% ===== Lists =====
\\setlist{
  topsep=4pt,
  itemsep=2pt,
  parsep=1pt,
  leftmargin=22pt,
}
\\setlist[itemize,1]{label=\\textbullet}
\\setlist[itemize,2]{label=--}

% ===== Horizontal Rules =====
\\newcommand{\\planishhr}{%
  {\\color{brandrule}\\hrule height 1.5pt}%
  \\vskip 10pt%
}

% ===== Tight list support =====
\\providecommand{\\tightlist}{%
  \\setlength{\\itemsep}{2pt}\\setlength{\\parskip}{0pt}%
}

\\newcommand{\\passmark}[1]{#1}

\\makeatletter
\\def\\maxwidth{\\ifdim\\Gin@nat@width>\\linewidth\\linewidth\\else\\Gin@nat@width\\fi}
\\def\\maxheight{\\ifdim\\Gin@nat@height>\\textheight\\textheight\\else\\Gin@nat@height\\fi}
\\makeatother
\\setkeys{Gin}{width=\\maxwidth,height=\\maxheight,keepaspectratio}

% ===== Document =====
\\begin{document}

% ===== Title Page =====
\\thispagestyle{empty}

\\begin{tikzpicture}[remember picture,overlay]
  \\shade[top color=brandgreen, bottom color=brandblue,
    middle color=brandteal]
    ([xshift=-6pt]current page.north east) rectangle
    ([xshift=0pt]current page.south east);
\\end{tikzpicture}

\\vspace*{-0.6in}

\\vfill

\\begin{center}
  \\vspace{24pt}

  \\begin{tikzpicture}
    \\shade[left color=brandgreen, right color=brandcyan,
      middle color=brandteal]
      (0,0) rectangle (10cm, 2pt);
  \\end{tikzpicture}

  \\vspace{10pt}

  {\\fontsize{22pt}{28pt}\\selectfont\\bfseries\\color{brandheading}$title$\\par}

  \\vspace{4pt}

  {\\fontsize{11pt}{14pt}\\selectfont\\color{brandsubtle}$subtitle$\\par}

  \\vspace{10pt}

  \\begin{tikzpicture}
    \\shade[left color=brandgreen, right color=brandcyan,
      middle color=brandteal]
      (0,0) rectangle (10cm, 2pt);
  \\end{tikzpicture}

  \\vspace{30pt}

  {\\fontsize{9pt}{12pt}\\selectfont\\color{brandsubtle}$tagline$\\par}
\\end{center}

\\vfill

\\begin{center}
  {\\fontsize{7.5pt}{10pt}\\selectfont\\color{brandmuted}$footer-text$\\par}
\\end{center}

\\clearpage

% ===== Content =====
$body$

\\end{document}
`;
}

// ===== Generate a single document via LaTeX =====
function generateLatexDocument(doc, config, configDir, fontsDir) {
  const inputPath = resolveAsset(doc.input, configDir);
  const outputPath = resolveAsset(doc.output, configDir);
  const footerText = buildFooterText(doc, config);
  const tagline = config.brand?.tagline || '';

  if (!fs.existsSync(inputPath)) {
    console.error(`  ERROR: File not found: ${inputPath}`);
    return false;
  }

  // Generate template
  const template = buildLatexTemplate(config, fontsDir);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planish-'));
  const templatePath = path.join(tmpDir, 'template.tex');
  fs.writeFileSync(templatePath, template);

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('  Running pandoc...');
  try {
    execSync(
      `pandoc "${inputPath}" ` +
        `--from markdown ` +
        `--to latex ` +
        `--template "${templatePath}" ` +
        `--pdf-engine=xelatex ` +
        `--variable "title=${doc.title}" ` +
        `--variable "subtitle=${doc.subtitle || ''}" ` +
        `--variable "footer-text=${footerText}" ` +
        `--variable "tagline=${tagline}" ` +
        `--output "${path.join(tmpDir, 'document.tex')}"`,
      { stdio: 'pipe' }
    );

    console.log('  Running xelatex (pass 1)...');
    execSync(
      `cd "${tmpDir}" && xelatex -interaction=nonstopmode -halt-on-error document.tex`,
      { stdio: 'pipe' }
    );

    console.log('  Running xelatex (pass 2)...');
    execSync(
      `cd "${tmpDir}" && xelatex -interaction=nonstopmode -halt-on-error document.tex`,
      { stdio: 'pipe' }
    );

    const pdfPath = path.join(tmpDir, 'document.pdf');
    if (fs.existsSync(pdfPath)) {
      fs.copyFileSync(pdfPath, outputPath);
      console.log(`  PDF saved: ${outputPath}`);
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return true;
    } else {
      console.error('  ERROR: PDF was not generated.');
      return false;
    }
  } catch (err) {
    console.error(`  ERROR: LaTeX generation failed: ${err.message}`);
    return false;
  }
}

// ===== Main entry point =====
export async function generateLatex(config, configDir, options = {}) {
  const { docFilter } = options;

  // Check prerequisites
  if (!commandExists('pandoc')) {
    console.log('LaTeX generation skipped: pandoc is not installed.');
    console.log('Install with: brew install pandoc');
    return;
  }

  let hasXelatex = commandExists('xelatex');
  if (!hasXelatex) {
    // Check MacTeX path
    try {
      execSync('test -d /Library/TeX/texbin', { stdio: 'pipe' });
      process.env.PATH = `/Library/TeX/texbin:${process.env.PATH}`;
      hasXelatex = true;
    } catch {
      // not available
    }
  }

  if (!hasXelatex) {
    console.log('LaTeX generation skipped: xelatex is not installed.');
    console.log('Install with: brew install --cask mactex');
    return;
  }

  console.log('Planish LaTeX PDF Generator');
  console.log('='.repeat(50));

  const fontsDir = path.join(__dirname, '..', 'fonts');

  let documents = config.documents || [];
  if (docFilter) {
    documents = documents.filter(
      (d) => d.name.toLowerCase() === docFilter.toLowerCase()
    );
    if (documents.length === 0) {
      console.error(`No document found matching "${docFilter}"`);
      return;
    }
  }

  console.log(`\nGenerating ${documents.length} document(s) via LaTeX...`);

  let successCount = 0;
  for (const doc of documents) {
    console.log(`\nProcessing: ${doc.name}`);
    console.log('-'.repeat(40));

    const ok = generateLatexDocument(doc, config, configDir, fontsDir);
    if (ok) successCount++;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Done! ${successCount}/${documents.length} LaTeX PDFs generated.`);
}
