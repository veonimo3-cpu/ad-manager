
import React, { useState, useMemo } from 'react';
import { Session } from '../types';
import { PlusCircle, Trash2, Clock, Layers, Search, ArrowUpDown, Folder } from 'lucide-react';

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

type SortOption = 'date' | 'name' | 'adsets';

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewSession,
  onDeleteSession,
  isOpen,
  toggleSidebar
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(s => 
        s.productInfo.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'date') return b.lastModified - a.lastModified;
      if (sortBy === 'name') return a.productInfo.name.localeCompare(b.productInfo.name);
      if (sortBy === 'adsets') return b.adSets.length - a.adSets.length;
      return 0;
    });
  }, [sessions, searchTerm, sortBy]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed top-0 left-0 h-full bg-slate-900/95 border-r border-slate-800 w-72 z-40 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static lg:h-[calc(100vh-80px)] lg:bg-transparent lg:border-0'}
      `}>
        <div className="p-4 space-y-4">
          <button 
            onClick={() => {
              onNewSession();
              if (window.innerWidth < 1024) toggleSidebar();
            }}
            className="w-full py-3 px-4 rounded-lg bg-gold-500 text-slate-900 font-bold hover:bg-gold-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
          >
            <PlusCircle className="w-5 h-5" />
            Nueva Campaña
          </button>

          {/* Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Buscar campaña..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-gold-500/50 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex-1 bg-slate-800 border-none rounded-lg text-xs text-slate-300 py-1.5 px-2 focus:ring-0 cursor-pointer"
              >
                <option value="date">Recientes</option>
                <option value="name">Nombre (A-Z)</option>
                <option value="adsets">Más AdSets</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
          <div className="px-2 mb-2 flex justify-between items-center">
             <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mis Productos ({filteredSessions.length})</h3>
          </div>
          
          {filteredSessions.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-600">
              <Folder className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No se encontraron campañas</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all border
                    ${currentSessionId === session.id 
                      ? 'bg-slate-800 border-gold-500/30 text-white' 
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${currentSessionId === session.id ? 'bg-gold-500' : 'bg-slate-600'}`}></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{session.productInfo.name || "Sin nombre"}</h4>
                      <div className="flex items-center gap-3 mt-1">
                         <span className="text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1">
                           <Layers className="w-3 h-3" />
                           {session.adSets.length}
                         </span>
                         <span className="text-[10px] text-slate-600 flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {new Date(session.lastModified).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                         </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => onDeleteSession(e, session.id)}
                      className="absolute right-2 top-2 p-1.5 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                      title="Eliminar campaña"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
