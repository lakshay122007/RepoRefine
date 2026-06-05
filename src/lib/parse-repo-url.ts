export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Repository URL is required.");
  }

  // owner/repo shorthand
  const shorthand = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/);
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, "") };
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Invalid repository URL. Use https://github.com/owner/repo or owner/repo.");
  }

  if (!url.hostname.includes("github.com")) {
    throw new Error("Only GitHub repository URLs are supported.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("Invalid GitHub URL. Expected format: github.com/owner/repo");
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");

  return { owner, repo };
}
