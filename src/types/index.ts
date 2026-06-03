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
  strengths: string[];
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