import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, Radio, Globe, Rss, Clock, RefreshCw, 
  Search, Filter, BookOpen, AlertCircle, Compass, 
  Map, MessageSquareCode, FileText, Bookmark, 
  ListRestart, Users, Activity, Loader2, ArrowRightLeft,
  BookMarked, Shield
} from "lucide-react";
import { NewsArticle, OSINTDashboardStats, ThreatHotspot, OSINTArticleReport } from "./types";
import IntelligenceMap from "./components/IntelligenceMap";
import ArticleDetailModal from "./components/ArticleDetailModal";
import { convertToMGRS } from "./utils";

interface SavedIntelReport {
  article: NewsArticle;
  report?: OSINTArticleReport;
  savedAt: string;
}

const EN_TX = {
  dashboard: "STRATEGIC DASHBOARD",
  dashboardSub: "Security & Geopolitics Overview",
  intelStream: "INTELLIGENCE STREAM",
  intelStreamSub: "Real-time Intel Feed",
  archive: "INTEL ARCHIVE",
  archiveSub: "Saved intelligence reports",
  tacticalGrid: "v0.1a Tactical Grid",
  operationalTime: "OPERATIONAL TIME",
  loadingTime: "GETTING SYSTEM UTC...",
  forceUpdate: "Force AI Sync",
  forceUpdateTitle: "Force update and re-synthesize entire system via AI",
  feedStatus: "SOURCE FEEDS STATUS",
  feedStatusDesc: "Direct real-time clean feed ingestion without CORS limitations.",
  online: "ONLINE",
  allAgencies: "ALL AGENCIES",
  briefingTitle: "EXECUTIVE STRATEGIC OSINT BRIEFING",
  briefingLoading: "AI is analyzing geopolitics index and global hot spots...",
  briefingWait: "Please wait (this is cached for subsequent instant page loads)",
  statsError: "Failed to compile stats report:",
  retryBtn: "Retry Ingestion",
  dataTimeline: "DATA TIMELINE ACCURACY",
  compressedState: "SECURED BRIEFING STATE",
  mapTitle: "GEOPOLITICAL WARFARE SPOTTER",
  mapDesc: "CLICK OR HOVER FOR RADAR EXTRACTS",
  noHotspotSelected: "Click on any hot spot region to view coordinates analysis.",
  threatReadout: "THREAT MATRIX READOUT",
  threatAnalysis: "GEOPOLITICAL ANALYSIS",
  militaryGrid: "MILITARY GRID REFERENCE",
  watchlistTitle: "CRITICAL WATCHLIST",
  mentions: "mentions",
  mediaBiasTitle: "MEDIA BIAS ANALYSIS",
  biasHigh: "Significant",
  biasMod: "Moderate",
  biasLow: "Low",
  biasNarrative: "Coverage Focus & Core Storylines:",
  biasSentiment: "Sentiment / Emotional Tone:",
  trendsTitle: "GEOPOLITICAL TREND TRACKER",
  filterSearch: "Search words or titles in feed...",
  filterSource: "SOURCE:",
  filterDomain: "DOMAIN:",
  filterCount: "Records Ingested:",
  allDomains: "ALL DOMAINS",
  domainGeopolitics: "GEOPOLITICS & DIALOGUE",
  domainMilitary: "MILITARY CONFLICT & WAR",
  domainEconomy: "ECONOMIC SANCTIONS",
  domainHuman: "HUMANITARIAN CRISES",
  feedLoading: "CONNECTED RSS FEEDS - COMPILES INTEL LAYERS...",
  feedError: "Failed to connect to RSS Feed networks:",
  feedRetry: "Reconnect Source Feed",
  feedEmpty: "No matching records found for active filters.",
  feedAuthor: "AUTHOR:",
  runAnalysis: "Run AI Analysis",
  noSnippet: "Summary snippet unavailable. Click to generate AI OSINT intelligence report.",
  archiveTitle: "ARCHIVED INTELLIGENCE REPORTS",
  totalRecords: "Total Saved Records:",
  archiveEmpty: "Intelligence Archive is Empty",
  archiveEmptyDesc: "When you analyze an article and click 'Save to Archive', the detailed generated dossier is saved here.",
  archiveEmptyBtn: "Go to Stream & Analyze",
  noDetails: "Basic article bookmark (no AI intelligence report)",
  savedOn: "Archived on",
  openRecord: "Open Dossier Record",
  footerTitle: "OSINT NEWS TRACKER & AI INTELLIGENCE DEEP DASHBOARD",
  footerDesc: "© 2026 Public OSINT Technology Platform - Powered by advanced neural threat analysis.",
  footerCommand: "SECURE COMMAND CORE",
  footerAccess: "PUBLIC AUDIT LAYER"
};

