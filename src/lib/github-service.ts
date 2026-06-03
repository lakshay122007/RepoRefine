import { graphql } from "@octokit/graphql";
import { AnalyzedRepo, ProfileAnalysis } from "@/types";

const github = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const PROFILE_QUERY = `
  query($username: String!) {
    user(login: $username) {
      name
      avatarUrl
      bio
      company
      location
      twitterUsername
      websiteUrl
      followers { totalCount }
      
      # Get total count of ALL repos (including forks)
      stats: repositories(ownerAffiliations: OWNER) {
        totalCount
      }

      # FETCH UP TO 100 NON-FORK REPOS
      # We sort by STARGAZERS to ensure we analyze the most important work first
      repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}, ownerAffiliations: OWNER, isFork: false) {
        nodes {
          name
          description
          stargazerCount
          forkCount
          pushedAt
          primaryLanguage { name }
          licenseInfo { name }
          openIssues: issues(states: OPEN) { totalCount }
          object(expression: "HEAD:README.md") {
            ... on Blob { text }
          }
        }
      }
    }
  }
`;

export async function getProfileData(username: string): Promise<Partial<ProfileAnalysis>> {
  try {
    const data: any = await github(PROFILE_QUERY, { username });
    
    if (!data.user) {
      throw new Error(`User '${username}' not found on GitHub.`);
    }

    const user = data.user;
    const breakdown: { label: string; value: number; reason: string }[] = [];

    // --- 1. Audit Repositories (Up to 100) ---
    const analyzedRepos: AnalyzedRepo[] = user.repositories.nodes.map((repo: any) => {
      const issues: string[] = [];
      let score = 100;

      if (!repo.description) { issues.push("Missing Description"); score -= 10; }
      if (!repo.licenseInfo) { issues.push("No License"); score -= 20; }
      
      // Strict README check
      if (!repo.object?.text) { 
        issues.push("No README"); 
        score -= 40; 
      } else if (repo.object.text.length < 300) { 
        issues.push("Weak README"); 
        score -= 20; 
      }
      
      const lastPush = new Date(repo.pushedAt);
      const daysSincePush = (Date.now() - lastPush.getTime()) / (1000 * 3600 * 24);
      if (daysSincePush > 365) { issues.push("Inactive > 1yr"); score -= 10; }

      const openIssueCount = repo.openIssues?.totalCount || 0;
      if (openIssueCount > 10) { issues.push(`${openIssueCount} stale open issues`); score -= 15; }
      else if (openIssueCount > 5) { issues.push(`${openIssueCount} open issues`); score -= 5; }

      return {
        name: repo.name,
        description: repo.description || "",
        language: repo.primaryLanguage?.name || "Unknown",
        stars: repo.stargazerCount,
        forks: repo.forkCount,
        openIssues: openIssueCount,
        lastUpdated: new Date(repo.pushedAt).toLocaleDateString(),
        issues,
        score: Math.max(0, score)
      };
    });

    // --- SMART SCORING ---
    // Instead of a flat average (which punishes you for old experimental repos),
    // we take the weighted average of your Top 10 repos (by stars).
    // The rest of the repos only count for 20% of the grade.
    
    const topRepos = analyzedRepos.slice(0, 10);
    const otherRepos = analyzedRepos.slice(10);

    const topAvg = topRepos.reduce((acc, r) => acc + r.score, 0) / (topRepos.length || 1);
    const otherAvg = otherRepos.length > 0 
      ? otherRepos.reduce((acc, r) => acc + r.score, 0) / otherRepos.length 
      : topAvg; // Fallback if < 10 repos

    // Weighted Quality Score: Top repos matter 80%, others 20%
    const weightedRepoScore = Math.round((topAvg * 0.8) + (otherAvg * 0.2));

    breakdown.push({ 
      label: "Code Standards", 
      value: weightedRepoScore, 
      reason: `Weighted score of ${analyzedRepos.length} repositories (Top 10 impactful projects prioritized).` 
    });

    // --- 2. Branding ---
    let brandingScore = 0;
    if (user.bio) brandingScore += 20; 
    if (user.company) brandingScore += 10;
    if (user.location) brandingScore += 10;
    if (user.websiteUrl) brandingScore += 30;
    if (user.twitterUsername) brandingScore += 10;
    if (user.avatarUrl) brandingScore += 20;

    breakdown.push({ 
      label: "Profile Completeness", 
      value: brandingScore, 
      reason: user.bio ? "Bio and links present." : "Missing key profile details." 
    });

    // --- 3. Consistency ---
    // Check if the user has pushed code in the last 30 days to ANY repo
    const recentActivity = analyzedRepos.some(r => {
       const date = new Date(r.lastUpdated);
       const days = (Date.now() - date.getTime()) / (1000 * 3600 * 24);
       return days < 30;
    });
    
    const consistencyScore = recentActivity ? 95 : 40;

    breakdown.push({ 
      label: "Activity Health", 
      value: consistencyScore, 
      reason: recentActivity ? "Recent contributions detected." : "No code pushed in over 30 days." 
    });

    const totalScore = Math.round(
      (weightedRepoScore * 0.5) +      
      (brandingScore * 0.2) + 
      (consistencyScore * 0.3) 
    );

    return {
      username,
      avatarUrl: user.avatarUrl,
      name: user.name || username,
      bio: user.bio || "",
      followers: user.followers.totalCount,
      scores: {
        total: totalScore,
        branding: brandingScore,
        repoQuality: weightedRepoScore,
        consistency: consistencyScore,
        profile: totalScore
      },
      stats: {
        totalRepos: user.stats.totalCount, 
        totalStars: analyzedRepos.reduce((acc, r) => acc + r.stars, 0),
        forks: analyzedRepos.reduce((acc, r) => acc + r.forks, 0),      },
      // Return all analyzed repos
      repos: analyzedRepos,
      redFlags: analyzedRepos.flatMap(r => r.issues).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5),
    };

  } catch (error: any) {
    console.error("GitHub API Error Details:", error);
    if (error.errors) {
       throw new Error(error.errors[0].message);
    }
    throw new Error(error.message || "GitHub API failed");
  }
}