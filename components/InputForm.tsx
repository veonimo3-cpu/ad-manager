
import React, { useEffect, useRef } from 'react';
import { AdInputData, AdArchetype, AdFormat, AdTone, ARCHETYPES_LIST, FORMATS_LIST, TONES_LIST, COLOR_PALETTES } from '../types';
import { Wand2, Target, AlertCircle, Package, Layers, Smartphone, Plus, Search, Zap, Check, Palette, Upload, Image as ImageIcon, X, Mic2, Fingerprint } from 'lucide-react';

interface InputFormProps {
  formData: AdInputData;
  setFormData: React.Dispatch<React.SetStateAction<AdInputData>>;
  onSubmit: () => void;
  isLoading: boolean;
  mode?: 'campaign' | 'adset'; // campaign = full form, adset = only strategy fields
}

const InputForm: React.FC<InputFormProps> = ({ formData, setFormData, onSubmit, isLoading, mode = 'campaign' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (field: keyof AdInputData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isCampaignMode = mode === 'campaign';

  // Initialize custom colors if not present
  useEffect(() => {
    if (!formData.customColors || formData.customColors.length === 0) {
      setFormData(prev => ({ ...prev, customColors: ['#ffffff', '#888888', '#000000'] }));
    }
  }, []);

  const handleCustomColorChange = (index: number, color: string) => {
    const newColors = [...(formData.customColors || ['#ffffff', '#888888', '#000000'])];
    newColors[index] = color;
    setFormData(prev => ({ ...prev, customColors: newColors }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('referenceImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const removeImage = (field: 'referenceImage' | 'logoImage') => {
    handleChange(field, undefined);
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
      
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        {isCampaignMode ? <Wand2 className="w-6 h-6 text-gold-400" /> : <Plus className="w-6 h-6 text-gold-400" />}
        {isCampaignMode ? 'Nueva Campaña (Producto)' : 'Nuevo Conjunto de Anuncios'}
      </h2>

      <div className="space-y-6">
        {/* Product Information Section */}
        <div className={`space-y-5 ${!isCampaignMode ? 'opacity-60 pointer-events-none bg-slate-800/30 p-4 rounded-lg border border-slate-700' : ''}`}>
          {!isCampaignMode && (
             <div className="text-xs font-bold text-gold-500 uppercase tracking-wider mb-[-10px]">Información de la Campaña</div>
          )}
          
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-2">
              <Package className="w-4 h-4" /> Producto / Servicio
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder="Ej. Café Energético 'WakeUp'"
              disabled={!isCampaignMode}
              className="glass-input w-full rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:ring-2 focus:ring-gold-500/50 transition-all disabled:bg-slate-800 disabled:text-slate-400"
            />
          </div>

          {/* Pain Point */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Punto de Dolor (Pain Point)
            </label>
            <input
              type="text"
              value={formData.painPoint}
              onChange={(e) => handleChange('painPoint', e.target.value)}
              placeholder="Ej. Cansancio a media tarde, falta de foco"
              disabled={!isCampaignMode}
              className="glass-input w-full rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:ring-2 focus:ring-gold-500/50 transition-all disabled:bg-slate-800 disabled:text-slate-400"
            />
          </div>

          {/* Image & Logo Uploads */}
          {isCampaignMode && (
            <div className="grid grid-cols-2 gap-4">
               {/* Reference Image */}
               <div>
                 <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                   <ImageIcon className="w-4 h-4" /> Imagen Referencia (Opcional)
                 </label>
                 
                 <input 
                   type="file" 
                   ref={fileInputRef}
                   className="hidden" 
                   accept="image/*"
                   onChange={handleImageUpload}
                 />

                 {!formData.referenceImage ? (
                   <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 bg-slate-800/30 rounded-xl p-4 text-center cursor-pointer hover:border-gold-500/50 hover:bg-slate-800/50 transition-all group h-32 flex flex-col items-center justify-center"
                   >
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-gold-400 mb-2" />
                      <p className="text-xs text-slate-400">Subir Referencia</p>
                   </div>
                 ) : (
                   <div className="relative inline-block group w-full">
                      <img 
                        src={formData.referenceImage} 
                        alt="Reference" 
                        className="h-32 w-full rounded-lg border border-slate-600 shadow-lg object-cover"
                      />
                      <button 
                         onClick={() => removeImage('referenceImage')}
                         className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                      >
                         <X className="w-3 h-3" />
                      </button>
                   </div>
                 )}
               </div>

               {/* Logo Upload */}
               <div>
                 <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                   <Fingerprint className="w-4 h-4" /> Logo (Opcional)
                 </label>
                 
                 <input 
                   type="file" 
                   ref={logoInputRef}
                   className="hidden" 
                   accept="image/*"
                   onChange={handleLogoUpload}
                 />

                 {!formData.logoImage ? (
                   <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 bg-slate-800/30 rounded-xl p-4 text-center cursor-pointer hover:border-gold-500/50 hover:bg-slate-800/50 transition-all group h-32 flex flex-col items-center justify-center"
                   >
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-gold-400 mb-2" />
                      <p className="text-xs text-slate-400">Subir Logo (PNG)</p>
                   </div>
                 ) : (
                   <div className="relative inline-block group w-full">
                      <div className="h-32 w-full rounded-lg border border-slate-600 shadow-lg bg-slate-800 flex items-center justify-center p-2">
                        <img 
                          src={formData.logoImage} 
                          alt="Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <button 
                         onClick={() => removeImage('logoImage')}
                         className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                      >
                         <X className="w-3 h-3" />
                      </button>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>

        {/* Divider if in adset mode */}
        {!isCampaignMode && <div className="h-px bg-slate-700/50 my-2"></div>}

        {/* Strategy Section */}
        <div className="space-y-5 animate-fade-in">
          {!isCampaignMode && (
             <div className="text-xs font-bold text-gold-500 uppercase tracking-wider mb-[-10px]">Estrategia del Sub-conjunto</div>
          )}

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-2">
              <Target className="w-4 h-4" /> Audiencia Objetivo
            </label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => handleChange('targetAudience', e.target.value)}
              placeholder="Ej. Estudiantes universitarios, Programadores"
              className="glass-input w-full rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:ring-2 focus:ring-gold-500/50 transition-all"
              autoFocus={!isCampaignMode}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Archetype Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Arquetipo Viral
              </label>
              <div className="grid grid-cols-1 gap-3">
                <select
                  value={formData.archetype}
                  onChange={(e) => handleChange('archetype', e.target.value as AdArchetype)}
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-gold-500/50 transition-all appearance-none cursor-pointer"
                >
                  {ARCHETYPES_LIST.map((arch) => (
                    <option key={arch.value} value={arch.value} className="bg-slate-900 text-slate-200">
                      {arch.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Formato / Red Social
              </label>
              <div className="grid grid-cols-1 gap-3">
                <select
                  value={formData.format}
                  onChange={(e) => handleChange('format', e.target.value as AdFormat)}
                  className="glass-input w-full rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-gold-500/50 transition-all appearance-none cursor-pointer"
                >
                  {FORMATS_LIST.map((fmt) => (
                    <option key={fmt.value} value={fmt.value} className="bg-slate-900 text-slate-200">
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tone Selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Mic2 className="w-4 h-4" /> Tono del Mensaje
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES_LIST.map((toneItem) => (
                   <button
                      key={toneItem.value}
                      onClick={() => handleChange('tone', toneItem.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                        ${formData.tone === toneItem.value 
                          ? 'bg-gold-500 text-slate-900 border-gold-400 shadow-lg shadow-gold-500/20' 
                          : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                        }
                      `}
                   >
                      {toneItem.label}
                   </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Advanced Options (Toggles & Color Palette) */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-5">
             
             {/* Toggles */}
             <div className="flex flex-col md:flex-row md:items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.useResearch}
                        onChange={(e) => handleChange('useResearch', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Activar Research (Web)</span>
                   </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.useProMode}
                        onChange={(e) => handleChange('useProMode', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                   </div>
                   <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Modo Pro (Gemini Boost)</span>
                   </div>
                </label>
             </div>

             {/* Color Palette */}
             <div>
                <label className="block text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                   <Palette className="w-4 h-4" /> Estilo de Color (Visuales & Texto)
                </label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={() => handleChange('colorPalette', palette.id)}
                      className={`relative group rounded-lg p-1.5 border transition-all flex flex-col items-center gap-2 w-24
                        ${formData.colorPalette === palette.id 
                          ? 'bg-slate-700 border-gold-500 ring-1 ring-gold-500/50' 
                          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700'
                        }
                      `}
                    >
                      <div className="flex -space-x-2 overflow-hidden">
                        {palette.id === 'custom' ? (
                          <div className="flex gap-0.5">
                             <div className="w-3 h-6 bg-white rounded-l-full" style={{ backgroundColor: formData.customColors?.[0] }}></div>
                             <div className="w-3 h-6 bg-gray-500" style={{ backgroundColor: formData.customColors?.[1] }}></div>
                             <div className="w-3 h-6 bg-black rounded-r-full" style={{ backgroundColor: formData.customColors?.[2] }}></div>
                          </div>
                        ) : (
                          palette.colors.map((colorClass, i) => (
                            <div key={i} className={`w-6 h-6 rounded-full border-2 border-slate-800 ${colorClass}`}></div>
                          ))
                        )}
                      </div>
                      <span className={`text-[10px] font-medium truncate w-full text-center ${formData.colorPalette === palette.id ? 'text-white' : 'text-slate-500'}`}>
                        {palette.name}
                      </span>
                      {formData.colorPalette === palette.id && (
                        <div className="absolute -top-1 -right-1 bg-gold-500 rounded-full p-0.5">
                           <Check className="w-2 h-2 text-slate-900" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Color Picker Area */}
                {formData.colorPalette === 'custom' && (
                   <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700 flex flex-wrap items-center gap-4 animate-fade-in">
                      <div className="text-xs text-slate-400 font-medium">Edita tus colores:</div>
                      {formData.customColors?.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                           <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-500 ring-2 ring-slate-800">
                              <input 
                                type="color" 
                                value={color}
                                onChange={(e) => handleCustomColorChange(index, e.target.value)}
                                className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer p-0 border-0"
                              />
                           </div>
                        </div>
                      ))}
                   </div>
                )}
             </div>
          </div>

        </div>

        <button
          onClick={onSubmit}
          disabled={isLoading || !formData.productName || !formData.targetAudience}
          className={`w-full mt-4 py-3.5 px-6 rounded-lg font-bold text-slate-900 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2
            ${isLoading 
              ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
              : 'bg-gradient-to-r from-gold-400 to-yellow-500 hover:from-gold-300 hover:to-yellow-400'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isCampaignMode ? 'Creando Campaña...' : 'Creando Conjunto...'}
            </>
          ) : (
            <>
              {isCampaignMode ? <Wand2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {isCampaignMode ? 'Lanzar Campaña Viral' : 'Generar Variantes'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InputForm;
