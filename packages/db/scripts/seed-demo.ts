// Seeds the database with a realistic demo library so the web app has
// content to design against. Idempotent: rows conflict on canonical_url
// and are skipped on re-run. Usage: bun run db:seed
import type { IntentId } from "@lobe/shared";
import { INTENT_IDS } from "@lobe/shared";

import { closeDatabase, db } from "../src/client";
import { saves, type NewSaveRow } from "../src/schema";

interface DemoEntry {
  intent: IntentId | null;
  text: string;
  summary?: string;
  topics?: string[];
  review?: boolean;
  failed?: boolean;
  image?: number;
}

const whyPool = [
  "You save a lot of pragmatic infrastructure content.",
  "Matches your recurring interest in dark, dense UI.",
  "You keep returning to posts about shipping small and fast.",
  "Similar to other tooling posts you marked as useful.",
  "You often save concrete numbers and benchmarks.",
  "Fits the product-inspiration pattern in your library.",
];

const authors = [
  { name: "Ana Fischer", handle: "@anafis", avatar: 47 },
  { name: "Dev Patel", handle: "@devbuilds", avatar: 12 },
  { name: "Marta Silva", handle: "@martacss", avatar: 32 },
  { name: "Ken Watanabe", handle: "@kenwtnb", avatar: null },
  { name: "Lea Kim", handle: "@leakim_", avatar: 5 },
  { name: "Tom Osei", handle: "@tomosei", avatar: null },
  { name: "Priya Nair", handle: "@priyaships", avatar: 25 },
  { name: "Jonas Berg", handle: "@jonasberg", avatar: null },
  { name: "Sara Haddad", handle: "@sarabuilds", avatar: 20 },
  { name: "Miguel Torres", handle: "@migueldev", avatar: null },
  { name: "Yuki Tanaka", handle: "@yukicodes", avatar: 44 },
  { name: "Nina Petrova", handle: "@ninapetrova", avatar: null },
] as const;

