
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Transaction, Order, Client, Note, Currency, CURRENCIES } from './types';
import { dbService } from './services/dbService';
import { supabase } from './lib/supabase';
import { translations, Language } from './translations';
import FinanceView from './components/FinanceView';
import ClientsView from './components/ClientsView';
import NotesView from './components/NotesView';
import OrdersView from './components/OrdersView';
import ProfileView from './components/ProfileView';
import NotificationsModal from './components/NotificationsModal';
import Login from './components/Login';
import { 
  Wallet, 
  Users, 
  BookOpen, 
  ShoppingBag, 
  User, 
  Plus,
  Menu,
  Bell,
  Lock,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('finance');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('babake_lang') as Language) || 'EN';
  });
  const [currency, setCurrency] = useState<Currency>(() => {
    const code = dbService.getCurrency();
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  });
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addTrigger, setAddTrigger] = useState(0);
  
  // Security State
  const [isLocked, setIsLocked] = useState(dbService.hasPin());
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  useEffect(() => {
    // Check session - The Supabase Proxy handles placeholder cases to avoid "Failed to fetch"
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (err) {
        console.warn("Auth initialization failed. Defaulting to restricted session.", err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-lock feature
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && dbService.hasPin()) {
        setIsLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (session && !isLocked) {
      loadInitialData();
    } else if (isLocked) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [session, isLocked]);

  useEffect(() => {
    localStorage.setItem('babake_lang', language);
  }, [language]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [txs, ords, cls, nts] = await Promise.all([
        dbService.getTransactions(),
        dbService.getOrders(),
        dbService.getClients(),
        dbService.getNotes()
      ]);
      setTransactions(txs);
      setOrders(ords);
      setClients(cls);
      setNotes(nts);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    dbService.setCurrency(newCurrency.code);
    setCurrency(newCurrency);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPinInput(val);
    
    if (val.length === 4) {
      if (dbService.verifyPin(val)) {
        setTimeout(() => {
          setIsLocked(false);
          setPinInput('');
          setPinError(false);
        }, 150);
      } else {
        setPinError(true);
        setTimeout(() => {
          setPinInput('');
          setPinError(false);
          pinInputRef.current?.focus();
        }, 600);
      }
    }
  };

  const getUrgentCount = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return orders.filter(o => {
      if (o.status === 'completed' || o.status === 'delivered') return false;
      const due = new Date(o.deadline);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }).length;
  };

  const urgentCount = getUrgentCount();

  const handleNavigate = (view: AppView, id?: string) => {
    setCurrentView(view);
    if (id) {
      setTargetId(id);
    } else {
      setTargetId(null);
    }
    setIsNotificationsOpen(false);
    setIsMenuOpen(false);
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-white justify-center items-center">
        <Loader2 className="text-purple-600 animate-spin" size={32} />
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => loadInitialData()} />;
  }

  if (isLocked) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-900 justify-between items-center text-center p-12 overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl"></div>

        <div className="mt-12 space-y-4 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-fuchsia-500 rounded-[30px] flex items-center justify-center text-white shadow-2xl shadow-purple-900/40 mx-auto border-4 border-slate-800/50">
            <Lock size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{t.vaultLocked}</h1>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-2">{t.enterPin}</p>
          </div>
        </div>
        
        <div className="w-full max-w-[280px] space-y-12 relative z-10">
          <div className={`flex justify-center gap-6 ${pinError ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  pinInput.length > i 
                    ? (pinError ? 'bg-rose-500 border-rose-500 scale-125' : 'bg-purple-500 border-purple-500 scale-125') 
                    : 'border-slate-700 bg-transparent'
                }`}
              ></div>
            ))}
          </div>

          <input 
            ref={pinInputRef}
            type="text"
            pattern="\d*"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pinInput}
            onChange={handlePinChange}
            onBlur={() => !isLocked || setTimeout(() => pinInputRef.current?.focus(), 100)}
            className="absolute opacity-0 pointer-events-none"
            autoFocus
          />

          {pinError && (
            <div className="text-rose-400 text-xs font-black uppercase tracking-widest animate-in fade-in zoom-in duration-200">
              {t.invalidPin}
            </div>
          )}
        </div>

        <div className="mb-8 space-y-6 relative z-10">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Encrypted Vault</span>
          </div>
          <p className="text-[10px] text-slate-600 max-w-[200px] leading-relaxed">
            Data is stored locally and encrypted for your protection.
          </p>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-10px); }
            40%, 80% { transform: translateX(10px); }
          }
          .animate-shake {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          }
        `}</style>
      </div>
    );
  }

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => handleNavigate(view)}
      className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${
        currentView === view ? 'text-purple-600' : 'text-slate-400'
      }`}
    >
      <Icon size={24} strokeWidth={currentView === view ? 2.5 : 2} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 relative overflow-hidden">
      <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold italic shadow-sm">B</div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ba Bake</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="relative text-slate-500 hover:text-purple-600 transition-colors p-1"
          >
            <Bell size={20} />
            {urgentCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-slate-500 hover:text-purple-600 transition-colors p-1"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {currentView === 'finance' && <FinanceView transactions={transactions} onUpdate={loadInitialData} openTrigger={addTrigger} lang={language} currency={currency} />}
        {currentView === 'clients' && <ClientsView openTrigger={addTrigger} lang={language} />}
        {currentView === 'notes' && <NotesView openTrigger={addTrigger} lang={language} />}
        {currentView === 'orders' && <OrdersView openTrigger={addTrigger} lang={language} currency={currency} targetId={targetId} onTargetClear={() => setTargetId(null)} />}
        {currentView === 'profile' && <ProfileView lang={language} onLangChange={setLanguage} currency={currency} onCurrencyChange={handleCurrencyChange} onLock={() => setIsLocked(true)} />}
      </main>

      {['finance', 'clients', 'notes', 'orders'].includes(currentView) && (
        <div className="fixed bottom-24 right-4 z-30">
          <button 
            onClick={() => {
              setAddTrigger(prev => prev + 1);
              setTimeout(loadInitialData, 1000);
            }}
            className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all"
          >
            <Plus size={28} />
          </button>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 flex justify-around px-2 py-1 safe-area-bottom z-20">
        <NavItem view="finance" icon={Wallet} label={t.finance} />
        <NavItem view="clients" icon={Users} label={t.clients} />
        <NavItem view="orders" icon={ShoppingBag} label={t.orders} />
        <NavItem view="notes" icon={BookOpen} label={t.notes} />
        <NavItem view="profile" icon={User} label={t.profile} />
      </nav>

      {isNotificationsOpen && (
        <NotificationsModal 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
          orders={orders}
          transactions={transactions}
          clients={clients}
          notes={notes}
          lang={language}
          currency={currency}
          onAction={handleNavigate}
        />
      )}

      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsMenuOpen(false)}
        >
          <div className="absolute top-16 right-4 w-48 bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-2 space-y-1">
              <button 
                onClick={() => {
                  handleNavigate('profile');
                }}
                className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors"
              >
                Security & PIN
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors">Export as PDF</button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors">App Version 1.0.2</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