const TH_TX = {
  dashboard: "DASHBOARD",
  dashboardSub: "ภาพรวมยุทธศาสตร์ความมั่นคง",
  intelStream: "INTELLIGENCE STREAM",
  intelStreamSub: "กระแสข่าวกรองเรียลไทม์",
  archive: "INTEL ARCHIVE",
  archiveSub: "คลังข่าวกรองที่บันทึกไว้",
  tacticalGrid: "v0.1a Tactical Grid",
  operationalTime: "OPERATIONAL TIME",
  loadingTime: "LOADING SYSTEM TIME...",
  forceUpdate: "บังคับอัปเดต AI",
  forceUpdateTitle: "อัปเดตและสังเคราะห์ข้อมูลด้วย AI ทั้งระบบทันที",
  feedStatus: "SOURCE FEEDS STATUS",
  feedStatusDesc: "เชื่อมต่อโดยตรงเพื่อดึงข่าวสารผ่านฐานข้อมูลเซิร์ฟเวอร์แบบคลีนเลเยอร์ ปราศจากข้อจำกัด CORS",
  online: "ONLINE",
  allAgencies: "ALL AGENCIES",
  briefingTitle: "สารพยากรณ์ข่าวกรองภาพรวมยุทธศาสตร์ (EXECUTIVE STRATEGIC OSINT BRIEFING)",
  briefingLoading: "ปัญญาประดิษฐ์กำลังวิเคราะห์ดัชนีภาพรวมข่าวภูมิรัฐศาสตร์และพิกัดความขัดแย้ง...",
  briefingWait: "กรุณารอสักครู่ (กระบวนการนี้จะแคชไว้เพื่อความเร็วในการโหลดครั้งถัดไป)",
  statsError: "ตรวจสอบพบข้อผิดพลาดประมวลผลสถิติ:",
  retryBtn: "พยายามโหลดใหม่อีกครั้ง",
  dataTimeline: "DATA TIMELINE ACCURACY",
  compressedState: "ANALYSIS COMPRESSED STATE",
  mapTitle: "พิกัดพื้นที่ระดับภัยคุกคามสากล (GEOPOLITICAL WARFARE SPOTTER)",
  mapDesc: "CLICK OR HOVER FOR RADAR EXTRACTS",
  noHotspotSelected: "คลิกเลือกภูมิภาคบนแผนที่เพื่อดูข้อมูลรายละเอียดความมั่นคงพิกัดเฉพาะ",
  threatReadout: "คาร์ดสถานการณ์เฉพาะที่ (THREAT MATRIX READOUT)",
  threatAnalysis: "เหตุผลเชิงยุทธวิธี (GEOPOLITICAL ANALYSIS)",
  militaryGrid: "พิกัดระบบกริดทหาร (MILITARY GRID REFERENCE)",
  watchlistTitle: "องค์กร & คาร์แรกเตอร์เป้าหมายเฝ้าระวัง (CRITICAL WATCHLIST)",
  mentions: "mentions",
  mediaBiasTitle: "การกำหนดกรอบความเห็นของสำนักข่าวชั้นนำ (MEDIA BIAS ANALYSIS)",
  biasHigh: "Significant",
  biasMod: "Moderate",
  biasLow: "Low",
  biasNarrative: "จุดเด่นการทำรายงานข่าว:",
  biasSentiment: "อารมณ์รวมของเสื่อ (Sentiment Framing):",
  trendsTitle: "แนวโน้มภาพรวมภูมิรัฐศาสตร์ปัจจุบัน (GEOPOLITICAL TREND TRACKER)",
  filterSearch: "สืบค้นหัวข้อ/คำเฉพาะในข่าว...",
  filterSource: "SOURCE:",
  filterDomain: "DOMAIN:",
  filterCount: "ค้นพบ:",
  allDomains: "ALL DOMAINS",
  domainGeopolitics: "GEOPOLITICS & DIALOGUE",
  domainMilitary: "MILITARY CONFLICT & WAR",
  domainEconomy: "ECONOMIC SANCTIONS",
  domainHuman: "HUMANITARIAN CRISES",
  feedLoading: "CONNECTED RSS FEEDS - COMPILES INTEL LAYERS...",
  feedError: "ไม่สามารถรวบรวมข้อมูล RSS ข่าวสารได้:",
  feedRetry: "พยายามเชื่อมต่อใหม่อีกครั้ง",
  feedEmpty: "ไม่พบแฟ้มข่าวสารเกี่ยวกับเงื่อนไขฟิลเตอร์ที่คุณสืบค้น",
  feedAuthor: "AUTHOR:",
  runAnalysis: "วิเคราะห์ระดับ AI",
  noSnippet: "ไม่พบระเบียงย่อขยายรายละเอียด กรุณาคลิกเพื่อประมวลผลความมั่นคงระดับ AI",
  archiveTitle: "คลังวิเคราะห์ข่าวกรองที่จัดเก็บ (ARCHIVED INTELLIGENCE REPORTS)",
  totalRecords: "แฟ้มประวัติสะสมทั้งหมด:",
  archiveEmpty: "คลังรายงานประวัติข่าวกรองว่างเปล่า",
  archiveEmptyDesc: "เมื่อคุณคลิกวิเคราะห์เชิงลึกข่าวสารในหน้า 'กระแสข่าวแบบเรียลไทม์' แล้วคลิกเลือกปุ่ม 'บันทึกเข้าแฟ้มสะสม' รายงานและรายละเอียดทั้งหมดจะถูกรวบรวมมาจัดเก็บไว้ที่นี่",
  archiveEmptyBtn: "ระบุข่าวและรันวิเคราะห์ AI",
  noDetails: "(รายงานพื้นฐาน ไม่พบคลิปข้อมูลสถิติเชิงลึก)",
  savedOn: "จัดเก็บเมื่อ",
  openRecord: "เปิดระเบียบข้อมูล",
  footerTitle: "OSINT NEWS TRACKER & AI INTELLIGENCE DEEP DASHBOARD",
  footerDesc: "© 2026 ระบบค้นหาข่าวกรองเทคโนโลยีอัจฉริยะแบบสาธารณะ - พัฒนาขึ้นโดย Metis Labs",
  footerCommand: "SECURE COMMAND CORE",
  footerAccess: "PUBLIC ACCESS LAYER"
};

