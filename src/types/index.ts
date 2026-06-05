export interface ProfileAnalysis {
  username: string;
  avatarUrl: string;
  name: string;
  bio: string;
  followers: number;
  scores: {
    total: number;
    profile: number;
    repoQuality: number;
    consistency: number;
    branding: number;
  };
  stats: {
    totalRepos: number;
    totalStars: number;
    forks: number;
  };
  repos: AnalyzedRepo[];
  redFlags: string[];
  aiReview: {
    persona: string;
    commentary: string;
    roadmap: string[];
  };
}

export interface AnalyzedRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  lastUpdated: string;
  issues: string[]; // e.g. "No README", "No License"
  score: number; // 0-100
}

export type Persona = 'recruiter' | 'roast' | 'mentor';

export type AuditMode = 'profile' | 'repo';

export interface SuggestedIssue {
  title: string;
  body: string;
  labels: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface RepoLinkAudit {
  owner: string;
  repo: string;
  url: string;
  metadata: {
    description: string;
    stars: number;
    forks: number;
    license: string | null;
    language: string | null;
    topics: string[];
    lastPushed: string;
    openIssues: number;
    isFork: boolean;
  };
  techStack: {
    languages: string[];
    frameworks: string[];
    packageManagers: string[];
    runtimes: string[];
    infra: string[];
  };
  signals: {
    hasCI: boolean;
    hasTests: boolean;
    hasDocker: boolean;
    hasEnvExample: boolean;
    hasContributing: boolean;
    configFiles: string[];
    rootEntries: string[];
    workflowFiles: string[];
    scripts: Record<string, string>;
  };
  readme: {
    exists: boolean;
    content: string;
    wordCount: number;
    sectionsFound: string[];
    sectionsMissing: string[];
    qualityScore: number;
  };
  health: {
    score: number;
    documentationScore: number;
    issues: string[];
  };
  generatedReadme: string;
  improvementSummary: string;
  suggestedIssues: SuggestedIssue[];
  aiEnhanced: boolean;
}
