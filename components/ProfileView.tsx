
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { supabase } from '../lib/supabase';
import { translations, Language } from '../translations';
import { Currency, CURRENCIES } from '../types';
import { 
  User, 
  Settings, 
  Database, 
  Languages, 
  LogOut, 
  ChevronRight, 
  Briefcase,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Heart,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCcw,
  Globe,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  History,
  Info,
  X,
  Check,
  Lock,
  ArrowLeft,
  Unlock,
  Key,
  Edit2,
  MapPin
} from 'lucide-react';

interface ProfileViewProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onLock?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ lang, onLangChange, currency, onCurrencyChange, onLock }) => {
  const [stats, setStats] = useState({ revenue: 0, clientCount: 0, activeOrders: 0 });
  const [dataStats, setDataStats] = useState({ clients: 0, orders: 0, measurements: 0, notes: 0, transactions: 0 });
  const [activePanel, setActivePanel] = useState<'main' | 'data' | 'security'>('main');
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [cloudMetadata, setCloudMetadata] = useState<any>(null);
  const [showRestoreCheck, setShowRestoreCheck] = useState(false);
  
  const [profile, setProfile] = useState({ name: '', address: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ name: '', address: '' });
  
  const [pinForm, setPinForm] = useState('');
  const [confirmPinForm, setConfirmPinForm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  useEffect(() => {
    loadStats();
    loadSyncInfo();
    loadProfile();
  }, []);

  const loadProfile = () => {
    const p = dbService.getProfile();
    setProfile(p);
    setEditProfileForm(p);
  };

  const loadStats = async () => {
    const s = await dbService.getStats();
    const ds = await dbService.getDataStats();
    setStats(s);
    setDataStats(ds);
  };

  const loadSyncInfo = async () => {
    const info = await dbService.getLastSyncInfo();
    const auto = dbService.getAutoSync();
    setLastSync(info);
    setIsAutoSync(auto);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.setProfile(editProfileForm);
    setProfile(editProfileForm);
    setIsEditingProfile(false);
    setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleAutoSync = () => {
    const newVal = !isAutoSync;
    setIsAutoSync(newVal);
    dbService.setAutoSync(newVal);
    if (newVal) handleCloudBackup();
  };

  const handleCloudBackup = async () => {
    setIsSyncing(true);
    const result = await dbService.pushToCloud();
    setIsSyncing(false);
    
    setFeedback({ 
      type: result.success ? 'success' : 'error', 
      message: result.message 
    });
    
    if (result.success) loadSyncInfo();
    setTimeout(() => setFeedback(null), 3000);
  };

  const initiateRestore = async () => {
    setIsSyncing(true);
    const meta = await dbService.getCloudMetadata();
    setCloudMetadata(meta);
    setIsSyncing(false);
    setShowRestoreCheck(true);
  };

  const handleCloudRestore = async () => {
    setShowRestoreCheck(false);
    setIsSyncing(true);
    const result = await dbService.pullFromCloud();
    setIsSyncing(false);

    setFeedback({ 
      type: result.success ? 'success' : 'error', 
      message: result.message 
    });

    if (result.success) loadStats();
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExport = async () => {
    const data = await dbService.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `babake_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', message: 'Backup downloaded successfully!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await dbService.importData(content);
      if (success) {
        setFeedback({ type: 'success', message: 'Data restored successfully!' });
        loadStats();
      } else {
        setFeedback({ type: 'error', message: 'Failed to restore data. Invalid file.' });
      }
      setTimeout(() => setFeedback(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = async () => {
    if (window.confirm("ARE YOU SURE? This will permanently delete all your clients, orders, and financial records from this device.")) {
      await dbService.clearAllData();
      loadStats();
      setFeedback({ type: 'success', message: 'All data cleared successfully.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.length === 4) {
      if (dbService.hasPin() && pinForm !== confirmPinForm) {
        setFeedback({ type: 'error', message: 'PINs do not match!' });
        return;
      }
      dbService.setPin(pinForm);
      setFeedback({ type: 'success', message: 'Security PIN updated successfully!' });
      setPinForm('');
      setConfirmPinForm('');
      setActivePanel('main');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleRemovePin = () => {
    if (window.confirm("Disable security? Your data will no longer be locked.")) {
      dbService.removePin();
      setFeedback({ type: 'success', message: 'Security PIN removed.' });
      setActivePanel('main');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Sign out of your Ba Bake account?")) {
      await supabase.auth.signOut();
    }
  };

  const menuGroups = [
    {
      title: t.businessSettings,
      items: [
        { 
          icon: User, 
          label: "Profile Details", 
          value: "Edit Name/Address", 
          onClick: () => setIsEditingProfile(true) 
        },
        { 
          icon: CreditCard, 
          label: "Currency Settings", 
          value: `${currency.code} (${currency.symbol})`,
          onClick: () => setIsCurrencyModalOpen(true)
        },
        { 
          icon: ShieldCheck, 
          label: t.security, 
          value: dbService.hasPin() ? t.activePin : t.noPin,
          onClick: () => setActivePanel('security')
        },
      ]
    },
    {
      title: t.appPreferences,
      items: [
        { 
          icon: Languages, 
          label: t.language, 
          value: lang === 'EN' ? "English" : "မြန်မာ (Myanmar)",
          onClick: () => onLangChange(lang === 'EN' ? 'MM' : 'EN')
        },
        { 
          icon: Database, 
          label: "Data & Backup", 
          value: "Manage Storage",
          onClick: () => setActivePanel('data')
        },
      ]
    },
    {
      title: t.support,
      items: [
        { icon: Heart, label: "About Ba Bake", value: "v1.0.2" },
        { icon: ExternalLink, label: "Contact Developer", value: "@htethtet" },
      ]
    }
  ];

  if (activePanel === 'security') {
    return (
      <div className="space-y-6 pb-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 pt-4 px-1">
          <button 
            onClick={() => { setActivePanel('main'); setPinForm(''); setConfirmPinForm(''); }}
            className="p-2 bg-white text-slate-400 rounded-xl hover:text-purple-600 shadow-sm border border-slate-50"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-800">{t.security}</h2>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[28px] flex items-center justify-center shadow-inner">
              <Key size={36} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{dbService.hasPin() ? t.changePin : t.setupPin}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Protect your design vault
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.enterPin}</label>
                <input 
                  type="password"
                  maxLength={4}
                  pattern="\d*"
                  inputMode="numeric"
                  value={pinForm}
                  onChange={(e) => setPinForm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-[24px] py-5 text-center text-3xl font-black tracking-[0.5em] outline-none transition-all"
                  required
                />
              </div>

              {dbService.hasPin() && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New PIN</label>
                  <input 
                    type="password"
                    maxLength={4}
                    pattern="\d*"
                    inputMode="numeric"
                    value={confirmPinForm}
                    onChange={(e) => setConfirmPinForm(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-[24px] py-5 text-center text-3xl font-black tracking-[0.5em] outline-none transition-all"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <button 
                type="submit"
                disabled={pinForm.length !== 4 || (dbService.hasPin() && confirmPinForm.length !== 4)}
                className="w-full py-5 bg-purple-600 text-white rounded-[24px] font-bold shadow-xl shadow-purple-100 active:scale-95 transition-all disabled:opacity-40"
              >
                {dbService.hasPin() ? t.changePin : t.save}
              </button>

              {dbService.hasPin() && (
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={onLock}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-[20px] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Lock size={14} /> {t.lockNow}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleRemovePin}
                    className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-[20px] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Unlock size={14} /> {t.removePin}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activePanel === 'data') {
    return (
      <div className="space-y-6 pb-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 pt-4 px-1">
          <button 
            onClick={() => setActivePanel('main')}
            className="p-2 bg-white text-slate-400 rounded-xl hover:text-purple-600 shadow-sm border border-slate-50"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-800">Cloud & Storage</h2>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-xs font-bold">{feedback.message}</span>
          </div>
        )}

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-6 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Cloud size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Supabase Cloud</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  Connected
                </div>
              </div>
            </div>
            <button 
              onClick={handleCloudBackup}
              disabled={isSyncing}
              className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSyncing ? <RefreshCcw size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <RefreshCcw size={14} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-600">Auto-sync on change</span>
              </div>
              <button 
                onClick={handleToggleAutoSync}
                className={`transition-colors ${isAutoSync ? 'text-indigo-600' : 'text-slate-300'}`}
              >
                {isAutoSync ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
            </div>
            
            <button 
              onClick={initiateRestore}
              className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <CloudDownload size={18} /> Restore from Cloud Snapshot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4 relative">
      <div className="flex flex-col items-center pt-4 pb-2 relative">
        <div className="relative group">
          <div className="w-24 h-24 bg-purple-600 rounded-[32px] flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-purple-100 mb-4 border-4 border-white">
            {profile.name.charAt(0)}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-slate-50"></div>
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="absolute -top-1 -right-1 bg-white p-2 rounded-xl shadow-md border border-slate-50 text-slate-400 hover:text-purple-600 transition-colors"
          >
            <Edit2 size={12} />
          </button>
        </div>
        <h2 className="text-xl font-bold text-slate-800">{profile.name}</h2>
        <p className="text-slate-400 text-sm font-medium flex items-center gap-1 mt-1">
          <MapPin size={12} className="text-rose-400" /> {profile.address}
        </p>
      </div>

      {feedback && (
          <div className={`mx-1 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-xs font-bold">{feedback.message}</span>
          </div>
        )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{t.orders}</div>
          <div className="text-lg font-bold text-purple-600">{stats.activeOrders}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{t.clients}</div>
          <div className="text-lg font-bold text-purple-600">{stats.clientCount}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{t.revenue}</div>
          <div className="text-lg font-bold text-emerald-600">{(stats.revenue / 1000).toFixed(0)}k</div>
        </div>
      </div>

      <div className="space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{group.title}</h3>
            <div className="bg-white rounded-[32px] border border-slate-50 shadow-sm overflow-hidden">
              {group.items.map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick}
                  className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                    i !== group.items.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{item.value}</span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleSignOut}
        className="w-full py-4 bg-rose-50 text-rose-600 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors mt-4 active:scale-95"
      >
        <LogOut size={18} />
        {t.logout}
      </button>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Edit Designer Profile</h2>
              <button onClick={() => setIsEditingProfile(false)} className="bg-slate-50 text-slate-400 p-2.5 rounded-2xl"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designer Name</label>
                <input 
                  type="text" 
                  value={editProfileForm.name} 
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })} 
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 font-bold outline-none"
                  placeholder="Htet Htet Mu"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Studio Address</label>
                <textarea 
                  value={editProfileForm.address} 
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })} 
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 h-24 font-medium outline-none resize-none"
                  placeholder="Yangon, Myanmar"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4.5 bg-purple-600 text-white rounded-[24px] font-bold shadow-xl shadow-purple-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                Save Profile <Check size={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-slate-300 font-medium pt-8">
        Ba Bake v1.0.2 • Made for Designers
      </div>
    </div>
  );
};

export default ProfileView;
