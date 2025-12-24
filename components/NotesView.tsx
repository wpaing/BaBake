
import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { dbService } from '../services/dbService';
import { translations, Language } from '../translations';
import { Search, Tag, Calendar, FileText, Plus } from 'lucide-react';

interface NotesViewProps {
  openTrigger?: number;
  lang: Language;
}

const NotesView: React.FC<NotesViewProps> = ({ openTrigger, lang }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'Design Idea'
  });

  const t = translations[lang];

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (openTrigger && openTrigger > 0) {
      setIsModalOpen(true);
    }
  }, [openTrigger]);

  const loadNotes = async () => {
    const data = await dbService.getNotes();
    setNotes(data);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title || !newNote.content) return;

    await dbService.addNote({
      ...newNote,
      date: new Date().toISOString().split('T')[0],
      user_id: 'user-1'
    });

    setNewNote({ title: '', content: '', category: 'Design Idea' });
    setIsModalOpen(false);
    loadNotes();
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-lg">{t.notes}</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-200 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredNotes.length === 0 ? (
          <div className="col-span-2 text-center py-20 bg-white rounded-3xl border border-dashed border-slate-100">
            <FileText size={48} className="mx-auto text-slate-100 mb-2" />
            <p className="text-slate-400 text-sm">No notes found.</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div key={note.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-40">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">{note.category}</div>
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">{note.title}</h4>
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed flex-1">
                {note.content}
              </p>
              <div className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                <Calendar size={10} /> {note.date}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        {['Fabric', 'Design Idea', 'Material Sketch', 'Client Feedback'].map(cat => (
          <button key={cat} onClick={() => setSearch(cat)} className="whitespace-nowrap bg-white border border-slate-100 px-4 py-2 rounded-full text-xs font-semibold text-slate-600 shadow-sm hover:border-purple-200 hover:text-purple-600 transition-all">
            {cat}
          </button>
        ))}
      </div>

      {/* Add Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{t.addNew}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">✕</button>
            </div>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 ml-1">Title</label>
                <input type="text" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="w-full bg-slate-50 border-0 rounded-xl p-3 outline-none" placeholder="Note title" required />
              </div>
              <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 ml-1">Category</label>
                <select value={newNote.category} onChange={(e) => setNewNote({ ...newNote, category: e.target.value })} className="w-full bg-slate-50 border-0 rounded-xl p-3 outline-none">
                  <option>Design Idea</option><option>Fabric</option><option>Material Sketch</option><option>Client Feedback</option><option>Other</option>
                </select>
              </div>
              <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 ml-1">Content</label>
                <textarea value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} className="w-full bg-slate-50 border-0 rounded-xl p-3 outline-none h-32 resize-none" placeholder="Write your thoughts..." required />
              </div>
              <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg mt-4">{t.save}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;