const entries: DemoEntry[] = [
  {
    intent: "try",
    text: "Cursor's new agent mode can refactor an entire package from a single prompt. Trying this on our worst legacy module tomorrow.",
    summary: "Try agent-mode refactoring on a legacy package.",
    topics: ["ai tooling", "dev workflow"],
    image: 380,
  },
  {
    intent: "learn",
    text: "How HNSW actually works, explained with diagrams that finally make the graph layers click. Best vector search explainer I've seen.",
    summary: "Visual explainer of HNSW vector indexes.",
    topics: ["vector search", "postgres"],
    review: true,
  },
  {
    intent: "build",
    text: "This onboarding flow is 4 screens, zero text inputs, and converts at 60%. Every step is a single tap. Study it.",
    summary: "Zero-input onboarding flow converting at 60%.",
    topics: ["onboarding", "product"],
    image: 460,
  },
  {
    intent: "reference",
    text: "The complete list of macOS defaults commands I run on every fresh machine. Dock, screenshots, key repeat, Finder, all of it.",
    summary: "macOS defaults setup checklist.",
    topics: ["macos", "setup"],
  },
  {
    intent: "buy",
    text: "The Keychron Q1 HE with hall effect switches is finally in stock. Adjustable actuation and rapid trigger for $189.",
    summary: "Keychron Q1 HE keyboard, $189.",
    topics: ["keyboards", "gear"],
    image: 340,
  },
  {
    intent: "share",
    text: "The 'boring technology' talk is still the best engineering strategy essay ever written. Sending this to the team again.",
    summary: "Share the boring-technology essay with the team.",
    topics: ["engineering culture"],
  },
  {
    intent: "learn",
    text: "Thread on why LLM confidence scores are basically uncalibrated out of the box, and what temperature scaling actually fixes.",
    summary: "Why LLM confidence needs calibration.",
    topics: ["ai tooling", "classification"],
  },
  {
    intent: "try",
    text: "TIL you can run Postgres in the browser with pglite. WASM build, persists to IndexedDB. Perfect for local-first demos.",
    summary: "Try pglite for in-browser Postgres demos.",
    topics: ["postgres", "local-first"],
    review: true,
  },
  {
    intent: "build",
    text: "A tiny CLI that turns any OpenAPI spec into typed fetch clients with zero runtime deps. We should build this for our stack.",
    summary: "Build a typed fetch client generator.",
    topics: ["typescript", "codegen"],
  },
  {
    intent: null,
    text: "Just spent 3 hours debugging a timezone bug that was actually a daylight saving bug. Ask me anything.",
  },
  {
    intent: "learn",
    text: "The best explanation of CRDTs I've read. Last-write-wins is quietly destroying more user data than you think.",
    summary: "CRDT fundamentals and LWW pitfalls.",
    topics: ["distributed systems", "local-first"],
    image: 420,
  },
  {
    intent: "reference",
    text: "Cheat sheet: every Postgres index type (btree, GIN, GiST, BRIN, HNSW) and when each one actually helps.",
    summary: "Postgres index type selection table.",
    topics: ["postgres", "performance"],
  },
  {
    intent: "buy",
    text: "This 27\" 5K monitor is $499 refurbished and it's basically a Studio Display without the webcam. Text rendering is identical.",
    summary: "Refurb 5K monitor, $499.",
    topics: ["gear", "displays"],
    image: 360,
  },
  {
    intent: "try",
    text: "The pomodoro variant that finally stuck for me: 90 minute blocks, no timer sounds, phone in another room. That's it.",
    summary: "Try 90-minute deep work blocks.",
    topics: ["productivity"],
  },
  {
    intent: "share",
    text: "This visualization of how compound interest destroys credit card debt needs to be shown in every school.",
    summary: "Share the compound interest debt visual.",
    topics: ["finance"],
    image: 400,
  },
  {
    intent: "build",
    text: "Love how Linear does command menu onboarding: it teaches you shortcuts contextually while you work instead of a tour.",
    summary: "Contextual shortcut teaching like Linear.",
    topics: ["onboarding", "keyboard ux"],
    review: true,
  },
  {
    intent: "learn",
    text: "io_uring explained for people who stopped reading at epoll. Worth twenty minutes of your life if you touch servers.",
    summary: "io_uring beyond epoll.",
    topics: ["linux", "performance"],
  },
  {
    intent: "reference",
    text: "A single page with every OG image size, favicon format, and web manifest field you actually need in 2026.",
    summary: "Meta image and favicon spec sheet.",
    topics: ["web", "seo"],
  },
  {
    intent: "try",
    text: "Bun's built-in test runner is fast enough that I stopped configuring anything else. `bun test`, done, 40ms.",
    summary: "Switch test running to plain bun test.",
    topics: ["bun", "testing"],
  },
  {
    intent: "buy",
    text: "Aeropress Clear plus the flow-control cap. My travel coffee setup is officially decided.",
    summary: "Aeropress Clear travel setup.",
    topics: ["coffee", "gear"],
    image: 440,
  },
  {
    intent: "learn",
    text: "Why Postgres MVCC means your COUNT(*) is slow, and the three estimation tricks that make dashboards instant.",
    summary: "Fast count strategies under MVCC.",
    topics: ["postgres", "performance"],
  },
  {
    intent: "build",
    text: "The pricing page is one slider and two numbers. Absolute clarity, zero tables. Recreating this for Atom.",
    summary: "Single-slider pricing page for Atom.",
    topics: ["pricing", "product"],
    image: 380,
    review: true,
  },
  {
    intent: "share",
    text: "A perfect 3-minute explanation of why software estimates are always wrong. Sending to every PM I know.",
    summary: "Share the estimates explainer with PMs.",
    topics: ["engineering culture"],
  },
  {
    intent: null,
    text: "The new M5 MacBook Pro benchmarks are out and the efficiency cores are doing something genuinely weird in sustained loads.",
  },
  {
    intent: "learn",
    text: "A visual guide to flexbox gap versus margin collapsing. Bookmarking for the next mystery layout bug.",
    summary: "Flexbox gap vs margin behavior.",
    topics: ["css", "layout"],
  },
  {
    intent: "reference",
    text: "The HTTP status code decision tree, printable version. 409 vs 422 finally settled.",
    summary: "HTTP status decision tree.",
    topics: ["api design"],
  },
  {
    intent: "try",
    text: "This ramen place in Shimokitazawa does a smoked shoyu broth over binchotan. Adding to the November list.",
    summary: "Smoked shoyu ramen spot in Shimokitazawa.",
    topics: ["tokyo", "food"],
    image: 500,
  },
  {
    intent: "build",
    text: "Someone built a $12k MRR product on top of screenshot OCR and spreadsheet export. The bar is on the floor.",
    summary: "OCR-to-spreadsheet micro-SaaS pattern.",
    topics: ["indie", "product"],
  },
  {
    intent: "learn",
    text: "Great breakdown of how X's timeline ranking mixes in-network and out-of-network candidates before scoring.",
    summary: "How X timeline ranking works.",
    topics: ["ranking", "ml"],
    review: true,
  },
  {
    intent: "buy",
    text: "The new Kindle finally has USB-C, warm light, and no lock screen ads by default. Upgrade time.",
    summary: "New Kindle upgrade.",
    topics: ["gear", "reading"],
  },
  {
    intent: "share",
    text: "The Berlin U-Bahn typography documentary is 12 minutes of pure joy. Every station is a different decade.",
    summary: "Share the U-Bahn typography film.",
    topics: ["typography", "design"],
    image: 360,
  },
  {
    intent: "reference",
    text: "All the SF Symbols to Lucide icon name mappings in one gist. Saved me an hour already.",
    summary: "SF Symbols to Lucide mapping.",
    topics: ["icons", "design systems"],
  },
  {
    intent: "try",
    text: "You can apparently fine-tune a decent whisper model on 30 minutes of your own audio. Weekend project unlocked.",
    summary: "Fine-tune whisper on personal audio.",
    topics: ["ai tooling", "audio"],
  },
  {
    intent: "learn",
    text: "The economics of GPU inference: batching, quantization, and why your per-request unit costs are lying to you.",
    summary: "GPU inference cost mechanics.",
    topics: ["ml infra", "costs"],
    image: 400,
  },
  {
    intent: "build",
    text: "This portfolio renders the whole site inside a terminal emulator, tabs and all. Stealing the aesthetic.",
    summary: "Terminal-emulator portfolio concept.",
    topics: ["design", "web"],
  },
  {
    intent: "buy",
    text: "These $30 reference monitors are apparently 90% of speakers ten times the price. Reviews are unanimous.",
    summary: "Budget reference monitors.",
    topics: ["audio", "gear"],
  },
  {
    intent: "learn",
    text: "React Server Components data flow, explained without a single buzzword. The waterfall diagrams are excellent.",
    summary: "RSC data flow explained plainly.",
    topics: ["react", "web"],
  },
  {
    intent: "reference",
    text: "Stripe's guide on SCA edge cases. Saving this before I inevitably need it at 2am during a launch.",
    summary: "Stripe SCA edge case guide.",
    topics: ["payments"],
    review: true,
  },
  {
    intent: "try",
    text: "Tailwind v4 container queries mean I can finally delete half my breakpoint soup. Migrating one component tonight.",
    summary: "Adopt container queries in Tailwind v4.",
    topics: ["css", "tailwind"],
  },
  {
    intent: "share",
    text: "This post on writing better error messages should be required reading. Sharing at standup tomorrow.",
    summary: "Share the error message writing guide.",
    topics: ["ux writing"],
  },
  {
    intent: null,
    text: "Hot take: most 'AI agents' in production are cron jobs with extra steps and a bigger bill.",
    failed: true,
  },
  {
    intent: "learn",
    text: "How SQLite handles concurrent writes and why WAL mode changes everything about what it's good for.",
    summary: "SQLite WAL concurrency model.",
    topics: ["sqlite", "databases"],
    image: 340,
  },
  {
    intent: "build",
    text: "Email digest that summarizes your GitHub notifications with an LLM, grouped by repo and urgency. Weekend build.",
    summary: "LLM-summarized GitHub digest.",
    topics: ["ai tooling", "email"],
  },
  {
    intent: "reference",
    text: "TypeScript utility types explained with exactly one example each. Dense, correct, no fluff.",
    summary: "Utility types quick reference.",
    topics: ["typescript"],
  },
  {
    intent: "try",
    text: "Obsidian canvas as a daily planning board instead of yet another todo app. Two weeks in, feels promising.",
    summary: "Try canvas-based daily planning.",
    topics: ["productivity", "notes"],
    image: 420,
  },
  {
    intent: "buy",
    text: "A standing desk mat that doubles as a balance board. My knees are intrigued and concerned.",
    summary: "Balance board desk mat.",
    topics: ["gear", "health"],
    review: true,
  },
  {
    intent: "learn",
    text: "Everything I believed about font hinting was wrong. This post fixes that, with side-by-side rasterizer output.",
    summary: "Font hinting misconceptions corrected.",
    topics: ["typography", "rendering"],
  },
  {
    intent: "build",
    text: "Their empty states double as product tours. Every blank screen teaches exactly one thing. So good.",
    summary: "Empty states as onboarding surface.",
    topics: ["onboarding", "product"],
    image: 360,
  },
  {
    intent: "share",
    text: "Someone mapped every specialty coffee roaster in Lisbon by roast profile. The group chat needs this immediately.",
    summary: "Share the Lisbon roaster map.",
    topics: ["coffee", "travel"],
  },
  {
    intent: "reference",
    text: "The definitive tailscale plus docker compose networking reference. MagicDNS quirks included.",
    summary: "Tailscale + compose networking guide.",
    topics: ["networking", "homelab"],
  },
  {
    intent: "learn",
    text: "Zod v4 internals: how they made parsing 10x faster without breaking the public API. Great systems writing.",
    summary: "Zod v4 performance internals.",
    topics: ["typescript", "performance"],
  },
  {
    intent: "try",
    text: "Cold brew with a pinch of salt and orange peel. Sounds cursed, allegedly tastes incredible.",
    summary: "Salt and orange peel cold brew.",
    topics: ["coffee"],
    image: 480,
  },
  {
    intent: "build",
    text: "A changelog page that reads like a product story instead of a commit dump. Notion does this so well.",
    summary: "Narrative changelog format.",
    topics: ["product", "writing"],
  },
  {
    intent: "buy",
    text: "Peak Design's new 6L sling. The one-bag people are losing their minds and honestly so am I.",
    summary: "Peak Design 6L sling.",
    topics: ["gear", "travel"],
    image: 400,
  },
  {
    intent: "reference",
    text: "Every ffmpeg one-liner I keep re-googling, collected in one place. Trim, scale, gif, hls, all of it.",
    summary: "ffmpeg one-liner collection.",
    topics: ["video", "cli"],
  },
  {
    intent: "try",
    text: "Deno KV plus queues gives you durable background jobs in about 20 lines. Want to try it for the newsletter scheduler.",
    summary: "Durable jobs on Deno KV.",
    topics: ["deno", "infra"],
    review: true,
  },
  {
    intent: "learn",
    text: "Why your p99 latency is a lie: coordinated omission explained with load test traces.",
    summary: "Coordinated omission in latency metrics.",
    topics: ["performance", "observability"],
  },
  {
    intent: "build",
    text: "Figma plugin that syncs design tokens straight into a Tailwind config PR. We need this exact pipeline.",
    summary: "Token sync pipeline to Tailwind.",
    topics: ["design systems", "tooling"],
  },
  {
    intent: "share",
    text: "A 90-second video on why Amsterdam's bike infrastructure works that says more than most urbanism books.",
    summary: "Share the bike infrastructure video.",
    topics: ["urbanism"],
    image: 380,
  },
  {
    intent: null,
    text: "Everyone is sleeping on browser extensions as a distribution channel. The install friction story completely changed.",
    failed: true,
  },
  {
    intent: "reference",
    text: "Complete Geist font feature settings table, including the tabular numeral and slashed zero flags.",
    summary: "Geist OpenType feature table.",
    topics: ["typography", "design systems"],
  },
];

