
import React, { useState, useEffect } from 'react';
import { Client, Measurement, MeasurementTemplate } from '../types';
import { dbService } from '../services/dbService';
import { translations, Language } from '../translations';
import {
  Search,
  Phone,
  Ruler,
  UserPlus,
  ChevronRight,
  ClipboardList,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Scissors,
  X,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Save,
  Grid,
  ChevronDown
} from 'lucide-react';

interface ClientsViewProps {
  openTrigger?: number;
  lang: Language;
}

const ClientsView: React.FC<ClientsViewProps> = ({ openTrigger, lang }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);

  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);

  const t = translations[lang];

  // Forms State
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', address: '' });
  const [measurementForm, setMeasurementForm] = useState<{
    name: string;
    unit: 'inches' | 'cm';
    fields: { label: string; value: string }[];
    notes: string;
  }>({ name: '', unit: 'inches', fields: [{ label: '', value: '' }], notes: '' });

  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplateForm, setShowSaveTemplateForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (openTrigger && openTrigger > 0) {
      if (selectedClient) {
        openAddMeasurement();
      } else {
        setIsAddClientModalOpen(true);
      }
    }
  }, [openTrigger, selectedClient]);

  const loadData = async () => {
    const cData = await dbService.getClients();
    const tData = await dbService.getTemplates();
    setClients(cData);
    setTemplates(tData);
  };

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    const mData = await dbService.getMeasurements(client.id);
    setMeasurements(mData);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.phone) return;
    await dbService.addClient(newClient);
    setNewClient({ name: '', phone: '', email: '', address: '' });
    setIsAddClientModalOpen(false);
    loadData();
  };

  const openAddMeasurement = () => {
    setEditingMeasurement(null);
    setMeasurementForm({
      name: `Fit - ${new Date().toLocaleDateString()}`,
      unit: 'inches',
      fields: [
        { label: 'Bust', value: '' },
        { label: 'Waist', value: '' },
        { label: 'Hips', value: '' },
        { label: 'Full Length', value: '' }
      ],
      notes: ''
    });
    setIsMeasurementModalOpen(true);
  };

  const openEditMeasurement = (m: Measurement) => {
    setEditingMeasurement(m);
    setMeasurementForm({
      name: m.name,
      unit: m.unit,
      fields: Object.entries(m.values).map(([label, value]) => ({ label, value: value.toString() })),
      notes: m.notes || ''
    });
    setIsMeasurementModalOpen(true);
  };

  const applyTemplate = (template: MeasurementTemplate) => {
    setMeasurementForm(prev => ({
      ...prev,
      fields: template.fields.map(label => ({ label, value: '' }))
    }));
    setIsTemplateSelectorOpen(false);
  };

  const addFieldRow = () => {
    setMeasurementForm(prev => ({
      ...prev,
      fields: [...prev.fields, { label: '', value: '' }]
    }));
  };

  const removeFieldRow = (index: number) => {
    setMeasurementForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const updateField = (index: number, key: 'label' | 'value', val: string) => {
    const newFields = [...measurementForm.fields];
    newFields[index][key] = val;
    setMeasurementForm(prev => ({ ...prev, fields: newFields }));
  };

  const handleSaveAsTemplate = async () => {
    if (!saveTemplateName.trim()) return;
    const labels = measurementForm.fields.map(f => f.label).filter(l => l.trim() !== '');
    await dbService.saveTemplate({ name: saveTemplateName, fields: labels });
    setSaveTemplateName('');
    setShowSaveTemplateForm(false);
    loadData();
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const valuesNum: Record<string, number> = {};
    measurementForm.fields.forEach(f => {
      if (f.label && f.value) valuesNum[f.label] = parseFloat(f.value);
    });

    if (editingMeasurement) {
      await dbService.updateMeasurement(editingMeasurement.id, {
        name: measurementForm.name,
        unit: measurementForm.unit,
        values: valuesNum,
        notes: measurementForm.notes
      });
    } else {
      await dbService.addMeasurement({
        client_id: selectedClient.id,
        name: measurementForm.name,
        unit: measurementForm.unit,
        values: valuesNum,
        notes: measurementForm.notes
      });
    }

    setIsMeasurementModalOpen(false);
    handleSelectClient(selectedClient);
  };

  const getTrend = (current: number, fieldName: string) => {
    if (measurements.length < 2) return null;
    const prev = measurements[1].values[fieldName];
    if (prev === undefined || isNaN(prev)) return null;
    const diff = current - prev;
    if (diff === 0) return <Minus size={12} className="text-slate-300" />;
    return (
      <div className={`flex items-center text-[10px] font-bold ${diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
        {diff > 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
        {Math.abs(diff).toFixed(1)}
      </div>
    );
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {!selectedClient ? (
        <>
          <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{t.clients}</h3>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">Fashion Measurement Records</p>
            </div>
            <button
              onClick={() => setIsAddClientModalOpen(true)}
              className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all active:scale-95"
            >
              <UserPlus size={20} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-3 pb-8">
            {filteredClients.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200">
                <Users size={48} className="mx-auto text-slate-100 mb-3" />
                <p className="text-slate-400 text-sm font-medium">No clients found</p>
              </div>
            ) : (
              filteredClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="bg-white p-4 rounded-[28px] flex items-center justify-between shadow-sm border border-slate-50 active:bg-slate-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-[20px] flex items-center justify-center font-bold text-xl">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{client.name}</div>
                      <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                        <Phone size={12} /> {client.phone}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="animate-in slide-in-from-right duration-400 pb-20">
          <button
            onClick={() => setSelectedClient(null)}
            className="mb-4 text-purple-600 font-bold text-sm flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
          >
            ← {t.cancel}
          </button>

          <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-50 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-purple-600 rounded-[30px] flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-purple-100">
                {selectedClient.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800">{selectedClient.name}</h2>
                <div className="text-sm text-slate-500 font-medium mt-1">{selectedClient.phone}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-2">
                <Edit3 size={14} /> Profile
              </button>
              <button className="py-3 bg-purple-600 text-white rounded-2xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                <Phone size={14} /> Call
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-5 px-1">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Ruler size={20} className="text-purple-600" /> Measurements
            </h3>
            <button
              onClick={openAddMeasurement}
              className="text-white text-xs font-bold bg-purple-600 px-5 py-2.5 rounded-[20px] shadow-lg shadow-purple-100 flex items-center gap-1.5"
            >
              <Plus size={16} /> New Set
            </button>
          </div>

          <div className="space-y-4">
            {measurements.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                <ClipboardList size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm font-medium">No measurements yet</p>
              </div>
            ) : (
              measurements.map((m, idx) => (
                <div key={m.id} className="bg-white rounded-[32px] shadow-sm border border-slate-50 overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50/50 flex justify-between items-center border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl text-purple-600 shadow-sm"><CheckCircle2 size={16} /></div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(m.created_at).toLocaleDateString()}</div>
                        <div className="text-xs font-bold text-slate-700">{m.name} ({m.unit})</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditMeasurement(m)} className="p-2 text-slate-400 hover:text-purple-600"><Edit3 size={16} /></button>
                      <button onClick={() => dbService.deleteMeasurement(m.id).then(() => handleSelectClient(selectedClient!))} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-y-6 gap-x-4">
                      {Object.entries(m.values).map(([fieldName, val]) => (
                        <div key={fieldName} className="text-center">
                          <div className="text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-tighter truncate">{fieldName}</div>
                          <div className="font-bold text-slate-800 text-base bg-slate-50 py-2.5 rounded-2xl border border-slate-100">
                            {val}<span className="text-[10px] font-medium opacity-40 ml-0.5">{m.unit === 'inches' ? '"' : 'cm'}</span>
                          </div>
                          {idx === 0 && <div className="mt-1 flex justify-center h-4">{getTrend(val as number, fieldName)}</div>}
                        </div>
                      ))}
                    </div>
                    {m.notes && <p className="mt-6 text-xs text-slate-500 italic bg-purple-50 p-3 rounded-2xl">"{m.notes}"</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Measurement Modal */}
      {isMeasurementModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 my-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{editingMeasurement ? 'Update Record' : 'New Measure'}</h2>
                <p className="text-xs text-slate-400 font-medium">Custom labels & units</p>
              </div>
              <button onClick={() => setIsMeasurementModalOpen(false)} className="bg-slate-50 text-slate-400 p-2.5 rounded-2xl"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveMeasurement} className="space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar pr-1">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">Record Name</label>
                  <input
                    type="text"
                    value={measurementForm.name}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, name: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-2xl p-3.5 font-bold outline-none"
                    placeholder="Fit Name" required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">Unit</label>
                  <div className="bg-slate-50 p-1 rounded-2xl flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMeasurementForm({ ...measurementForm, unit: 'inches' })}
                      className={`px-3 py-2 text-[10px] font-bold rounded-xl transition-all ${measurementForm.unit === 'inches' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400'}`}
                    >Inches</button>
                    <button
                      type="button"
                      onClick={() => setMeasurementForm({ ...measurementForm, unit: 'cm' })}
                      className={`px-3 py-2 text-[10px] font-bold rounded-xl transition-all ${measurementForm.unit === 'cm' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400'}`}
                    >CM</button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <h4 className="text-sm font-bold text-slate-800">Labels & Values</h4>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTemplateSelectorOpen(!isTemplateSelectorOpen)}
                    className="text-[10px] font-bold text-purple-600 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-full"
                  >
                    <Grid size={12} /> Load Template <ChevronDown size={10} />
                  </button>
                  {isTemplateSelectorOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-50 z-10 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {templates.map(tmp => (
                        <button key={tmp.id} type="button" onClick={() => applyTemplate(tmp)} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                          {tmp.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {measurementForm.fields.map((field, idx) => (
                  <div key={idx} className="flex gap-3 animate-in fade-in duration-300">
                    <div className="flex-[2]">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(idx, 'label', e.target.value)}
                        className="w-full bg-slate-50 border-0 rounded-2xl p-3.5 text-xs font-bold outline-none"
                        placeholder="Label (e.g. Bust)"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        step="0.1"
                        value={field.value}
                        onChange={(e) => updateField(idx, 'value', e.target.value)}
                        className="w-full bg-slate-50 border-0 rounded-2xl p-3.5 text-xs font-bold outline-none pr-8"
                        placeholder="0.0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">
                        {measurementForm.unit === 'inches' ? '"' : 'cm'}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeFieldRow(idx)} className="p-3 text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFieldRow}
                  className="w-full py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-bold text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                >
                  <Plus size={14} /> Add New Row
                </button>
              </div>

              <textarea
                value={measurementForm.notes}
                onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })}
                className="w-full bg-slate-50 rounded-2xl p-4 h-24 outline-none font-medium text-xs"
                placeholder="Additional design notes..."
              />

              <div className="pt-2 border-t border-slate-50 space-y-4">
                {showSaveTemplateForm ? (
                  <div className="bg-purple-50 p-4 rounded-3xl animate-in slide-in-from-bottom-2 duration-300">
                    <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2">New Template Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={saveTemplateName}
                        onChange={(e) => setSaveTemplateName(e.target.value)}
                        className="flex-1 bg-white border-0 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                        placeholder="e.g. Bridal Gown"
                      />
                      <button type="button" onClick={handleSaveAsTemplate} className="bg-purple-600 text-white px-4 rounded-xl text-[10px] font-bold">Save</button>
                      <button type="button" onClick={() => setShowSaveTemplateForm(false)} className="text-slate-400 p-2"><X size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateForm(true)}
                    className="w-full flex items-center justify-center gap-2 text-purple-600 text-[10px] font-bold uppercase tracking-widest py-2"
                  >
                    <Save size={14} /> Save this field set as template
                  </button>
                )}

                <button type="submit" className="w-full py-4.5 bg-purple-600 text-white rounded-[24px] font-bold shadow-xl shadow-purple-100 flex items-center justify-center gap-2 active:scale-95">
                  {editingMeasurement ? 'Update Record' : 'Save Measurement'} <CheckCircle2 size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">New Client</h2>
              <button onClick={() => setIsAddClientModalOpen(false)} className="bg-slate-50 text-slate-400 p-2.5 rounded-2xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddClient} className="space-y-5">
              <input type="text" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 font-medium outline-none" placeholder="Full Name" required />
              <input type="tel" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 font-medium outline-none" placeholder="Phone Number" required />
              <textarea value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 h-24 font-medium outline-none" placeholder="Address (Optional)" />
              <button type="submit" className="w-full py-4.5 bg-purple-600 text-white rounded-[24px] font-bold shadow-xl shadow-purple-100">Create Profile</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;
