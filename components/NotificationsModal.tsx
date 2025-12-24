
import React from 'react';
import { Order, AppView, Transaction, Client, Note, Currency } from '../types';
import { translations, Language } from '../translations';
import { 
  X, 
  Bell, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  TrendingUp,
  TrendingDown,
  UserPlus,
  Package,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Activity,
  Wallet
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  transactions: Transaction[];
  clients: Client[];
  notes: Note[];
  lang: Language;
  currency: Currency;
  onAction: (view: AppView, id?: string) => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ 
  isOpen, 
  onClose, 
  orders, 
  transactions, 
  clients, 
  notes, 
  lang, 
  currency,
  onAction 
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // Financial Daily Summary
  const todayTransactions = transactions.filter(tx => tx.date === todayStr);
  const todayIncome = todayTransactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
  const todayExpense = todayTransactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
  
  const totalBalance = transactions.reduce((acc, tx) => acc + (tx.type === 'income' ? tx.amount : -tx.amount), 0);

  // Alerts logic
  const getCategorizedOrders = () => {
    const overdue: Order[] = [];
    const dueToday: Order[] = [];
    const urgent: Order[] = []; // Due within 3 days

    orders.forEach(o => {
      if (o.status === 'completed' || o.status === 'delivered') return;
      
      const due = new Date(o.deadline);
      const diffTime = due.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) overdue.push(o);
      else if (diffDays === 0) dueToday.push(o);
      else if (diffDays <= 3) urgent.push(o);
    });

    return { overdue, dueToday, urgent };
  };

  const { overdue, dueToday, urgent } = getCategorizedOrders();

  // Activity Log logic
  const activityItems = [
    ...clients.map(c => ({
      id: c.id,
      type: 'clients' as AppView,
      icon: <UserPlus size={14} className="text-blue-500" />,
      text: `Client Added: ${c.name}`,
      meta: c.phone,
      date: c.created_at,
      color: 'bg-blue-50',
      isNew: new Date(c.created_at).getTime() > todayDate.getTime()
    })),
    ...orders.map(o => ({
      id: o.id,
      type: 'orders' as AppView,
      icon: <Package size={14} className="text-purple-500" />,
      text: `Order Started: ${o.description.substring(0, 24)}...`,
      meta: `${o.total_amount.toLocaleString()} ${currency.symbol}`,
      date: o.created_at,
      color: 'bg-purple-50',
      isNew: new Date(o.created_at).getTime() > todayDate.getTime()
    })),
    ...transactions.map((tx, idx) => ({
      id: tx.id || `tx-${idx}`,
      type: 'finance' as AppView,
      icon: tx.type === 'income' ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownLeft size={14} className="text-rose-500" />,
      text: `${tx.category}: ${tx.amount.toLocaleString()} ${currency.symbol}`,
      meta: tx.type.toUpperCase(),
      date: tx.date,
      color: tx.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50',
      isNew: tx.date === todayStr
    })),
    ...notes.map(n => ({
      id: n.id,
      type: 'notes' as AppView,
      icon: <FileText size={14} className="text-amber-500" />,
      text: `Note: ${n.title}`,
      meta: n.category,
      date: n.date,
      color: 'bg-amber-50',
      isNew: n.date === todayStr
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden mt-12 animate-in slide-in-from-top-8 duration-500 flex flex-col max-h-[85vh]">
        
        {/* Header - Designer Branding */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white relative">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
              <Bell size={24} className="animate-wiggle" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Alert Center</h2>
              <p className="text-xs text-purple-100 font-medium opacity-80">Daily Pulse for Ba Bake Studio</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-3xl p-4 backdrop-blur-lg border border-white/20 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl"><Wallet size={16} /></div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-purple-200">Current Balance</div>
                <div className="text-lg font-black">{totalBalance.toLocaleString()} <span className="text-[10px]">{currency.symbol}</span></div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${todayIncome >= todayExpense ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-400/20 text-rose-200'}`}>
                {todayIncome >= todayExpense ? '+' : ''}{(todayIncome - todayExpense).toLocaleString()} Today
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 bg-slate-50/50">
          
          {/* Critical Path: Overdue & Due Today */}
          {(overdue.length > 0 || dueToday.length > 0 || urgent.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-500" /> Critical Path
                </h3>
                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                  {overdue.length + dueToday.length + urgent.length} Action Items
                </span>
              </div>

              <div className="space-y-2">
                {overdue.map(o => (
                  <button key={o.id} onClick={() => onAction('orders', o.id)} className="w-full bg-white p-4 rounded-[28px] border-2 border-rose-100 flex items-center justify-between group shadow-sm">
                    <div className="flex items-center gap-4 text-left overflow-hidden">
                      <div className="bg-rose-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black animate-pulse">!</div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-slate-800 truncate">{o.description}</div>
                        <div className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Overdue by {Math.abs(Math.ceil((new Date(o.deadline).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)))} days</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-rose-200" />
                  </button>
                ))}

                {dueToday.map(o => (
                  <button key={o.id} onClick={() => onAction('orders', o.id)} className="w-full bg-white p-4 rounded-[28px] border-2 border-purple-200 flex items-center justify-between group shadow-sm">
                    <div className="flex items-center gap-4 text-left overflow-hidden">
                      <div className="bg-purple-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center"><Calendar size={18} /></div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-slate-800 truncate">{o.description}</div>
                        <div className="text-[10px] font-black text-purple-600 uppercase tracking-tight">Due Today • Final Check Needed</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-purple-200" />
                  </button>
                ))}

                {urgent.map(o => (
                  <button key={o.id} onClick={() => onAction('orders', o.id)} className="w-full bg-white p-4 rounded-[28px] border border-amber-100 flex items-center justify-between group shadow-sm">
                    <div className="flex items-center gap-4 text-left overflow-hidden">
                      <div className="bg-amber-50 text-amber-600 w-10 h-10 rounded-2xl flex items-center justify-center"><Clock size={18} /></div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-slate-800 truncate">{o.description}</div>
                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-tight">Approaching Deadline • In {Math.ceil((new Date(o.deadline).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))} days</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-amber-200" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-500" /> Financial Pulse
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><TrendingUp size={12} /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Today's In</span>
                </div>
                <div className="text-lg font-black text-slate-800">{todayIncome.toLocaleString()} {currency.symbol}</div>
              </div>
              <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg"><TrendingDown size={12} /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Today's Out</span>
                </div>
                <div className="text-lg font-black text-slate-800">{todayExpense.toLocaleString()} {currency.symbol}</div>
              </div>
            </div>
          </div>

          {/* Combined Activity Feed */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><Activity size={14} className="text-purple-500" /> Timeline</span>
              <span className="text-[9px] font-medium text-slate-300">Live Updates</span>
            </h3>
            
            <div className="space-y-3">
              {activityItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-slate-200">
                  <CheckCircle2 size={32} className="mx-auto text-slate-100 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nothing to report yet</p>
                </div>
              ) : (
                activityItems.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onAction(item.type, item.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-white rounded-[28px] transition-all group active:scale-[0.98] border border-transparent hover:border-slate-100 hover:shadow-sm"
                  >
                    <div className={`w-10 h-10 ${item.color} rounded-2xl flex items-center justify-center shrink-0 shadow-inner`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 overflow-hidden text-left">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-slate-700 truncate">{item.text}</div>
                        {item.isNew && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                        <span className="truncate">{item.meta}</span>
                        <span className="text-slate-200">•</span>
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-200 group-hover:text-purple-300 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
          <button 
            onClick={() => { onAction('finance'); onClose(); }}
            className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-[22px] font-bold text-xs hover:bg-slate-100 active:scale-95 transition-all"
          >
            Review Ledger
          </button>
          <button 
            onClick={() => { onAction('orders'); onClose(); }}
            className="flex-1 py-4 bg-purple-600 text-white rounded-[22px] font-bold text-xs shadow-xl shadow-purple-100 hover:bg-purple-700 active:scale-95 transition-all"
          >
            Manage Queue
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .animate-wiggle {
          animation: wiggle 2s ease-in-out infinite;
        }
        @keyframes pulse-once {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-pulse-once {
          animation: pulse-once 1s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default NotificationsModal;
