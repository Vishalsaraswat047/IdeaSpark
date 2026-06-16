import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini client on the server
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

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

// Schema detail to ensure robust JSON matching types.ts
const ideaResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Name of the startup / idea" },
    tagline: { type: Type.STRING, description: "A catchy, sharp human tagline under 8 words" },
    analysis: {
      type: Type.OBJECT,
      properties: {
        problemStatement: { type: Type.STRING, description: "Clear, deeply defined problem details" },
        solutionOverview: { type: Type.STRING, description: "Elegant summary of the AI-powered solution" },
        targetAudience: { type: Type.STRING, description: "Primary demographics, user personas, and target markets" },
        valueProposition: { type: Type.STRING, description: "Why users will stick around, the unique multiplier" },
        industryClassification: { type: Type.STRING, description: "The overarching industry category (e.g. AgriTech, FinTech)" },
      },
      required: ["problemStatement", "solutionOverview", "targetAudience", "valueProposition", "industryClassification"],
    },
    scores: {
      type: Type.OBJECT,
      properties: {
        overall: { type: Type.INTEGER, description: "Overall 0-100 blended execution opportunity score" },
        innovation: {
          type: Type.OBJECT,
          properties: { score: { type: Type.INTEGER }, feedback: { type: Type.STRING } },
          required: ["score", "feedback"],
        },
        feasibility: {
          type: Type.OBJECT,
          properties: { score: { type: Type.INTEGER }, feedback: { type: Type.STRING } },
          required: ["score", "feedback"],
        },
        impact: {
          type: Type.OBJECT,
          properties: { score: { type: Type.INTEGER }, feedback: { type: Type.STRING } },
          required: ["score", "feedback"],
        },
        riskScore: {
          type: Type.OBJECT,
          properties: { score: { type: Type.INTEGER }, feedback: { type: Type.STRING } },
          required: ["score", "feedback"],
        },
        startupPotential: {
          type: Type.OBJECT,
          properties: { score: { type: Type.INTEGER }, feedback: { type: Type.STRING } },
          required: ["score", "feedback"],
        },
      },
      required: ["overall", "innovation", "feasibility", "impact", "riskScore", "startupPotential"],
    },
    market: {
      type: Type.OBJECT,
      properties: {
        competitors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              strengths: { type: Type.STRING },
              weaknesses: { type: Type.STRING },
            },
            required: ["name", "description", "strengths", "weaknesses"],
          },
        },
        marketSize: { type: Type.STRING, description: "Market sizing and addressable audience estimate" },
        industryTrends: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 key industry trends" },
        marketOpportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "unlocked opportunities" },
      },
      required: ["competitors", "marketSize", "industryTrends", "marketOpportunities"],
    },
    improvements: {
      type: Type.OBJECT,
      properties: {
        additionalFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
        betterTargetMarkets: { type: Type.ARRAY, items: { type: Type.STRING } },
        productEnhancements: { type: Type.ARRAY, items: { type: Type.STRING } },
        strategicImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["additionalFeatures", "betterTargetMarkets", "productEnhancements", "strategicImprovements"],
    },
    roadmap: {
      type: Type.OBJECT,
      properties: {
        stages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "e.g., Phase 1: Prototype Launch" },
              timeline: { type: Type.STRING, description: "duration, e.g. Weeks 1-4" },
              description: { type: Type.STRING },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } },
              milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["title", "timeline", "description", "actions", "milestones"],
          },
        },
        recommendedTechnologies: { type: Type.ARRAY, items: { type: Type.STRING } },
        mvpFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
        launchStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["stages", "recommendedTechnologies", "mvpFeatures", "launchStrategy"],
    },
  },
  required: ["title", "tagline", "analysis", "scores", "market", "improvements", "roadmap"],
};

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

    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY environment variable is required. Please manage it in Settings -> Secrets panel." 
      });
    }

    const systemInstruction = 
      "You are the IdeaSpark AI Innovation Intelligence Engine, an elite-tier startup validator, venture capital analyst, and expert product architect. " +
      "Analyze the user's idea thoroughly. Provide objective, practical, highly polished feedback. " +
      "Rate the original originality (innovation), developmental ease (feasibility), and commercial potential honestly, including specific major risks or structural gaps. " +
      "Provide actual competitor names or similar solutions (approx. 2-3 genuine equivalents if possible, otherwise similar software paradigms). " +
      "Suggest high-impact enhancements/features, concrete MVP scope, and structured timelines. " +
      "You MUST output valid, structured JSON exactly respecting the requested schema.";

    const promptText = `
Idea Category: ${category || "General Startup Concept"}
Idea Description:
"${rawInput}"

Perform a complete innovation research research report based on the input above. Populate all fields with deeply professional, creative, and fully fleshed out content. Do not use high-level generalities; be specific to this industry.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: ideaResponseSchema,
      },
    });

    const validatedJSONText = response.text?.trim() || "{}";
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

    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY environment variable is required. Please manage it in Settings -> Secrets panel." 
      });
    }

    // Prepare system instructions with the full context of this specific idea
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

    // Map message history to chat format for Gemini SDK
    // Let's create an ongoing chat with system instructions
    const formattedContents = [];
    if (chatHistory && chatHistory.length > 0) {
      // Add historic chats to provide conversation context
      for (const m of chatHistory) {
        formattedContents.push({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        });
      }
    }
    // Append the final user query
    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text || "No response received." });
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

// Setup Vite Dev Server / Static Assets build output
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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
}

startServer();
