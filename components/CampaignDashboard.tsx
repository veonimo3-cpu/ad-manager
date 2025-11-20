
import React, { useState } from 'react';
import { Session, AdSet } from '../types';
import { Layers, Plus, ArrowRight, Package, AlertCircle, ChevronRight, Pencil, X, Save } from 'lucide-react';

interface CampaignDashboardProps {
  session: Session;
  onSelectAdSet: (adSetId: string) => void;
  onNewAdSet: () => void;
  onUpdateAdSet: (adSetId: string, updates: { name: string, targetAudience: string }) => void;
}

const CampaignDashboard: React.FC<CampaignDashboardProps> = ({ session, onSelectAdSet, onNewAdSet, onUpdateAdSet }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', targetAudience: '' });

  const handleEditClick = (e: React.MouseEvent, adSet: AdSet) => {
    e.stopPropagation();
    setEditingId(adSet.id);
    setEditForm({ name: adSet.name, targetAudience: adSet.targetAudience });
  };

  const handleSaveEdit = () => {
    if (editingId) {
      onUpdateAdSet(editingId, editForm);
      setEditingId(null);
    }
  };

  const handleCloseEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="animate-fade-in space-y-8 relative">
      
      {/* Edit Modal Overlay */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in">
            <button 
              onClick={handleCloseEdit}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-gold-400" />
              Editar Ad Set
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Nombre del Conjunto</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="glass-input w-full rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-gold-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Audiencia Objetivo (Descripción)</label>
                <textarea 
                  value={editForm.targetAudience}
                  onChange={(e) => setEditForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                  rows={3}
                  className="glass-input w-full rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-gold-500/50 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleCloseEdit}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-slate-900 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Header (Product Level) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold-500/20 text-gold-400 border border-gold-500/30">
                Campaña Activa
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{session.productInfo.name}</h1>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
               <AlertCircle className="w-4 h-4 text-slate-500" />
               <span>Pain Point: <span className="text-slate-300 italic">{session.productInfo.painPoint}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
                <div className="text-2xl font-bold text-white">{session.adSets.length}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Conjuntos de Anuncios</div>
             </div>
          </div>
        </div>
      </div>

      {/* Ad Sets Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <Layers className="w-5 h-5 text-gold-400" />
             Conjuntos de Anuncios (Ángulos)
           </h2>
           <button 
             onClick={onNewAdSet}
             className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-slate-900 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-gold-500/10 transform hover:scale-105"
           >
             <Plus className="w-4 h-4" />
             Nuevo Ángulo
           </button>
        </div>

        {session.adSets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
             <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-slate-600" />
             </div>
             <h3 className="text-lg font-medium text-white mb-1">No hay conjuntos de anuncios</h3>
             <p className="text-slate-500 mb-6 max-w-md mx-auto">Crea diferentes ángulos creativos para probar distintas audiencias o estilos visuales.</p>
             <button onClick={onNewAdSet} className="text-gold-400 hover:text-gold-300 font-medium">
               + Crear primer conjunto
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {session.adSets.map((adSet) => (
                <div 
                  key={adSet.id}
                  onClick={() => onSelectAdSet(adSet.id)}
                  className="glass-panel p-5 rounded-xl border border-slate-700/50 hover:border-gold-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                     <button 
                        onClick={(e) => handleEditClick(e, adSet)}
                        className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                        title="Editar detalles"
                     >
                        <Pencil className="w-4 h-4" />
                     </button>
                     <ChevronRight className="w-5 h-5 text-gold-400" />
                  </div>
                  
                  <div className="mb-4 pr-12">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold-400 transition-colors truncate">{adSet.name}</h3>
                    <p className="text-sm text-slate-400 truncate">{adSet.targetAudience}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-slate-900 rounded text-xs text-slate-300 border border-slate-700">
                      {adSet.archetype}
                    </span>
                    <span className="px-2 py-1 bg-slate-900 rounded text-xs text-slate-300 border border-slate-700">
                      {adSet.format}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between">
                     <div className="text-xs text-slate-500">
                        Creado {new Date(adSet.createdAt).toLocaleDateString()}
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-xs font-medium text-slate-300">{adSet.ads.length} Creativos</span>
                     </div>
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default CampaignDashboard;
