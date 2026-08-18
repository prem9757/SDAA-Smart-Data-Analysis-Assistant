import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getGeminiClient, PRIMARY_MODEL } from "./server/geminiService.js";
import { knowledgeBaseRepo } from "./server/knowledgeBaseService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==========================================
  // DYNAMIC DOMAIN KNOWLEDGE BASE API ENDPOINTS
  // ==========================================

  // 1. Get all available domains
  app.get("/api/knowledge-base/domains", (req, res) => {
    try {
      const domains = knowledgeBaseRepo.getAllDomains();
      res.json({ domains, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch domains" });
    }
  });

  // 2. Get specific domain by ID with full rules & semantics
  app.get("/api/knowledge-base/domain/:domainId", (req, res) => {
    try {
      const domain = knowledgeBaseRepo.getDomain(req.params.domainId);
      if (!domain) {
        return res.status(404).json({ error: `Domain '${req.params.domainId}' not found` });
      }
      res.json(domain);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch domain" });
    }
  });

  // 3. Add a new rule to a domain (creates immutable version record)
  app.post("/api/knowledge-base/domain/:domainId/rules", (req, res) => {
    try {
      const { rule, author, reason } = req.body;
      const createdRule = knowledgeBaseRepo.addRule(req.params.domainId, rule, author, reason);
      res.status(201).json({ rule: createdRule, message: "Rule added successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to add rule" });
    }
  });

  // 4. Update an existing rule (bumps rule version)
  app.put("/api/knowledge-base/domain/:domainId/rules/:ruleId", (req, res) => {
    try {
      const { updatedFields, author, reason } = req.body;
      const updatedRule = knowledgeBaseRepo.updateRule(
        req.params.domainId,
        req.params.ruleId,
        updatedFields,
        author,
        reason
      );
      res.json({ rule: updatedRule, message: "Rule updated with new version" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update rule" });
    }
  });

  // 5. Change rule status (ACTIVE, APPROVED, REJECTED, DEPRECATED)
  app.patch("/api/knowledge-base/domain/:domainId/rules/:ruleId/status", (req, res) => {
    try {
      const { status, author, reason } = req.body;
      const updatedRule = knowledgeBaseRepo.setRuleStatus(
        req.params.domainId,
        req.params.ruleId,
        status,
        author,
        reason
      );
      res.json({ rule: updatedRule, message: `Rule status updated to ${status}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update status" });
    }
  });

  // 6. Propose AI Rule
  app.post("/api/knowledge-base/propose-rule", (req, res) => {
    try {
      const proposal = req.body;
      const saved = knowledgeBaseRepo.proposeAIRule(proposal);
      res.status(201).json({ proposal: saved, message: "AI Rule Proposal recorded" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to record proposal" });
    }
  });

  // 7. Get all AI proposals
  app.get("/api/knowledge-base/proposals", (req, res) => {
    try {
      const proposals = knowledgeBaseRepo.getAIProposals();
      res.json({ proposals });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch proposals" });
    }
  });

  // 8. Review AI Proposal (Approve or Reject with human-in-the-loop audit)
  app.post("/api/knowledge-base/proposals/:ruleId/review", (req, res) => {
    try {
      const { action, author, reason } = req.body;
      const result = knowledgeBaseRepo.reviewAIProposal(req.params.ruleId, action, author, reason);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to review proposal" });
    }
  });

  // 9. Historical Validation Engine (Tests a rule against sample/benchmark datasets)
  app.post("/api/knowledge-base/historical-validation", (req, res) => {
    try {
      const { rule, datasets } = req.body;
      const testDatasets = Array.isArray(datasets) && datasets.length > 0 ? datasets : [];

      let totalRows = 0;
      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;
      const sampleFlagged: any[] = [];

      testDatasets.forEach((ds: any) => {
        const rows = Array.isArray(ds.rows) ? ds.rows : [];
        totalRows += rows.length;

        rows.forEach((r: any, idx: number) => {
          // Evaluate condition against rule target columns
          let violation = false;
          let isTruePositive = true;

          for (const col of rule.target_columns || []) {
            const val = r[col];
            if (val !== undefined && val !== null) {
              const numVal = parseFloat(String(val).replace(/[$,]/g, ""));
              if (rule.valid_range && !isNaN(numVal)) {
                const [min, max] = rule.valid_range;
                if (numVal < min || numVal > max) {
                  violation = true;
                  // If extreme negative or 1000x multiplier, it's a true positive anomaly
                  isTruePositive = numVal < 0 || numVal > max * 1.5;
                }
              }
            }
          }

          if (violation) {
            if (isTruePositive) {
              truePositives++;
            } else {
              falsePositives++;
            }
            if (sampleFlagged.length < 10) {
              sampleFlagged.push({
                dataset_name: ds.name || "Historical Dataset",
                row_index: idx + 1,
                values: r,
                reason: `Triggered rule ${rule.rule_id} condition`,
                is_true_positive: isTruePositive,
              });
            }
          } else {
            trueNegatives++;
          }
        });
      });

      const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1.0;
      const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1.0;
      const fpr = falsePositives + trueNegatives > 0 ? falsePositives / (falsePositives + trueNegatives) : 0.0;

      const recommendation =
        fpr > 0.08 ? "HIGH_RISK_FALSE_POSITIVES" : totalRows < 5 ? "INSUFFICIENT_DATA" : "SAFE_TO_ACTIVATE";

      res.json({
        rule_id: rule.rule_id,
        rule_description: rule.description,
        datasets_evaluated: testDatasets.length,
        rows_evaluated: totalRows,
        true_positives: truePositives,
        false_positives: falsePositives,
        true_negatives: trueNegatives,
        false_negatives: falseNegatives,
        precision: Math.round(precision * 1000) / 1000,
        recall: Math.round(recall * 1000) / 1000,
        false_positive_rate: Math.round(fpr * 1000) / 1000,
        recommendation,
        sample_flagged_rows: sampleFlagged,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Historical validation failed" });
    }
  });

  // 10. Conflict Detection across rules
  app.post("/api/knowledge-base/conflict-detection", (req, res) => {
    try {
      const { rules } = req.body;
      const conflicts = knowledgeBaseRepo.detectConflicts(rules || []);
      res.json({ conflicts });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Conflict detection failed" });
    }
  });

  // 11. Immutable Version History & Changelog
  app.get("/api/knowledge-base/versions", (req, res) => {
    try {
      const versions = knowledgeBaseRepo.getVersionHistory();
      res.json({ versions });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch versions" });
    }
  });

  // AI Data Analysis & Executive Summary API
  app.post("/api/ai/analyze-dataset", async (req, res) => {
    try {
      const { datasetName, sampleRows, columnStats, rowCount } = req.body;
      const ai = getGeminiClient();

      const prompt = `
You are SDA (Smart Data Analysis Assistant) — an elite AI Data Analyst, Data Quality Engineer, Data Scientist, BI Analyst, and Analytics Consultant.
Your purpose is to transform datasets across any domain (Sales, Finance, Banking, HR, Marketing, E-commerce, Inventory, Supply Chain, Healthcare, Education, Manufacturing, Logistics, IoT, etc.) into reliable, validated, analysis-ready data and actionable business insights.

THINKING PROCESS & REASONING GUIDELINES:
1. Step 1: Ingest Schema & Evaluate Completeness - check missingness, constant columns, and semantic types.
2. Step 2: Statistical & Anomaly Diagnosis - evaluate distributions, skewness, outliers, and physical domain constraints.
3. Step 3: Correlation & Driver Discovery - identify key metrics driving core outcomes.
4. Step 4: Strategic Synthesis - formulate high-impact, prioritized business actions.

Dataset Name: "${datasetName}"
Total Rows: ${rowCount}
Column Profiles & Stats:
${JSON.stringify(columnStats, null, 2)}

Sample Data Rows:
${JSON.stringify(sampleRows, null, 2)}

Provide a detailed JSON response matching this schema:
{
  "thinkingProcess": [
    { "step": 1, "phase": "Schema & Type Verification", "reasoning": "Detailed analysis of column definitions, data types, and primary entities." },
    { "step": 2, "phase": "Data Health & Integrity Evaluation", "reasoning": "Assessment of missing values, anomalies, outliers, and data cleanliness." },
    { "step": 3, "phase": "Statistical Patterns & Correlations", "reasoning": "Identified key performance indicators, relationships, and driving factors." },
    { "step": 4, "phase": "Strategic Business Synthesis", "reasoning": "Translating data findings into actionable recommendations." }
  ],
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

  // AI Chat Assistant & Query Endpoint with Structured Thinking Process
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, datasetContext } = req.body;
      const ai = getGeminiClient();

      const systemInstruction = `
You are SDA (Smart Data Analysis Assistant) — a production-grade Universal AI Data Analyst, Data Quality Engineer, Data Scientist, and Analytics Consultant.
Your mission is to provide rigorous, schema-aware, explainable, and reproducible data intelligence for ANY dataset domain.

MANDATORY RESPONSE FORMAT:
Always structure your analytical thinking clearly. You must format your response with an explicit thinking section at the top followed by your structured answer:

<thinking>
• Step 1 (Intent & Schema Mapping): [Explain what columns, entities, and metrics are being targeted based on the dataset schema]
• Step 2 (Statistical & Data Verification): [Explain the numerical, categorical, or distribution checks performed on sample rows / stats]
• Step 3 (Root Cause & Pattern Deduction): [Explain why this trend or pattern occurs based on evidence]
• Step 4 (Actionable Takeaway): [Summarize the direct business answer]
</thinking>

[Provide your main response here with clear Markdown formatting, bullet points, and tables if applicable. Keep tone professional, objective, and insightful.]

Active Dataset Context:
- Name: ${datasetContext?.name || "Dataset"}
- Total Rows: ${datasetContext?.rowCount || 0}
- Columns: ${JSON.stringify(datasetContext?.columns || [])}
- Sample Records: ${JSON.stringify(datasetContext?.sampleRows || [])}
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
          temperature: 0.6,
        },
      });

      const fullText = response.text || "";
      let thinking = "";
      let cleanReply = fullText;

      const thinkingMatch = fullText.match(/<thinking>([\s\S]*?)<\/thinking>/);
      if (thinkingMatch) {
        thinking = thinkingMatch[1].trim();
        cleanReply = fullText.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim();
      }

      res.json({ reply: cleanReply, thinking: thinking || undefined });
    } catch (error: any) {
      console.error("AI Chat error:", error);
      res.status(500).json({ 
        reply: "I encountered an issue analyzing the dataset with the current query. Let me know if you would like me to inspect specific columns or generate a query.", 
        error: error.message 
      });
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
  "thinking": "Step-by-step query construction rationale: identified target columns, aggregations, WHERE clauses, and sorting.",
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
