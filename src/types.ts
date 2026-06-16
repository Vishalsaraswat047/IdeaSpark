export interface PerformanceRating {
  score: number;
  feedback: string;
}

export interface Competitor {
  name: string;
  description: string;
  strengths: string;
  weaknesses: string;
}

export interface RoadmapStage {
  title: string;
  timeline: string;
  description: string;
  actions: string[];
  milestones: string[];
}

export interface IdeaReport {
  id: string;
  rawInput: string;
  title: string;
  tagline: string;
  category: "Startup" | "Research" | "Social Impact" | "Product Concept" | "Other";
  submittedAt: string;
  
  // Idea Analysis
  analysis: {
    problemStatement: string;
    solutionOverview: string;
    targetAudience: string;
    valueProposition: string;
    industryClassification: string;
  };

  // Scores
  scores: {
    overall: number;
    innovation: PerformanceRating;
    feasibility: PerformanceRating;
    impact: PerformanceRating;
    riskScore: PerformanceRating;
    startupPotential: PerformanceRating;
  };

  // Market Intelligence
  market: {
    competitors: Competitor[];
    marketSize: string;
    industryTrends: string[];
    marketOpportunities: string[];
  };

  // Improvements
  improvements: {
    additionalFeatures: string[];
    betterTargetMarkets: string[];
    productEnhancements: string[];
    strategicImprovements: string[];
  };

  // Roadmap
  roadmap: {
    stages: RoadmapStage[];
    recommendedTechnologies: string[];
    mvpFeatures: string[];
    launchStrategy: string[];
  };
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}
