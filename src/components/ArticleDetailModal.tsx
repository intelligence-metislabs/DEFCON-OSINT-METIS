import React, { useState, useEffect } from "react";
import { NewsArticle, OSINTArticleReport } from "../types";
import { 
  X, Loader2, Sparkles, AlertTriangle, ShieldCheck, 
  MapPin, Flag, FileText, Bookmark, BookmarkCheck, 
  ArrowUpRight, Users, Compass, CheckCircle2, Download 
} from "lucide-react";

interface ArticleDetailModalProps {
  article: NewsArticle | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (article: NewsArticle, report?: OSINTArticleReport) => void;
  language: "EN" | "TH";
}

export default function ArticleDetailModal({ 
  article, 
  onClose, 
  isBookmarked, 
  onToggleBookmark,
  language
}: ArticleDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OSINTArticleReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [fromFirebaseCache, setFromFirebaseCache] = useState(false);

  const EN_TX = {
    titlePrefix: "DEFCON INTEL RECORD",
    pubDatePrefix: "Published:",
    reporterPrefix: "Copyist/Reporter",
    cancelBookmark: "Cancel bookmark",
    saveBookmark: "Save to file",
    openOrigin: "Open Original Source",
    feedSummary: "Original Feed Summary (Translated to English)",
    feedSummaryFallback: "No content snippet details are available in this RSS feed.",
    mainTitle: "OSINT AI MILITARY-GRADE ANALYTICS",
    firebaseCache: "FIREBASE CACHE",
    liveExtraction: "LIVE EXTRACTION",
    exportReport: "Export MD Report",
    loadingIntel: "Synthesizing OSINT intelligence report...",
    threatIndex: "THREAT INDEX (SEC LEVEL)",
    intelVector: "INTEL VECTOR DOMAIN",
    tacticalExtracts: "TACTICAL EXTRACTS (DATA EXTRACTIONS)",
    keyActors: "KEY ACTORS DETECTED",
    hotspots: "HOTSPOTS DETECTED",
    targetCoalitions: "COALITIONS & ORGANIZATIONS",
    executiveBriefing: "EXECUTIVE COGNITIVE BRIEFING",
    mediaBias: "MEDIA BIAS / COGNITIVE WARFARE ANALYSIS",
    narrativeAngle: "MAIN NARRATIVE ANGLE",
    loadedPhrases: "LOADED TERMS & PHRASES DETECTED",
    omissions: "OMISSIONS DETECTED (HISTORICAL BACKGROUND)",
    noOmissions: "No omissions identified",
    noLoaded: "No loaded terms identified",
    strategicImplications: "SECURITY SYSTEMIC IMPLICATIONS (RISK MODEL)",
    immediateThreat: "IMMEDIATE TARGET THREAT",
    longTermStructural: "LONG-TERM STRUCTURAL WEAKNESS",
    analystTakeaways: "RECOMMENDED ACTIONS FOR INTELLIGENCE ANALYSTS",
    reportTitle: "DEFCON NEWS INTELLIGENCE ANALYSIS REPORT",
    recordId: "RECORD ID",
    newsTopic: "NEWS ARTICLE TOPIC",
    originSource: "ORIGIN SOURCE OUTLET",
    pubDateLabel: "PUBLISHED DATE",
    originalLink: "SOURCE REFERRAL LINK",
  };

  const TH_TX = {
    titlePrefix: "บันทึกข่าวกรองพิเศษ",
    pubDatePrefix: "เผยแพร่เมื่อ:",
    reporterPrefix: "ผู้รายงาน/คัดลอก",
    cancelBookmark: "ยกเลิกเก็บข้อมูล",
    saveBookmark: "บันทึกเข้าแฟ้มสะสม",
    openOrigin: "เปิดแหล่งข่าวจริง",
    feedSummary: "สรุปภาพรวมข่าวเบื้องต้น (ORIGINAL FEED EXTRACT/TRANSLATED)",
    feedSummaryFallback: "ไม่พบรายละเอียดข้อความเพิ่มเติมใน RSS feed",
    mainTitle: "OSINT AI MILITARY-GRADE ANALYTICS",
    firebaseCache: "FIREBASE CACHE",
    liveExtraction: "LIVE EXTRACTION",
    exportReport: "ส่งออกรายงาน MD",
    loadingIntel: "กำลังประมวลข่าวกรอง OSINT...",
    threatIndex: "THREAT INDEX (ระดับภัยคุกคาม)",
    intelVector: "หมวดหมู่หลักทางข่าวกรอง (INTEL VECTOR DOMAIN)",
    tacticalExtracts: "TACTICAL EXTRACTS (สกัดข้อมูลเชิงยุทธวิธี)",
    keyActors: "ตัวละครสำคัญ (KEY ACTORS)",
    hotspots: "พื้นที่สมรภูมิขัดแย้ง (HOTSPOTS)",
    targetCoalitions: "องค์กร/ความร่วมมือ (TARGET COALITIONS)",
    executiveBriefing: "บทสรุปข่าวกรองฝ่ายบริหาร (EXECUTIVE COGNITIVE BRIEFING)",
    mediaBias: "การวิเคราะห์โฆษณาชวนเชื่อและการกำหนดทิศทางข่าว (MEDIA BIAS / COGNITIVE WARFARE)",
    narrativeAngle: "แนวทางเล่าเรื่องหลัก (NARRATIVE ANGLE)",
    loadedPhrases: "คำที่แฝงอารมณ์จูงใจผู้อ่าน (LOADED PHRASES)",
    omissions: "จุดสาระที่ถูกละเว้นละเลย (OMISSIONS DETECTED)",
    noOmissions: "ตรวจสอบไม่พบจุดเว้นว่างเด่นชัด",
    noLoaded: "ไม่พบลอยแผลหรือคำเฉพาะเจาะจง",
    strategicImplications: "ผลกระทบเชิงความมั่นคงระยะยาว (SECURITY SYSTEMIC IMPLICATIONS)",
    immediateThreat: "ภัยคุกคามฉับพลันเฉพาะหน้า (IMMEDIATE THREAT)",
    longTermStructural: "จุดเปราะบางเชิงโครงสร้างระยะยาว (LONG-TERM WEAKNESS)",
    analystTakeaways: "ปฏิบัติการแนะนำสำหรับนักวิเคราะห์ข่าวกรอง (ANALYST TAKEAWAYS)",
    reportTitle: "รายงานวิเคราะห์ข่าวกรองพิเศษ DEFCON MONITOR",
    recordId: "ระเบียนข่าวไอดี",
    newsTopic: "หัวข้อข่าว",
    originSource: "สำนักข่าวต้นทาง",
    pubDateLabel: "วันที่นำเสนอข่าว",
    originalLink: "ลิงก์ข่าวอ้างอิง",
  };

  const t = language === "EN" ? EN_TX : TH_TX;

  const loadingPhrasesTh = [
    "ตระเตรียมช่องสัญญาณดาวเทียมเพื่อระบุพิกัด...",
    "กำลังประเมินกลยุทธ์สื่อและระดับความเอนเอียง (Propaganda Detection)...",
    "ตรวจสอบดัชนีภัยคุกคามและความเสี่ยงทางยุทธศาสตร์ความมั่นคง...",
    "สกัดรายชื่อผู้นำฝ่ายบริหาร องค์กรความมั่นคง และจุดขัดแย้ง...",
    "ประมวลผลดรรชนีวิเคราะห์ความสงบเรียบร้อยระดับสากลเชิงลึก..."
  ];

  const loadingPhrasesEn = [
    "Aligning satellite links to verify coordinates...",
    "Assessing news media framing and bias (Propaganda Detection)...",
    "Auditing risk indicators and strategic threat models...",
    "Extracting key actors, security coalitions, and active conflict hotspots...",
    "Synthesizing the complete multi-vector OSINT report..."
  ];

  const loadingPhrases = language === "EN" ? loadingPhrasesEn : loadingPhrasesTh;

  useEffect(() => {
    if (!article) return;

    // Reset state
    setReport(null);
    setError(null);
    setLoading(true);
    setLoadingStep(0);
    setFromFirebaseCache(false);

    // Look in localStorage first to check if we already ran deep analysis for this article in this language
    const cacheKey = `${article.id}_${language.toLowerCase()}`;
    const savedReports = localStorage.getItem("osint_saved_reports_cache_v2");
    if (savedReports) {
      try {
        const parsed = JSON.parse(savedReports);
        if (parsed[cacheKey]) {
          setReport(parsed[cacheKey]);
          setFromFirebaseCache(parsed[cacheKey].fromCache || false);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Cache parsing error:", err);
      }
    }

    // Interval to cycle through cool tactical OSINT steps
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
    }, 2200);

    // Fetch deep analysis from the server, passing lang in body
    fetch("/api/news/analyze-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...article, lang: language }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(language === "EN" ? "Failed to generate report via AI. Please try again." : "การประมวลผลผ่าน AI ล้มเหลว กรุณาลองใหม่อีกครั้ง");
        return res.json();
      })
      .then((resData) => {
        if (resData.success && resData.report) {
          const reportWithCache = { ...resData.report, fromCache: !!resData.fromCache };
          setReport(reportWithCache);
          setFromFirebaseCache(!!resData.fromCache);
          
          // Cache locally under the language-specific key with defensive try-to-parse logic
          let freshReports = {};
          if (savedReports) {
            try {
              freshReports = JSON.parse(savedReports);
            } catch (e) {
              console.warn("Invalid cached reports format. Re-initializing empty cache storage.", e);
            }
          }
          (freshReports as any)[cacheKey] = reportWithCache;
          localStorage.setItem("osint_saved_reports_cache_v2", JSON.stringify(freshReports));
        } else {
          throw new Error(resData.error || (language === "EN" ? "An error occurred during synthesis." : "เกิดข้อผิดพลาดในการสร้างรายงาน"));
        }
      })
      .catch((err: any) => {
        setError(err.message || (language === "EN" ? "Intelligence system network error." : "การเชื่อมโยงระบบวิเคราะห์ล้มเหลว"));
      })
      .finally(() => {
        clearInterval(interval);
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, [article, language]);

  if (!article) return null;

  // Show translated original text if available in report
  const displayTitle = report?.translatedTitle || article.title;
  const displaySnippet = report?.translatedSnippet || article.contentSnippet || article.content || "No details available";

  // Export as Markdown File
  const handleExportMarkdown = () => {
    if (!report) return;

    const mdContent = `
# ${t.reportTitle}
**${t.recordId}:** DF-${article.id.toUpperCase()}
**${t.newsTopic}:** ${displayTitle}
**${t.originSource}:** ${article.source}
**${t.pubDateLabel}:** ${new Date(article.isoDate || article.pubDate).toLocaleString(language === "EN" ? "en-US" : "th-TH")}
**${t.originalLink}:** ${article.link}

---

## 1. ${t.executiveBriefing}
${report.executiveSummary}

---

## 2. ${t.intelVector}
* **${t.intelVector}:** ${report.intelligenceDomain}
* **${t.threatIndex}:** ${report.threatMetrics.score} / 10
* **${t.intelVector} scale:** ${report.threatMetrics.impactScale}
* **Analysis:** ${report.threatMetrics.analysis}

---

## 3. ${t.tacticalExtracts}
* **${t.keyActors}:** ${report.tacticalExtracts.keyActors.join(", ") || "-"}
* **${t.hotspots}:** ${report.tacticalExtracts.hotspots.join(", ") || "-"}
* **${t.targetCoalitions}:** ${report.tacticalExtracts.targetOrganizations.join(", ") || "-"}

---

## 4. ${t.mediaBias}
* **${t.narrativeAngle}:** ${report.propagandaAssessment.narrativeAngle}
* **${t.loadedPhrases}:** ${report.propagandaAssessment.loadedTermsDetected || t.noLoaded}
* **${t.omissions}:** ${report.propagandaAssessment.omissionsDetected || t.noOmissions}

---

## 5. ${t.strategicImplications}
* **${t.immediateThreat}:** ${report.strategicSecurityImplications.immediateThreats}
* **${t.longTermStructural}:** ${report.strategicSecurityImplications.longTermVulnerabilities}

---

## 6. ${t.analystTakeaways}
${report.recommendedTakeaways.map((task, i) => `${i + 1}. ${task}`).join("\n")}

---
*Generated via OSINT News Tracker & AI Analytics Dashboard (Language: ${language})*
    `.trim();

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement("a");
    linkElement.href = url;
    linkElement.setAttribute("download", `OSINT_REPORT_${article.id.toUpperCase()}_${language}.md`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  const getThreatBadgeClass = (score: number) => {
    if (score >= 8) return "bg-red-950/70 text-red-400 border border-red-800/60";
    if (score >= 5) return "bg-amber-950/70 text-amber-400 border border-amber-800/60";
    return "bg-emerald-950/70 text-emerald-400 border border-emerald-800/60";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in" id="article-detail-modal-root">
      <div className="relative w-full max-w-4xl h-[92vh] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        
        {/* Terminal top-bar */}
        <div className="flex items-center justify-between bg-slate-950 px-4 py-3 border-b border-slate-800 font-mono text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span className="ml-2 font-bold text-slate-300">{t.titlePrefix}: DF-{article.id.toUpperCase()}</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition p-1 hover:bg-slate-900 rounded"
            id="close-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 font-sans space-y-6">
          {/* Article Source Headers */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-800/60 pb-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2.5 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-indigo-900/60 font-bold uppercase">
                  {article.source}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{t.pubDatePrefix} {new Date(article.isoDate || article.pubDate).toLocaleString(language === "EN" ? "en-US" : "th-TH")}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug">
                {displayTitle}
              </h1>
              <p className="text-xs text-slate-400 italic">
                {t.reporterPrefix}: {article.creator || "Anonymous Analyst"}
              </p>
            </div>

            <div className="flex flex-row md:flex-col gap-2 shrink-0">
              <button
                onClick={() => onToggleBookmark(article, report || undefined)}
                className={`flex items-center justify-center space-x-2 px-3.5 py-1.5 rounded-md font-mono text-xs transition border ${
                  isBookmarked 
                    ? "bg-slate-800 hover:bg-slate-755 text-indigo-400 border-indigo-900"
                    : "bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800"
                }`}
                id="bookmark-article-btn"
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>{t.cancelBookmark}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{t.saveBookmark}</span>
                  </>
                )}
              </button>

              <a
                href={article.link}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs transition"
                id="read-original-article-link"
              >
                <span>{t.openOrigin}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Original Content Snippet Panel */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-md p-4" id="original-feed-segment">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.feedSummary}</span>
            </h3>
            <p className="text-slate-300 font-sans text-sm leading-relaxed">
              {displaySnippet}
            </p>
          </div>

          {/* OSINT AI Intelligence Assessment Panel */}
          <div className="space-y-5" id="ai-assessment-panel">
            <div className="flex items-center space-x-2 border-b border-indigo-900/40 pb-2 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h2 className="text-lg font-bold font-mono text-slate-100">{t.mainTitle}</h2>
              </div>
              
              {report && (
                <>
                  {fromFirebaseCache ? (
                    <span className="bg-emerald-950/80 text-emerald-400 text-[10px] font-mono tracking-normal font-bold px-2 py-0.5 rounded border border-emerald-800/45 flex items-center space-x-1">
                      <span className="w-1.2 h-1.2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{t.firebaseCache}</span>
                    </span>
                  ) : (
                    <span className="bg-sky-950/80 text-sky-400 text-[10px] font-mono tracking-normal font-bold px-2 py-0.5 rounded border border-sky-850 flex items-center space-x-1">
                      <span className="w-1.2 h-1.2 rounded-full bg-sky-400"></span>
                      <span>{t.liveExtraction}</span>
                    </span>
                  )}
                  
                  <button
                    onClick={handleExportMarkdown}
                    className="ml-auto inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-mono text-indigo-400 hover:text-white bg-indigo-950/40 hover:bg-indigo-900 border border-indigo-800/55 rounded transition"
                    title={language === "EN" ? "Download report as Markdown (.md)" : "ดาวน์โหลดรายงานเป็น Markdown (.md)"}
                    id="export-md-report-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.exportReport}</span>
                  </button>
                </>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-slate-950/40 border border-slate-800/50 rounded-lg">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <div className="text-center space-y-1.5 font-mono">
                  <p className="text-slate-300 text-sm font-bold animate-pulse">{t.loadingIntel}</p>
                  <p className="text-indigo-400 text-xs tracking-wider">{loadingPhrases[loadingStep]}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-3 p-4 bg-red-950/40 border border-red-900/60 rounded-lg text-red-200">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-xs font-mono font-bold">{error}</p>
              </div>
            )}

            {report && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Left Column: Core threat levels and Domain */}
                <div className="md:col-span-1 space-y-5">
                  
                  {/* Danger score meter */}
                  <div className="bg-slate-950 border border-slate-800 rounded p-4 text-center space-y-3 shadow-sm">
                    <h4 className="text-xs font-mono text-slate-400 uppercase">{t.threatIndex}</h4>
                    <div className="relative inline-flex items-center justify-center">
                      <div className="text-4xl md:text-5xl font-mono font-extrabold text-slate-100">
                        {report.threatMetrics.score}
                        <span className="text-xs text-slate-500 font-normal">/10</span>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-wider ${getThreatBadgeClass(report.threatMetrics.score)}`}>
                        {report.threatMetrics.impactScale}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed text-left pt-2 border-t border-slate-900">
                      {report.threatMetrics.analysis}
                    </p>
                  </div>

                  {/* Context focus */}
                  <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3 font-mono text-xs">
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-1.5 flex items-center space-x-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t.intelVector}</span>
                    </h4>
                    <div className="bg-slate-900 p-2 border border-slate-800 rounded text-center text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
                      {report.intelligenceDomain}
                    </div>
                  </div>

                  {/* Extracts */}
                  <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-4 font-mono text-xs">
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wide border-b border-slate-900 pb-1.5 flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{t.tacticalExtracts}</span>
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <span className="text-slate-500 block mb-1">{t.keyActors}</span>
                        <div className="flex flex-wrap gap-1">
                          {report.tacticalExtracts.keyActors.map((actor, i) => (
                            <span key={i} className="bg-slate-900 hover:bg-slate-850 px-2 py-0.5 rounded border border-slate-800 text-[11px] text-slate-300">
                              {actor}
                            </span>
                          )) || "—"}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-1">{t.hotspots}</span>
                        <div className="flex flex-wrap gap-1">
                          {report.tacticalExtracts.hotspots.map((spot, i) => (
                            <span key={i} className="bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-950/60 text-[11px] text-slate-300 flex items-center space-x-0.5">
                              <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{spot}</span>
                            </span>
                          )) || "—"}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-1">{t.targetCoalitions}</span>
                        <div className="flex flex-wrap gap-1">
                          {report.tacticalExtracts.targetOrganizations.map((org, i) => (
                            <span key={i} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] text-slate-300">
                              {org}
                            </span>
                          )) || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: AI Deep briefing, Framing / Propaganda and Strategic Implications */}
                <div className="md:col-span-2 space-y-5">
                  
                  {/* Executive summary */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-2.5">
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5 border-b border-slate-900 pb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{t.executiveBriefing}</span>
                    </h3>
                    <p className="text-slate-200 text-sm leading-relaxed font-sans">
                      {report.executiveSummary}
                    </p>
                  </div>

                  {/* Framing Propaganda check */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3 font-mono text-xs">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5 border-b border-slate-900 pb-2">
                      <Flag className="w-4 h-4 text-amber-500" />
                      <span>{t.mediaBias}</span>
                    </h3>
                    
                    <div className="space-y-3 leading-relaxed font-sans text-sm text-slate-300">
                      <div>
                        <span className="font-mono text-xs text-slate-500 block mb-0.5">{t.narrativeAngle}</span>
                        <p className="bg-slate-900/60 p-2.5 border border-slate-800/80 rounded text-xs text-slate-300">
                          {report.propagandaAssessment.narrativeAngle}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="font-mono text-xs text-slate-500 block mb-0.5">{t.loadedPhrases}</span>
                          <div className="bg-slate-900/60 p-2.5 border border-slate-800/80 rounded text-[11px] font-mono leading-normal text-amber-400">
                            {report.propagandaAssessment.loadedTermsDetected || t.noLoaded}
                          </div>
                        </div>
                        <div>
                          <span className="font-mono text-xs text-slate-500 block mb-0.5">{t.omissions}</span>
                          <div className="bg-slate-900/60 p-2.5 border border-slate-800/80 rounded text-xs text-slate-300">
                            {report.propagandaAssessment.omissionsDetected || t.noOmissions}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategic vulnerabilities */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3.5">
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5 border-b border-slate-900 pb-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>{t.strategicImplications}</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                      <div className="space-y-1.5">
                        <span className="font-mono text-xs text-red-400 uppercase block">{t.immediateThreat}</span>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          {report.strategicSecurityImplications.immediateThreats}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="font-mono text-xs text-orange-400 uppercase block">{t.longTermStructural}</span>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          {report.strategicSecurityImplications.longTermVulnerabilities}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Analytical recommendations */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-5 space-y-3">
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5 border-b border-slate-900 pb-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      <span>{t.analystTakeaways}</span>
                    </h3>
                    
                    <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
                      {report.recommendedTakeaways.map((task, i) => (
                        <li key={i} className="flex items-start space-x-2 bg-slate-900/40 p-2 border border-slate-850 rounded">
                          <span className="font-mono font-bold text-indigo-400 text-xs mt-0.5">#{i+1}</span>
                          <span className="font-sans">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

              </div>
            )}
          </div>
        </div>

        {/* Footer info text */}
        <div className="bg-slate-950 px-6 py-2.5 border-t border-slate-800 text-[10px] text-slate-600 font-mono flex items-center justify-between">
          <span>CLASSIFICATION: OPEN SOURCE INTELLIGENCE (OSINT)</span>
          <span>DATA PROCESSED REAL-TIME BY COGNITIVE OSINT ENGINE ({language})</span>
        </div>

      </div>
    </div>
  );
}
