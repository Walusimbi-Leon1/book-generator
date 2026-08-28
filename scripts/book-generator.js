#!/usr/bin/env node
/**
 * Book Generator Concept Script — runs in GitHub Actions (book-generator.yml).
 *
 * Calls opencode.ai (big-pickle) to generate a NEW book concept:
 *   - International appeal (universal themes, no region/race lock-in)
 *   - Varied genres (literary fiction, romance, philosophy, sci-fi, fantasy,
 *     historical, magical realism, etc.) — rotated each run
 *   - Title + subtitle + logline + style directions
 *   - Author = Walusimbi Leon
 *
 * Outputs (GH Actions step outputs):
 *   repo, title, subtitle, description, genre, style, characters, setting, notes
 */

const { execSync } = require("child_process");
const https = require("https");
const { URL } = require("url");

const BASE_URL = process.env.OPENCODE_BASE_URL || "https://opencode.ai/zen/v1";
const MODEL = process.env.MODEL || "big-pickle";
const API_KEY = process.env.OPENCODE_API_KEY;
if (!API_KEY) {
  console.error("❌ OPENCODE_API_KEY not set");
  process.exit(1);
}

// Rotate a fresh genre each invocation so the generator doesn't spam one type.
const GENRES = [
  "Literary fiction", "Romance (international, cross-cultural)", "Philosophical fiction",
  "Science fiction (humanist / soft)", "Fantasy (literary / low-magic)",
  "Historical fiction (any era, global setting)", "Magical realism", "Mystery (literary / atmospheric)",
  "Psychological thriller (slow-burn, character-driven)", "Contemporary literary drama",
  "Epistolary novel", "Short story cycle (linked)", "Mythic retelling (global folklore)",
  "Speculative literary fiction", "Adventure literary fiction"
];
const genre = GENRES[Math.floor(Math.random() * GENRES.length)];

const SYSTEM =
  `You are a creative director of international literature. Your job is to conceive a brand-new book that could be loved everywhere on Earth — transcending any single culture, race, or region. The author is Walusimbi Leon. Output STRICT JSON only (no markdown, no intro prose).`;

const USER =
`Pick a genre for this round: "${genre}".

Conceive an original, internationally-appealing book idea that a global readership would love.
Think of a fresh premise — not retreading tropes — anchored in a universal human experience
(love, loss, belonging, growth, moral choice, wonder, reconciliation, etc.).

Generate a JSON object with these fields (all values are strings):
{
  "title": "a compelling, memorable title (no subtitle)",
  "subtitle": "a short subtitle or tagline, or empty string",
  "genre": "the genre string above, refined",
  "description": "logline + brief synopsis — 3–5 sentences, international scope, no place/character names unless universal",
  "style": "prose style guidance — tense, POV, tone, rhythm (e.g. 'Introspective third-person, present tense, lyrical and spare')",
  "characters": "2–4 core character archetypes (roles/descriptions, not region-locked names)",
  "setting": "international / timeless / 'a port city', 'between seasons', etc. — avoid pinning to one country",
  "notes": "2–3 sentences of directorial guidance for the writer: what emotional arc to hit, themes to weave, atmosphere to sustain",
  "repo": "a kebab-case repo slug derived from the title — lowercase, a–z0-9-hyphens, max 6 words, e.g. 'the-weight-of-rain'"
}

Do NOT repeat an existing Walusimbi-Leon1 book. Be original. Output ONLY the JSON object.`;

async function generate() {
  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: USER }],
    temperature: 0.95,
    max_tokens: 2048,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/chat/completions`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error(`opencode.ai ${res.statusCode}: ${data.slice(0, 300)}`));
        const parsed = JSON.parse(data);
        const content = (parsed.choices?.[0]?.message?.content || "").trim();
        resolve(content);
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const raw = await generate();
    let json;
    try {
      const cleaned = raw.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
      json = JSON.parse(cleaned);
    } catch (e) {
      console.error("❌ Failed to parse JSON from model:");
      console.error(raw);
      process.exit(1);
    }

    // Validate required fields
    const required = ["title", "subtitle", "genre", "description", "style", "characters", "setting", "notes", "repo"];
    for (const f of required) {
      if (json[f] === undefined || json[f] === null) {
        console.error(`❌ Missing field: ${f}`);
        console.error(JSON.stringify(json, null, 2));
        process.exit(1);
      }
    }

    // Validate repo slug
    if (!/^[a-z0-9-]+$/.test(json.repo) || json.repo.length > 60) {
      console.error(`❌ Invalid repo slug: ${json.repo}`);
      process.exit(1);
    }

    console.log("✅ Concept generated:");
    console.log(JSON.stringify(json, null, 2));

    // Emit as GH Actions step outputs (coerce all to strings, skip nulls)
    const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;
    if (GITHUB_OUTPUT) {
      const fs = require("fs");
      const out = Object.entries(json)
        .map(([k, v]) => `${k}=${String(v).replace(/\"/g, '\\"')}`)
        .join("\n") + "\n";
      fs.appendFileSync(GITHUB_OUTPUT, out);
    } else {
      // Local debug: just print
      Object.entries(json).forEach(([k, v]) => console.log(`${k}=${v}`));
    }
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
})();
