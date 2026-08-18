import fs from 'fs';
import path from 'path';

export interface ColumnSemanticDefinition {
  name: string;
  aliases: string[];
  expected_type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'id';
  valid_range?: [number, number];
  allowed_values?: string[];
  is_identifier?: boolean;
  format_pattern?: string;
  description: string;
}

export interface DomainKPIDefinition {
  name: string;
  formula: string;
  description: string;
  unit?: string;
}

export interface DomainRule {
  rule_id: string;
  domain: string;
  version: string;
  description: string;
  condition: string;
  action: 'CORRECT' | 'FLAG' | 'NORMALIZE' | 'CAP' | 'IMPUTE' | 'REJECT' | 'CALCULATE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  auto_fix_allowed: boolean;
  source: 'ORGANIZATION' | 'DOMAIN_STANDARD' | 'USER_APPROVED' | 'DATASET_CUSTOM' | 'AI_PROPOSED' | 'GENERIC_CLEANING';
  created_at: string;
  updated_at: string;
  status: 'ACTIVE' | 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'DEPRECATED';
  priority: number;
  target_columns: string[];
  valid_range?: [number, number];
  allowed_values?: string[];
  formula_expression?: string;
  parameters?: Record<string, any>;
  error_message?: string;
  conflict_ids?: string[];
}

