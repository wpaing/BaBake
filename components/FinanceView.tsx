
import React, { useState, useEffect } from 'react';
import { Transaction, Currency } from '../types';
import { dbService } from '../services/dbService';
import { generateFinancialReport } from '../utils/pdfGenerator';
import { translations, Language } from '../translations';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';

interface FinanceViewProps {
  transactions: Transaction[];
  onUpdate: () => void;
  openTrigger?: number;
  lang: Language;
  currency: Currency;
}

const FinanceView: React.FC<FinanceViewProps> = ({ transactions, onUpdate, openTrigger, lang, currency }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: '',
    type: 'income' as 'income' | 'expense',
    category: 'Client Payment',
    description: ''
  });

  const t = translations[lang];

  useEffect(() => {
    if (openTrigger && openTrigger > 0) {
      setIsModalOpen(true);
    }
  }, [openTrigger]);

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount) return;

    await dbService.addTransaction({
      amount: parseFloat(newTx.amount),
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
      date: new Date().toISOString().split('T')[0]
    });

    setNewTx({ amount: '', type: 'income', category: 'Client Payment', description: '' });
    setIsModalOpen(false);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-purple-600 to-fuchsia-500 rounded-3xl p-6 text-white shadow-xl shadow-purple-200">
        <div className="flex justify-between items-start mb-4">
          <span className="text-purple-100 text-sm font-medium">{t.netBalance}</span>
          <button
            onClick={() => generateFinancialReport(transactions, 'Current Period', currency)}
            className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-colors"
          >
            <FileText size={18} />
          </button>
        </div>
        <div className="text-3xl font-bold mb-6">
          {balance.toLocaleString()} <span className="text-lg font-normal">{currency.symbol}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3">
            <ArrowUpCircle className="text-emerald-300" size={24} />
            <div>
              <div className="text-[10px] text-purple-100 uppercase tracking-wider">{t.income}</div>
              <div className="font-semibold text-sm">{income.toLocaleString()} {currency.symbol}</div>
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3">
            <ArrowDownCircle className="text-rose-300" size={24} />
            <div>
              <div className="text-[10px] text-purple-100 uppercase tracking-wider">{t.expenses}</div>
              <div className="font-semibold text-sm">{expense.toLocaleString()} {currency.symbol}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800">{t.recentTransactions}</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-purple-600 text-sm font-semibold flex items-center gap-1 hover:underline"
        >
          {t.addNew} <ChevronRight size={16} />
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <TrendingUp size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">No transactions yet.</p>
          </div>
        ) : (
          transactions.slice(0, 5).map(t => (
            <div key={t.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{t.category}</div>
                  <div className="text-xs text-slate-400">{t.date}</div>
                </div>
              </div>
              <div className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} {currency.symbol}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{t.addNew}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: 'income' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${newTx.type === 'income' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}
                >{t.income}</button>
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: 'expense' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${newTx.type === 'expense' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}
                >{t.expenses}</button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 ml-1">Amount ({currency.code})</label>
                <input
                  type="number"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-purple-200 outline-none text-lg font-bold"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 ml-1">Category</label>
                <select
                  value={newTx.category}
                  onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-purple-200 outline-none"
                >
                  <option>Client Payment</option>
                  <option>Fabric Purchase</option>
                  <option>Material Supplies</option>
                  <option>Workshop Rent</option>
                  <option>Utilities</option>
                  <option>Marketing</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 ml-1">{t.description}</label>
                <textarea
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-purple-200 outline-none h-20 resize-none"
                  placeholder="What was this for?"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all mt-4"
              >
                {t.save}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceView;
