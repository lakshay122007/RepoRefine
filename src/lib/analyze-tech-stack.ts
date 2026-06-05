type FileContents = Record<string, string>;

const FRAMEWORK_SIGNALS: Record<string, RegExp> = {
  "Next.js": /"next"\s*:/,
  React: /"react"\s*:/,
  Vue: /"vue"\s*:/,
  Svelte: /"svelte"\s*:/,
  Angular: /"@angular\/core"/,
  Express: /"express"\s*:/,
  FastAPI: /fastapi/i,
  Django: /django/i,
  Flask: /flask/i,
  Spring: /spring-boot|org\.springframework/,
  Tailwind: /tailwindcss/,
  Prisma: /"@prisma\/client"/,
  tRPC: /"@trpc\//,
};

const RUNTIME_SIGNALS: Record<string, RegExp> = {
  Node: /"node"\s*:/,
  Python: /python_requires|Programming Language :: Python/,
  Rust: /\[package\]/,
  Go: /^module /m,
  Java: /java\.version|sourceCompatibility/,
};

export function detectTechStack(
  files: FileContents,
  languages: string[],
  topics: string[]
): {
  frameworks: string[];
  packageManagers: string[];
  runtimes: string[];
  infra: string[];
} {
  const combined = Object.values(files).join("\n");
  const frameworks = new Set<string>();
  const packageManagers = new Set<string>();
  const runtimes = new Set<string>();
  const infra = new Set<string>();

  for (const [name, pattern] of Object.entries(FRAMEWORK_SIGNALS)) {
    if (pattern.test(combined)) frameworks.add(name);
  }

  for (const [name, pattern] of Object.entries(RUNTIME_SIGNALS)) {
    if (pattern.test(combined)) runtimes.add(name);
  }

  if (files["package.json"]) {
    packageManagers.add("npm");
    if (files["pnpm-lock.yaml"]) {
      packageManagers.delete("npm");
      packageManagers.add("pnpm");
    }
    if (files["yarn.lock"]) {
      packageManagers.delete("npm");
      packageManagers.add("yarn");
    }
  }
  if (files["requirements.txt"] || files["pyproject.toml"] || files["Pipfile"]) {
    runtimes.add("Python");
    if (files["Pipfile"]) packageManagers.add("pipenv");
    else packageManagers.add("pip");
  }
  if (files["Cargo.toml"]) {
    runtimes.add("Rust");
    packageManagers.add("cargo");
  }
  if (files["go.mod"]) {
    runtimes.add("Go");
    packageManagers.add("go modules");
  }
  if (files["pom.xml"] || files["build.gradle"]) {
    runtimes.add("Java");
    packageManagers.add(files["pom.xml"] ? "maven" : "gradle");
  }

  if (files["Dockerfile"] || files["docker-compose.yml"] || files["docker-compose.yaml"]) {
    infra.add("Docker");
  }
  if (files["turbo.json"]) infra.add("Turborepo");
  if (files[".github/workflows"] || Object.keys(files).some((f) => f.startsWith(".github/workflows/"))) {
    infra.add("GitHub Actions");
  }

  for (const lang of languages) {
    if (lang === "TypeScript" || lang === "JavaScript") runtimes.add("Node");
    if (lang === "Python") runtimes.add("Python");
    if (lang === "Rust") runtimes.add("Rust");
    if (lang === "Go") runtimes.add("Go");
    if (lang === "Java") runtimes.add("Java");
  }

  for (const topic of topics) {
    if (topic === "docker") infra.add("Docker");
    if (topic === "kubernetes") infra.add("Kubernetes");
  }

  return {
    frameworks: [...frameworks],
    packageManagers: [...packageManagers],
    runtimes: [...runtimes],
    infra: [...infra],
  };
}

export function parsePackageJsonScripts(content: string): Record<string, string> {
  try {
    const parsed = JSON.parse(content) as { scripts?: Record<string, string> };
    return parsed.scripts ?? {};
  } catch {
    return {};
  }
}

export function parseEnvExampleKeys(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0]?.trim())
    .filter((key): key is string => Boolean(key));
}
