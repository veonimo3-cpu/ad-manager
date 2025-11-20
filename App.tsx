
import React, { useState, useEffect } from 'react';
import { AdInputData, AdArchetype, GeneratedAd, Session, AdFormat, AdSet, COLOR_PALETTES, AdTone } from './types';
import InputForm from './components/InputForm';
import ResultCard from './components/ResultCard';
import Sidebar from './components/Sidebar';
import CampaignDashboard from './components/CampaignDashboard';
import LoadingOverlay from './components/LoadingOverlay';
import { generateAdContent, refineAdContent, generateVideo } from './services/geminiService';
import { Zap, Menu, X } from 'lucide-react';

const INITIAL_DATA: AdInputData = {
  productName: '',
  painPoint: '',
  targetAudience: '',
  archetype: AdArchetype.US_VS_THEM,
  format: AdFormat.SQUARE,
  tone: AdTone.URGENT, // Default tone
  useResearch: true,
  useProMode: false,
  colorPalette: COLOR_PALETTES[0].id,
  customColors: ['#ffffff', '#888888', '#000000'],
  referenceImage: undefined,
  logoImage: undefined
};

const App: React.FC = () => {
  // Session State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentAdSetId, setCurrentAdSetId] = useState<string | null>(null);
  
  // UI State
  const [formData, setFormData] = useState<AdInputData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'createCampaign' | 'dashboard' | 'createAdSet' | 'viewAdSet'>('createCampaign');

  // Load sessions from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('viral_ad_sessions_v2');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save sessions to local storage on change - CRASH FIX: Wrapped in try/catch
  useEffect(() => {
    try {
      localStorage.setItem('viral_ad_sessions_v2', JSON.stringify(sessions));
    } catch (e) {
      console.warn("LocalStorage Quota Exceeded - History may not be saved.", e);
      // We do not set error state here to avoid disrupting the user flow, 
      // but we prevent the app from crashing.
    }
  }, [sessions]);

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setCurrentAdSetId(null);
    setFormData(INITIAL_DATA);
    setViewMode('createCampaign');
    setIsSidebarOpen(false);
    setError(null);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setCurrentAdSetId(null);
    setViewMode('dashboard');
    setError(null);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      handleNewSession();
    }
  };

  // --- CREATE CAMPAIGN + FIRST AD SET ---
  const handleSubmitCampaign = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const resultWithoutIds = await generateAdContent(formData);
      
      const newAd: GeneratedAd = {
        ...resultWithoutIds,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      const newAdSet: AdSet = {
        id: crypto.randomUUID(),
        name: `${formData.targetAudience} - ${formData.archetype.split('(')[0].trim()}`,
        targetAudience: formData.targetAudience,
        archetype: formData.archetype,
        format: formData.format,
        ads: [newAd],
        createdAt: Date.now(),
        customColors: formData.colorPalette === 'custom' ? formData.customColors : undefined,
        referenceImage: formData.referenceImage, // Persist reference image
        logoImage: formData.logoImage // Persist Logo
      };

      const newSession: Session = {
        id: crypto.randomUUID(),
        title: formData.productName,
        productInfo: {
          name: formData.productName,
          painPoint: formData.painPoint
        },
        adSets: [newAdSet],
        lastModified: Date.now(),
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setCurrentAdSetId(newAdSet.id);
      setViewMode('viewAdSet');

    } catch (err) {
      setError("Hubo un error conectando con la IA. Por favor intenta de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CREATE NEW AD SET IN EXISTING CAMPAIGN ---
  const handleInitNewAdSet = () => {
    if (!currentSessionId) return;
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    // Pre-fill product info, reset strategy fields to default
    setFormData({
      productName: session.productInfo.name,
      painPoint: session.productInfo.painPoint,
      targetAudience: '',
      archetype: AdArchetype.US_VS_THEM,
      format: AdFormat.SQUARE,
      tone: AdTone.URGENT, // Default
      useResearch: true,
      useProMode: false,
      colorPalette: COLOR_PALETTES[0].id,
      customColors: ['#ffffff', '#888888', '#000000'],
      referenceImage: undefined,
      logoImage: undefined // Reset logo for new adset unless we want to persist? Let's reset.
    });
    setViewMode('createAdSet');
  };

  const handleSubmitAdSet = async () => {
     if (!currentSessionId) return;
     setIsLoading(true);
     setError(null);

     try {
       const resultWithoutIds = await generateAdContent(formData);
       
       const newAd: GeneratedAd = {
         ...resultWithoutIds,
         id: crypto.randomUUID(),
         timestamp: Date.now(),
       };
 
       const newAdSet: AdSet = {
         id: crypto.randomUUID(),
         name: `${formData.targetAudience} - ${formData.archetype.split('(')[0].trim()}`,
         targetAudience: formData.targetAudience,
         archetype: formData.archetype,
         format: formData.format,
         ads: [newAd],
         createdAt: Date.now(),
         customColors: formData.colorPalette === 'custom' ? formData.customColors : undefined,
         referenceImage: formData.referenceImage, // Persist reference image
         logoImage: formData.logoImage
       };

       setSessions(prev => prev.map(s => {
         if (s.id === currentSessionId) {
           return {
             ...s,
             adSets: [...s.adSets, newAdSet],
             lastModified: Date.now()
           };
         }
         return s;
       }));

       setCurrentAdSetId(newAdSet.id);
       setViewMode('viewAdSet');

     } catch (err) {
        setError("Error al crear el conjunto de anuncios.");
        console.error(err);
     } finally {
        setIsLoading(false);
     }
  };

  // --- UPDATE EXISTING AD SET (Rename/Edit) ---
  const handleUpdateAdSet = (adSetId: string, updates: { name: string, targetAudience: string }) => {
    if (!currentSessionId) return;
    
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          adSets: s.adSets.map(as => {
            if (as.id === adSetId) {
              return { ...as, ...updates };
            }
            return as;
          }),
          lastModified: Date.now()
        };
      }
      return s;
    }));
  };

  // --- REFINEMENT LOGIC ---
  const handleRefine = async (instruction: string) => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession || !currentAdSetId) return;
    
    const currentAdSet = currentSession.adSets.find(as => as.id === currentAdSetId);
    if (!currentAdSet) return;

    const lastAd = currentAdSet.ads[currentAdSet.ads.length - 1];
    
    // Reconstruct AdInputData for context
    const contextData: AdInputData = {
      productName: currentSession.productInfo.name,
      painPoint: currentSession.productInfo.painPoint,
      targetAudience: currentAdSet.targetAudience,
      archetype: currentAdSet.archetype,
      format: currentAdSet.format,
      // Default these for refinement if missing in old data
      tone: AdTone.URGENT, // Default fallback
      useResearch: false, 
      useProMode: false,
      colorPalette: currentAdSet.customColors ? 'custom' : COLOR_PALETTES[0].id,
      customColors: currentAdSet.customColors,
      referenceImage: currentAdSet.referenceImage, // Pass stored reference
      logoImage: currentAdSet.logoImage // Pass stored logo
    };

    setIsRefining(true);
    setError(null);

    try {
      const refinedResult = await refineAdContent(lastAd, instruction, contextData);
      
      const newAd: GeneratedAd = {
        ...refinedResult,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      setSessions(prev => prev.map(s => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            adSets: s.adSets.map(as => {
               if (as.id === currentAdSetId) {
                 return { ...as, ads: [...as.ads, newAd] };
               }
               return as;
            }),
            lastModified: Date.now(),
          };
        }
        return s;
      }));

    } catch (err) {
      setError("No se pudo refinar el anuncio.");
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  };

  // --- MANUAL ADDITION (Resize / Upload) ---
  const handleManualAdd = (newAd: GeneratedAd) => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession || !currentAdSetId) return;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSession.id) {
        return {
          ...s,
          adSets: s.adSets.map(as => {
             if (as.id === currentAdSetId) {
               return { ...as, ads: [...as.ads, newAd] };
             }
             return as;
          }),
          lastModified: Date.now(),
        };
      }
      return s;
    }));
  };

  // --- ANIMATION LOGIC ---
  const handleAnimate = async (adId: string) => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession || !currentAdSetId) return;

    const currentAdSet = currentSession.adSets.find(as => as.id === currentAdSetId);
    if (!currentAdSet) return;

    const adIndex = currentAdSet.ads.findIndex(ad => ad.id === adId);
    if (adIndex === -1) return;
    
    const targetAd = currentAdSet.ads[adIndex];
    if (targetAd.videoUrl) return; 

    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
         const hasKey = await aistudio.hasSelectedApiKey();
         if (!hasKey) {
            await aistudio.openSelectKey();
         }
      }
    } catch (e) {
      console.warn("AI Studio helper not available", e);
    }

    setIsVideoGenerating(true);
    setError(null);

    try {
       const videoUrl = await generateVideo(targetAd.imageUrl, currentAdSet.format);
       
       setSessions(prev => prev.map(s => {
         if (s.id === currentSession.id) {
           return {
             ...s,
             adSets: s.adSets.map(as => {
                if (as.id === currentAdSetId) {
                   const newAds = [...as.ads];
                   newAds[adIndex] = { ...targetAd, videoUrl };
                   return { ...as, ads: newAds };
                }
                return as;
             }),
             lastModified: Date.now()
           };
         }
         return s;
       }));

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found") || err.toString().includes("404")) {
         setError("La API Key no tiene acceso a Veo o expiró. Por favor selecciona una nueva llave.");
         const aistudio = (window as any).aistudio;
         if (aistudio) {
             try { await aistudio.openSelectKey(); } catch(e) {}
         }
      } else {
         setError("Error generando video con Veo. Intenta de nuevo.");
      }
    } finally {
      setIsVideoGenerating(false);
    }
  };

  // --- RENDER HELPERS ---
  const activeSession = sessions.find(s => s.id === currentSessionId);
  const activeAdSet = activeSession?.adSets.find(as => as.id === currentAdSetId);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-gold-500/30">
      {/* Header */}
      <header className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 flex items-center px-4 lg:px-8 justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-400 hover:text-gold-400 lg:hidden transition-colors"
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleNewSession}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
              <Zap className="w-6 h-6 text-slate-900 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Viral Ad Creator</h1>
              <p className="text-xs text-gold-500 font-medium uppercase tracking-widest">Ads Manager</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <Sidebar 
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
          
          {/* Loading Overlay (Scoped to Main Content) */}
          <LoadingOverlay isVisible={isLoading} />

          <div className="max-w-6xl mx-auto">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-3 animate-fade-in">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {error}
              </div>
            )}

            {viewMode === 'createCampaign' && (
              <>
                <div className="mb-8 text-center space-y-2">
                  <h2 className="text-3xl md:text-4xl font-bold text-white">Nueva Campaña</h2>
                  <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                    Comienza definiendo tu producto. Luego podrás crear múltiples ángulos y tests A/B.
                  </p>
                </div>
                <InputForm 
                  formData={formData} 
                  setFormData={setFormData} 
                  onSubmit={handleSubmitCampaign} 
                  isLoading={isLoading}
                  mode="campaign"
                />
              </>
            )}

            {viewMode === 'dashboard' && activeSession && (
               <CampaignDashboard 
                 session={activeSession}
                 onSelectAdSet={(id) => {
                    setCurrentAdSetId(id);
                    setViewMode('viewAdSet');
                 }}
                 onNewAdSet={handleInitNewAdSet}
                 onUpdateAdSet={handleUpdateAdSet}
               />
            )}

            {viewMode === 'createAdSet' && activeSession && (
               <>
                 <div className="mb-8">
                    <button onClick={() => setViewMode('dashboard')} className="text-slate-400 hover:text-white flex items-center gap-2 mb-4">
                       ← Volver al Dashboard de {activeSession.productInfo.name}
                    </button>
                    <div className="text-center space-y-2">
                       <h2 className="text-3xl md:text-4xl font-bold text-white">Nuevo Ángulo / Ad Set</h2>
                       <p className="text-slate-400 max-w-2xl mx-auto">
                          Define una nueva audiencia o estrategia para este producto.
                       </p>
                    </div>
                 </div>
                 <InputForm 
                   formData={formData} 
                   setFormData={setFormData} 
                   onSubmit={handleSubmitAdSet} 
                   isLoading={isLoading}
                   mode="adset"
                 />
               </>
            )}

            {viewMode === 'viewAdSet' && activeAdSet && (
              <ResultCard 
                adSet={activeAdSet}
                onRefine={handleRefine}
                onManualAdd={handleManualAdd}
                onAnimate={handleAnimate}
                isRefining={isRefining}
                isVideoGenerating={isVideoGenerating}
                onBack={() => {
                   setViewMode('dashboard');
                   setCurrentAdSetId(null);
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
