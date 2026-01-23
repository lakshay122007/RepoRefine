'use server';

import { getProfileData } from "@/lib/github-service";
import { generateAIReview } from "@/lib/ai-service";
import { Persona, ProfileAnalysis } from "@/types";

export async function analyzeProfile(formData: FormData): Promise<ProfileAnalysis> {
  const username = formData.get("username") as string;
  const persona = (formData.get("persona") as Persona) || "recruiter";

  console.log(`🚀 Starting analysis for: ${username}`);

  try {
    // 1. Check Env Vars
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN is missing in .env.local");
    }

    // 2. Get Hard Data
    console.log("...Fetching GitHub Data");
    const profileData = await getProfileData(username);
    
    // 3. Get AI Insights (Handle missing OpenAI key gracefully)
    console.log("...Fetching AI Review");
    let aiData;
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("No OpenAI Key");
      aiData = await generateAIReview(profileData, persona);
    } catch (aiError) {
      console.warn("⚠️ OpenAI Failed or Key missing. Using fallback.");
      aiData = {
        commentary: "AI Analysis unavailable. Please add a valid OPENAI_API_KEY to .env.local to generate a personalized review.",
        roadmap: ["Add OpenAI API Key", "Check GitHub Token", "Review Code Manually"]
      };
    }

    console.log("✅ Analysis Complete");

    // 4. Merge
    return {
      ...profileData,
      aiReview: {
        persona,
        ...aiData
      }
    } as ProfileAnalysis;

  } catch (error: any) {
    console.error("❌ SERVER ACTION ERROR:", error.message);
    // Re-throw so the UI knows it failed, but pass the specific message
    throw new Error(error.message || "Failed to analyze profile");
  }
}