import { RepoLinkAudit } from "@/types";

function installInstructions(audit: Partial<RepoLinkAudit>): string {
  const pm = audit.techStack?.packageManagers[0];

  if (pm === "pnpm") return "```bash\npnpm install\n```";
  if (pm === "yarn") return "```bash\nyarn install\n```";
  if (pm === "pip" || pm === "pipenv") {
    if (audit.signals?.configFiles.includes("pyproject.toml")) {
      return "```bash\npip install -e .\n```";
    }
    return "```bash\npip install -r requirements.txt\n```";
  }
  if (pm === "cargo") return "```bash\ncargo build\n```";
  if (pm === "go modules") return "```bash\ngo mod download\n```";
  if (audit.signals?.configFiles.includes("package.json")) {
    return "```bash\nnpm install\n```";
  }
  return "> Installation steps not detected — add setup instructions for your package manager.";
}

function usageInstructions(audit: Partial<RepoLinkAudit>): string {
  const scripts = audit.signals?.scripts ?? {};
  const dev = scripts.dev || scripts.start || scripts.serve;
  const pm = audit.techStack?.packageManagers[0] ?? "npm";
  const runCmd = pm === "pnpm" ? "pnpm" : pm === "yarn" ? "yarn" : "npm run";

  if (dev) {
    return `\`\`\`bash\n${runCmd} ${scripts.dev ? "dev" : scripts.start ? "start" : "serve"}\n\`\`\``;
  }
  if (scripts.build) {
    return `\`\`\`bash\n${runCmd} build\n\`\`\``;
  }
  return "> Usage instructions not detected — document how to run the project locally.";
}

function testingInstructions(audit: Partial<RepoLinkAudit>): string {
  const scripts = audit.signals?.scripts ?? {};
  const testScript = Object.keys(scripts).find((k) => /test/i.test(k));
  const pm = audit.techStack?.packageManagers[0] ?? "npm";
  const runCmd = pm === "pnpm" ? "pnpm" : pm === "yarn" ? "yarn" : "npm run";

  if (testScript) {
    return `\`\`\`bash\n${runCmd} ${testScript}\n\`\`\``;
  }
  if (audit.signals?.hasTests) {
    return "> Tests detected but no documented test command — add the run instructions here.";
  }
  return "> No test runner detected — add testing instructions when a suite is introduced.";
}

function environmentSection(audit: Partial<RepoLinkAudit>, envKeys: string[]): string {
  if (envKeys.length > 0) {
    const rows = envKeys.map((key) => `| \`${key}\` | Description needed | — |`).join("\n");
    return `Copy \`.env.example\` to \`.env\` and configure:\n\n| Variable | Description | Required |\n|----------|-------------|----------|\n${rows}`;
  }
  if (audit.signals?.hasEnvExample) {
    return "Copy `.env.example` to `.env` and fill in the required values.";
  }
  return "> No environment variables detected — document any required configuration here.";
}

export function generateTemplateReadme(
  audit: Partial<RepoLinkAudit>,
  envKeys: string[] = []
): string {
  const name = audit.repo ?? "Project";
  const desc = audit.metadata?.description || "A software project.";
  const license = audit.metadata?.license ?? "Not specified";
  const langs = audit.techStack?.languages?.join(", ") || audit.metadata?.language || "Unknown";
  const frameworks = audit.techStack?.frameworks?.join(", ");
  const infra = audit.techStack?.infra?.join(", ");

  const techLines = [
    `- **Language:** ${langs}`,
    frameworks ? `- **Framework:** ${frameworks}` : null,
    audit.techStack?.packageManagers?.length
      ? `- **Package manager:** ${audit.techStack.packageManagers.join(", ")}`
      : null,
    infra ? `- **Infrastructure:** ${infra}` : null,
    audit.signals?.hasCI ? `- **CI/CD:** GitHub Actions` : null,
    audit.signals?.hasDocker ? `- **Containerization:** Docker` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const features =
    audit.metadata?.topics && audit.metadata.topics.length > 0
      ? audit.metadata.topics.map((t) => `- ${t}`).join("\n")
      : "> Add a feature list describing what this project does.";

  return `# ${name}

${desc}

## Features

${features}

## Tech Stack

${techLines || "> Tech stack could not be fully detected from repository files."}

## Installation

${installInstructions(audit)}

## Usage

${usageInstructions(audit)}

## Environment Variables

${environmentSection(audit, envKeys)}

## Testing

${testingInstructions(audit)}

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

${license}
`;
}
