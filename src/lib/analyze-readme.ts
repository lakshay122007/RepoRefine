const SECTION_ALIASES: Record<string, RegExp[]> = {
  installation: [/install/i, /getting started/i, /setup/i, /prerequisites/i],
  usage: [/usage/i, /how to use/i, /examples?/i, /quick start/i],
  testing: [/test/i, /running tests/i],
  contributing: [/contribut/i],
  environment: [/env(ironment)?/i, /configuration/i, /config/i],
  license: [/license/i],
  features: [/features?/i, /what it does/i, /overview/i],
};

const ALL_SECTIONS = Object.keys(SECTION_ALIASES);

export function extractReadmeHeadings(content: string): string[] {
  const headings: string[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}

export function detectReadmeSections(headings: string[]): {
  sectionsFound: string[];
  sectionsMissing: string[];
} {
  const sectionsFound: string[] = [];
  const sectionsMissing: string[] = [];

  for (const section of ALL_SECTIONS) {
    const patterns = SECTION_ALIASES[section];
    const found = headings.some((heading) =>
      patterns.some((pattern) => pattern.test(heading))
    );
    if (found) {
      sectionsFound.push(section);
    } else {
      sectionsMissing.push(section);
    }
  }

  return { sectionsFound, sectionsMissing };
}

export function scoreReadmeQuality(
  exists: boolean,
  content: string,
  sectionsFound: string[],
  hasEnvExample: boolean
): number {
  if (!exists) return 0;

  let score = 0;
  if (content.length > 0) score += 25;
  if (content.length > 500) score += 15;

  const weights: Record<string, number> = {
    installation: 15,
    usage: 15,
    testing: 10,
    contributing: 10,
    environment: 10,
    license: 5,
    features: 5,
  };

  for (const section of sectionsFound) {
    score += weights[section] ?? 0;
  }

  if (hasEnvExample && sectionsFound.includes("environment")) {
    score += 5;
  } else if (!hasEnvExample && content.match(/process\.env|os\.environ|dotenv/i)) {
    score -= 5;
  }

  return Math.min(100, Math.max(0, score));
}
