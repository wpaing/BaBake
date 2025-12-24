
export type TransactionType = 'income' | 'expense';

export type CurrencyCode = 'MMK' | 'USD' | 'THB' | 'EUR';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  user_id: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  user_id: string;
  created_at: string;
}

export interface MeasurementField {
  id: string;
  label: string;
}

export interface MeasurementTemplate {
  id: string;
  name: string;
  fields: string[]; // List of labels like ["Bust", "Waist"]
}

export interface Measurement {
  id: string;
  client_id: string;
  name: string;
  unit: 'inches' | 'cm';
  values: Record<string, number>;
  photo_url?: string;
  notes?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Order {
  id: string;
  client_id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'ready_for_fitting' | 'completed' | 'delivered';
  deadline: string;
  fabric_source: 'client' | 'babake';
  fabric_cost: number;
  fabric_images: string[]; // Updated to support multiple images
  total_amount: number;
  paid_amount: number;
  payments: PaymentRecord[];
  created_at: string;
  user_id: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  date: string;
  user_id: string;
}

export type AppView = 'finance' | 'clients' | 'notes' | 'orders' | 'profile';
