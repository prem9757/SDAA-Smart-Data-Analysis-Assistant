/**
 * Client-Side Domain Rule Knowledge Base
 *
 * Provides instant access to standard domain models, rules, column semantics,
 * and KPIs across E-commerce, Finance, Healthcare, SaaS, HR, Logistics, Marketing, and Generic domains.
 */

import { DomainDefinition, DomainRule, DomainKPIDefinition } from '../types/domainKnowledge';

export const BUILT_IN_DOMAINS: DomainDefinition[] = [
  {
    id: 'ecommerce',
    name: 'E-commerce & Retail',
    version: '1.2.0',
    description: 'Rules for digital storefronts, order tracking, SKU inventory, and cart checkout analytics.',
    icon: 'ShoppingCart',
    created_at: '2026-01-10T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [
      { name: 'Order_ID', aliases: ['order_id', 'orderid', 'order_number', 'txn_id'], expected_type: 'id', is_identifier: true, description: 'Unique alphanumeric identifier for orders' },
      { name: 'Customer_ID', aliases: ['customer_id', 'cust_id', 'buyer_id', 'user_id'], expected_type: 'id', is_identifier: true, description: 'Unique customer identifier' },
      { name: 'Quantity', aliases: ['qty', 'quantity', 'item_count', 'units'], expected_type: 'number', valid_range: [1, 10000], description: 'Positive integer quantity of purchased goods' },
      { name: 'Unit_Price', aliases: ['unit_price', 'price', 'item_price', 'retail_price'], expected_type: 'number', valid_range: [0.01, 100000], description: 'Price per single unit in base currency' },
      { name: 'Discount', aliases: ['discount', 'discount_rate', 'promo_discount', 'rebate'], expected_type: 'number', valid_range: [0, 1], description: 'Discount fraction (0.0 to 1.0) or percentage' },
      { name: 'Revenue', aliases: ['revenue', 'total_amount', 'sales', 'order_total', 'actual_revenue'], expected_type: 'number', valid_range: [0, 10000000], description: 'Actual billed amount for the order' },
      { name: 'Order_Status', aliases: ['order_status', 'status', 'delivery_status', 'fulfillment_status'], expected_type: 'string', allowed_values: ['Completed', 'Shipped', 'Pending', 'Processing', 'Cancelled', 'Refunded'], description: 'Lifecycle state of the customer order' },
      { name: 'Payment_Method', aliases: ['payment_method', 'pay_type', 'payment_type'], expected_type: 'string', allowed_values: ['Credit Card', 'Debit Card', 'PayPal', 'Apple Pay', 'Bank Transfer', 'Cash on Delivery', 'UPI', 'Net Banking'], description: 'Settlement instrument utilized' },
    ],
    kpis: [
      { name: 'AOV', formula: 'SUM(Revenue) / COUNT(DISTINCT Order_ID)', description: 'Average Order Value per transaction', unit: '$' },
      { name: 'Discount_Rate', formula: 'AVG(Discount)', description: 'Average promotional discount across sales', unit: '%' },
      { name: 'Cancellation_Rate', formula: 'COUNT(Status="Cancelled") / COUNT(*)', description: 'Proportion of aborted transactions', unit: '%' },
    ],
    rules: [
      {
        rule_id: 'ECOM_MATH_001',
        domain: 'ecommerce',
        version: '1.2.0',
        description: 'Revenue must match Quantity × Unit_Price × (1 - Discount) within 0.05 rounding tolerance.',
        condition: 'Math.abs(Revenue - (Quantity * Unit_Price * (1 - Discount))) <= 0.05',
        action: 'CORRECT',
        severity: 'HIGH',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-01-10T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Revenue', 'Quantity', 'Unit_Price', 'Discount'],
        formula_expression: 'Expected_Revenue = Quantity * Unit_Price * (1 - Discount)',
      },
      {
        rule_id: 'ECOM_RANGE_002',
        domain: 'ecommerce',
        version: '1.1.0',
        description: 'Discount must strictly reside between 0.00 and 1.00 (or normalized from percentage).',
        condition: 'Discount >= 0 && Discount <= 1.0',
        action: 'NORMALIZE',
        severity: 'HIGH',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-02-15T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Discount'],
        valid_range: [0, 1],
      },
      {
        rule_id: 'ECOM_QTY_003',
        domain: 'ecommerce',
        version: '1.0.0',
        description: 'Purchased quantity must be positive integers; negative values indicate erroneous signs.',
        condition: 'Quantity > 0',
        action: 'CORRECT',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-01-10T00:00:00.000Z',
        updated_at: '2026-01-10T00:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Quantity'],
        valid_range: [1, 100000],
      },
      {
        rule_id: 'ECOM_ENUM_004',
        domain: 'ecommerce',
        version: '1.0.0',
        description: 'Order_Status must normalize to official enum variants (Completed, Shipped, Pending, Cancelled, Refunded).',
        condition: "['Completed', 'Shipped', 'Pending', 'Processing', 'Cancelled', 'Refunded'].includes(Order_Status)",
        action: 'NORMALIZE',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-01-10T00:00:00.000Z',
        updated_at: '2026-01-10T00:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Order_Status'],
        allowed_values: ['Completed', 'Shipped', 'Pending', 'Processing', 'Cancelled', 'Refunded'],
      },
    ],
  },
  {
    id: 'finance',
    name: 'Financial & Banking',
    version: '1.1.0',
    description: 'General ledger, credit risk, bank transaction reconciliations, and debt ratios.',
    icon: 'Landmark',
    created_at: '2026-01-12T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [
      { name: 'Account_Number', aliases: ['account_id', 'acct_no', 'account_number'], expected_type: 'id', is_identifier: true, description: 'Protected bank account identifier' },
      { name: 'Transaction_Type', aliases: ['txn_type', 'type', 'transaction_type'], expected_type: 'string', allowed_values: ['Deposit', 'Withdrawal', 'Transfer', 'Fee', 'Interest', 'Adjustment'], description: 'Ledger movement category' },
      { name: 'Debit_Amount', aliases: ['debit', 'debit_amount', 'dr_amount'], expected_type: 'number', valid_range: [0, 100000000], description: 'Debit expenditure amount' },
      { name: 'Credit_Amount', aliases: ['credit', 'credit_amount', 'cr_amount'], expected_type: 'number', valid_range: [0, 100000000], description: 'Credit inflow amount' },
      { name: 'Credit_Score', aliases: ['credit_score', 'fico', 'score'], expected_type: 'number', valid_range: [300, 850], description: 'Standard FICO credit score (300-850)' },
    ],
    kpis: [
      { name: 'Net_Cash_Flow', formula: 'SUM(Credit_Amount) - SUM(Debit_Amount)', description: 'Net periodic cash flow', unit: '$' },
    ],
    rules: [
      {
        rule_id: 'FIN_FICO_001',
        domain: 'finance',
        version: '1.1.0',
        description: 'Credit score must fall within valid FICO boundaries (300 to 850).',
        condition: 'Credit_Score >= 300 && Credit_Score <= 850',
        action: 'FLAG',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        auto_fix_allowed: false,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-01-12T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Credit_Score'],
        valid_range: [300, 850],
      },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Clinical',
    version: '1.1.0',
    description: 'Patient admissions, vital signs, clinical laboratory thresholds, and medical codes.',
    icon: 'Activity',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [
      { name: 'Patient_ID', aliases: ['patient_id', 'mrn', 'patient_no'], expected_type: 'id', is_identifier: true, description: 'Medical Record Number / Unique Patient Identifier' },
      { name: 'Age', aliases: ['age', 'patient_age'], expected_type: 'number', valid_range: [0, 125], description: 'Patient biological age in years' },
      { name: 'Heart_Rate', aliases: ['heart_rate', 'pulse', 'hr_bpm'], expected_type: 'number', valid_range: [30, 220], description: 'Heart rate in beats per minute' },
    ],
    kpis: [],
    rules: [
      {
        rule_id: 'HEALTH_AGE_002',
        domain: 'healthcare',
        version: '1.0.0',
        description: 'Patient age cannot be negative or exceed human longevity limits (0 to 125).',
        condition: 'Age >= 0 && Age <= 125',
        action: 'CAP',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-01-15T00:00:00.000Z',
        updated_at: '2026-01-15T00:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Age'],
        valid_range: [0, 125],
      },
    ],
  },
  {
    id: 'generic',
    name: 'Generic Tabular Dataset',
    version: '1.0.0',
    description: 'Universal fallback domain covering baseline types, duplicates, and general tabular sanity.',
    icon: 'Database',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [],
    kpis: [],
    rules: [],
  },
];

class DomainKnowledgeRepository {
  private domains: Map<string, DomainDefinition> = new Map();

  constructor() {
    BUILT_IN_DOMAINS.forEach((d) => this.domains.set(d.id, d));
  }

  public getAllDomains(): DomainDefinition[] {
    return Array.from(this.domains.values());
  }

  public getDomain(domainId: string): DomainDefinition {
    return (
      this.domains.get(domainId) ||
      this.domains.get('generic') ||
      BUILT_IN_DOMAINS[0]
    );
  }

  public getRulesForDomain(domainId: string): DomainRule[] {
    const domain = this.getDomain(domainId);
    return domain.rules || [];
  }

  public getKPIsForDomain(domainId: string): DomainKPIDefinition[] {
    const domain = this.getDomain(domainId);
    return domain.kpis || [];
  }
}

export const domainKnowledgeRepository = new DomainKnowledgeRepository();
