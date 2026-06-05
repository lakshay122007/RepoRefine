import { graphql } from "@octokit/graphql";
import { parseRepoUrl } from "@/lib/parse-repo-url";
import {
  detectReadmeSections,
  extractReadmeHeadings,
  scoreReadmeQuality,
} from "@/lib/analyze-readme";
import {
  detectTechStack,
  parseEnvExampleKeys,
  parsePackageJsonScripts,
} from "@/lib/analyze-tech-stack";
import {
  analyzeRepoHealth,
  buildSuggestedIssues,
  detectTestSetup,
} from "@/lib/analyze-repo-health";
import { generateTemplateReadme } from "@/lib/readme-generator";
import { generateRepoReadme } from "@/lib/ai-service";
import { RepoLinkAudit } from "@/types";

const PROBE_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".env.example",
  ".env.sample",
  "jest.config.js",
  "jest.config.ts",
  "vitest.config.ts",
  "pytest.ini",
  "turbo.json",
  "next.config.js",
  "next.config.ts",
  "vite.config.ts",
  "tsconfig.json",
  "CONTRIBUTING.md",
];

const github = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const REPO_QUERY = `
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      description
      url
      isFork
      isPrivate
      pushedAt
      stargazerCount
      forkCount
      primaryLanguage { name }
      licenseInfo { name }
      repositoryTopics(first: 20) {
        nodes { topic { name } }
      }
      languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
        edges { node { name } }
      }
      issues(states: OPEN) { totalCount }
      readme: object(expression: "HEAD:README.md") {
        ... on Blob { text }
      }
      root: object(expression: "HEAD:") {
        ... on Tree { entries { name type } }
      }
      workflows: object(expression: "HEAD:.github/workflows") {
        ... on Tree { entries { name } }
      }
    }
  }
`;

const BLOB_QUERY = `
  query($owner: String!, $name: String!, $expression: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: $expression) {
        ... on Blob { text }
      }
    }
  }
`;

type RepoQueryResult = {
  repository: {
    name: string;
    description: string | null;
    url: string;
    isFork: boolean;
    isPrivate: boolean;
    pushedAt: string;
    stargazerCount: number;
    forkCount: number;
    primaryLanguage: { name: string } | null;
    licenseInfo: { name: string } | null;
    repositoryTopics: { nodes: Array<{ topic: { name: string } }> };
    languages: { edges: Array<{ node: { name: string } }> };
    issues: { totalCount: number };
    readme: { text: string } | null;
    root: { entries: Array<{ name: string; type: string }> } | null;
    workflows: { entries: Array<{ name: string }> } | null;
  } | null;
};

async function fetchBlob(owner: string, name: string, path: string): Promise<string | null> {
  try {
    const data = (await github(BLOB_QUERY, {
      owner,
      name,
      expression: `HEAD:${path}`,
    })) as { repository: { object: { text: string } | null } };
    return data.repository?.object?.text ?? null;
  } catch {
    return null;
  }
}

