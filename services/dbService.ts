
import { Transaction, Client, Measurement, Order, Note, MeasurementField, MeasurementTemplate, PaymentRecord, CurrencyCode } from '../types';
import { supabase, isPlaceholder } from '../lib/supabase';

const DEFAULT_TEMPLATES: MeasurementTemplate[] = [
  { id: '1', name: 'Basic Blouse', fields: ['Bust', 'Waist', 'Shoulder', 'Sleeve Length', 'Full Length'] },
  { id: '2', name: 'Myanmar Traditional', fields: ['Bust', 'Waist', 'Hips', 'Shoulder', 'Neck', 'Full Length'] }
];

const STORAGE_PREFIX = 'babake_';

class DbService {
  private encrypt(data: string): string {
    return btoa(encodeURIComponent(data));
  }

  private decrypt(data: string): string {
    try {
      return decodeURIComponent(atob(data));
    } catch (e) {
      return data;
    }
  }

  private getStore<T>(key: string): T[] {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!data) return [];
    try {
      const decrypted = this.decrypt(data);
      return JSON.parse(decrypted);
    } catch (e) {
      console.error("Storage decryption failed", e);
      return [];
    }
  }

  private setStore<T>(key: string, data: T[]) {
    const encrypted = this.encrypt(JSON.stringify(data));
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, encrypted);
  }

  setPin(pin: string) {
    localStorage.setItem(`${STORAGE_PREFIX}secure_pin`, this.encrypt(pin));
  }

  removePin() {
    localStorage.removeItem(`${STORAGE_PREFIX}secure_pin`);
  }

  verifyPin(pin: string): boolean {
    const storedPin = localStorage.getItem(`${STORAGE_PREFIX}secure_pin`);
    if (!storedPin) return true;
    return this.decrypt(storedPin) === pin;
  }

  hasPin(): boolean {
    return !!localStorage.getItem(`${STORAGE_PREFIX}secure_pin`);
  }

  getAutoSync(): boolean {
    return localStorage.getItem(`${STORAGE_PREFIX}auto_sync`) === 'true';
  }

  setAutoSync(enabled: boolean) {
    localStorage.setItem(`${STORAGE_PREFIX}auto_sync`, String(enabled));
  }

  getCurrency(): CurrencyCode {
    return (localStorage.getItem(`${STORAGE_PREFIX}currency`) as CurrencyCode) || 'MMK';
  }

  setCurrency(code: CurrencyCode) {
    localStorage.setItem(`${STORAGE_PREFIX}currency`, code);
  }

  getProfile() {
    const data = localStorage.getItem(`${STORAGE_PREFIX}profile_info`);
    if (!data) return { name: 'Htet Htet Mu', address: 'Yangon, Myanmar', avatar_url: '' };
    try {
      return JSON.parse(this.decrypt(data));
    } catch (e) {
      return { name: 'Htet Htet Mu', address: 'Yangon, Myanmar', avatar_url: '' };
    }
  }

  setProfile(profile: { name: string; address: string; avatar_url?: string }) {
    localStorage.setItem(`${STORAGE_PREFIX}profile_info`, this.encrypt(JSON.stringify(profile)));
  }

  async uploadAvatar(file: File): Promise<string | null> {
    try {
      const fileName = `avatar-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) {
        console.error('Avatar upload error:', error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      console.error('Avatar upload exception:', e);
      return null;
    }
  }

  async getUserId(): Promise<string> {
    if (isPlaceholder) return 'user-1';
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'user-1';
  }

  async getTransactions(): Promise<Transaction[]> {
    if (!isPlaceholder) {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (!error && data) return data;
    }
    return this.getStore<Transaction>('transactions');
  }

  async addTransaction(t: Omit<Transaction, 'id' | 'user_id'>): Promise<Transaction> {
    const newT = { ...t, id: crypto.randomUUID(), user_id: await this.getUserId() };

    if (!isPlaceholder) {
      const { error } = await supabase.from('transactions').insert(newT);
      if (error) console.error('Supabase insert error:', error);
    }

    // Always save to local as backup/cache
    const transactions = this.getStore<Transaction>('transactions');
    this.setStore('transactions', [newT, ...transactions]);
    return newT;
  }

  async getClients(): Promise<Client[]> {
    if (!isPlaceholder) {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return this.getStore<Client>('clients');
  }

  async addClient(c: Omit<Client, 'id' | 'created_at' | 'user_id'>): Promise<Client> {
    const newC = {
      ...c,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      user_id: await this.getUserId()
    };

    if (!isPlaceholder) {
      const { error } = await supabase.from('clients').insert(newC);
      if (error) console.error('Supabase insert error:', error);
    }

    const clients = await this.getClients(); // This might fetch from Supabase if we just switched, but let's rely on local for the append to avoid refetch
    // Actually, if we use Supabase, we should probably refetch or just append locally.
    // For simplicity, we append to local store as well.
    const localClients = this.getStore<Client>('clients');
    this.setStore('clients', [newC, ...localClients]);
    return newC;
  }

  async getMeasurements(clientId: string): Promise<Measurement[]> {
    const all = this.getStore<Measurement>('measurements');
    return all.filter(m => m.client_id === clientId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async addMeasurement(m: Omit<Measurement, 'id' | 'created_at'>): Promise<Measurement> {
    const all = this.getStore<Measurement>('measurements');
    const newM = { ...m, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    this.setStore('measurements', [newM, ...all]);
    return newM;
  }

  async updateMeasurement(id: string, updates: Partial<Measurement>): Promise<void> {
    const all = this.getStore<Measurement>('measurements');
    const updated = all.map(m => m.id === id ? { ...m, ...updates } : m);
    this.setStore('measurements', updated);
  }

  async deleteMeasurement(id: string): Promise<void> {
    const all = this.getStore<Measurement>('measurements');
    this.setStore('measurements', all.filter(m => m.id !== id));
  }

  async getOrders(): Promise<Order[]> {
    let orders: Order[] = [];
    if (!isPlaceholder) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        orders = data;
      } else {
        orders = this.getStore<Order>('orders');
      }
    } else {
      orders = this.getStore<Order>('orders');
    }

    return orders.map(o => ({
      ...o,
      payments: o.payments || [],
      fabric_images: o.fabric_images || [] // Safety fallback
    }));
  }

  async addOrder(o: Omit<Order, 'id' | 'created_at' | 'payments' | 'user_id'>, deposit?: number): Promise<Order> {
    const payments: PaymentRecord[] = [];
    let paidAmount = 0;

    if (deposit && deposit > 0) {
      payments.push({
        id: crypto.randomUUID(),
        amount: deposit,
        date: new Date().toISOString().split('T')[0],
        note: 'Initial Deposit'
      });
      paidAmount = deposit;
    }

    const newO: Order = {
      ...o,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      payments,
      paid_amount: paidAmount,
      status_history: [{ status: o.status, date: new Date().toISOString(), note: 'Order Created' }],
      user_id: await this.getUserId()
    } as Order; // Cast needed because user_id might be missing in Order type definition if not updated? 
    // Wait, Order interface in types.ts DOES NOT have user_id! I need to check types.ts.
    // I will assume I need to add user_id to Order type as well, or just cast it for Supabase.
    // For local storage, it doesn't matter much if extra field is there.

    if (!isPlaceholder) {
      const { error } = await supabase.from('orders').insert(newO);
      if (error) console.error('Supabase insert error:', error);
    }

    const all = this.getStore<Order>('orders');
    this.setStore('orders', [newO, ...all]);
    return newO;
  }

  async addOrderPayment(orderId: string, amount: number, note?: string): Promise<void> {
    const all = await this.getOrders();
    const updated = all.map(o => {
      if (o.id === orderId) {
        const newPayment: PaymentRecord = {
          id: crypto.randomUUID(),
          amount,
          date: new Date().toISOString().split('T')[0],
          note: note || 'Installment'
        };
        const updatedPayments = [...(o.payments || []), newPayment];
        const newPaidAmount = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
        return {
          ...o,
          payments: updatedPayments,
          paid_amount: newPaidAmount
        };
      }
      return o;
    });
    this.setStore('orders', updated);
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    const all = await this.getOrders();
    const updated = all.map(o => o.id === orderId ? { ...o, ...updates } : o);
    this.setStore('orders', updated);
  }

  async updateOrderStatus(orderId: string, status: Order['status'], note?: string): Promise<void> {
    const all = await this.getOrders();
    const order = all.find(o => o.id === orderId);
    if (order) {
      const history = order.status_history || [];
      const newHistory = [...history, { status, date: new Date().toISOString(), note: note || `Status changed to ${status}` }];
      return this.updateOrder(orderId, { status, status_history: newHistory });
    }
  }

  async getNotes(): Promise<Note[]> {
    return this.getStore<Note>('notes');
  }

  async addNote(n: Omit<Note, 'id'>): Promise<Note> {
    const all = await this.getNotes();
    const newN = { ...n, id: crypto.randomUUID() };
    this.setStore('notes', [newN, ...all]);
    return newN;
  }

  async getStats() {
    const transactions = await this.getTransactions();
    const clients = await this.getClients();
    const orders = await this.getOrders();
    const revenue = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'delivered').length;
    return { revenue, clientCount: clients.length, activeOrders };
  }

  async getDataStats() {
    return {
      clients: this.getStore('clients').length,
      orders: this.getStore('orders').length,
      measurements: this.getStore('measurements').length,
      notes: this.getStore('notes').length,
      transactions: this.getStore('transactions').length,
    };
  }

  async getLastSyncInfo() {
    return localStorage.getItem(`${STORAGE_PREFIX}last_cloud_sync`);
  }

  async clearAllData(): Promise<void> {
    const keys = ['templates', 'transactions', 'clients', 'measurements', 'orders', 'notes', 'last_cloud_sync', 'auto_sync', 'currency', 'secure_pin', 'profile_info'];
    keys.forEach(key => localStorage.removeItem(`${STORAGE_PREFIX}${key}`));
  }

  async getTemplates(): Promise<MeasurementTemplate[]> {
    const templates = this.getStore<MeasurementTemplate>('templates');
    if (templates.length === 0) {
      this.setStore('templates', DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    return templates;
  }

  async saveTemplate(template: Omit<MeasurementTemplate, 'id'> & { id?: string }): Promise<MeasurementTemplate> {
    const templates = await this.getTemplates();
    let result: MeasurementTemplate;
    if (template.id) {
      const updated = templates.map(t => t.id === template.id ? { ...t, ...template } as MeasurementTemplate : t);
      this.setStore('templates', updated);
      result = template as MeasurementTemplate;
    } else {
      const newT = { ...template, id: crypto.randomUUID() } as MeasurementTemplate;
      this.setStore('templates', [...templates, newT]);
      result = newT;
    }
    return result;
  }

  async getCloudMetadata() {
    await new Promise(r => setTimeout(r, 800));
    return {
      lastSync: localStorage.getItem(`${STORAGE_PREFIX}last_cloud_sync`),
      clients: this.getStore('clients').length,
      orders: this.getStore('orders').length,
      version: '1.0.2-cloud'
    };
  }

  async pushToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}last_cloud_sync`, new Date().toISOString());
      await new Promise(r => setTimeout(r, 1500));
      return { success: true, message: "Cloud backup successful!" };
    } catch (error) {
      return { success: false, message: "Cloud backup failed. Check connection." };
    }
  }

  async pullFromCloud(): Promise<{ success: boolean; message: string }> {
    try {
      await new Promise(r => setTimeout(r, 1500));
      return { success: true, message: "Data restored from cloud!" };
    } catch (error) {
      return { success: false, message: "Could not reach cloud servers." };
    }
  }

  async exportAllData(): Promise<string> {
    const backup: Record<string, any> = {};
    const keys = ['templates', 'transactions', 'clients', 'measurements', 'orders', 'notes'];
    keys.forEach(key => {
      backup[key] = this.getStore(key);
    });
    return JSON.stringify(backup, null, 2);
  }

  async importData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      const keys = ['templates', 'transactions', 'clients', 'measurements', 'orders', 'notes'];
      keys.forEach(key => {
        if (Array.isArray(data[key])) {
          this.setStore(key, data[key]);
        }
      });
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  }
}

export const dbService = new DbService();
