#!/usr/bin/env node
/**
 * Seed Book Repo Script — runs in GitHub Actions (book-generator.yml).
 *
 * Takes the generated concept (passed via env) and:
 *   1. Clones the sgss-template/book-binder template repo
 *   2. Replaces placeholders with real book content (book.config.json,
 *      README.md, LICENSE, scripts/write-book.js)
 *   3. Sets the required GitHub Actions secrets on the new repo so its
 *      3-day writing workflow can run
 *   4. Commits + pushes to main on the newly-created repo
 *   5. The seeded write-book.yml (cron every 3 days) then writes a new
 *      chapter every 3 days — same pipeline as the 17 existing book repos.
 *
 * This guarantees the new book auto-writes itself on schedule with no
 * further intervention.
 */

const { execSync } = require("child_process");
const fs = require("fs");

const { REPO: REPO_ENV, GH_TOKEN, GH_PAT } = process.env;
const REPO_ARG = (() => {
  const a = process.argv.find((x) => x.startsWith("--repo="));
  return a ? a.slice("--repo=".length) : undefined;
})();
const REPO = REPO_ENV || REPO_ARG;
const {
  BOOK_TITLE, BOOK_SUBTITLE, BOOK_GENRE, BOOK_DESCRIPTION,
  BOOK_STYLE, BOOK_CHARACTERS, BOOK_SETTING, BOOK_NOTES,
  OPENCODE_API_KEY, OPENCODE_API_KEY_2, OPENCODE_API_KEY_3,
  OPENCODE_API_KEY_4, OPENCODE_API_KEY_5, GH_PUSH_TOKEN,
} = process.env;

if (!REPO || !GH_TOKEN) {
  console.error("❌ REPO and GH_TOKEN env vars are required");
  process.exit(1);
}

const OWNER = "Walusimbi-Leon1";
const REPO_URL = `https://x-access-token:${GH_TOKEN}@github.com/${OWNER}/${REPO}.git`;

// ── Helper: set a GitHub Actions secret on the new repo ───────────
// Uses gh CLI (authed via GH_PAT) which handles encryption automatically.
function setSecret(name, value) {
  if (!value) { console.log(`⚠️  Skipping empty secret: ${name}`); return; }
  try {
    execSync(
      `gh secret set ${name} -b"${value.replace(/"/g, '\\"')}" -R ${OWNER}/${REPO}`,
      { stdio: "inherit", env: { ...process.env, GH_TOKEN: GH_PAT } }
    );
    console.log(`✅ Secret set: ${name}`);
  } catch (e) {
    console.error(`⚠️  Failed to set secret ${name}: ${e.message}`);
  }
}

// ── Clone template ─────────────────────────────────────────────────
console.log(`Cloning template: Walusimbi-Leon1/sgss-template`);
const tmpDir = `/tmp/seed-${REPO}-${Date.now()}`;
execSync(`git clone https://x-access-token:${GH_TOKEN}@github.com/Walusimbi-Leon1/sgss-template.git ${tmpDir}`, {
  stdio: "inherit",
});
process.chdir(tmpDir);

// ── Write book.config.json ─────────────────────────────────────────
const config = {
  title: BOOK_TITLE,
  subtitle: BOOK_SUBTITLE,
  genre: BOOK_GENRE,
  author: "Walusimbi Leon (SGSS)",
  description: BOOK_DESCRIPTION,
  style: BOOK_STYLE,
  characters: BOOK_CHARACTERS,
  setting: BOOK_SETTING,
  notes: BOOK_NOTES,
  chapterTitle: "Chapter",
  mdFiles: ["book.md"],
  htmlFiles: ["book.html"],
  indexInject: null,
  mdHeadingLevel: 2,
  targetWords: 2000,
  apiTimeoutMs: 600000,
  maxTokens: 16384,
};
fs.writeFileSync("book.config.json", JSON.stringify(config, null, 2));
console.log("✅ book.config.json written");

// ── Write a seed book.md (opening chapter) ─────────────────────────
const seedChapter = `## ${BOOK_TITLE}\n\n${BOOK_DESCRIPTION.replace(/^(.{0,300}).*$/s, "$1")}\n`;
fs.writeFileSync("book.md", seedChapter);
console.log("✅ book.md seeded");

