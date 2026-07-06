import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import Parser from "rss-parser";
import * as dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Google Developer Gemini SDK
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Initialize Firebase dynamically from config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;
let firebaseEnabled = false;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const firebaseApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
    });
    db = getFirestore(firebaseApp, config.firestoreDatabaseId || "(default)");
    firebaseEnabled = true;
    console.log("Firebase initialized successfully inside server! Database ID:", config.firestoreDatabaseId || "(default)");
  } catch (err) {
    console.error("Firebase initialization failed inside server:", err);
  }
} else {
  console.log("Firebase applet configuration not found at:", firebaseConfigPath);
}

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["enclosure", "enclosure"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

const FEEDS = [
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Prachachat Politics", url: "https://www.prachachat.net/politics/feed" },
  { name: "Matichon Politics", url: "https://www.matichon.co.th/politics/feed" },
  { name: "Thairath News", url: "https://www.thairath.co.th/rss/news" },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3, initialDelayMs = 2000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      attempt++;
      return await fn();
    } catch (err: any) {
      let errMsg = "";
      if (err && typeof err === "object") {
        errMsg = err.message || JSON.stringify(err);
      } else {
        errMsg = String(err);
      }
      
      // Keep logs super clean, short, and non-cluttered
      if (errMsg.length > 250) {
        errMsg = errMsg.substring(0, 250) + "...";
      }

      const isQuota = errMsg.includes("429") || errMsg.includes("quota") || (err && (err.status === 429 || err.statusCode === 429));
      const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || (err && (err.status === 503 || err.statusCode === 503));
      
      if (isQuota) {
        console.warn(`[Gemini Attempt ${attempt} Rate Limiting Detected]: Quota limit or 429 Busy response.`);
      } else if (isUnavailable) {
        console.warn(`[Gemini Attempt ${attempt} Service Unavailable Detected]: 503 or High Demand response.`);
      } else {
        console.warn(`[Gemini Attempt ${attempt} failed]: ${errMsg}`);
      }

      if (attempt >= maxAttempts) {
        throw err;
      }
      
      // For rate limits or service unavailability, use slightly larger backoff
      const baseDelay = (isQuota || isUnavailable) ? initialDelayMs * 1.8 : initialDelayMs;
      const sleepTime = baseDelay * Math.pow(2.2, attempt - 1) * (0.8 + Math.random() * 0.4);
      console.log(`Retrying Gemini request (Attempt ${attempt + 1}/${maxAttempts}) after ${Math.round(sleepTime)}ms due to transient error...`);
      await delay(sleepTime);
    }
  }
}

interface NewsArticle {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  isoDate: string;
  creator: string;
  content: string;
  contentSnippet: string;
  source: string;
  thumbnail: string;
  categories: string[];
}

// Memory caches
let cachedArticles: NewsArticle[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for RSS

interface OSINTDashboardStats {
  executiveBriefing: string;
  geopoliticalTrends: Array<{
    trend: string;
    description: string;
    impact: "High" | "Medium" | "Low";
  }>;
  sourceBiasAnalysis: Array<{
    source: string;
    sentimentSummary: string;
    narrativeFocus: string; // Dynamic insight on what they focus on
    biasLevel: string; // e.g., low, moderate
  }>;
  threatMatrix: Array<{
    region: string;
    threatScore: number; // 1-100
    status: "Critical" | "Severe" | "Elevated" | "Low";
    coords: {
      lat: number;
      lng: number;
    };
    incidentsSummary: string;
  }>;
  criticalEntities: Array<{
    name: string;
    type: "Person" | "Organization" | "Location" | "Event";
    role: string;
    mentions: number;
  }>;
  generatedAt: string;
}

let cachedDashboardStatsMap: Record<string, OSINTDashboardStats> = {};
let lastStatsGenerationTimeMap: Record<string, number> = {};
const STATS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache for AI dashboard stats

// Safe stringify helper for handling items with null-prototype or objects
function safeStringify(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    try {
      if (Array.isArray(val)) {
        return val.map(safeStringify).join(", ");
      }
      if (val._ !== undefined) {
        return safeStringify(val._);
      }
      if (val.$ || val.term || val.name) {
        const potentialVals = [val._, val.term, val.name, val.label];
        const found = potentialVals.find(v => v !== undefined);
        if (found !== undefined) return safeStringify(found);
      }
      // Fail-safe to avoid Object.create(null) or circular structure crashes
      return JSON.stringify(val);
    } catch (e) {
      return "[Object]";
    }
  }
  return String(val);
}

// Clean content helper to remove HTML tags
function cleanHTML(text: string): string {
  if (!text) return "";
  return safeStringify(text).substring(0, 1000).replace(/<\/?[^>]+(>|$)/g, "").trim();
}

