import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "minimaxai/minimax-m2.7";

async function nvidiaChatCompletion(messages: any[], options?: { responseFormat?: "json_object" }) {
  const body: any = {
    model: NVIDIA_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 8192,
  };
  if (options?.responseFormat) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

const app = express();
const PORT = 3001;

app.use(express.json());

const PERSISTENCE_FILE = path.join(process.cwd(), "ideas_db.json");

// Helper to read database
async function readDB(): Promise<any[]> {
  try {
    const content = await fs.readFile(PERSISTENCE_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

// Helper to write database
async function writeDB(data: any[]): Promise<void> {
  await fs.writeFile(PERSISTENCE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// API: Get all ideas
app.get("/api/ideas", async (req, res) => {
  try {
    const data = await readDB();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Submit and analyze an idea
app.post("/api/ideas/analyze", async (req, res) => {
  try {
    const { rawInput, category } = req.body;
    if (!rawInput || !rawInput.trim()) {
      return res.status(400).json({ error: "rawInput is required" });
    }

    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ 
        error: "NVIDIA_API_KEY environment variable is required. Please set it in your .env file." 
      });
    }

    const systemInstruction = 
      "You are the IdeaSpark AI Innovation Intelligence Engine, an elite-tier startup validator, venture capital analyst, and expert product architect. " +
      "Analyze the user's idea thoroughly. Provide objective, practical, highly polished feedback. " +
      "Rate the original originality (innovation), developmental ease (feasibility), and commercial potential honestly, including specific major risks or structural gaps. " +
      "Provide actual competitor names or similar solutions (approx. 2-3 genuine equivalents if possible, otherwise similar software paradigms). " +
      "Suggest high-impact enhancements/features, concrete MVP scope, and structured timelines. " +
      "You MUST output valid, structured JSON exactly matching this schema: " +
      JSON.stringify({
        title: "Name of the startup / idea",
        tagline: "A catchy, sharp human tagline under 8 words",
        analysis: {
          problemStatement: "Clear, deeply defined problem details",
          solutionOverview: "Elegant summary of the AI-powered solution",
          targetAudience: "Primary demographics, user personas, and target markets",
          valueProposition: "Why users will stick around, the unique multiplier",
          industryClassification: "The overarching industry category (e.g. AgriTech, FinTech)"
        },
        scores: {
          overall: "Overall 0-100 blended execution opportunity score (integer)",
          innovation: { score: 0, feedback: "string" },
          feasibility: { score: 0, feedback: "string" },
          impact: { score: 0, feedback: "string" },
          riskScore: { score: 0, feedback: "string" },
          startupPotential: { score: 0, feedback: "string" }
        },
        market: {
          competitors: [{ name: "string", description: "string", strengths: "string", weaknesses: "string" }],
          marketSize: "Market sizing and addressable audience estimate",
          industryTrends: ["3-4 key industry trends"],
          marketOpportunities: ["unlocked opportunities"]
        },
        improvements: {
          additionalFeatures: ["feature suggestions"],
          betterTargetMarkets: ["target market suggestions"],
          productEnhancements: ["ux/product enhancements"],
          strategicImprovements: ["strategic playbook tweaks"]
        },
        roadmap: {
          stages: [{ title: "Phase title", timeline: "duration", description: "string", actions: ["action items"], milestones: ["milestone targets"] }],
          recommendedTechnologies: ["tech stack suggestions"],
          mvpFeatures: ["mvp feature list"],
          launchStrategy: ["launch strategy items"]
        }
      });

    const promptText = `Idea Category: ${category || "General Startup Concept"}\nIdea Description:\n"${rawInput}"\n\nPerform a complete innovation research report based on the input above. Populate all fields with deeply professional, creative, and fully fleshed out content. Do not use high-level generalities; be specific to this industry.`;

    const responseText = await nvidiaChatCompletion(
      [
        { role: "system", content: systemInstruction },
        { role: "user", content: promptText },
      ],
      { responseFormat: "json_object" }
    );

    const validatedJSONText = responseText?.trim() || "{}";
    const reportData = JSON.parse(validatedJSONText);

    // Form final report with metadata
    const finalReport = {
      id: "idea_" + Date.now().toString(36),
      rawInput,
      category: category || "Other",
      submittedAt: new Date().toISOString(),
      ...reportData,
    };

    const db = await readDB();
    db.unshift(finalReport); // Prepend new ideas to show them first
    await writeDB(db);

    res.json(finalReport);
  } catch (err: any) {
    console.error("Analysis Error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze the idea. Please try again." });
  }
});

// API: Chat about a specific idea (AI Assistant)
app.post("/api/ideas/:id/ask", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, chatHistory } = req.body;

    const db = await readDB();
    const idea = db.find((i) => i.id === id);

    if (!idea) {
      return res.status(404).json({ error: "Idea not found." });
    }

    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ 
        error: "NVIDIA_API_KEY environment variable is required. Please set it in your .env file." 
      });
    }

    const systemInstruction = `You are the IdeaSpark AI Personal Advisor. You have access to the complete innovation analysis, scorecards, competitor reports, and execution roadmap for the idea titled "${idea.title}".
Your goal is to answer questions, guide strategic adjustments, specify implementation technologies, refine MVP feature priorities, or critique models in context.

Idea Report Reference:
- Category: ${idea.category}
- Raw Concept: "${idea.rawInput}"
- Tagline: "${idea.tagline}"
- Problem: "${idea.analysis.problemStatement}"
- Solution: "${idea.analysis.solutionOverview}"
- Audience: "${idea.analysis.targetAudience}"
- Value Prop: "${idea.analysis.valueProposition}"
- Overall Score: ${idea.scores.overall}/100
- Innovation Feedback: ${idea.scores.innovation.feedback} (Score: ${idea.scores.innovation.score})
- Feasibility Feedback: ${idea.scores.feasibility.feedback} (Score: ${idea.scores.feasibility.score})
- Impact Feedback: ${idea.scores.impact.feedback} (Score: ${idea.scores.impact.score})
- Risk Feedback: ${idea.scores.riskScore.feedback} (Score: ${idea.scores.riskScore.score})
- Startup Potential: ${idea.scores.startupPotential.feedback} (Score: ${idea.scores.startupPotential.score})
- Existing competitors/analogues: ${JSON.stringify(idea.market.competitors)}
- Recommended features: ${JSON.stringify(idea.improvements.additionalFeatures)}
- MVP details: ${JSON.stringify(idea.roadmap.mvpFeatures)}
- Tech recommendation: ${JSON.stringify(idea.roadmap.recommendedTechnologies)}

Give helpful, directly constructive, concise responses. Speak as a supportive co-founder or technical advisor. Maintain context from previous conversation if available.`;

    const messages = [{ role: "system", content: systemInstruction }];
    if (chatHistory && chatHistory.length > 0) {
      for (const m of chatHistory) {
        messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.text });
      }
    }
    messages.push({ role: "user", content: message });

    const responseText = await nvidiaChatCompletion(messages);
    res.json({ text: responseText || "No response received." });
  } catch (err: any) {
    console.error("Chat Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate conversation response." });
  }
});

// API: Delete an idea
app.delete("/api/ideas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDB();
    const updated = db.filter((i) => i.id !== id);
    await writeDB(updated);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const isVercel = process.env.VERCEL === "1";

if (!isVercel) {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IdeaSpark AI backend server rolling on http://localhost:${PORT}`);
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export default app;