export interface DomainDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  column_semantics: ColumnSemanticDefinition[];
  kpis: DomainKPIDefinition[];
  rules: DomainRule[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeVersionRecord {
  id: string;
  version: string;
  domain: string;
  rule_id: string;
  previous_rule?: DomainRule;
  new_rule: DomainRule;
  reason_for_change: string;
  changed_by: string;
  timestamp: string;
  evidence: string;
}

export interface AIRuleProposal {
  rule_id: string;
  detected_pattern: string;
  proposed_rule: DomainRule;
  evidence: string;
  affected_columns: string[];
  affected_rows: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  potential_false_positives: string;
  potential_business_impact: string;
  recommended_action: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_by?: string;
  rejected_reason?: string;
}

// Initial Base Knowledge Store for multiple real-world domains
const INITIAL_DOMAINS: DomainDefinition[] = [
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
      { name: 'Payment_Method', aliases: ['payment_method', 'pay_type', 'payment_type'], expected_type: 'string', allowed_values: ['Credit Card', 'Debit Card', 'PayPal', 'Apple Pay', 'Bank Transfer', 'Cash on Delivery'], description: 'Settlement instrument utilized' },
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
        description: 'Discount must strictly reside between 0.00 and 1.00 (or converted if 1-100%).',
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
      {
        rule_id: 'USER_RULE_DISCOUNT_PERCENT',
        domain: 'ecommerce',
        version: '1.0.0',
        description: 'Marketing campaign promo discounts are specified as whole percentage numbers [0 to 100%].',
        condition: 'Discount >= 0 && Discount <= 100',
        action: 'CORRECT',
        severity: 'HIGH',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'USER_APPROVED',
        created_at: '2026-08-10T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 1,
        target_columns: ['Discount'],
        valid_range: [0, 100],
      }
    ]
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
      { name: 'Debt_To_Income', aliases: ['dti', 'debt_to_income', 'dti_ratio'], expected_type: 'number', valid_range: [0, 100], description: 'Monthly debt obligations vs gross income percentage' },
    ],
    kpis: [
      { name: 'Net_Cash_Flow', formula: 'SUM(Credit_Amount) - SUM(Debit_Amount)', description: 'Net periodic cash flow', unit: '$' },
      { name: 'Average_Credit_Score', formula: 'AVG(Credit_Score)', description: 'Mean borrower creditworthiness' },
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
      {
        rule_id: 'FIN_LEDGER_002',
        domain: 'finance',
        version: '1.0.0',
        description: 'Single transaction cannot have both Debit > 0 and Credit > 0 simultaneously.',
        condition: '!(Debit_Amount > 0 && Credit_Amount > 0)',
        action: 'FLAG',
        severity: 'HIGH',
        confidence: 'HIGH',
        auto_fix_allowed: false,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-01-12T00:00:00.000Z',
        updated_at: '2026-01-12T00:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Debit_Amount', 'Credit_Amount'],
      }
    ]
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
      { name: 'Systolic_BP', aliases: ['systolic', 'sys_bp', 'systolic_bp'], expected_type: 'number', valid_range: [60, 240], description: 'Systolic blood pressure (mmHg)' },
      { name: 'Diastolic_BP', aliases: ['diastolic', 'dia_bp', 'diastolic_bp'], expected_type: 'number', valid_range: [40, 140], description: 'Diastolic blood pressure (mmHg)' },
      { name: 'Body_Temp_C', aliases: ['body_temp', 'temp_c', 'temperature'], expected_type: 'number', valid_range: [32.0, 43.0], description: 'Core body temperature in Celsius' },
    ],
    kpis: [
      { name: 'Average_Stay_Length', formula: 'AVG(Discharge_Date - Admission_Date)', description: 'Average hospital admission duration in days', unit: 'days' },
    ],
    rules: [
      {
        rule_id: 'HEALTH_BP_001',
        domain: 'healthcare',
        version: '1.1.0',
        description: 'Systolic BP must always be strictly greater than Diastolic BP by at least 10 mmHg.',
        condition: 'Systolic_BP >= Diastolic_BP + 10',
        action: 'FLAG',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        auto_fix_allowed: false,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-01-15T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Systolic_BP', 'Diastolic_BP'],
      },
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
      }
    ]
  },
  {
    id: 'saas',
    name: 'SaaS & Subscriptions',
    version: '1.0.0',
    description: 'Recurring subscriptions, MRR/ARR, churn events, and seat licensing.',
    icon: 'Zap',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [
      { name: 'Subscription_ID', aliases: ['sub_id', 'subscription_id', 'contract_id'], expected_type: 'id', is_identifier: true, description: 'Unique subscription contract ID' },
      { name: 'MRR', aliases: ['mrr', 'monthly_recurring_revenue', 'monthly_rate'], expected_type: 'number', valid_range: [0, 1000000], description: 'Monthly Recurring Revenue' },
      { name: 'ARR', aliases: ['arr', 'annual_recurring_revenue'], expected_type: 'number', valid_range: [0, 12000000], description: 'Annualized Recurring Revenue (MRR * 12)' },
      { name: 'Plan_Tier', aliases: ['plan', 'tier', 'plan_tier', 'subscription_plan'], expected_type: 'string', allowed_values: ['Free', 'Starter', 'Professional', 'Business', 'Enterprise'], description: 'Subscription entitlement level' },
      { name: 'Billing_Frequency', aliases: ['billing_frequency', 'interval', 'billing_cycle'], expected_type: 'string', allowed_values: ['Monthly', 'Quarterly', 'Annual', 'Multi-Year'], description: 'Invoicing cadence' },
    ],
    kpis: [
      { name: 'Total_ARR', formula: 'SUM(MRR * 12)', description: 'Total Annual Recurring Revenue run-rate', unit: '$' },
      { name: 'ARPU', formula: 'AVG(MRR)', description: 'Average Revenue per Account/User', unit: '$' },
    ],
    rules: [
      {
        rule_id: 'SAAS_ARR_001',
        domain: 'saas',
        version: '1.0.0',
        description: 'ARR must equal MRR × 12 for active recurring subscriptions.',
        condition: 'Math.abs(ARR - (MRR * 12)) <= 1.0',
        action: 'CORRECT',
        severity: 'HIGH',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['ARR', 'MRR'],
        formula_expression: 'ARR = MRR * 12',
      }
    ]
  },
  {
    id: 'hr',
    name: 'Human Resources & Payroll',
    version: '1.0.0',
    description: 'Workforce headcount, salary bands, performance evaluations, and tenure.',
    icon: 'Users',
    created_at: '2026-02-10T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [
      { name: 'Employee_ID', aliases: ['employee_id', 'emp_id', 'staff_id'], expected_type: 'id', is_identifier: true, description: 'Unique staff identifier' },
      { name: 'Base_Salary', aliases: ['base_salary', 'salary', 'annual_salary', 'base_pay'], expected_type: 'number', valid_range: [15000, 2000000], description: 'Annualized base compensation' },
      { name: 'Bonus', aliases: ['bonus', 'incentive', 'variable_pay'], expected_type: 'number', valid_range: [0, 1000000], description: 'Annual incentive bonus' },
      { name: 'Gross_Pay', aliases: ['gross_pay', 'gross_compensation', 'total_comp'], expected_type: 'number', valid_range: [15000, 3000000], description: 'Total pre-tax compensation (Base + Bonus)' },
      { name: 'Performance_Rating', aliases: ['performance_rating', 'rating', 'review_score'], expected_type: 'number', valid_range: [1, 5], description: 'Standard 1-to-5 performance score' },
    ],
    kpis: [
      { name: 'Average_Salary', formula: 'AVG(Base_Salary)', description: 'Mean workforce annual base pay', unit: '$' },
      { name: 'Total_Payroll', formula: 'SUM(Gross_Pay)', description: 'Total organizational compensation outlay', unit: '$' },
    ],
    rules: [
      {
        rule_id: 'HR_GROSS_001',
        domain: 'hr',
        version: '1.0.0',
        description: 'Gross_Pay must equal Base_Salary + Bonus.',
        condition: 'Math.abs(Gross_Pay - (Base_Salary + (Bonus || 0))) <= 1.0',
        action: 'CORRECT',
        severity: 'HIGH',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-02-10T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Gross_Pay', 'Base_Salary', 'Bonus'],
        formula_expression: 'Gross_Pay = Base_Salary + Bonus',
      }
    ]
  },
  {
    id: 'logistics',
    name: 'Logistics & Supply Chain',
    version: '1.0.0',
    description: 'Shipment waybills, origin-destination routing, payload weights, and delivery SLA.',
    icon: 'Truck',
    created_at: '2026-02-20T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [
      { name: 'Tracking_Number', aliases: ['tracking_number', 'waybill', 'tracking_id', 'shipment_id'], expected_type: 'id', is_identifier: true, description: 'Package tracking waybill number' },
      { name: 'Weight_KG', aliases: ['weight', 'weight_kg', 'gross_weight'], expected_type: 'number', valid_range: [0.01, 50000], description: 'Package payload mass in kilograms' },
      { name: 'Transit_Days', aliases: ['transit_days', 'duration_days', 'days_in_transit'], expected_type: 'number', valid_range: [0, 180], description: 'Elapsed delivery days from dispatch' },
      { name: 'Delivery_Status', aliases: ['delivery_status', 'shipment_status', 'status'], expected_type: 'string', allowed_values: ['In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Failed Delivery', 'Returned to Sender'], description: 'Real-time courier transit state' },
    ],
    kpis: [
      { name: 'On_Time_Delivery_Rate', formula: 'COUNT(Status="Delivered" AND Transit_Days <= SLA) / COUNT(*)', description: 'Shipments meeting promised delivery timeline', unit: '%' },
    ],
    rules: [
      {
        rule_id: 'LOG_WEIGHT_001',
        domain: 'logistics',
        version: '1.0.0',
        description: 'Shipment weight must be strictly positive (> 0.01 KG).',
        condition: 'Weight_KG > 0.01',
        action: 'CORRECT',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-02-20T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Weight_KG'],
        valid_range: [0.01, 50000],
      }
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing & AdTech',
    version: '1.0.0',
    description: 'Ad campaign impressions, click-through rates, conversion funnels, and ad spend.',
    icon: 'Megaphone',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [
      { name: 'Campaign_ID', aliases: ['campaign_id', 'ad_id', 'campaign_name'], expected_type: 'id', is_identifier: true, description: 'Marketing campaign identifier' },
      { name: 'Impressions', aliases: ['impressions', 'views', 'ad_views'], expected_type: 'number', valid_range: [0, 1000000000], description: 'Total ad impression count' },
      { name: 'Clicks', aliases: ['clicks', 'ad_clicks', 'user_clicks'], expected_type: 'number', valid_range: [0, 100000000], description: 'Total clicked traffic' },
      { name: 'Conversions', aliases: ['conversions', 'purchases', 'leads'], expected_type: 'number', valid_range: [0, 10000000], description: 'Downstream goal conversions' },
      { name: 'Spend', aliases: ['spend', 'ad_spend', 'cost', 'campaign_cost'], expected_type: 'number', valid_range: [0, 10000000], description: 'Media expenditure amount' },
    ],
    kpis: [
      { name: 'CTR', formula: 'SUM(Clicks) / SUM(Impressions)', description: 'Click-Through Rate', unit: '%' },
      { name: 'CPC', formula: 'SUM(Spend) / SUM(Clicks)', description: 'Cost Per Click', unit: '$' },
      { name: 'Conversion_Rate', formula: 'SUM(Conversions) / SUM(Clicks)', description: 'Landing page conversion efficiency', unit: '%' },
    ],
    rules: [
      {
        rule_id: 'MKT_FUNNEL_001',
        domain: 'marketing',
        version: '1.0.0',
        description: 'Funnel consistency: Clicks cannot exceed Impressions, and Conversions cannot exceed Clicks.',
        condition: 'Clicks <= Impressions && Conversions <= Clicks',
        action: 'FLAG',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        auto_fix_allowed: false,
        source: 'DOMAIN_STANDARD',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 2,
        target_columns: ['Impressions', 'Clicks', 'Conversions'],
      }
    ]
  },
  {
    id: 'generic',
    name: 'Generic Tabular Dataset',
    version: '1.0.0',
    description: 'Universal fallback rules for arbitrary structured tabular data when domain is ambiguous.',
    icon: 'Table',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    column_semantics: [],
    kpis: [],
    rules: [
      {
        rule_id: 'GEN_NULL_001',
        domain: 'generic',
        version: '1.0.0',
        description: 'Impute missing sentinel placeholders (null, NaN, N/A, undefined, blank).',
        condition: 'value !== null && value !== "" && value !== "N/A" && value !== "null"',
        action: 'IMPUTE',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'GENERIC_CLEANING',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 4,
        target_columns: ['*'],
      },
      {
        rule_id: 'GEN_TRIM_002',
        domain: 'generic',
        version: '1.0.0',
        description: 'Trim leading, trailing, and redundant internal whitespace across string fields.',
        condition: 'value === value.trim().replace(/\\s+/g, " ")',
        action: 'NORMALIZE',
        severity: 'LOW',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        source: 'GENERIC_CLEANING',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-08-18T08:00:00.000Z',
        status: 'ACTIVE',
        priority: 4,
        target_columns: ['*'],
      }
    ]
  }
];

