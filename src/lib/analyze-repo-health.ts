import { SuggestedIssue } from "@/types";

type HealthInput = {
  description: string | null;
  license: string | null;
  hasCI: boolean;
  hasTests: boolean;
  hasDocker: boolean;
  hasEnvExample: boolean;
  hasContributing: boolean;
  readmeExists: boolean;
  readmeQualityScore: number;
  sectionsMissing: string[];
  openIssues: number;
  daysSincePush: number;
  isFork: boolean;
  scripts: Record<string, string>;
};

export function analyzeRepoHealth(input: HealthInput): {
  score: number;
  documentationScore: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  if (!input.description) {
    issues.push("Missing repository description");
    score -= 10;
  }
  if (!input.license) {
    issues.push("No license");
    score -= 15;
  }
  if (!input.readmeExists) {
    issues.push("No README");
    score -= 30;
  } else if (input.readmeQualityScore < 50) {
    issues.push("Weak README");
    score -= 15;
  }
  if (!input.hasCI) {
    issues.push("No CI/CD");
    score -= 10;
  }
  if (!input.hasTests) {
    issues.push("No test setup detected");
    score -= 10;
  }
  if (!input.hasEnvExample && input.sectionsMissing.includes("environment")) {
    issues.push("Missing environment variable documentation");
    score -= 5;
  }
  if (input.daysSincePush > 365) {
    issues.push("Inactive > 1 year");
    score -= 10;
  } else if (input.daysSincePush > 180) {
    issues.push("Inactive > 6 months");
    score -= 5;
  }
  if (input.isFork) {
    issues.push("Fork — verify originality");
    score -= 5;
  }

  const documentationScore = input.readmeQualityScore;

  return {
    score: Math.max(0, Math.min(100, score)),
    documentationScore,
    issues,
  };
}

export function buildSuggestedIssues(input: HealthInput & {
  owner: string;
  repo: string;
  envKeys: string[];
  workflowFiles: string[];
}): SuggestedIssue[] {
  const issues: SuggestedIssue[] = [];

  if (!input.readmeExists) {
    issues.push({
      title: "Add a comprehensive README",
      body: `## Problem\n${input.owner}/${input.repo} has no README file.\n\n## Suggested sections\n- Project overview\n- Installation\n- Usage\n- Environment variables\n- Testing\n- Contributing\n- License`,
      labels: ["documentation", "good first issue"],
      priority: "high",
    });
  } else {
    for (const section of input.sectionsMissing) {
      if (["installation", "usage", "testing"].includes(section)) {
        issues.push({
          title: `Add README section: ${section}`,
          body: `The README is missing a **${section}** section. Add clear instructions so new contributors and users can get started quickly.`,
          labels: ["documentation"],
          priority: section === "installation" ? "high" : "medium",
        });
      }
    }
  }

  if (!input.hasCI) {
    issues.push({
      title: "Set up CI/CD with GitHub Actions",
      body: "Add a workflow under `.github/workflows/` to run linting, tests, and builds on pull requests.",
      labels: ["ci/cd", "enhancement"],
      priority: "high",
    });
  }

  if (!input.hasTests) {
    issues.push({
      title: "Add automated tests",
      body: "Introduce a test suite and document how to run tests in the README.",
      labels: ["testing", "enhancement"],
      priority: "medium",
    });
  }

  if (!input.hasEnvExample && input.envKeys.length === 0) {
    issues.push({
      title: "Document required environment variables",
      body: "Add a `.env.example` file listing required environment variables with placeholder values.",
      labels: ["documentation", "setup"],
      priority: "medium",
    });
  }

  if (!input.license) {
    issues.push({
      title: "Add a LICENSE file",
      body: "Choose an open-source license (MIT, Apache-2.0, etc.) so others know how they can use this project.",
      labels: ["legal", "documentation"],
      priority: "medium",
    });
  }

  if (!input.hasContributing) {
    issues.push({
      title: "Add contributing guidelines",
      body: "Create a CONTRIBUTING.md with setup steps, code style expectations, and PR process.",
      labels: ["documentation", "good first issue"],
      priority: "low",
    });
  }

  if (input.openIssues > 20) {
    issues.push({
      title: "Triage open issues",
      body: `There are ${input.openIssues} open issues. Review, label, and close stale items to improve project health.`,
      labels: ["maintenance"],
      priority: "low",
    });
  }

  return issues;
}

export function detectTestSetup(
  rootEntries: string[],
  scripts: Record<string, string>,
  files: string[]
): boolean {
  const testDirs = ["tests", "test", "__tests__", "spec"];
  if (rootEntries.some((entry) => testDirs.includes(entry.toLowerCase()))) return true;
  if (files.some((f) => /jest\.config|vitest\.config|pytest\.ini|\.test\.|\.spec\./i.test(f))) return true;
  if (Object.keys(scripts).some((key) => /test/i.test(key))) return true;
  return false;
}