const DAY = 86_400_000;
const base = Date.now();

const rows: NewSaveRow[] = entries.map((entry, index) => {
  const author = authors[index % authors.length]!;
  const createdAt = new Date(base - index * 0.45 * DAY);
  const review = entry.review ?? false;
  const sourceId = String(1_800_000_000 + index);
  const canonicalUrl = `https://x.com/${author.handle.slice(1)}/status/${sourceId}`;

  return {
    platform: "x",
    sourceId,
    canonicalUrl,
    pageUrl: canonicalUrl,
    content: entry.text,
    authorName: author.name,
    authorHandle: author.handle,
    authorAvatarUrl:
      author.avatar === null
        ? null
        : `https://i.pravatar.cc/80?img=${author.avatar}`,
    publishedAt: new Date(createdAt.getTime() - 2 * DAY),
    media: entry.image
      ? [
          {
            type: "image" as const,
            url: `https://picsum.photos/seed/lobe${index}/640/${entry.image}`,
            alt: "attached image",
          },
        ]
      : [],
    recipeVersion: 1,
    layoutFingerprint: "seed-demo",
    status: entry.intent ? "ready" : entry.failed ? "failed" : "processing",
    intent: entry.intent,
    confidence: entry.intent
      ? review
        ? 0.64
        : 0.86 + (index % 3) * 0.04
      : null,
    summary: entry.intent ? (entry.summary ?? null) : null,
    topics: entry.topics ?? [],
    why: entry.intent ? whyPool[index % whyPool.length]! : null,
    suggestedIntents: entry.intent
      ? INTENT_IDS.filter((id) => id !== entry.intent).slice(0, 2)
      : [],
    needsReview: review,
    failureReason: entry.failed ? "Classification timed out." : null,
    createdAt,
    updatedAt: createdAt,
  };
});

const inserted = await db
  .insert(saves)
  .values(rows)
  .onConflictDoNothing({ target: saves.canonicalUrl })
  .returning({ id: saves.id });

console.log(`Seeded ${inserted.length} of ${rows.length} demo saves.`);
await closeDatabase();