// Generate unique hash ID
function generateId(str: string): string {
  const safeStr = safeStringify(str);
  let hash = 0;
  for (let i = 0; i < safeStr.length; i++) {
    const char = safeStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Check if article is political or security related
function isPoliticalOrSecurityRelated(title: string, snippet: string, categories: string[], sourceName: string): boolean {
  // Auto-approve dedicated politics feeds
  if (sourceName === "Prachachat Politics" || sourceName === "Matichon Politics") {
    return true;
  }

  const combined = `${safeStringify(title)} ${safeStringify(snippet)} ${(categories || []).map(safeStringify).join(" ")}`.toLowerCase();

  // Thai keywords for politics, geopolitical and national security
  const thaiKeywords = [
    "การเมือง", "เลือกตั้ง", "พรรค", "รัฐบาล", "นายก", "คสช", "ส.ส", "ส.ว", "รัฐสภา", 
    "ประธานธิบดี", "ทหาร", "กองทัพ", "การทูต", "ความขัดแย้ง", "ปะทะ", "สงคราม", "โจมตี", "ภัยคุกคาม", 
    "ความมั่นคง", "กลาโหม", "ยุทโธปกรณ์", "ไซเบอร์", "จารกรรม", "ชายแดน", "จับกุม", "ชุมนุม", "ประท้วง", 
    "ปฏิรูป", "กฎหมาย", "ศาลรัฐธรรมนูญ", "รัฐธรรมนูญ", "แถลงการณ์", "เจรจา", "สังหาร", "อาวุธ", "ระเบิด",
    "กองทัพเรือ", "กองทัพบก", "กองทัพอากาศ", "รักษาความสงบ", "ก่อการร้าย", "ขู่", "กบฏ", "วิจัยนิวเคลียร์",
    "วุฒิสภา", "พรรคการเมือง", "ลงมติ", "นโยบายความมั่นคง", "ภูมิรัฐศาสตร์", "สนธิสัญญา", "น่านน้ำ", "น่านฟ้า",
    "ศาลรัฐธรรมนูญ", "รัฐบุรุษ", "รัฐมนตรี", "กระทรวง"
  ];

  // English keywords for politics, geopolitical and security
  const englishKeywords = [
    "politic", "government", "parliament", "senate", "congress", "minister", "president", "election", 
    "vote", "ballot", "campaign", "party", "parties", "protest", "riot", "coup", "reform", "treaty", 
    "diplomat", "bilateral", "sanction", "policy", "military", "army", "troop", "soldier", "weapon", 
    "missile", "defense", "defence", "border", "conflict", "clash", "strike", "attack", "bomb", "blast", 
    "war", "cyber", "espionage", "spy", "intelligence", "threat", "security", "geopolit", "terror", 
    "rebel", "nuclear", "nato", "veto", "unrest", "defcon", "geopolitical"
  ];

  const hasThaiMatch = thaiKeywords.some(kw => combined.includes(kw));
  const hasEnglishMatch = englishKeywords.some(kw => combined.includes(kw));

  return hasThaiMatch || hasEnglishMatch;
}

// Fetch and merge RSS feeds
async function getLatestNews(forceRefresh = false): Promise<NewsArticle[]> {
  const now = Date.now();
  if (!forceRefresh && cachedArticles.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedArticles;
  }

  const allArticles: NewsArticle[] = [];

  for (const feed of FEEDS) {
    try {
      // Use node-fetch / global fetch with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(feed.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const xmlText = await response.text();
      const parsed = await parser.parseString(xmlText);

      if (parsed && parsed.items) {
        parsed.items.forEach((item) => {
          let thumbnail = "";
          // Extract thumbnail from multiple possible locations (mediaContent, enclosure, encoded etc)
          if (item.mediaContent && item.mediaContent.length > 0) {
            const mediaObj = item.mediaContent[0];
            if (mediaObj && mediaObj.$ && mediaObj.$.url) {
              thumbnail = safeStringify(mediaObj.$.url);
            }
          } else if (item.enclosure && item.enclosure.url) {
            thumbnail = safeStringify(item.enclosure.url);
          }

          // Fallback image urls for different sources if missing
          if (!thumbnail) {
            if (feed.name === "BBC") {
              thumbnail = "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=400&q=80"; // BBC blue/news aesthetic
            } else if (feed.name === "Al Jazeera") {
              thumbnail = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80"; // Tech orange-blue globe
            } else if (feed.name === "New York Times") {
              thumbnail = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80"; // Serif newspaper
            } else {
              thumbnail = "https://images.unsplash.com/photo-1495020689067-958852a6565d?auto=format&fit=crop&w=400&q=80"; // Generic global map
            }
          }

          const articleLink = safeStringify(item.link || "");
          const articleTitle = safeStringify(item.title || "No Title");
          const uniqueString = articleLink || articleTitle;
          const articleId = generateId(uniqueString);

          // Avoid duplicates by ID
          if (uniqueString && !allArticles.some(a => a.id === articleId)) {
            const rawContent = safeStringify(item.contentEncoded || item.content || "");
            const contentSnippet = cleanHTML(item.contentSnippet || rawContent || "");
            
            // Extract categories cleanly as strings
            let rawCategories = item.categories || [];
            if (!Array.isArray(rawCategories)) {
              rawCategories = [rawCategories];
            }
            const categories = rawCategories.map((cat: any) => {
              if (cat && typeof cat === "object") {
                if (cat._) return safeStringify(cat._);
                if (cat.name) return safeStringify(cat.name);
                if (cat.$ && cat.$.term) return safeStringify(cat.$.term);
              }
              return safeStringify(cat);
            }).filter((c: string) => c.trim().length > 0);

            // FILTER: Selected only political and security-related articles
            if (isPoliticalOrSecurityRelated(articleTitle, contentSnippet, categories, feed.name)) {
              allArticles.push({
                id: articleId,
                title: articleTitle,
                link: articleLink,
                pubDate: safeStringify(item.pubDate || new Date().toISOString()),
                isoDate: safeStringify(item.isoDate || new Date().toISOString()),
                creator: safeStringify(item.creator || item["dc:creator"] || "Staff Intelligence"),
                content: cleanHTML(rawContent).substring(0, 500),
                contentSnippet: contentSnippet.substring(0, 300),
                source: feed.name,
                thumbnail,
                categories,
              });
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching RSS feed [${feed.name}] from ${feed.url}:`, error);
      // Fail-safe: we don't crash, we just let other feeds compile.
    }
  }

  // Sort articles chronologically
  allArticles.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());

  // Keep max 100 items to prevent bloat
  cachedArticles = allArticles.slice(0, 100);
  lastFetchTime = now;

  return cachedArticles;
}

// Express API endpoints

// 1. Unified RSS articles
app.get("/api/news", async (req, res) => {
  try {
    const force = req.query.refresh === "true";
    const articles = await getLatestNews(force);
    res.json({ success: true, count: articles.length, articles });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Real-time OSINT Intelligence analysis of recent headlines (real-time summary & charts generator)
app.get("/api/news/osint-dashboard", async (req, res) => {
  const now = Date.now();
  const force = req.query.refresh === "true";
  const lang = (req.query.lang as string) === "EN" ? "EN" : "TH";

  // Check state & Firebase database cache first under normal conditions
  if (!force) {
    if (cachedDashboardStatsMap[lang] && (now - lastStatsGenerationTimeMap[lang] < STATS_CACHE_DURATION)) {
      return res.json({ success: true, data: cachedDashboardStatsMap[lang] });
    }

    if (firebaseEnabled && db) {
      try {
        const docRef = doc(db, "dashboard", `latest_${lang.toLowerCase()}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as OSINTDashboardStats;
          const cachedTime = new Date(data.generatedAt).getTime();
          const age = now - cachedTime;
          // If the firebase cache is less than 30 minutes old, return it to save precious model token costs
          if (age < 30 * 60 * 1000) {
            console.log(`Serving OSINT Dashboard stats (${lang}) from Firebase Firestore database.`);
            cachedDashboardStatsMap[lang] = data;
            lastStatsGenerationTimeMap[lang] = cachedTime;
            return res.json({ success: true, data: data, fromCache: true });
          }
        }
      } catch (dbErr) {
        console.warn(`Firestore read for dashboard stats (${lang}) failed:`, dbErr);
      }
    }
  }

  // Load active articles for synthesis
  let articles: NewsArticle[] = [];
  try {
    articles = await getLatestNews();
  } catch (err) {
    console.warn("Failed to fetch news to synthesize dashboard stats. Falling back to cache.", err);
  }

  // Define hotTopicsSample to pass to the model, or default if empty
  const hotTopicsSample = (articles.length > 0 ? articles.slice(0, 20) : []).map(a => ({
    title: a.title,
    source: a.source,
    date: a.pubDate,
    snippet: a.contentSnippet.substring(0, 150)
  }));

  const targetLang = lang === "EN" ? "English" : "Thai";
  const regionExamples = lang === "EN"
    ? "Middle East, Eastern Europe, South China Sea, South Asia, North Africa, North America"
    : "ตะวันออกกลาง, ยุโรปตะวันออก, ทะเลจีนใต้, เอเชียใต้, แอฟริกาเหนือ, อเมริกาเหนือ";

  // Synthesis function to wrap in callGeminiWithRetry
  const generateDashboardStats = async () => {
    if (hotTopicsSample.length === 0) {
      throw new Error("No recent global headline feeds available for intelligence compilation.");
    }

    const prompt = `
    You are an elite OSINT (Open Source Intelligence) Director.
    Analyze the following list of recent global news headlines, compare the frames given by media networks (Al Jazeera, BBC, CNN, New York Times), and provide a unified geopolitical intelligence summary.
    
    Target News Headings Data:
    ${JSON.stringify(hotTopicsSample)}

    Construct an OSINT intelligence report strictly in JSON format matching the schema specified below.
    The response must contain the following variables parsed correctly (Do not wrap in markdown tags except the requested JSON):
    - executiveBriefing: A high-level executive briefing in ${targetLang} (around 150-250 words) summing up current global conditions, dominant conflicts, and security patterns from these articles.
    - geopoliticalTrends: Array of hot geopolitical trends. Each must have:
      * trend: trend category (military action, economic pivot, human crisis, cybersecurity threat etc.)
      * description: description of this trend in ${targetLang}.
      * impact: "High", "Medium", or "Low"
    - sourceBiasAnalysis: Analysis of media coverage frames. One object for each source (Al Jazeera, New York Times, CNN, BBC) actually present (or default them).
      * source: name of news agency.
      * sentimentSummary: overall framing and emotional stance of this agency in ${targetLang}.
      * narrativeFocus: major story angles this agency is focusing on compared to others in ${targetLang}.
      * biasLevel: "Low", "Moderate", or "Significant"
    - threatMatrix: Array of 4-6 regional conflict hot-zones. Each region must correspond to coordinates that we will plot on a map:
      * region: Region name in ${targetLang} (e.g., ${regionExamples} etc.)
      * threatScore: Numerical threat score (integer between 1 and 100)
      * status: "Critical", "Severe", "Elevated", or "Low" based on the score (Critical is 85+, Severe 70-84, Elevated 40-69, Low <40)
      * coords: { lat: number, lng: number } - approximate geographic coordinates for plotting (lat: -90 to 90, lng: -180 to 180).
        (Examples: Middle East lat:30.0, lng:45.0 ; Ukraine/Europe lat:49.0, lng:31.0 ; East Asia / South China Sea lat:15.0, lng:115.0 ; South Asia lat:21.0, lng:78.0 ; Africa lat:5.0, lng:20.0)
      * incidentsSummary: ${targetLang} summary sentence on what is provoking this level of threat.
    - criticalEntities: Array of 5 key international entities extracted from the headlines:
      * name: entity name (Individual, Government, Coalition e.g. NATO, Hamas, Joe Biden, Volodymyr Zelensky, etc.)
      * type: "Person" | "Organization" | "Location" | "Event"
      * role: Their strategic role in current incidents in ${targetLang}.
      * mentions: estimated number of times this entity appears in the current news sample.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveBriefing: { type: Type.STRING },
            geopoliticalTrends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  trend: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ["trend", "description", "impact"]
              }
            },
            sourceBiasAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  sentimentSummary: { type: Type.STRING },
                  narrativeFocus: { type: Type.STRING },
                  biasLevel: { type: Type.STRING }
                },
                required: ["source", "sentimentSummary", "narrativeFocus", "biasLevel"]
              }
            },
            threatMatrix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  region: { type: Type.STRING },
                  threatScore: { type: Type.INTEGER },
                  status: { type: Type.STRING },
                  coords: {
                    type: Type.OBJECT,
                    properties: {
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER }
                    },
                    required: ["lat", "lng"]
                  },
                  incidentsSummary: { type: Type.STRING }
                },
                required: ["region", "threatScore", "status", "coords", "incidentsSummary"]
              }
            },
            criticalEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  role: { type: Type.STRING },
                  mentions: { type: Type.INTEGER }
                },
                required: ["name", "type", "role", "mentions"]
              }
            }
          },
          required: ["executiveBriefing", "geopoliticalTrends", "sourceBiasAnalysis", "threatMatrix", "criticalEntities"]
        }
      }
    });

    const parsedStats: OSINTDashboardStats = JSON.parse(response.text?.trim() || "{}");
    parsedStats.generatedAt = new Date().toISOString();
    return parsedStats;
  };

  try {
    // Attempt with retry up to 4 times for maximum service resiliency
    const parsedStats = await callGeminiWithRetry(generateDashboardStats, 4, 1500);

    cachedDashboardStatsMap[lang] = parsedStats;
    lastStatsGenerationTimeMap[lang] = now;

    if (firebaseEnabled && db) {
      try {
        await setDoc(doc(db, "dashboard", `latest_${lang.toLowerCase()}`), parsedStats);
        console.log(`Cached newly synthesized OSINT Dashboard stats (${lang}) to Firebase.`);
      } catch (dbErr) {
        console.warn(`Failed to save dashboard stats (${lang}) to Firebase:`, dbErr);
      }
    }

    res.json({ success: true, data: parsedStats });
  } catch (err: any) {
    const errStr = String(err.message || err);
    console.warn(`OSINT Dashboard synthesize (${lang}) failed. Initiating fallback... Info:`, errStr.substring(0, 200));

    // Grab stale cache from memory if exists
    if (cachedDashboardStatsMap[lang]) {
      console.log(`Serving stale in-memory cached dashboard stats (${lang}) due to Gemini API failure.`);
      return res.json({ success: true, data: cachedDashboardStatsMap[lang], fromCache: true, isStaleFallback: true });
    }

    // Try hard to fetch stale cache from Firebase
    if (firebaseEnabled && db) {
      try {
        const docRef = doc(db, "dashboard", `latest_${lang.toLowerCase()}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as OSINTDashboardStats;
          console.log(`Serving stale Firebase cached dashboard stats (${lang}) due to Gemini API failure.`);
          cachedDashboardStatsMap[lang] = data;
          lastStatsGenerationTimeMap[lang] = new Date(data.generatedAt).getTime();
          return res.json({ success: true, data: data, fromCache: true, isStaleFallback: true });
        }
      } catch (dbErr) {
        console.warn(`Firestore fallback read (${lang}) failed:`, dbErr);
      }
    }

    // Absolutely worst case, serve a neat, valid dynamic fallback mock context
    console.log(`Serving robust dynamic mock dashboard fallback (${lang}) to keep the app functional.`);
    const titlesText = hotTopicsSample.length > 0 
      ? hotTopicsSample.slice(0, 3).map(x => `"${x.title}"`).join(lang === "EN" ? ", " : " และ ") 
      : (lang === "EN" ? "Global transition stability" : "การเปลี่ยนผ่านเสถียรภาพความมั่นคง");
      
    const staticFallback: OSINTDashboardStats = lang === "EN" ? {
      executiveBriefing: `The intelligence analysis system is temporarily running in offline safe-mode due to heavy API request volumes. General security monitoring remains focused on recent key developments including: ${titlesText}. Strategic command advisors are closely tracking maritime security and trans-national border stability.`,
      geopoliticalTrends: [
        {
          trend: "Cyber Operations & Infrastructure Vigilance",
          description: "Following recent incidents, military and key state entities have raised defenses against potential intrusions on operational systems.",
          impact: "High"
        },
        {
          trend: "Bilateral Alliance Adjustments",
          description: "Diplomatic movements indicate realignment of support frameworks around contested shipping corridors.",
          impact: "Medium"
        }
      ],
      sourceBiasAnalysis: [
        {
          source: "Al Jazeera",
          sentimentSummary: "Critical reporting on structural defense allocations and regional security balances.",
          narrativeFocus: "Focuses on strategic human angles and sovereign boundary assertions.",
          biasLevel: "Moderate"
        },
        {
          source: "New York Times",
          sentimentSummary: "Emphasis on multilateral treaty mechanisms and trade coalition dynamics.",
          narrativeFocus: "Highlights formal diplomatic accords and democratic coalition agreements.",
          biasLevel: "Low"
        }
      ],
      threatMatrix: [
        {
          region: "Middle East",
          threatScore: 82,
          status: "Severe",
          coords: { lat: 30.0, lng: 45.0 },
          incidentsSummary: "Strains along key waterways trigger high-alert response posture."
        }
      ],
      criticalEntities: [
        {
          name: "United Nations",
          type: "Organization",
          role: "Calling for de-escalation of border activity and immediate maritime dialogue.",
          mentions: 12
        }
      ],
      generatedAt: new Date().toISOString()
    } : {
      executiveBriefing: `ระบบตรวจวิเคราะห์วิกฤตขัดข้องชั่วคราวเนื่องจากคิวคำสั่งหนาแน่น (API Busy) ระบบเปลี่ยนผ่านสู่โหมดความปลอดภัยออฟไลน์โดยอัตโนมัติ ข้อมูลพลาดยุทธศาสตร์หลักยังคงมุ่งเน้นความตึงเครียดรอบเหตุการณ์สำคัญ ได้แก่ ${titlesText} เจ้าหน้าที่ระดับสูงเฝ้าระวังความผันผวนของสถานการณ์ข้ามประเทศและความปลอดภัยในช่องแคบเศรษฐกิจอย่างใกล้ชิด`,
      geopoliticalTrends: [
        {
          trend: "Cyber Operations & Infrastructure Vigilance",
          description: "สืบเนื่องจากเหตุการณ์ปัจจุบัน มีการประกาศยกระดับป้องกันการเจาะระบบเครือข่ายระบบทหารและนโยบายอุตสาหกรรมสากล",
          impact: "High"
        },
        {
          trend: "Bilateral Alliance Adjustments",
          description: "ความเคลื่อนไหวทางการทูตแสดงให้เห็นถึงการปรับโครงสร้างกรอบพันธมิตรความสัมพันธ์รองรับสภาวะความขัดแย้งเชิงนโยบาย",
          impact: "Medium"
        }
      ],
      sourceBiasAnalysis: [
        {
          source: "Al Jazeera",
          sentimentSummary: "รายงานเชิงวิพากษ์วิจารณ์ต่อการจัดสรรงบประมาณด้านความมั่นคงและความมั่นคงทางพลังงานในภูมิภาค",
          narrativeFocus: "มุ่งเน้นไปที่มิติด้านความมั่นคงทางอาหารและมนุษยธรรมเพื่อส่งผลต่อความเห็นของสาธารณชน",
          biasLevel: "Moderate"
        },
        {
          source: "New York Times",
          sentimentSummary: "การรายงานแบบอนุรักษนิยมที่เน้นการใช้มาตรการพหุภาคีและพันธมิตรทางการค้าในการแก้ไขข้อขัดแย้ง",
          narrativeFocus: "เน้นการวิเคราะห์กฎหมายระหว่างประเทศและการตรวจสอบสิทธิบัตรทางยุทธวิธีร่วมกัน",
          biasLevel: "Low"
        }
      ],
      threatMatrix: [
        {
          region: "ตะวันออกกลาง",
          threatScore: 82,
          status: "Severe",
          coords: { lat: 30.0, lng: 45.0 },
          incidentsSummary: "แรงกดดันอย่างรุนแรงส่งผลให้มีการตอบโต้เชิงยุทธการของกองทัพเรือพันธมิตรรอบมหาสมุทรอินเดีย"
        }
      ],
      criticalEntities: [
        {
          name: "องค์การสหประชาชาติ (UN)",
          type: "Organization",
          role: "เรียกร้องให้ลดการแสดงออกกำลังข้ามพรมแดนสากลอย่างเร่งด่วนและเปิดศูนย์ข้อมูลสันติภาพร่วม",
          mentions: 12
        }
      ],
      generatedAt: new Date().toISOString()
    };

    res.json({ success: true, data: staticFallback, fromCache: false, isFallback: true });
  }
});

// 3. Deep Article OSINT Assessment
app.post("/api/news/analyze-article", async (req, res) => {
  const { title, contentSnippet, source, link, pubDate, lang } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: "Article title is required" });
  }

  const langCode = lang === "EN" ? "EN" : "TH";
  const targetLang = langCode === "EN" ? "English" : "Thai";
  const articleId = generateId(link || title);
  const cacheKey = `${articleId}_${langCode.toLowerCase()}`;

  // Check Firebase first to see if this article has already been analyzed in this language
  if (firebaseEnabled && db) {
    try {
      const docRef = doc(db, "articleReports", cacheKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const stored = docSnap.data();
        console.log(`Serving tactical OSINT report for article [${cacheKey}] from Firebase Firestore cache.`);
        return res.json({ success: true, report: stored.report, fromCache: true });
      }
    } catch (dbErr) {
      console.warn("Failed to lookup article analysis in Firebase:", dbErr);
    }
  }

  const performAnalysis = async () => {
    const prompt = `
    You are an expert military command advisor and Open Source Intelligence (OSINT) specialist.
    Run a detailed strategic vector and tactical intelligence analysis on this article:
    - TITLE: ${title}
    - SOURCE: ${source}
    - BRIEF/TEXT: ${contentSnippet}
    - DATE: ${pubDate}

    Return a comprehensive assessment strictly in JSON format. Provide detailed answers written clearly in ${targetLang} language.
    Include the following fields:
    1. translatedTitle: The title of the article, translated into ${targetLang} language.
    2. translatedSnippet: The content snippet/brief of the article, translated into ${targetLang} language.
    3. executiveSummary: 3-4 sentences summarizing what occurred, keeping emotions completely objective (${targetLang}).
    4. intelligenceDomain: The intelligence category e.g., "Geopolitical Warfare", "Military Conflict", "Cyber Espionage", "Economic/Sanctions Infrastructure", "Humanitarian/Migration Emergency", "Bilateral Ties".
    5. threatMetrics:
       - score: Threat level score (scale of 1-10, where 10 is immediate global escalation risk, 1 is local civil affairs)
       - impactScale: Scale of effect ("Local", "Bilateral", "Regional Conflict", "Global Systemic Shift")
       - analysis: 1-2 sentence tactical justification of why this score was designated (${targetLang}).
    6. tacticalExtracts:
       - keyActors: Array of specific people, armies, rebel bands, or state ministries involved.
       - hotspots: Array of specific cities, sea corridors, borders, or regions.
       - targetOrganizations: Groups, state companies, treaties (e.g., EU, UN, IMF).
    7. propagandaAssessment:
       - narrativeAngle: What is the main thesis or angle of this outlet's reporting of this event? (${targetLang})
       - loadedTermsDetected: Key words/techniques used to influence reader sentiment (if any). (${targetLang})
       - omissionsDetected: What structural backdrop or historical detail was neglected? (${targetLang})
    8. strategicSecurityImplications:
       - immediateThreats: Tactical danger or short-term actions triggered (${targetLang}).
       - longTermVulnerabilities: Structural risks of this action for world stability over months/years (${targetLang}).
    9. recommendedTakeaways: Array of 3 specific recommendations for intelligence analysts or regional advisors (${targetLang}).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedTitle: { type: Type.STRING },
            translatedSnippet: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            intelligenceDomain: { type: Type.STRING },
            threatMetrics: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                impactScale: { type: Type.STRING },
                analysis: { type: Type.STRING }
              },
              required: ["score", "impactScale", "analysis"]
            },
            tacticalExtracts: {
              type: Type.OBJECT,
              properties: {
                keyActors: { type: Type.ARRAY, items: { type: Type.STRING } },
                hotspots: { type: Type.ARRAY, items: { type: Type.STRING } },
                targetOrganizations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["keyActors", "hotspots", "targetOrganizations"]
            },
            propagandaAssessment: {
              type: Type.OBJECT,
              properties: {
                narrativeAngle: { type: Type.STRING },
                loadedTermsDetected: { type: Type.STRING },
                omissionsDetected: { type: Type.STRING }
              },
              required: ["narrativeAngle", "loadedTermsDetected", "omissionsDetected"]
            },
            strategicSecurityImplications: {
              type: Type.OBJECT,
              properties: {
                immediateThreats: { type: Type.STRING },
                longTermVulnerabilities: { type: Type.STRING }
              },
              required: ["immediateThreats", "longTermVulnerabilities"]
            },
            recommendedTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: [
            "translatedTitle",
            "translatedSnippet",
            "executiveSummary",
            "intelligenceDomain",
            "threatMetrics",
            "tacticalExtracts",
            "propagandaAssessment",
            "strategicSecurityImplications",
            "recommendedTakeaways"
          ]
        }
      }
    });

    return JSON.parse(response.text?.trim() || "{}");
  };

  try {
    // Attempt with retry up to 4 times for maximum service resiliency
    const parsedReport = await callGeminiWithRetry(performAnalysis, 4, 1500);

    // Cache the newly processed OSINT analysis document to save AI token usage
    if (firebaseEnabled && db) {
      try {
        await setDoc(doc(db, "articleReports", cacheKey), {
          articleId,
          cacheKey,
          lang: langCode,
          title,
          source: source || "Unknown",
          link: link || "",
          pubDate: pubDate || new Date().toISOString(),
          contentSnippet: contentSnippet || "",
          report: parsedReport,
          generatedAt: new Date().toISOString()
        });
        console.log(`Saved newly analyzed report for article [${cacheKey}] to Firebase Firestore.`);
      } catch (saveErr) {
        console.error("Failed to write article report cache to Firebase:", saveErr);
      }
    }

    res.json({ success: true, report: parsedReport });
  } catch (err: any) {
    const errStr = String(err.message || err);
    console.warn(`OSINT Single Article Analysis failed for ${cacheKey}. Triggering fallback... Info:`, errStr.substring(0, 200));

    // If Gemini fails completely, compile a smart dynamic fallback report based on the title & content
    const combinedText = (title + " " + (contentSnippet || "")).toLowerCase();
    const isMilitary = /(naval|ship|military|airforce|troop|drone|defense|conflict|weapon|attack|bomb|border|threat|critical|severe|intelligence|vessel|navy|war|conflict)/i.test(combinedText);
    const isEconomic = /(finance|bank|rate|fed|trade|tariff|currency|market|inflation|economic|supply-chain|deal|money)/i.test(combinedText);
    const isEnvironment = /(climate|temp|warm|weather|rain|flood|heat|coal|carbon|energy|gas|electricity)/i.test(combinedText);

    let domain = "Geopolitical Warfare";
    let score = 5;
    let impact = "Bilateral";
    if (isMilitary) {
      domain = "Military Conflict";
      score = 8;
      impact = "Regional Conflict";
    } else if (isEconomic) {
      domain = "Economic/Sanctions Infrastructure";
      score = 6;
      impact = "Global Systemic Shift";
    } else if (isEnvironment) {
      domain = "Infrastructure & Resource Emergency";
      score = 4;
      impact = "Local";
    }

    const fallbackReport = langCode === "EN" ? {
      translatedTitle: title,
      translatedSnippet: contentSnippet || "No summary expansion is available.",
      executiveSummary: `[Resilient Safe-Mode Simulation] Executive summary regarding "${title}" from outlet ${source || "Open Sources"}. This incident outlines structural border alignment risks and international balance policies.`,
      intelligenceDomain: domain,
      threatMetrics: {
        score: score,
        impactScale: impact,
        analysis: "Direct system-level categorization based on text indicators (Fallback mode active due to temporary API limits)."
      },
      tacticalExtracts: {
        keyActors: [source || "Staff Agencies", "Regional Field Units", "Local Authorities"],
        hotspots: ["Regional Economic Zone", "Strategic Border Line"],
        targetOrganizations: ["International Monitoring Hubs", "United Nations Office"]
      },
      propagandaAssessment: {
        narrativeAngle: `The agency ${source || "Foreign Media"} framed the story to support regional stability and sovereign assertions.`,
        loadedTermsDetected: "Strategic resilience, cautionary measures, border timelines",
        omissionsDetected: "Historical escalation statistics along the maritime boundaries were underrepresented."
      },
      strategicSecurityImplications: {
        immediateThreats: "Increased vigilance on sovereign air corridors and protective infrastructure.",
        longTermVulnerabilities: "Cumulative administrative shift along neighboring maritime trade routes."
      },
      recommendedTakeaways: [
        "Verify status updates via nearby tactical stations over the next 24-48 hours.",
        "Assess historical trends to isolate baseline of local naval movements.",
        "Store this brief inside command-specific logs for future comparative modeling."
      ]
    } : {
      translatedTitle: title,
      translatedSnippet: contentSnippet || "",
      executiveSummary: `[จำลองสถานการณ์ความมั่นคงสำเร็จรูป] ข้อมูลสรุปสาระสำคัญเกี่ยวกับ "${title}" จากสำนักข่าว ${source || "Open Sources"}. เหตุการณ์นี้สะท้อนโครงสร้างความขัดแย้งเชิงนโยบายและความสัมพันธ์ข้ามช่องรัฐ มีขอบเขตยุทธวิธีที่มีนัยต่อการเฝ้าสังเกตการณ์พลาดย่อยประจำวันโดยผู้ชำนาญการข่าวกรองสากล`,
      intelligenceDomain: domain,
      threatMetrics: {
        score: score,
        impactScale: impact,
        analysis: "ประเมินเชิงระบบบนบริบทของข้อความและการวางกำลังหนุนในพื้นที่เป้าหมาย (ระบบทำงานในโหมด Resilient Fallback เนื่องจากช่องสัญญาณนายแบบขัดข้องชั่วคราว)"
      },
      tacticalExtracts: {
        keyActors: [source || "Staff Agencies", "Regional Field Units", "Local Authorities"],
        hotspots: ["Regional Economic Zone", "Strategic Border Line"],
        targetOrganizations: ["International Monitoring Hubs", "United Nations Office"]
      },
      propagandaAssessment: {
        narrativeAngle: `สำนักข่าว ${source || "ต่างประเทศ"} นำเสนอมุมมองเพื่อสร้างเสถียรภาพความมั่นใจและการสกัดสิทธิ์การเคลื่อนไหวที่ไม่ได้รับอนุมัติ`,
        loadedTermsDetected: "ความยืดหยุ่นทางยุทธวิธี, เหตุสุดพิจารณา, เส้นตายความมั่นคง",
        omissionsDetected: "รายละเอียดประวัติความตึงเครียดระยะพลาดยาวเชิงลึกในน่านน้ำข้ามฟาก"
      },
      strategicSecurityImplications: {
        immediateThreats: "การสั่งเฝ้าระวังความผันผวนด้านราคาและแผนรับมือภัยไซเบอร์ในสังกัดราชการชายฝั่ง",
        longTermVulnerabilities: "การสร้างคอลัมน์กดดันเชิงประชากรในระเบียบโครงข่ายยุทธศาสตร์ระยะหลายปี"
      },
      recommendedTakeaways: [
        "จัดทีมข่าวสารหลักเพื่อสังเกตการรายงานผลตอบรับหลัง 24 ชั่วโมงต่อยอด",
        "ประสานหน่วยข่าวร่วมชายขอบเขตเพื่อให้ได้ภาพความจริงทางกายภาพในจุดขัดแย้ง",
        "บรรจุสรุปความขัดแย้งนี้ลงกลุ่มฐานข้อมูลผู้เฝ้าระวังกองทัพเพื่อการใช้ประโยชน์ภายหน้า"
      ]
    };

    res.json({ success: true, report: fallbackReport, isFallback: true });
  }
});

// Configure Vite integration for develop vs static serve for production
async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OSINT app listening on port ${PORT}`);
  });
}

runServer();
