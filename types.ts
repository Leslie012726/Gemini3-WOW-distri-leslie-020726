export type Language = 'en' | 'zh-TW';
export type ThemeMode = 'light' | 'dark';

export interface PainterStyle {
  id: string;
  name_en: string;
  name_zh: string;
  accent: string;
  palette: string[];
  bg_from: string;
  bg_to: string;
  card_rgba_dark: string;
  card_rgba_light: string;
  border_rgba_dark: string;
  border_rgba_light: string;
  font: string;
}

export interface MedFlowRow {
  SupplierID: string;
  Deliverdate: string;
  CustomerID: string;
  LicenseNo: string;
  Category: string;
  UDID: string;
  DeviceNAME: string;
  LotNO: string;
  SerNo: string;
  Model: string;
  Number: number;
  parsedDate?: Date;
}

export interface DataSummary {
  rows: number;
  total_units: number;
  unique: {
    suppliers: number;
    customers: number;
    categories: number;
  };
  date_range: {
    min: string | null;
    max: string | null;
  };
  top_suppliers: { key: string; units: number }[];
  top_customers: { key: string; units: number }[];
  top_categories: { key: string; units: number }[];
  sample_rows: MedFlowRow[];
}

export interface FilterState {
  date_min: string | null;
  date_max: string | null;
  suppliers: string[];
  customers: string[];
  categories: string[];
  top_n: number;
  edge_threshold: number;
  max_nodes: number;
}

export interface AgentSpec {
  id: string;
  name: string;
  goal: string;
  model: string;
  system_prompt: string;
  user_prompt_template: string;
  temperature: number;
  max_tokens: number;
}

export interface PipelineRun {
    id: string;
    timestamp: number;
    agentOutputs: Record<string, string>;
    status: 'running' | 'completed' | 'failed';
    error?: string;
}

export type TabId = 'overview' | 'network' | 'agents' | 'data' | 'config' | 'quality';
