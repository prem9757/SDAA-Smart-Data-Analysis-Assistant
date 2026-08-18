import {
  DomainDefinition,
  DomainRule,
  AIRuleProposal,
  HistoricalValidationResult,
  RuleConflictReport,
  KnowledgeVersionRecord,
  KnowledgeFeedbackReport,
  DomainDetectionResult,
} from '../types/domainKnowledge';

// Optional API key header for dynamic authenticated knowledge retrieval
const DEFAULT_KB_AUTH_HEADER = 'Bearer sda-knowledge-token-auth';

export async function fetchAllDomains(): Promise<DomainDefinition[]> {
  try {
    const res = await fetch('/api/knowledge-base/domains', {
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.domains || [];
  } catch (err) {
    console.error('Failed to fetch domains from API:', err);
    return [];
  }
}

export async function fetchDomainDetails(domainId: string): Promise<DomainDefinition | null> {
  try {
    const res = await fetch(`/api/knowledge-base/domain/${domainId}`, {
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch domain '${domainId}':`, err);
    return null;
  }
}

export async function createDomainRule(
  domainId: string,
  rule: DomainRule,
  author: string,
  reason: string
): Promise<DomainRule | null> {
  try {
    const res = await fetch(`/api/knowledge-base/domain/${domainId}/rules`, {
      method: 'POST',
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rule, author, reason }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.rule;
  } catch (err) {
    console.error('Failed to create rule:', err);
    return null;
  }
}

export async function updateDomainRule(
  domainId: string,
  ruleId: string,
  updatedFields: Partial<DomainRule>,
  author: string,
  reason: string
): Promise<DomainRule | null> {
  try {
    const res = await fetch(`/api/knowledge-base/domain/${domainId}/rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updatedFields, author, reason }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.rule;
  } catch (err) {
    console.error('Failed to update rule:', err);
    return null;
  }
}

export async function setDomainRuleStatus(
  domainId: string,
  ruleId: string,
  status: DomainRule['status'],
  author: string,
  reason: string
): Promise<DomainRule | null> {
  try {
    const res = await fetch(`/api/knowledge-base/domain/${domainId}/rules/${ruleId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, author, reason }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.rule;
  } catch (err) {
    console.error('Failed to update rule status:', err);
    return null;
  }
}

export async function fetchAIProposals(): Promise<AIRuleProposal[]> {
  try {
    const res = await fetch('/api/knowledge-base/proposals', {
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.proposals || [];
  } catch (err) {
    console.error('Failed to fetch AI proposals:', err);
    return [];
  }
}

export async function submitAIProposal(proposal: AIRuleProposal): Promise<AIRuleProposal | null> {
  try {
    const res = await fetch('/api/knowledge-base/propose-rule', {
      method: 'POST',
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proposal),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.proposal;
  } catch (err) {
    console.error('Failed to submit AI proposal:', err);
    return null;
  }
}

export async function reviewAIProposal(
  ruleId: string,
  action: 'APPROVE' | 'REJECT',
  author: string = 'Data Quality System',
  reason: string = 'User reviewed in UI'
): Promise<{ proposal: AIRuleProposal; activatedRule?: DomainRule } | null> {
  try {
    const res = await fetch(`/api/knowledge-base/proposals/${ruleId}/review`, {
      method: 'POST',
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, author, reason }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to review proposal:', err);
    return null;
  }
}

export async function runHistoricalValidation(
  rule: DomainRule,
  datasets: Array<{ name: string; rows: any[] }>
): Promise<HistoricalValidationResult> {
  try {
    const res = await fetch('/api/knowledge-base/historical-validation', {
      method: 'POST',
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rule, datasets }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to run historical validation:', err);
    return {
      rule_id: rule.rule_id,
      rule_description: rule.description,
      datasets_evaluated: datasets.length,
      rows_evaluated: datasets.reduce((sum, d) => sum + d.rows.length, 0),
      true_positives: 0,
      false_positives: 0,
      true_negatives: 0,
      false_negatives: 0,
      precision: 1.0,
      recall: 1.0,
      false_positive_rate: 0.0,
      recommendation: 'INSUFFICIENT_DATA',
      sample_flagged_rows: [],
    };
  }
}

export async function detectRuleConflicts(rules: DomainRule[]): Promise<RuleConflictReport[]> {
  try {
    const res = await fetch('/api/knowledge-base/conflict-detection', {
      method: 'POST',
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rules }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.conflicts || [];
  } catch (err) {
    console.error('Failed to detect rule conflicts:', err);
    return [];
  }
}

export async function fetchVersionHistory(): Promise<KnowledgeVersionRecord[]> {
  try {
    const res = await fetch('/api/knowledge-base/versions', {
      headers: {
        Authorization: DEFAULT_KB_AUTH_HEADER,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.versions || [];
  } catch (err) {
    console.error('Failed to fetch versions:', err);
    return [];
  }
}