// In-Memory & File-backed Dynamic Store
class KnowledgeBaseRepository {
  private domains: Map<string, DomainDefinition> = new Map();
  private versionHistory: KnowledgeVersionRecord[] = [];
  private aiProposals: AIRuleProposal[] = [];
  private dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'server', 'data');
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (e) {
        console.warn('Could not create server/data directory, using in-memory store:', e);
      }
    }
    this.initialize();
  }

  private initialize() {
    INITIAL_DOMAINS.forEach((d) => {
      this.domains.set(d.id, JSON.parse(JSON.stringify(d)));
    });
  }

  public getAllDomains(): DomainDefinition[] {
    return Array.from(this.domains.values());
  }

  public getDomain(domainId: string): DomainDefinition | undefined {
    return this.domains.get(domainId);
  }

  public addDomain(domain: DomainDefinition, author = 'System User'): DomainDefinition {
    this.domains.set(domain.id, domain);
    return domain;
  }

  public addRule(domainId: string, rule: DomainRule, author = 'Analyst', reason = 'New domain business rule'): DomainRule {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error(`Domain '${domainId}' not found`);

    const updatedRule: DomainRule = {
      ...rule,
      version: rule.version || '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: rule.status || 'ACTIVE',
    };

    domain.rules.push(updatedRule);
    domain.updated_at = new Date().toISOString();

    // Log Versioning
    this.versionHistory.push({
      id: `VER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: updatedRule.version,
      domain: domainId,
      rule_id: updatedRule.rule_id,
      new_rule: updatedRule,
      reason_for_change: reason,
      changed_by: author,
      timestamp: new Date().toISOString(),
      evidence: 'Direct Knowledge Base Rule Addition',
    });

    return updatedRule;
  }

  public updateRule(
    domainId: string,
    ruleId: string,
    updatedFields: Partial<DomainRule>,
    author = 'Analyst',
    reason = 'Rule parameter and boundary revision'
  ): DomainRule {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error(`Domain '${domainId}' not found`);

    const ruleIndex = domain.rules.findIndex((r) => r.rule_id === ruleId);
    if (ruleIndex === -1) throw new Error(`Rule '${ruleId}' not found in domain '${domainId}'`);

    const previousRule = JSON.parse(JSON.stringify(domain.rules[ruleIndex]));
    
    // Bump version (e.g. 1.0.0 -> 1.1.0)
    const vParts = previousRule.version.split('.').map(Number);
    const newVersion = `${vParts[0] || 1}.${(vParts[1] || 0) + 1}.0`;

    const newRule: DomainRule = {
      ...previousRule,
      ...updatedFields,
      rule_id: ruleId,
      domain: domainId,
      version: newVersion,
      updated_at: new Date().toISOString(),
    };

    domain.rules[ruleIndex] = newRule;
    domain.updated_at = new Date().toISOString();

    // Record immutable version log
    this.versionHistory.push({
      id: `VER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: newVersion,
      domain: domainId,
      rule_id: ruleId,
      previous_rule: previousRule,
      new_rule: newRule,
      reason_for_change: reason,
      changed_by: author,
      timestamp: new Date().toISOString(),
      evidence: `Modified fields: ${Object.keys(updatedFields).join(', ')}`,
    });

    return newRule;
  }

  public setRuleStatus(
    domainId: string,
    ruleId: string,
    status: DomainRule['status'],
    author = 'Analyst',
    reason = 'Status changed'
  ): DomainRule {
    return this.updateRule(domainId, ruleId, { status }, author, reason);
  }

  public proposeAIRule(proposal: AIRuleProposal): AIRuleProposal {
    this.aiProposals = [proposal, ...this.aiProposals];
    return proposal;
  }

  public getAIProposals(): AIRuleProposal[] {
    return this.aiProposals;
  }

  public reviewAIProposal(
    ruleId: string,
    action: 'APPROVE' | 'REJECT',
    author = 'Human Reviewer',
    reason?: string
  ): { proposal: AIRuleProposal; activatedRule?: DomainRule } {
    const proposalIndex = this.aiProposals.findIndex((p) => p.rule_id === ruleId);
    if (proposalIndex === -1) throw new Error(`AI Proposal '${ruleId}' not found`);

    const proposal = this.aiProposals[proposalIndex];
    proposal.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    proposal.approved_by = action === 'APPROVE' ? author : undefined;
    proposal.rejected_reason = action === 'REJECT' ? reason : undefined;

    let activatedRule: DomainRule | undefined = undefined;

    if (action === 'APPROVE') {
      const targetDomain = proposal.proposed_rule.domain || 'generic';
      const ruleToActivate: DomainRule = {
        ...proposal.proposed_rule,
        status: 'APPROVED',
        source: 'USER_APPROVED',
        priority: 1, // User-approved gets highest priority
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      let domain = this.domains.get(targetDomain);
      if (!domain) {
        domain = this.domains.get('generic')!;
      }
      domain.rules.push(ruleToActivate);
      activatedRule = ruleToActivate;

      this.versionHistory.push({
        id: `VER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        version: ruleToActivate.version,
        domain: targetDomain,
        rule_id: ruleToActivate.rule_id,
        new_rule: ruleToActivate,
        reason_for_change: `Approved AI Rule Proposal: ${proposal.detected_pattern}`,
        changed_by: author,
        timestamp: new Date().toISOString(),
        evidence: proposal.evidence,
      });
    }

    return { proposal, activatedRule };
  }

  public getVersionHistory(): KnowledgeVersionRecord[] {
    return this.versionHistory;
  }

  // Conflict Detection Engine between rules
  public detectConflicts(rules: DomainRule[]): any[] {
    const conflicts: any[] = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const a = rules[i];
        const b = rules[j];

        // Check if they target the same column
        const sharedCols = a.target_columns.filter((c) => b.target_columns.includes(c) && c !== '*');
        if (sharedCols.length === 0) continue;

        // 1. Check Range Contradiction (e.g. Discount <= 1 vs Discount 10..100)
        if (a.valid_range && b.valid_range) {
          const [minA, maxA] = a.valid_range;
          const [minB, maxB] = b.valid_range;
          if (maxA < minB || maxB < minA) {
            conflicts.push({
              conflict_id: `CONF-${a.rule_id}-${b.rule_id}`,
              rule_a: a,
              rule_b: b,
              affected_columns: sharedCols,
              conflict_type: 'RANGE_CONTRADICTION',
              description: `Rule ${a.rule_id} bounds [${minA}, ${maxA}] contradict Rule ${b.rule_id} bounds [${minB}, ${maxB}].`,
              possible_interpretation: 'Different units of measure (e.g., fraction 0-1 vs percentage 10-100%).',
              recommended_resolution: 'Apply User-Approved rule or normalize percentage columns by dividing by 100.',
            });
          }
        }

        // 2. Action Contradictions (e.g. one says REJECT, one says CORRECT)
        if (a.action === 'REJECT' && (b.action === 'CORRECT' || b.action === 'CAP')) {
          conflicts.push({
            conflict_id: `CONF-ACT-${a.rule_id}-${b.rule_id}`,
            rule_a: a,
            rule_b: b,
            affected_columns: sharedCols,
            conflict_type: 'MUTUALLY_EXCLUSIVE_ACTIONS',
            description: `Rule ${a.rule_id} mandates row deletion/rejection while Rule ${b.rule_id} attempts inline auto-correction.`,
            possible_interpretation: 'Conflicting severity policies between regulatory audit rules and operational auto-fixes.',
            recommended_resolution: 'Prioritize User-Approved policy; flag records for human verification before dropping.',
          });
        }

        // 3. Formula Divergence (e.g. formula_expression discrepancy)
        if (a.formula_expression && b.formula_expression && a.formula_expression !== b.formula_expression) {
          conflicts.push({
            conflict_id: `CONF-FORM-${a.rule_id}-${b.rule_id}`,
            rule_a: a,
            rule_b: b,
            affected_columns: sharedCols,
            conflict_type: 'FORMULA_DIVERGENCE',
            description: `Rule ${a.rule_id} formula (${a.formula_expression}) contradicts Rule ${b.rule_id} formula (${b.formula_expression}).`,
            possible_interpretation: 'Incompatible accounting conventions or variable discounting calculations.',
            recommended_resolution: 'Enforce User-Approved revenue formula (P1) for business consistency.',
          });
        }

        // 4. Allowed Values / Enums Contradiction
        if (a.allowed_values && b.allowed_values) {
          const overlap = a.allowed_values.filter((val) => b.allowed_values?.includes(val));
          if (overlap.length === 0) {
            conflicts.push({
              conflict_id: `CONF-ENUM-${a.rule_id}-${b.rule_id}`,
              rule_a: a,
              rule_b: b,
              affected_columns: sharedCols,
              conflict_type: 'FORMAT_AMBIGUITY',
              description: `Allowed categorical sets for ${sharedCols.join(', ')} are completely disjoint between ${a.rule_id} and ${b.rule_id}.`,
              possible_interpretation: 'Different terminology standards between upstream legacy systems and modern schemas.',
              recommended_resolution: 'Unionize approved enums and apply alias normalization mappings.',
            });
          }
        }
      }
    }

    return conflicts;
  }
}

export const knowledgeBaseRepo = new KnowledgeBaseRepository();