export async function analyzeRepoFromUrl(repoUrl: string): Promise<RepoLinkAudit> {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const data = (await github(REPO_QUERY, { owner, name: repo })) as RepoQueryResult;

  if (!data.repository) {
    throw new Error(`Repository '${owner}/${repo}' not found on GitHub.`);
  }

  if (data.repository.isPrivate) {
    throw new Error("Private repositories require a token with repo scope.");
  }

  const r = data.repository;
  const rootEntries = r.root?.entries?.map((e) => e.name) ?? [];
  const workflowFiles = r.workflows?.entries?.map((e) => e.name) ?? [];
  const hasCI = workflowFiles.length > 0;

  const fileContents: Record<string, string> = {};
  const configFiles: string[] = [];

  const blobs = await Promise.all(
    PROBE_FILES.map(async (path) => {
      const text = await fetchBlob(owner, repo, path);
      return { path, text };
    })
  );

  for (const { path, text } of blobs) {
    if (text) {
      fileContents[path] = text;
      configFiles.push(path);
    }
  }

  const languages = r.languages.edges.map((e) => e.node.name);
  const topics = r.repositoryTopics.nodes.map((n) => n.topic.name);
  const readmeContent = r.readme?.text ?? "";
  const readmeExists = readmeContent.length > 0;

  const headings = readmeExists ? extractReadmeHeadings(readmeContent) : [];
  const { sectionsFound, sectionsMissing } = detectReadmeSections(headings);

  const hasEnvExample = Boolean(fileContents[".env.example"] || fileContents[".env.sample"]);
  const envKeys = parseEnvExampleKeys(
    fileContents[".env.example"] || fileContents[".env.sample"] || ""
  );
  const hasContributing = Boolean(fileContents["CONTRIBUTING.md"]);
  const hasDocker = Boolean(
    fileContents["Dockerfile"] || fileContents["docker-compose.yml"] || fileContents["docker-compose.yaml"]
  );

  const scripts = fileContents["package.json"]
    ? parsePackageJsonScripts(fileContents["package.json"])
    : {};

  const hasTests = detectTestSetup(rootEntries, scripts, configFiles);
  const techStack = detectTechStack(fileContents, languages, topics);

  const readmeQualityScore = scoreReadmeQuality(
    readmeExists,
    readmeContent,
    sectionsFound,
    hasEnvExample
  );

  const daysSincePush =
    (Date.now() - new Date(r.pushedAt).getTime()) / (1000 * 3600 * 24);

  const healthInput = {
    description: r.description,
    license: r.licenseInfo?.name ?? null,
    hasCI,
    hasTests,
    hasDocker,
    hasEnvExample,
    hasContributing,
    readmeExists,
    readmeQualityScore,
    sectionsMissing,
    openIssues: r.issues.totalCount,
    daysSincePush,
    isFork: r.isFork,
    scripts,
  };

  const health = analyzeRepoHealth(healthInput);

  const partialAudit: Partial<RepoLinkAudit> = {
    owner,
    repo: r.name,
    url: r.url,
    metadata: {
      description: r.description ?? "",
      stars: r.stargazerCount,
      forks: r.forkCount,
      license: r.licenseInfo?.name ?? null,
      language: r.primaryLanguage?.name ?? null,
      topics,
      lastPushed: new Date(r.pushedAt).toLocaleDateString(),
      openIssues: r.issues.totalCount,
      isFork: r.isFork,
    },
    techStack: {
      languages,
      ...techStack,
    },
    signals: {
      hasCI,
      hasTests,
      hasDocker,
      hasEnvExample,
      hasContributing,
      configFiles,
      rootEntries,
      workflowFiles,
      scripts,
    },
    readme: {
      exists: readmeExists,
      content: readmeContent,
      wordCount: readmeContent.split(/\s+/).filter(Boolean).length,
      sectionsFound,
      sectionsMissing,
      qualityScore: readmeQualityScore,
    },
    health,
  };

  const templateReadme = generateTemplateReadme(partialAudit, envKeys);
  let generatedReadme = templateReadme;
  let improvementSummary = "README generated from detected repository signals.";
  let suggestedIssues = buildSuggestedIssues({
    ...healthInput,
    owner,
    repo: r.name,
    envKeys,
    workflowFiles,
  });
  let aiEnhanced = false;

  try {
    if (process.env.GROQ_API_KEY) {
      const aiResult = await generateRepoReadme(partialAudit as RepoLinkAudit, templateReadme, envKeys);
      generatedReadme = aiResult.readme || templateReadme;
      improvementSummary = aiResult.improvementSummary || improvementSummary;
      if (aiResult.suggestedIssues?.length) {
        suggestedIssues = [...suggestedIssues, ...aiResult.suggestedIssues].slice(0, 10);
      }
      aiEnhanced = true;
    }
  } catch {
    // fallback to template
  }

  return {
    ...(partialAudit as RepoLinkAudit),
    generatedReadme,
    improvementSummary,
    suggestedIssues,
    aiEnhanced,
  };
}
