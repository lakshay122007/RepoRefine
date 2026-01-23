import OpenAI from "openai";
import { ProfileAnalysis, Persona } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAIReview(
  data: Partial<ProfileAnalysis>, 
  persona: Persona
): Promise<{ commentary: string; roadmap: string[] }> {
  
  const prompts = {
    recruiter: "You are a FAANG Technical Recruiter. Be strict, professional, and focus on employability.",
    roast: "You are a cynical Senior Engineer. Roast this profile mercilessly. Be funny but mean.",
    mentor: "You are a kind Engineering Manager. Be encouraging and focus on growth."
  };

  const systemPrompt = `
    ${prompts[persona]}
    Analyze this GitHub profile summary.
    Profile Score: ${data.scores?.total}/100.
    Bio: ${data.bio || "None"}.
    Top Repos: ${data.repos?.map(r => `${r.name} (${r.language}, Score: ${r.score})`).join(", ")}.
    Red Flags: ${data.redFlags?.join(", ")}.
    
    Output strictly valid JSON format:
    {
      "commentary": "A 2-3 sentence summary of the profile in your persona's voice.",
      "roadmap": ["Action item 1", "Action item 2", "Action item 3", "Action item 4"]
    }
  `;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }],
    model: "gpt-4o-mini", // Cost effective
    response_format: { type: "json_object" },
  });

  const content = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    commentary: content.commentary || "Could not generate review.",
    roadmap: content.roadmap || ["Update README", "Add tests"]
  };
}