export default function App() {
  const [language, setLanguage] = useState<"TH" | "EN">(() => {
    const stored = localStorage.getItem("osint_app_language");
    return (stored === "TH" || stored === "EN") ? stored : "TH";
  });

  const toggleLanguage = () => {
    const next = language === "TH" ? "EN" : "TH";
    setLanguage(next);
    localStorage.setItem("osint_app_language", next);
    fetchOSINTStats(false, next);
  };

  const t = language === "TH" ? TH_TX : EN_TX;

  const [activeTab, setActiveTab] = useState<"dashboard" | "feed" | "archive">("dashboard");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);

  // OSINT dashboard stats
  const [dashboardStats, setDashboardStats] = useState<OSINTDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Selected article for deep intelligence analysis
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  
  // Selected hotspot from map to highlight or filter
  const [selectedHotspot, setSelectedHotspot] = useState<ThreatHotspot | null>(null);

  // Filters for News Stream
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [minThreat, setMinThreat] = useState<number>(0);

  // Bookmarks / Saved reports
  const [savedReports, setSavedReports] = useState<SavedIntelReport[]>([]);

  // System time tracking representation (UTC standard)
  const [systemTime, setSystemTime] = useState("");

  useEffect(() => {
    // Update live clock
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleString("en-US", { timeZone: "UTC", hour12: false }) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch News & Stats on Mount
  useEffect(() => {
    fetchNews();
    fetchOSINTStats(false, language);
    loadSavedReports();
  }, []);

  const fetchNews = async (force = false) => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch(`/api/news?refresh=${force}`);
      if (!res.ok) throw new Error("การดึงข้อมูล RSS Feed ล้มเหลว พยายามดึงข้อมูลใหม่อีกครั้ง");
      const data = await res.json();
      if (data.success) {
        setArticles(data.articles);
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการโหลดข่าวสาร");
      }
    } catch (err: any) {
      setNewsError(err.message || "เกิดข้อผิดพลาดในการติดต่อฐานข้อมูลฝั่งเซิร์ฟเวอร์");
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchOSINTStats = async (force = false, currentLang = language) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch(`/api/news/osint-dashboard?refresh=${force}&lang=${currentLang}`);
      if (!res.ok) throw new Error("ระบบ AI ประเมินสถิติขัดข้องทางเครือข่าย");
      const data = await res.json();
      if (data.success) {
        const stats = { ...data.data, fromCache: !!data.fromCache };
        setDashboardStats(stats);
        if (data.data?.threatMatrix?.length > 0) {
          setSelectedHotspot((prev) => {
            if (prev) {
              const matched = data.data.threatMatrix.find((m: any) => m.region === prev.region);
              if (matched) return matched;
            }
            return data.data.threatMatrix[0];
          });
        }
      } else {
        throw new Error(data.error || "ไม่สามารถสังเคราะห์ข้อมูลสถิติประมวลผลด่วนได้");
      }
    } catch (err: any) {
      setStatsError(err.message || "ล้มเหลวในการเชื่อมโยงวิเคราะห์ภาพรวมทางภูมิรัฐศาสตร์ด้วยปัญญาประดิษฐ์");
    } finally {
      setStatsLoading(false);
    }
  };

  const loadSavedReports = () => {
    const list = localStorage.getItem("osint_saved_reports_list");
    if (list) {
      try {
        setSavedReports(JSON.parse(list));
      } catch (err) {
        console.error("Failed to load saved reports archive:", err);
      }
    }
  };

  const handleToggleBookmark = (article: NewsArticle, report?: OSINTArticleReport) => {
    const list = localStorage.getItem("osint_saved_reports_list");
    let current: SavedIntelReport[] = [];
    if (list) {
      try {
        current = JSON.parse(list);
      } catch (err) {
        console.warn("Invalid bookmark storage format. Resetting bookmarks list.", err);
      }
    }
    if (!Array.isArray(current)) {
      current = [];
    }
    
    const exists = current.some(item => item && item.article && item.article.id === article.id);
    if (exists) {
      // Remove
      current = current.filter(item => item.article.id !== article.id);
    } else {
      // Add
      current.push({
        article,
        report,
        savedAt: new Date().toISOString()
      });
    }
    
    localStorage.setItem("osint_saved_reports_list", JSON.stringify(current));
    setSavedReports(current);
  };

  const handleFullRefresh = async () => {
    await Promise.all([
      fetchNews(true),
      fetchOSINTStats(true)
    ]);
  };

  const isArticleBookmarked = (id: string) => {
    return savedReports.some(item => item.article.id === id);
  };

  // Filtered lists of feed items
  const filteredArticles = articles.filter((a) => {
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.contentSnippet.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSource = selectedSource === "ALL" || a.source === selectedSource;
    
    // Some basic hardcoded keyword rules if AI analysis not triggered yet on lists
    const matchesDomain = selectedDomain === "ALL" || (() => {
      const text = (a.title + " " + a.contentSnippet).toLowerCase();
      if (selectedDomain === "GEOPOLITICS") return text.match(/politic|treaty|border|diplomat|president|summit|court/);
      if (selectedDomain === "MILITARY") return text.match(/military|war|strike|missile|attack|soldier|army|weapon|combat|troop/);
      if (selectedDomain === "ECONOMY") return text.match(/economy|sanction|trade|tariff|stock|bank|oil|gas|price/);
      if (selectedDomain === "HUMAN") return text.match(/humanitarian|migration|refugee|rights|food|civil|protest/);
      return true;
    })();

    return matchesSearch && matchesSource && matchesDomain;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* 1. Header & Navigation Rail */}
      <header className="bg-slate-900 border-b border-indigo-900/50 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-lg backdrop-blur-md bg-slate-900/90">
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-indigo-700 to-slate-900 p-2.5 rounded-lg border border-indigo-500/30 shadow-md flex items-center justify-center relative">
            <Shield className="w-5.5 h-5.5 text-indigo-400" />
            <Globe className="w-2.5 h-2.5 text-slate-100 absolute animate-[spin_10s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-sans text-slate-100 tracking-tight flex items-center gap-2">
              DEFCON <span className="text-indigo-400 font-semibold tracking-wide">OSINT METIS</span> <span className="text-slate-500 text-xs font-normal font-mono hidden sm:inline">{t.tacticalGrid}</span>
            </h1>
          </div>
        </div>

        {/* Tactical status readout */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block font-mono text-xs">
            <p className="text-slate-500">{t.operationalTime}</p>
            <p className="text-slate-200 font-bold tracking-wider flex items-center justify-end space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{systemTime || t.loadingTime}</span>
            </p>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-400 hover:text-indigo-200 font-mono text-xs font-bold px-3 py-2 rounded-md border border-indigo-900/50 hover:border-indigo-700 transition shadow-inner shrink-0"
            title={language === "TH" ? "Switch to English" : "สลับเป็นภาษาไทย"}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === "TH" ? "EN" : "TH/ไทย"}</span>
          </button>

          <button
            onClick={handleFullRefresh}
            className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-300 font-mono text-xs px-3.5 py-2 rounded-md border border-slate-800 hover:border-slate-700 transition"
            title={t.forceUpdateTitle}
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">{t.forceUpdate}</span>
          </button>
        </div>
      </header>

      {/* 2. Primary Layout Grid */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Navigation Selector Dashboard Left Column */}
        <nav className="lg:col-span-3 flex flex-row lg:flex-col gap-2.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full text-left flex items-center space-x-3 px-4 py-3.5 rounded-lg border font-mono transition ${
              activeTab === "dashboard"
                ? "bg-slate-900 border-indigo-500 text-indigo-400 shadow-lg"
                : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <div className="text-left leading-tight shrink-0 sm:shrink">
              <p className="text-xs font-bold uppercase tracking-wider block">{t.dashboard}</p>
              <p className="text-[10px] text-slate-500 hidden sm:block font-sans">{t.dashboardSub}</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("feed")}
            className={`w-full text-left flex items-center space-x-3 px-4 py-3.5 rounded-lg border font-mono transition ${
              activeTab === "feed"
                ? "bg-slate-900 border-indigo-500 text-indigo-400 shadow-lg"
                : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <Radio className="w-5 h-5 shrink-0" />
            <div className="text-left leading-tight shrink-0 sm:shrink">
              <p className="text-xs font-bold uppercase tracking-wider block">{t.intelStream}</p>
              <p className="text-[10px] text-slate-500 hidden sm:block font-sans">{t.intelStreamSub}</p>
            </div>
            {articles.length > 0 && (
              <span className="ml-auto bg-indigo-950 text-indigo-400 border border-indigo-800/80 px-2 py-0.5 rounded-full text-xs font-bold hidden lg:inline">
                {articles.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("archive")}
            className={`w-full text-left flex items-center space-x-3 px-4 py-3.5 rounded-lg border font-mono transition ${
              activeTab === "archive"
                ? "bg-slate-900 border-indigo-500 text-indigo-400 shadow-lg"
                : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <BookMarked className="w-5 h-5 shrink-0" />
            <div className="text-left leading-tight shrink-0 sm:shrink">
              <p className="text-xs font-bold uppercase tracking-wider block">{t.archive}</p>
              <p className="text-[10px] text-slate-500 hidden sm:block font-sans">{t.archiveSub}</p>
            </div>
            {savedReports.length > 0 && (
              <span className="ml-auto bg-slate-900 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded-full text-xs font-bold hidden lg:inline">
                {savedReports.length}
              </span>
            )}
          </button>

          {/* Quick Stats sidebar widget (only on desktop layout) */}
          <div className="hidden lg:block mt-6 p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 font-mono text-[11px] text-slate-400 relative overflow-hidden">
            <h4 className="text-xs font-semibold text-slate-300 border-b border-slate-900 pb-1.5 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t.feedStatus}</span>
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Prachachat Politics RSS:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.online}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Matichon Politics RSS:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.online}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Thairath News RSS:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.online}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Al Jazeera XML:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.online}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>New York Times XML:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.online}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>CNN International XML:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.online}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>BBC World News XML:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.online}</span>
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-500 leading-normal">
              {t.feedStatusDesc}
            </div>
          </div>
        </nav>

        {/* Main interactive pane */}
        <main className="lg:col-span-9 space-y-6">

          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Geopolitical map section */}
              {statsLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                  <div className="space-y-1.5 font-mono">
                    <p className="text-slate-200 text-sm font-bold">{t.briefingLoading}</p>
                    <p className="text-indigo-400 text-xs">{t.briefingWait}</p>
                  </div>
                </div>
              ) : statsError ? (
                <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-5 flex items-start space-x-3 text-red-200 font-mono text-sm">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t.statsError}</p>
                    <p className="text-xs text-red-400 mt-1">{statsError}</p>
                    <button 
                      onClick={() => fetchOSINTStats(true)} 
                      className="mt-3 px-3.5 py-1 text-xs bg-red-900 hover:bg-red-800 text-white rounded transition"
                    >
                      {t.retryBtn}
                    </button>
                  </div>
                </div>
              ) : (
                dashboardStats && (
                  <>
                    {/* Executive Briefing Summary */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-slate-850 rounded-lg p-6 relative overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                      <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between flex-wrap gap-2 mb-3">
                        <span className="flex items-center space-x-1.5">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <span>{t.briefingTitle}</span>
                        </span>
                      </h3>
                      
                      <div className="text-slate-200 text-sm leading-relaxed max-w-full font-serif text-justify space-y-3">
                        <p>{dashboardStats.executiveBriefing}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span>{t.dataTimeline}: {new Date(dashboardStats.generatedAt).toLocaleString(language === "TH" ? "th-TH" : "en-US")}</span>
                        <span>{t.compressedState}</span>
                      </div>
                    </motion.div>

                    {/* Geopolitical map dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Map col */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                           <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                            <Map className="w-4.5 h-4.5 text-blue-400" />
                            <span>{t.mapTitle}</span>
                          </h2>
                          <span className="text-[10px] font-mono text-slate-500">{t.mapDesc}</span>
                        </div>

                        <IntelligenceMap 
                          hotspots={dashboardStats.threatMatrix}
                          onSelectHotspot={(hotspot) => setSelectedHotspot(hotspot)}
                        />
                      </div>

                      {/* Selected hotspot side detail cards */}
                      <div className="space-y-4">
                        <div className="flex items-center border-b border-slate-800 pb-2">
                          <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                            <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                            <span>{t.threatReadout}</span>
                          </h2>
                        </div>

                        {selectedHotspot ? (
                          <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 space-y-4 shadow-md font-mono text-xs">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="font-bold text-slate-100 text-sm font-sans">{selectedHotspot.region}</span>
                              <span className={`px-2 py-0.5 rounded leading-none text-[10px] font-bold ${
                                selectedHotspot.status === "Critical" ? "bg-red-950 text-red-400 border border-red-800/60 animate-pulse" :
                                selectedHotspot.status === "Severe" ? "bg-amber-950 text-amber-400 border border-amber-800/60" :
                                selectedHotspot.status === "Elevated" ? "bg-yellow-950 text-yellow-400 border border-yellow-800/60" :
                                "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                              }`}>
                                {selectedHotspot.status}
                              </span>
                            </div>

                            <div className="space-y-3 font-sans text-xs text-slate-300">
                              <div>
                                <span className="text-[10px] font-mono text-slate-500 block mb-1">{t.threatAnalysis}:</span>
                                <p className="leading-relaxed bg-slate-950 p-2.5 border border-slate-800 rounded font-serif text-slate-200 text-[13px]">
                                  {selectedHotspot.incidentsSummary}
                                </p>
                              </div>

                              <div className="space-y-2 pt-1 animate-fade-in">
                                <div className="bg-slate-950 p-3 border border-indigo-950 rounded relative overflow-hidden">
                                  <div className="absolute top-0 right-0 bg-indigo-950 text-indigo-400 text-[8px] px-1.5 py-0.5 select-none border-b border-l border-indigo-900 rounded-bl font-mono font-bold tracking-wider">
                                    MGRS MILITARY GRID
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-500 block mb-1">{t.militaryGrid}</span>
                                  <span className="font-mono text-sm text-indigo-400 font-bold tracking-widest block">{convertToMGRS(selectedHotspot.coords.lat, selectedHotspot.coords.lng)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-slate-950 p-2.5 border border-slate-800 rounded text-center">
                                    <span className="text-[10px] font-mono text-slate-500 block mb-0.5">LATITUDE</span>
                                    <span className="font-mono text-xs text-slate-300 font-bold">{selectedHotspot.coords.lat.toFixed(4)} N/S</span>
                                  </div>
                                  <div className="bg-slate-950 p-2.5 border border-slate-800 rounded text-center">
                                    <span className="text-[10px] font-mono text-slate-500 block mb-0.5">LONGITUDE</span>
                                    <span className="font-mono text-xs text-slate-300 font-bold">{selectedHotspot.coords.lng.toFixed(4)} E/W</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-10 text-center font-mono text-xs text-slate-500">
                            {t.noHotspotSelected}
                          </div>
                        )}

                        {/* critical entities breakdown card */}
                        <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 space-y-3 font-mono text-xs shadow-md">
                          <h4 className="font-bold border-b border-slate-800 pb-2 flex items-center space-x-1.5 text-slate-300">
                            <Users className="w-4 h-4 text-indigo-400" />
                            <span>{t.watchlistTitle}</span>
                          </h4>
                          
                          <div className="space-y-2.5">
                            {dashboardStats.criticalEntities.slice(0, 5).map((e, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-slate-950 border border-slate-850 p-2 rounded">
                                <div className="space-y-0.5 max-w-[70%]">
                                  <p className="font-bold text-slate-200 truncate">{e.name}</p>
                                  <p className="text-[9px] text-slate-500 truncate">{e.role}</p>
                                </div>
                                <div className="text-right text-[10px]">
                                  <span className="text-[10px] text-indigo-400 bg-indigo-950/45 border border-indigo-900/60 px-1.5 rounded font-bold">{e.type}</span>
                                  <p className="text-[10px] text-slate-500 mt-1 capitalize">{e.mentions} {t.mentions}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Source bias reporting difference analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Media frame bias */}
                      <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 space-y-4 shadow-xl">
                        <h4 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2.5">
                          <MessageSquareCode className="w-4.5 h-4.5 text-indigo-400" />
                          <span>{t.mediaBiasTitle}</span>
                        </h4>

                        <div className="grid grid-cols-1 gap-3 font-sans text-xs">
                          {dashboardStats.sourceBiasAnalysis.map((b, i) => (
                            <div key={i} className="bg-slate-950 border border-slate-800 p-3.5 rounded-md space-y-2 relative overflow-hidden">
                              <div className="absolute top-0 right-0 h-full w-1.5 bg-slate-800"></div>
                              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                                <span className="font-bold text-xs text-indigo-400 font-mono">{b.source}</span>
                                <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                                  b.biasLevel === "Significant" ? "bg-red-950 text-red-400 border-red-800" :
                                  b.biasLevel === "Moderate" ? "bg-amber-950 text-amber-400 border-amber-800" :
                                  "bg-emerald-950 text-emerald-400 border-emerald-800"
                                }`}>
                                  BIAS: {b.biasLevel === "Significant" ? t.biasHigh : b.biasLevel === "Moderate" ? t.biasMod : t.biasLow}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-slate-200 text-xs text-justify font-serif">
                                  <strong>{t.biasNarrative}</strong> {b.narrativeFocus}
                                </p>
                                <p className="text-slate-400 text-[11px] leading-relaxed italic">
                                  <strong>{t.biasSentiment}</strong> {b.sentimentSummary}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Geopolitical trends widget representation */}
                      <div className="bg-slate-900 border border-slate-850 rounded-lg p-5 space-y-4 shadow-xl">
                        <h4 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2.5">
                          <Activity className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                          <span>{t.trendsTitle}</span>
                        </h4>

                        <div className="space-y-3 font-sans text-xs">
                          {dashboardStats.geopoliticalTrends.map((t, idx) => (
                            <div key={idx} className="bg-slate-950 border border-slate-800 p-3.5 rounded-md flex items-start space-x-3.5">
                              <div className={`mt-0.5 rounded px-2 py-0.5 text-[9px] font-mono leading-none font-bold shrink-0 ${
                                t.impact === "High" ? "bg-red-950 text-red-400 border border-red-800/40" :
                                t.impact === "Medium" ? "bg-amber-950 text-amber-400 border border-amber-800/40" :
                                "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                              }`}>
                                IMPACT: {t.impact}
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-xs text-slate-200 uppercase font-mono tracking-wide">{t.trend}</p>
                                <p className="text-slate-350 text-xs font-serif leading-relaxed text-justify">{t.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </>
                )
              )}

            </div>
          )}

          {/* TAB 2: NEWS STREAM */}
          {activeTab === "feed" && (
            <div className="space-y-6">
              
              {/* Filter controls row */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="สืบค้นหัวข้อ/คำเฉพาะในข่าว..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-md py-2 pl-9 pr-4 text-xs text-slate-250 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                {/* News source filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 text-xs font-mono shrink-0">SOURCE:</span>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-md py-2 px-3 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="ALL">ALL AGENCIES</option>
                    <option value="Prachachat Politics">ประชาชาติธุรกิจ - การเมือง</option>
                    <option value="Matichon Politics">มติชน - การเมือง</option>
                    <option value="Thairath News">ไทยรัฐ - ข่าวทั่วไป</option>
                    <option value="Al Jazeera">AL JAZEERA</option>
                    <option value="New York Times">NEW YORK TIMES</option>
                    <option value="CNN">CNN INT</option>
                    <option value="BBC">BBC WORLD</option>
                  </select>
                </div>

                {/* Domain Focus filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 text-xs font-mono shrink-0">DOMAIN:</span>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-md py-2 px-3 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="ALL">ALL DOMAINS</option>
                    <option value="GEOPOLITICS">GEOPOLITICS & DIALOGUE</option>
                    <option value="MILITARY">MILITARY CONFLICT & WAR</option>
                    <option value="ECONOMY">ECONOMIC SANCTIONS</option>
                    <option value="HUMAN">HUMANITARIAN CRISES</option>
                  </select>
                </div>

                {/* Statistics display */}
                <div className="text-right text-xs text-slate-450 font-mono flex items-center justify-end space-x-2">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ค้นพบ: <strong>{filteredArticles.length}</strong> แฟ้มผลลัพธ์</span>
                </div>
              </div>

              {/* Feed items list */}
              {newsLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-lg py-24 text-center flex flex-col items-center justify-center space-y-4 shadow-md">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                  <p className="font-mono text-xs text-slate-400 animate-pulse uppercase">CONNECTED RSS FEEDS - COMPILES INTEL LAYERS...</p>
                </div>
              ) : newsError ? (
                <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-5 text-center font-mono text-sm">
                  <p className="text-red-400 font-bold mb-2">ไม่สามารถรวบรวมข้อมูล RSS ข่าวสารได้:</p>
                  <p className="text-xs text-slate-400 mb-4">{newsError}</p>
                  <button 
                    onClick={() => fetchNews(true)} 
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-xs leading-none transition"
                  >
                    พยายามเชื่อมต่อใหม่อีกครั้ง
                  </button>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-805 rounded-lg py-20 text-center font-mono text-xs text-slate-500">
                  ไม่พบแฟ้มข่าวสารเกี่ยวกับเงื่อนไขฟิลเตอร์ที่คุณสืบค้น
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <AnimatePresence mode="popLayout">
                    {filteredArticles.map((article, index) => (
                      <motion.div
                        layout
                        key={article.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                        onClick={() => setSelectedArticle(article)}
                        className="bg-slate-900 border border-slate-850 hover:border-indigo-505/50 rounded-lg overflow-hidden flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl group"
                      >
                        {/* Article thumbnail image */}
                        <div className="relative aspect-[2/1] w-full overflow-hidden bg-slate-950 border-b border-slate-900/80">
                          <img
                            src={article.thumbnail}
                            alt={article.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            onError={(e) => {
                              // Secondary fallback
                              e.currentTarget.src = "https://images.unsplash.com/photo-1495020689067-958852a6565d?auto=format&fit=crop&w=800&q=80";
                            }}
                          />
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                            <span className="bg-slate-950/90 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider backdrop-blur-sm">
                              {article.source}
                            </span>
                          </div>

                          {isArticleBookmarked(article.id) && (
                            <div className="absolute top-2 right-2 bg-indigo-600 border border-indigo-550 p-1 rounded backdrop-blur-sm" title="บันทึกรายงานไว้ในระบบ">
                              <Bookmark className="w-3.5 h-3.5 text-white fill-white" />
                            </div>
                          )}
                        </div>

                        {/* Text fields container */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                              <span>{new Date(article.isoDate || article.pubDate).toLocaleString("th-TH")}</span>
                            </div>
                            <h3 className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors text-sm md:text-base leading-snug line-clamp-2 font-sans tracking-tight">
                              {article.title}
                            </h3>
                            <p className="text-slate-350 text-xs line-clamp-3 leading-relaxed font-serif pt-1">
                              {article.contentSnippet || "ไม่พบระเบียงย่อขยายรายละเอียด กรุณาคลิกเพื่อประมวลผลความมั่นคงระดับ AI"}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-950 flex items-center justify-between text-[11px] font-mono text-slate-500">
                            <span className="truncate max-w-[150px]">AUTHOR: {article.creator}</span>
                            <span className="text-indigo-405 group-hover:underline flex items-center space-x-1 font-bold shrink-0">
                              <span>วิเคราะห์ระดับ AI</span>
                              <span>&rarr;</span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: ANALYSIS ARCHIVE */}
          {activeTab === "archive" && (
            <div className="space-y-6">
              
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <BookMarked className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-mono font-bold text-slate-200">คลังวิเคราะห์ข่าวกรองที่จัดเก็บ (ARCHIVED INTELLIGENCE REPORTS)</h2>
                <span className="ml-auto text-xs font-mono text-slate-500">แฟ้มประวัติสะสมทั้งหมด: <strong>{savedReports.length}</strong> แฟ้ม</span>
              </div>

              {savedReports.length === 0 ? (
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-16 text-center space-y-4 shadow-inner">
                  <div className="mx-auto bg-slate-950 p-4 border border-slate-800 w-fit rounded-full flex items-center justify-center text-slate-650">
                    <Bookmark className="w-8 h-8 text-slate-600" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <p className="font-sans font-bold text-slate-200 text-sm">คลังรายงานประวัติข่าวกรองว่างเปล่า</p>
                    <p className="font-sans text-xs text-slate-500 leading-relaxed">
                      เมื่อคุณคลิกวิเคราะห์เชิงลึกข่าวสารในหน้า "กระแสข่าวแบบเรียลไทม์" แล้วคลิกเลือกปุ่ม **"บันทึกเข้าแฟ้มสะสม"** รายงานและรายละเอียดทั้งหมดจะถูกรวบรวมมาจัดเก็บไว้ที่นี่
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("feed")}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-550 text-white font-mono text-xs font-bold rounded-md transition"
                  >
                    ระบุข่าวและรันวิเคราะห์ AI
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {savedReports.map((item, index) => (
                    <div
                      key={item.article.id}
                      onClick={() => setSelectedArticle(item.article)}
                      className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-lg p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-xl transition relative group"
                    >
                      <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-indigo-550 to-rose-550 rounded-r"></div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-indigo-950 uppercase font-bold">
                            {item.article.source}
                          </span>
                          <span className="text-slate-550">จัดเก็บเมื่อ: {new Date(item.savedAt).toLocaleDateString("th-TH")}</span>
                        </div>

                        <h3 className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors font-sans text-base leading-snug line-clamp-2">
                          {item.article.title}
                        </h3>

                        {item.report ? (
                          <div className="bg-slate-950 p-2.5 border border-slate-850 rounded font-sans text-xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-1 font-mono text-[10px]">
                              <span className="text-slate-450 uppercase">{item.report.intelligenceDomain}</span>
                              <span className="text-rose-450 font-bold">ภัยทางสากล: {item.report.threatMetrics.score}/10</span>
                            </div>
                            <p className="text-slate-350 line-clamp-2 font-serif leading-relaxed">
                              {item.report.executiveSummary}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-500 font-mono text-xs leading-normal">
                            (รายงานพื้นฐาน ไม่พบคลิปข้อมูลสถิติเชิงลึก)
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between font-mono text-[11px] text-slate-500 border-t border-slate-950">
                        <span>RECORD: OSINT-{item.article.id.toUpperCase()}</span>
                        <span className="text-indigo-400 font-bold">เปิดระเบียนข้อมูล &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </main>

      </div>

      {/* 3. Deep Analysis Drawer/Modal overlay selector */}
      <ArticleDetailModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        isBookmarked={selectedArticle ? isArticleBookmarked(selectedArticle.id) : false}
        onToggleBookmark={handleToggleBookmark}
        language={language}
      />

      {/* 4. Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 px-6 mt-12 font-mono text-xs text-slate-500">
        <div className="max-w-[1600px] w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-bold text-slate-400">{t.footerTitle}</p>
            <p className="text-[11px] text-slate-650 font-sans">{t.footerDesc}</p>
          </div>
          <div className="flex items-center space-x-3 text-slate-600">
            <span>{t.footerCommand}</span>
            <span>|</span>
            <span>{t.footerAccess}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
