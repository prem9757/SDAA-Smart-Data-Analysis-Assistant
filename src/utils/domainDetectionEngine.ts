import { DomainDefinition, DomainDetectionResult, SupportingEvidence } from '../types/domainKnowledge';

export function detectDatasetDomain(
  datasetName: string,
  columns: Array<{ name: string; type?: string }>,
  sampleRows: any[],
  availableDomains: DomainDefinition[]
): DomainDetectionResult {
  const columnNames = columns.map((c) => c.name.toLowerCase().trim());
  const colNameSet = new Set(columnNames);

  const domainScores: Array<{
    domainId: string;
    domainName: string;
    version: string;
    score: number;
    evidence: SupportingEvidence[];
  }> = [];

  for (const domain of availableDomains) {
    if (domain.id === 'generic') continue;

    let score = 0;
    const evidence: SupportingEvidence[] = [];

    // 1. Column Semantic Name & Alias Matching
    for (const semantic of domain.column_semantics) {
      const aliasMatches = [semantic.name.toLowerCase(), ...semantic.aliases.map((a) => a.toLowerCase())];
      const matchedCol = columns.find((c) => {
        const cLower = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return aliasMatches.some((alias) => {
          const aLower = alias.replace(/[^a-z0-9]/g, '');
          return cLower === aLower || cLower.includes(aLower) || aLower.includes(cLower);
        });
      });

      if (matchedCol) {
        const weight = semantic.is_identifier ? 18 : 12;
        score += weight;
        evidence.push({
          type: 'COLUMN_MATCH',
          column: matchedCol.name,
          description: `Column '${matchedCol.name}' matches domain semantic definition '${semantic.name}'`,
          weight,
        });

        // 2. Value Enum & Range Pattern Matching in Sample Rows
        if (semantic.allowed_values && sampleRows.length > 0) {
          const sampleVals = sampleRows
            .map((r) => String(r[matchedCol.name] ?? '').trim().toLowerCase())
            .filter(Boolean);
          const allowedLower = semantic.allowed_values.map((v) => v.toLowerCase());
          const matchCount = sampleVals.filter((v) => allowedLower.includes(v)).length;
          
          if (sampleVals.length > 0 && matchCount / sampleVals.length >= 0.4) {
            score += 15;
            evidence.push({
              type: 'VALUE_PATTERN',
              column: matchedCol.name,
              description: `Values in '${matchedCol.name}' match domain enum categories (${Math.round((matchCount / sampleVals.length) * 100)}% match)`,
              weight: 15,
            });
          }
        }

        // Check Valid Numeric Range
        if (semantic.valid_range && sampleRows.length > 0) {
          const numVals = sampleRows
            .map((r) => parseFloat(String(r[matchedCol.name] ?? '').replace(/[$,]/g, '')))
            .filter((v) => !isNaN(v));
          const [min, max] = semantic.valid_range;
          const withinBounds = numVals.filter((v) => v >= min && v <= max).length;
          
          if (numVals.length > 0 && withinBounds / numVals.length >= 0.8) {
            score += 10;
            evidence.push({
              type: 'STATISTICAL_DISTRIBUTION',
              column: matchedCol.name,
              description: `Values in '${matchedCol.name}' fit expected physical distribution [${min} to ${max}]`,
              weight: 10,
            });
          }
        }
      }
    }

    // 3. Domain Mathematical Formula Signature Detection
    if (domain.id === 'ecommerce') {
      const qtyCol = columns.find((c) => /qty|quantity|units/i.test(c.name));
      const priceCol = columns.find((c) => /price|unit_price|cost/i.test(c.name));
      const revCol = columns.find((c) => /revenue|total|sales|amount/i.test(c.name));
      if (qtyCol && priceCol && revCol && sampleRows.length > 0) {
        let formulaMatches = 0;
        sampleRows.slice(0, 20).forEach((r) => {
          const q = parseFloat(String(r[qtyCol.name]).replace(/[$,]/g, '')) || 0;
          const p = parseFloat(String(r[priceCol.name]).replace(/[$,]/g, '')) || 0;
          const rev = parseFloat(String(r[revCol.name]).replace(/[$,]/g, '')) || 0;
          if (q > 0 && p > 0 && Math.abs(rev - q * p) <= Math.max(1, rev * 0.35)) {
            formulaMatches++;
          }
        });
        if (formulaMatches >= 3) {
          score += 25;
          evidence.push({
            type: 'FORMULA_MATCH',
            description: `Detected E-commerce Revenue relationship: ${revCol.name} ≈ ${qtyCol.name} × ${priceCol.name}`,
            weight: 25,
          });
        }
      }
    } else if (domain.id === 'saas') {
      const mrrCol = columns.find((c) => /mrr|monthly_revenue/i.test(c.name));
      const arrCol = columns.find((c) => /arr|annual_revenue/i.test(c.name));
      if (mrrCol && arrCol && sampleRows.length > 0) {
        let arrMatches = 0;
        sampleRows.slice(0, 10).forEach((r) => {
          const m = parseFloat(String(r[mrrCol.name])) || 0;
          const a = parseFloat(String(r[arrCol.name])) || 0;
          if (m > 0 && Math.abs(a - m * 12) <= 1) arrMatches++;
        });
        if (arrMatches >= 2) {
          score += 30;
          evidence.push({
            type: 'FORMULA_MATCH',
            description: `Detected SaaS ARR Equation: ARR = MRR × 12 (${arrMatches} row confirmations)`,
            weight: 30,
          });
        }
      }
    } else if (domain.id === 'hr') {
      const baseCol = columns.find((c) => /base|salary|base_pay/i.test(c.name));
      const grossCol = columns.find((c) => /gross|total_comp|gross_pay/i.test(c.name));
      if (baseCol && grossCol) {
        score += 20;
        evidence.push({
          type: 'FORMULA_MATCH',
          description: `Detected Payroll Relationship between ${baseCol.name} and ${grossCol.name}`,
          weight: 20,
        });
      }
    }

    // Dataset Name semantic hint
    const dsNameLower = datasetName.toLowerCase();
    if (dsNameLower.includes(domain.id) || dsNameLower.includes(domain.name.toLowerCase())) {
      score += 15;
      evidence.push({
        type: 'COLUMN_MATCH',
        description: `Dataset file name '${datasetName}' explicitly references ${domain.name}`,
        weight: 15,
      });
    }

    domainScores.push({
      domainId: domain.id,
      domainName: domain.name,
      version: domain.version,
      score,
      evidence,
    });
  }

  // Sort candidates by score
  domainScores.sort((a, b) => b.score - a.score);
  const bestCandidate = domainScores[0];

  // Normalized Confidence Score calculation (0 to 100)
  const maxPossibleScore = 90;
  const rawScore = bestCandidate ? bestCandidate.score : 0;
  const confidenceScore = Math.min(100, Math.round((rawScore / maxPossibleScore) * 100));

  const isUncertain = confidenceScore < 50;
  const fallbackToGeneric = isUncertain;

  const genericDomain = availableDomains.find((d) => d.id === 'generic') || {
    id: 'generic',
    name: 'Generic Tabular Dataset',
    version: '1.0.0',
    description: 'Generic fallback rules',
    column_semantics: [],
    kpis: [],
    rules: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (fallbackToGeneric || !bestCandidate) {
    return {
      detectedDomain: genericDomain.name,
      domainId: 'generic',
      version: genericDomain.version,
      confidenceScore: Math.max(25, confidenceScore),
      supportingEvidence: [
        {
          type: 'STATISTICAL_DISTRIBUTION',
          description: 'No single industry domain exceeded the 50% confidence threshold. Using universal generic cleaning rules.',
          weight: 10,
        },
        ...(bestCandidate ? bestCandidate.evidence : []),
      ],
      isUncertain: true,
      fallbackToGeneric: true,
      alternativeCandidates: domainScores.slice(0, 3).map((d) => ({
        domain: d.domainName,
        domainId: d.domainId,
        confidence: Math.min(100, Math.round((d.score / maxPossibleScore) * 100)),
      })),
    };
  }

  return {
    detectedDomain: bestCandidate.domainName,
    domainId: bestCandidate.domainId,
    version: bestCandidate.version,
    confidenceScore,
    supportingEvidence: bestCandidate.evidence,
    isUncertain: false,
    fallbackToGeneric: false,
    alternativeCandidates: domainScores.slice(1, 4).map((d) => ({
      domain: d.domainName,
      domainId: d.domainId,
      confidence: Math.min(100, Math.round((d.score / maxPossibleScore) * 100)),
    })),
  };
}

export const inferDomainFromDataset = detectDatasetDomain;
