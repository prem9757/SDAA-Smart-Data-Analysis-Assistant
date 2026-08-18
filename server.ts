import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getGeminiClient, PRIMARY_MODEL } from "./server/geminiService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Data Analysis & Executive Summary API
  app.post("/api/ai/analyze-dataset", async (req, res) => {
    try {
      const { datasetName, sampleRows, columnStats, rowCount } = req.body;
      const ai = getGeminiClient();

      const prompt = `
You are SDA (Smart Data Analysis Assistant) — an elite AI Data Analyst, Data Quality Engineer, Data Scientist, BI Analyst, and Analytics Consultant.
Your purpose is to transform datasets across any domain (Sales, Finance, Banking, HR, Marketing, E-commerce, Inventory, Supply Chain, Healthcare, Education, Manufacturing, Logistics, IoT, etc.) into reliable, validated, analysis-ready data and actionable business insights.

CORE PRINCIPLES:
- Never assume domain or column meanings blindly; infer dynamically from schema and sample data.
- Assess data completeness, validity, consistency, uniqueness, and integrity.
- Never fabricate metrics, values, or trends.
- Base every insight on actual calculated values and statistical evidence.

Dataset Name: "${datasetName}"
Total Rows: ${rowCount}
Column Profiles & Stats:
${JSON.stringify(columnStats, null, 2)}

Sample Data Rows:
${JSON.stringify(sampleRows, null, 2)}

Provide a detailed JSON response matching this schema:
{
  "executiveSummary": "A concise, high-impact 3-4 sentence overview of dataset key findings, domain classification, and strategic context.",
  "healthStatus": "EXCELLENT" | "GOOD" | "WARNING" | "CRITICAL",
  "domainInferred": "Inferred domain or 'Dataset domain could not be confidently determined.'",
  "keyTakeaways": [
    { "title": "...", "description": "...", "impact": "HIGH" | "MEDIUM" | "LOW", "category": "REVENUE" | "EFFICIENCY" | "RISK" | "GROWTH" | "OPERATIONS" | "QUALITY" }
  ],
  "driverAnalysis": [
    { "factor": "...", "correlation": "Strong Positive" | "Moderate Positive" | "Negative" | "Inverse", "insight": "..." }
  ],
  "anomaliesDetected": [
    { "feature": "...", "description": "...", "severity": "HIGH" | "MEDIUM" | "LOW" }
  ],
  "recommendedActions": [
    { "action": "...", "priority": "P0" | "P1" | "P2", "expectedOutcome": "..." }
  ],
  "suggestedVisualizations": [
    { "type": "bar" | "line" | "area" | "scatter" | "pie", "title": "...", "xAxis": "...", "yAxis": "...", "reason": "..." }
  ]
}
Return ONLY valid JSON.
`;

      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const jsonText = response.text || "{}";
      res.json(JSON.parse(jsonText));
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze dataset" });
    }
  });

  // AI Chat Assistant & Query Endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, datasetContext } = req.body;
      const ai = getGeminiClient();

      const systemInstruction = `
You are SDA (Smart Data Analysis Assistant) — a production-grade Universal AI Data Analyst, Data Quality Engineer, Data Scientist, BI Analyst, and Analytics Consultant.
Your mission is to provide rigorous, schema-aware, domain-aware, validation-driven, explainable, and reproducible data intelligence for ANY dataset domain (Finance, Healthcare, HR, Marketing, Supply Chain, IoT, E-commerce, etc.).

MANDATORY RULES & BEHAVIOR:
1. NEVER assume column meanings, business rules, or domains without evidence.
2. Dynamic Domain Awareness: Infer dataset domain dynamically or state if confidence is low.
3. Rigorous Data Quality: Distinguish potential errors from legitimate extreme values.
4. No Fabrication Policy: Never fabricate values, metrics, trends, or causal claims. If evidence is insufficient, explicitly state "Insufficient evidence to determine this."
5. Structured Insight Format: When explaining patterns, provide: Observation -> Evidence -> Interpretation -> Business Implication.
6. SQL & Code Assistance: When generating SQL, adhere strictly to the schema provided.

Active Dataset Context:
- Name: ${datasetContext?.name || "Dataset"}
- Total Rows: ${datasetContext?.rowCount || 0}
- Columns: ${JSON.stringify(datasetContext?.columns || [])}
- Sample Records: ${JSON.stringify(datasetContext?.sampleRows || [])}

Provide clear, structured, and insightful analysis with Markdown tables, statistics, and recommendations.
`;

      const formattedContents = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("AI Chat error:", error);
      res.status(500).json({ error: error.message || "Failed to answer query" });
    }
  });

  // NL-to-SQL API
  app.post("/api/ai/sql-generate", async (req, res) => {
    try {
      const { naturalLanguageQuery, tableName, columns } = req.body;
      const ai = getGeminiClient();

      const prompt = `
Convert the following natural language request into a clean, standard SQL query for SQLite/PostgreSQL.
Table Name: \`${tableName}\`
Columns & Types: ${JSON.stringify(columns)}
Request: "${naturalLanguageQuery}"

Return JSON matching:
{
  "sql": "SELECT ... FROM \`${tableName}\` ...",
  "explanation": "Brief explanation of what the query does.",
  "suggestedChartType": "bar" | "line" | "pie" | "scatter" | "table"
}
`;

      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("SQL Gen Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate SQL" });
    }
  });

  // AI AutoML & Predictive Modeling API
  app.post("/api/ai/auto-ml", async (req, res) => {
    try {
      const { datasetName, targetColumn, problemType, columns, sampleRows } = req.body;
      const ai = getGeminiClient();

      const prompt = `
You are an expert ML Engineer. Provide AutoML guidance for modeling target variable "${targetColumn}" (${problemType}) on dataset "${datasetName}".
Columns: ${JSON.stringify(columns)}
Sample data: ${JSON.stringify(sampleRows)}

Return JSON:
{
  "recommendedAlgorithms": ["Algorithm 1", "Algorithm 2", "Algorithm 3"],
  "featureImportance": [
    { "feature": "col1", "importanceScore": 0.38, "reason": "..." }
  ],
  "dataPreprocessingSteps": ["...", "..."],
  "potentialPitfalls": ["..."],
  "businessImpact": "..."
}
`;

      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("AutoML Error:", error);
      res.status(500).json({ error: error.message || "Failed AutoML analysis" });
    }
  });

  // Vite dev or production static serving
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
