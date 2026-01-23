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
      # Get total count of ALL repos (including forks) for the stat number
      stats: repositories(ownerAffiliations: OWNER) {
        totalCount
      }
      # Get the top 6 NON-FORK repos for analysis
      repositories(first: 6, orderBy: {field: STARGAZERS, direction: DESC}, ownerAffiliations: OWNER, isFork: false) {
        totalCount
        nodes {
          name
          description
          stargazerCount
          forkCount
          pushedAt
          primaryLanguage { name }
          licenseInfo { name }
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

    // --- 1. Audit Repositories ---
    const analyzedRepos: AnalyzedRepo[] = user.repositories.nodes.map((repo: any) => {
      const issues: string[] = [];
      let score = 100;

      if (!repo.description) { issues.push("Missing Description"); score -= 10; }
      if (!repo.licenseInfo) { issues.push("No License"); score -= 20; }
      if (!repo.object?.text) { issues.push("No README"); score -= 40; }
      else if (repo.object.text.length < 200) { issues.push("Weak README"); score -= 20; }
      
      const lastPush = new Date(repo.pushedAt);
      const daysSincePush = (Date.now() - lastPush.getTime()) / (1000 * 3600 * 24);
      if (daysSincePush > 180) { issues.push("Inactive > 6mo"); score -= 15; }

      return {
        name: repo.name,
        description: repo.description || "",
        language: repo.primaryLanguage?.name || "Unknown",
        stars: repo.stargazerCount,
        lastUpdated: new Date(repo.pushedAt).toLocaleDateString(),
        issues,
        score: Math.max(0, score)
      };
    });

    // --- 2. Calculate Profile Scores ---
    let brandingScore = 0;
    if (user.bio) brandingScore += 20;
    if (user.company) brandingScore += 10;
    if (user.location) brandingScore += 10;
    if (user.websiteUrl) brandingScore += 30;
    if (user.twitterUsername) brandingScore += 10;
    if (user.avatarUrl) brandingScore += 20;

    const repoQualityAvg = analyzedRepos.reduce((acc, r) => acc + r.score, 0) / (analyzedRepos.length || 1);
    
    // Simple consistency proxy
    const consistencyScore = analyzedRepos.some(r => r.issues.includes("Inactive > 6mo")) ? 40 : 85;

    const totalScore = Math.round((brandingScore * 0.2) + (repoQualityAvg * 0.5) + (consistencyScore * 0.3));

    return {
      username,
      avatarUrl: user.avatarUrl,
      name: user.name || username,
      bio: user.bio || "",
      followers: user.followers.totalCount,
      scores: {
        total: totalScore,
        branding: brandingScore,
        repoQuality: Math.round(repoQualityAvg),
        consistency: consistencyScore,
        profile: totalScore 
      },
      stats: {
        // FIX: Use the totalCount from the 'stats' alias we added to the query
        totalRepos: user.stats.totalCount, 
        totalStars: analyzedRepos.reduce((acc, r) => acc + r.stars, 0),
        forks: analyzedRepos.reduce((acc, r) => acc + (r as any).forkCount || 0, 0),
      },
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