// ── Write book.html (styled page) ─────────────────────────────────
const htmlSkeleton = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BOOK_TITLE} — Walusimbi Leon</title>
  <meta name="description" content="${BOOK_DESCRIPTION.replace(/"/g, "&quot;")}">
  <style>
    :root { --bg:#0f172a; --text:#e2e8f0; --accent:#cbd5e1; --link:#38bdf8; --border:#334155; }
    * { box-sizing: border-box; }
    body { font-family:'Georgia','Times New Roman',serif; background:var(--bg); color:var(--text); line-height:1.7; max-width:720px; margin:0 auto; padding:2rem 1rem; }
    h1,h2,h3 { color:var(--accent); font-weight:500; }
    h1 { font-size:2.2rem; border-bottom:1px solid var(--border); padding-bottom:.5rem; }
    h2 { font-size:1.4rem; margin-top:2rem; }
    p { margin:1rem 0; }
    a { color:var(--link); }
    .author,.footer,.support-box { color:#94a3b8; font-size:.9rem; }
    .book-section { margin:2rem 0; }
    @media (max-width:600px){ body{padding:1rem .5rem;} }
  </style>
</head>
<body>
  <h1>${BOOK_TITLE}</h1>
  ${BOOK_SUBTITLE ? `<p class="subtitle"><em>${BOOK_SUBTITLE}</em></p>` : ""}
  <div class="book-section"><p><em>${BOOK_DESCRIPTION}</em></p></div>
  <div class="about">
    <h2>About This Book</h2>
    <p><strong>Genre:</strong> ${BOOK_GENRE}</p>
    <p><strong>Style:</strong> ${BOOK_STYLE}</p>
    <p><strong>Setting:</strong> ${BOOK_SETTING}</p>
    <p><strong>Characters:</strong> ${BOOK_CHARACTERS}</p>
    <p><strong>Author:</strong> Walusimbi Leon (SGSS)</p>
  </div>
  <div class="footer">
    <hr>
    <p><em>${BOOK_NOTES}</em></p>
    <p><strong>Author:</strong> Walusimbi Leon (SGSS)</p>
    <p class="support-box">This book is part of the <a href="https://github.com/Walusimbi-Leon1">SGSS Literary Collection</a>. Free to read, share, and distribute under <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>.</p>
  </div>
</body>
</html>`;
fs.writeFileSync("book.html", htmlSkeleton);
console.log("✅ book.html written");

// ── Write README.md ────────────────────────────────────────────────
const readme = `# ${BOOK_TITLE}\n\n**A book by Walusimbi Leon (SGSS)**\n\n## About\n\n${BOOK_DESCRIPTION}\n\n## Auto-Writing Pipeline\n\nThis book is written automatically — a new chapter (~2,000 words) is generated every 3 days via GitHub Actions + big-pickle on opencode.ai. The pipeline lives in [\`.github/workflows/write-book.yml\`](./.github/workflows/write-book.yml).\n\n## Read Online\n\n- 📖 HTML: https://walusimbi-leon1.github.io/${REPO}/book.html\n- 📥 PDF: https://walusimbi-leon1.github.io/${REPO}/book.pdf *(generated separately)*\n\n## License\n\n[CC0 1.0 Universal](LICENSE) — free to read, share, and distribute.\n`;
fs.writeFileSync("README.md", readme);
console.log("✅ README.md written");

// ── Copy canonical write-book.js ──────────────────────────────────
try {
  execSync(
    `curl -sSL https://raw.githubusercontent.com/Walusimbi-Leon1/under-the-acacia-tree/main/scripts/write-book.js -o scripts/write-book.js`,
    { stdio: "inherit" }
  );
  console.log("✅ scripts/write-book.js copied (canonical)");
} catch (e) {
  console.error("⚠️  Could not fetch canonical write-book.js — using template version");
}

// ── Ensure write-book.yml has the 3-day cron ──────────────────────
const wfPath = ".github/workflows/write-book.yml";
let wf = "";
try { wf = fs.readFileSync(wfPath, "utf8"); } catch { /* none in template */ }
if (!wf.includes("*/3")) {
  const canonicalWf = `name: Book Writing

on:
  schedule:
    - cron: "0 6 */3 * *"
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: daily-book-writing
  cancel-in-progress: false

jobs:
  write:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Write next chapter
        run: node scripts/write-book.js
        env:
          OPENCODE_API_KEY:   \${{ secrets.OPENCODE_API_KEY }}
          OPENCODE_API_KEY_2: \${{ secrets.OPENCODE_API_KEY_2 }}
          OPENCODE_API_KEY_3: \${{ secrets.OPENCODE_API_KEY_3 }}
          OPENCODE_API_KEY_4: \${{ secrets.OPENCODE_API_KEY_4 }}
          OPENCODE_API_KEY_5: \${{ secrets.OPENCODE_API_KEY_5 }}
          GH_PUSH_TOKEN:      \${{ secrets.GH_PUSH_TOKEN }}
          MODEL: big-pickle
`;
  fs.mkdirSync(".github/workflows", { recursive: true });
  fs.writeFileSync(wfPath, canonicalWf);
  console.log("✅ write-book.yml written (3-day cron)");
}

// ── Set secrets on the new repo (so 3-day writer can run) ─────────
console.log("— Setting secrets on new repo —");
setSecret("OPENCODE_API_KEY", OPENCODE_API_KEY);
setSecret("OPENCODE_API_KEY_2", OPENCODE_API_KEY_2);
setSecret("OPENCODE_API_KEY_3", OPENCODE_API_KEY_3);
setSecret("OPENCODE_API_KEY_4", OPENCODE_API_KEY_4);
setSecret("OPENCODE_API_KEY_5", OPENCODE_API_KEY_5);
setSecret("GH_PUSH_TOKEN", GH_PUSH_TOKEN);

// ── Commit + push ──────────────────────────────────────────────────
execSync("git add -A");
execSync(
  `git -c user.name="SGSS Books Bot" -c user.email="walusimbileon3@gmail.com" commit -m "📚 Seeded new book: ${BOOK_TITLE}"`,
  { stdio: "inherit" }
);
execSync(`git -c "http.https://github.com/.extraheader=" push ${REPO_URL} HEAD:main`, { stdio: "inherit" });
console.log(`✅ Pushed first commit to Walusimbi-Leon1/${REPO}`);
console.log(`📖 ${BOOK_TITLE} is now live and will write its next chapter in 3 days.`);
