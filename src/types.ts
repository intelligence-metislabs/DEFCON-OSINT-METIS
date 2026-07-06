export interface NewsArticle {
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

export interface GeopoliticalTrend {
  trend: string;
  description: string;
  impact: "High" | "Medium" | "Low";
}

export interface SourceBias {
  source: string;
  sentimentSummary: string;
  narrativeFocus: string;
  biasLevel: string; // e.g., low, moderate, significant
}

export interface ThreatHotspot {
  region: string;
  threatScore: number;
  status: "Critical" | "Severe" | "Elevated" | "Low";
  coords: {
    lat: number;
    lng: number;
  };
  incidentsSummary: string;
}

export interface CriticalEntity {
  name: string;
  type: "Person" | "Organization" | "Location" | "Event";
  role: string;
  mentions: number;
}

export interface OSINTDashboardStats {
  executiveBriefing: string;
  geopoliticalTrends: GeopoliticalTrend[];
  sourceBiasAnalysis: SourceBias[];
  threatMatrix: ThreatHotspot[];
  criticalEntities: CriticalEntity[];
  generatedAt: string;
  fromCache?: boolean;
}

export interface OSINTArticleReport {
  executiveSummary: string;
  intelligenceDomain: string;
  threatMetrics: {
    score: number;
    impactScale: string;
    analysis: string;
  };
  tacticalExtracts: {
    keyActors: string[];
    hotspots: string[];
    targetOrganizations: string[];
  };
  propagandaAssessment: {
    narrativeAngle: string;
    loadedTermsDetected: string;
    omissionsDetected: string;
  };
  strategicSecurityImplications: {
    immediateThreats: string;
    longTermVulnerabilities: string;
  };
  recommendedTakeaways: string[];
}
