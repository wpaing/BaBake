
import React, { useState, useEffect, useRef } from 'react';
import { Order, Client, PaymentRecord, Currency } from '../types';
import { dbService } from '../services/dbService';
import { supabase } from '../lib/supabase';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { translations, Language } from '../translations';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Search,
  Calendar,
  CreditCard,
  Edit2,
  AlertTriangle,
  X,
  Plus,
  ChevronRight,
  RefreshCcw,
  CheckCircle,
  Package,
  Layers,
  FileEdit,
  Scissors,
  User,
  ShoppingBag,
  Info,
  Camera,
  ImageIcon,
  Upload,
  HandCoins,
  History,
  Check,
  Trash2,
  ArrowRight,
  Maximize2,
  Tag
} from 'lucide-react';

interface OrdersViewProps {
  openTrigger?: number;
  lang: Language;
  currency: Currency;
  targetId?: string | null;
  onTargetClear?: () => void;
}

const OrdersView: React.FC<OrdersViewProps> = ({ openTrigger, lang, currency, targetId, onTargetClear }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'urgent' | 'completed'>('all');

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const orderRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const t = translations[lang];

  const [newOrder, setNewOrder] = useState({
    client_id: '',
    description: '',
    deadline: '',
    fabric_source: 'client' as 'client' | 'babake',
    fabric_cost: '0',
    total_amount: '',
    initial_deposit: '0'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (openTrigger && openTrigger > 0) {
      setIsAddModalOpen(true);
    }
  }, [openTrigger]);

  useEffect(() => {
    if (targetId && orders.length > 0) {
      const element = orderRefs.current[targetId];
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            if (onTargetClear) onTargetClear();
          }, 3000);
        }, 100);
      }
    }
  }, [targetId, orders]);

  const loadData = async () => {
    const oData = await dbService.getOrders();
    const cData = await dbService.getClients();
    setOrders(oData);
    setClients(cData);
  };

  const getClient = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'in_progress': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'ready_for_fitting': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'delivered': return 'bg-slate-50 text-slate-500 border-slate-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getDeadlineStats = (deadline: string, status: Order['status']) => {
    if (status === 'completed' || status === 'delivered') return { isUrgent: false, daysLeft: 999, label: '' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(deadline);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let label = '';
    if (diffDays < 0) label = `${Math.abs(diffDays)}d ${t.overdue}`;
    else if (diffDays === 0) label = t.dueToday;
    else if (diffDays === 1) label = t.dueTomorrow;
    else label = `In ${diffDays}d`;

    return { isUrgent: diffDays <= 3, isOverdue: diffDays < 0, daysLeft: diffDays, label };
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    await dbService.updateOrderStatus(orderId, newStatus);
    loadData();
  };

  const handleDownloadInvoice = (order: Order) => {
    const client = getClient(order.client_id);
    if (client) {
      generateInvoicePDF(client, order, undefined, currency);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const removePreview = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImagesToSupabase = async (previews: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const base64 of previews) {
      try {
        if (supabase.storage) {
          const blob = await (await fetch(base64)).blob() as Blob;
          const fileName = `${crypto.randomUUID()}.png`;
          const { data, error } = await supabase.storage
            .from('fabrics')
            .upload(fileName, blob);

          if (!error && data) {
            const { data: { publicUrl } } = supabase.storage
              .from('fabrics')
              .getPublicUrl(fileName);
            uploadedUrls.push(publicUrl);
            continue;
          }
        }
        uploadedUrls.push(base64);
      } catch (err) {
        uploadedUrls.push(base64);
      }
    }
    return uploadedUrls;
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.client_id || !newOrder.total_amount) return;

    const deposit = parseFloat(newOrder.initial_deposit) || 0;
    const finalImages = await uploadImagesToSupabase(imagePreviews);

    await dbService.addOrder({
      client_id: newOrder.client_id,
      description: newOrder.description,
      status: 'pending',
      deadline: newOrder.deadline,
      fabric_source: newOrder.fabric_source,
      fabric_cost: parseFloat(newOrder.fabric_cost) || 0,
      fabric_images: finalImages,
      total_amount: parseFloat(newOrder.total_amount),
      paid_amount: 0
    }, deposit);

    if (deposit > 0) {
      await dbService.addTransaction({
        amount: deposit,
        type: 'income',
        category: 'Client Payment',
        description: `Deposit: ${newOrder.description}`,
        date: new Date().toISOString().split('T')[0]
      });
    }

    setNewOrder({ client_id: '', description: '', deadline: '', fabric_source: 'client', fabric_cost: '0', total_amount: '', initial_deposit: '0' });
    setImagePreviews([]);
    setIsAddModalOpen(false);
    loadData();
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    await dbService.addOrderPayment(editingOrder.id, amount, paymentNote);
    await dbService.addTransaction({
      amount: amount,
      type: 'income',
      category: 'Client Payment',
      description: `Payment: ${editingOrder.description} (${paymentNote || 'Installment'})`,
      date: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(false);
    setEditingOrder(null);
    setDepositAmount('');
    setPaymentNote('');
    loadData();
  };

  const filteredOrders = orders
    .filter(o => {
      const clientName = getClient(o.client_id)?.name || '';
      const matchesSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === 'pending') return ['pending', 'in_progress', 'ready_for_fitting'].includes(o.status);
      if (activeTab === 'completed') return o.status === 'completed' || o.status === 'delivered';
      if (activeTab === 'urgent') return getDeadlineStats(o.deadline, o.status).isUrgent;
      return true;
    })
    .sort((a, b) => {
      const statsA = getDeadlineStats(a.deadline, a.status);
      const statsB = getDeadlineStats(b.deadline, b.status);
      return statsA.daysLeft - statsB.daysLeft;
    });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">{t.orders}</h3>
          <p className="text-[10px] text-slate-400 font-medium tracking-tight">Studio Production & Materials</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search orders or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium text-sm"
          />
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-50 overflow-x-auto no-scrollbar">
          {['all', 'urgent', 'pending', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 min-w-[85px] py-2.5 text-xs font-bold rounded-xl transition-all capitalize relative ${activeTab === tab ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {tab === 'all' ? t.all : tab === 'urgent' ? t.urgent : tab === 'pending' ? 'Active' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200">
            <Package size={48} className="mx-auto text-slate-100 mb-3" />
            <p className="text-slate-400 text-sm font-medium">No production items found.</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const client = getClient(order.client_id);
            const stats = getDeadlineStats(order.deadline, order.status);
            const balance = order.total_amount - (order.paid_amount || 0);
            const progress = (order.paid_amount / order.total_amount) * 100;
            const isTarget = order.id === targetId;

            return (
              <div
                key={order.id}
                ref={(el) => { orderRefs.current[order.id] = el; }}
                className={`bg-white rounded-[32px] overflow-hidden shadow-sm border transition-all duration-500 ${isTarget ? 'ring-4 ring-purple-600 animate-pulse-once scale-[1.02] z-10 shadow-xl' : (stats.isUrgent ? 'ring-2 ring-rose-50 border-rose-100' : 'border-slate-100')
                  }`}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-bold">
                        {client?.name.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{client?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(order.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                      className={`text-[9px] font-black uppercase px-2.5 py-1.5 rounded-full border outline-none transition-all ${getStatusColor(order.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">Working</option>
                      <option value="ready_for_fitting">Fitting</option>
                      <option value="completed">Finished</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>

                  <p className="text-xs text-slate-600 font-medium mb-4 bg-slate-50/50 p-3 rounded-xl italic">
                    "{order.description}"
                  </p>

                  {/* Multi-Fabric Gallery */}
                  {(order.fabric_images && order.fabric_images.length > 0) && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Scissors size={10} /> Fabric Swatches ({order.fabric_images.length})
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block uppercase tracking-tight ${order.fabric_source === 'client' ? 'text-blue-600 bg-blue-50 px-2 rounded-lg' : 'text-purple-600 bg-purple-50 px-2 rounded-lg'}`}>
                          {order.fabric_source === 'client' ? "Client's" : "Studio's"}
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {order.fabric_images.map((img, i) => (
                          <div key={i} className="relative group shrink-0">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                              <img src={img} alt={`fabric-${i}`} className="w-full h-full object-cover" />

                              {/* Price Tag Overlay for Studio Fabric */}
                              {order.fabric_source === 'babake' && order.fabric_cost > 0 && i === 0 && (
                                <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-lg shadow-lg flex items-center gap-1.5 animate-in slide-in-from-left duration-500">
                                  <Tag size={10} className="fill-white/20" />
                                  <span className="text-[9px] font-black whitespace-nowrap">
                                    {order.fabric_cost.toLocaleString()} {currency.symbol}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                              <Maximize2 size={12} className="text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Balance Due</span>
                      <span className={`text-sm font-black ${balance === 0 ? 'text-emerald-500' : 'text-slate-800'}`}>
                        {balance === 0 ? 'FULLY PAID' : `${balance.toLocaleString()} ${currency.symbol}`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingOrder(order); setIsHistoryModalOpen(true); }}
                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-purple-600 transition-colors"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => { setEditingOrder(order); setIsPaymentModalOpen(true); }}
                        className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
                      >
                        <HandCoins size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(order)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-white bg-purple-600 px-4 py-2 rounded-xl shadow-md shadow-purple-100"
                      >
                        <FileDown size={14} /> Bill
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto no-scrollbar">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">New Order</h2>
              <button onClick={() => { setIsAddModalOpen(false); setImagePreviews([]); }} className="bg-slate-50 text-slate-400 p-2.5 rounded-2xl"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddOrder} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><User size={12} /> Client Profile</label>
                <select
                  value={newOrder.client_id}
                  onChange={(e) => setNewOrder({ ...newOrder, client_id: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl p-4 font-bold outline-none appearance-none shadow-sm"
                  required
                >
                  <option value="">Choose a Client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><FileEdit size={12} /> Design & Requirements</label>
                <textarea
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 outline-none h-24 resize-none font-medium text-sm shadow-sm"
                  placeholder="e.g. Silk Wedding Gown, lace sleeves..."
                  required
                />
              </div>

              <div className="bg-slate-50/50 p-5 rounded-[32px] border border-slate-100 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Scissors size={12} /> Fabric Source</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewOrder({ ...newOrder, fabric_source: 'client' })}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${newOrder.fabric_source === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                    >Client's</button>
                    <button
                      type="button"
                      onClick={() => setNewOrder({ ...newOrder, fabric_source: 'babake' })}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${newOrder.fabric_source === 'babake' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
                    >Ba Bake's</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><ImageIcon size={12} /> Fabric Swatches</label>
                    {newOrder.fabric_source === 'babake' && (
                      <div className="flex items-center gap-2 animate-in fade-in duration-300">
                        <span className="text-[9px] font-bold text-slate-400">PRICE:</span>
                        <div className="relative">
                          <input
                            type="number"
                            value={newOrder.fabric_cost}
                            onChange={(e) => setNewOrder({ ...newOrder, fabric_cost: e.target.value })}
                            className="w-24 bg-white border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-black text-purple-600 outline-none text-right pr-6"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300">{currency.symbol}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {imagePreviews.map((img, i) => (
                      <div key={i} className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200">
                          <img src={img} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePreview(i)}
                          className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full shadow-lg"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-100 hover:text-purple-600 transition-all shrink-0"
                    >
                      <Camera size={20} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Add</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Bill ({currency.code})</label>
                  <input
                    type="number"
                    value={newOrder.total_amount}
                    onChange={(e) => setNewOrder({ ...newOrder, total_amount: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-2xl p-4 outline-none font-black text-slate-800 shadow-sm"
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Deposit ({currency.code})</label>
                  <input
                    type="number"
                    value={newOrder.initial_deposit}
                    onChange={(e) => setNewOrder({ ...newOrder, initial_deposit: e.target.value })}
                    className="w-full bg-purple-50 border-0 rounded-2xl p-4 outline-none font-black text-purple-600 shadow-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Calendar size={12} /> Delivery Deadline</label>
                <input
                  type="date"
                  value={newOrder.deadline}
                  onChange={(e) => setNewOrder({ ...newOrder, deadline: e.target.value })}
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 outline-none font-bold shadow-sm"
                  required
                />
              </div>

              <button type="submit" className="w-full py-5 bg-purple-600 text-white rounded-[28px] font-bold shadow-xl shadow-purple-100 mt-2 active:scale-95 transition-all flex items-center justify-center gap-2">
                Launch Production <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Deposit Modal */}
      {isPaymentModalOpen && editingOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Add Payment</h2>
                <p className="text-xs text-slate-400 font-medium">Tracking money for {getClient(editingOrder.client_id)?.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="bg-slate-50 text-slate-400 p-2.5 rounded-2xl"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Bill</div>
                  <div className="text-base font-bold text-slate-700">{editingOrder.total_amount.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl">
                  <div className="text-[9px] font-black text-emerald-400 uppercase mb-1">Remaining</div>
                  <div className="text-base font-bold text-emerald-600">{(editingOrder.total_amount - editingOrder.paid_amount).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Payment Amount ({currency.code})</label>
                <div className="relative">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl p-4 text-xl font-black outline-none"
                    placeholder="Enter amount..."
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">{currency.symbol}</div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4.5 bg-purple-600 text-white rounded-[24px] font-bold shadow-xl shadow-purple-100 flex items-center justify-center gap-2"
              >
                Record Payment <Check size={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {isHistoryModalOpen && editingOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Payment History</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="bg-slate-50 text-slate-400 p-2.5 rounded-2xl"><X size={20} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              {(!editingOrder.payments || editingOrder.payments.length === 0) ? (
                <div className="text-center py-10 text-slate-400">No payment records found.</div>
              ) : (
                editingOrder.payments.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl relative">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-black text-slate-800">{p.amount.toLocaleString()} {currency.symbol}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{p.date}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">{p.note || 'Payment Record'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersView;
