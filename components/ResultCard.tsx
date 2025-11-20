
import React, { useState, useEffect, useRef } from 'react';
import { AdSet, AdFormat, GeneratedAd } from '../types';
import { Copy, Download, Send, Check, Video, PlayCircle, Loader2, Globe, ArrowLeft, ArrowRight, FileText, MessageSquare, Images, LayoutTemplate, Maximize2, ChevronDown, Camera, Wand2, RefreshCw } from 'lucide-react';
import { generateImage, editProductImage } from '../services/geminiService';

interface ResultCardProps {
  adSet: AdSet;
  onRefine: (instruction: string) => void;
  onManualAdd: (ad: GeneratedAd) => void;
  onAnimate: (adId: string) => void;
  isRefining: boolean;
  isVideoGenerating: boolean;
  onBack: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ adSet, onRefine, onManualAdd, onAnimate, isRefining, isVideoGenerating, onBack }) => {
  // Default to showing the latest item
  const [currentIndex, setCurrentIndex] = useState(adSet.ads.length - 1);
  const [refineText, setRefineText] = useState('');
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [showResizeMenu, setShowResizeMenu] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isReversioning, setIsReversioning] = useState(false);
  
  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Mounted Ref to prevent state updates if unmounted
  const isMounted = useRef(true);

  // State for Script Tabs (0-4)
  const [activeScriptTab, setActiveScriptTab] = useState(0);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Sync index when history length changes (new item added)
  useEffect(() => {
    if (adSet.ads.length > 0) {
       setCurrentIndex(adSet.ads.length - 1);
       setImageLoading(true);
       setActiveScriptTab(0); // Reset tab on new generation
    }
  }, [adSet.ads.length]);

  // Guard against empty or invalid adSets to prevent crashes
  if (!adSet || !adSet.ads || adSet.ads.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center">
        <p className="text-slate-400">No ads available in this set.</p>
        <button onClick={onBack} className="mt-4 text-gold-400 hover:underline">Go Back</button>
      </div>
    );
  }

  // Safety check for index out of bounds
  const safeIndex = Math.min(currentIndex, adSet.ads.length - 1);
  const currentResult = adSet.ads[safeIndex];
  
  // Backward compatibility: handle if 'scripts' array is missing but 'script' object exists (from old saves)
  const scripts = currentResult.scripts || ((currentResult as any).script ? [(currentResult as any).script] : []);
  const activeScript = scripts[activeScriptTab] || scripts[0] || { title: "Error", hook: "", body: "No script data found.", cta: "" };

  const isCarousel = adSet.format === AdFormat.CAROUSEL;

  // Determine styling colors
  const customColors = adSet.customColors;
  
  const getCardStyle = () => {
    if (customColors && customColors.length >= 3) {
      return {
        background: `linear-gradient(135deg, ${customColors[0]} 0%, ${customColors[1]} 100%)`,
        borderColor: customColors[2],
        textColor: customColors[2] === '#ffffff' || customColors[2] === '#000000' ? customColors[2] : '#facc15' // gold fallback
      };
    }
    return null;
  };
  
  const dynamicStyle = getCardStyle();

  const copyToClipboard = () => {
    if (!activeScript) return;
    let text = '';
    
    if (isCarousel && activeScript.slides) {
       text = activeScript.slides.map(s => `Slide ${s.slideNumber}: ${s.headline}\n${s.body}`).join('\n\n');
       text += `\n\nCaption: ${activeScript.cta}`;
    } else {
       text = `${activeScript.title}\n\n${activeScript.hook}\n\n${activeScript.body}\n\n${activeScript.cta}`;
    }
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refineText.trim() && !isRefining) {
      onRefine(refineText);
      setRefineText('');
    }
  };

  const navigateHistory = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setImageLoading(true); 
      setActiveScriptTab(0);
    } else if (direction === 'next' && currentIndex < adSet.ads.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setImageLoading(true);
      setActiveScriptTab(0);
    }
  };

  // --- New Features Logic ---

  const isBusy = imageLoading || isResizing || isEnhancing || isReversioning;

  // 1. Reversion / Variation (Fixed: Uses Image-to-Image)
  const handleReversion = async () => {
    if (isBusy || !process.env.API_KEY) return;
    
    setIsReversioning(true);
    setShowResizeMenu(false);

    try {
       let newImageUrl;
       
       // STRATEGY:
       // 1. If we have the Original Reference Image (stored in AdSet), use that.
       // 2. If not, use the Current Image as reference.
       const sourceImage = adSet.referenceImage || currentResult.imageUrl;
       
       // Check if sourceImage is valid before sending
       if (!sourceImage || sourceImage.length < 100) {
          throw new Error("Invalid source image for reversion.");
       }

       try {
          // Attempt 1: Image-to-Image
          newImageUrl = await editProductImage(
              sourceImage, 
              currentResult.imagePrompt, 
              process.env.API_KEY, 
              adSet.format
          );
       } catch (imgError) {
          console.warn("Image-to-Image failed, falling back to Text-to-Image", imgError);
          // Attempt 2: Fallback to Text-to-Image if Img-to-Img fails (avoid crash)
          alert("Nota: La variación directa falló. Generando nueva imagen basada en el prompt...");
          newImageUrl = await generateImage(currentResult.imagePrompt, process.env.API_KEY, adSet.format);
       }

       if (!newImageUrl || !newImageUrl.startsWith('data:image')) {
         throw new Error("La imagen generada no es válida.");
       }

       const newAd: GeneratedAd = {
        ...currentResult,
        id: crypto.randomUUID(),
        imageUrl: newImageUrl,
        userRequest: 'Variante (Reversion)',
        timestamp: Date.now()
      };
      
      if (isMounted.current) {
        onManualAdd(newAd);
      }

    } catch (e) {
      console.error("Reversion failed", e);
      alert("Error crítico: No se pudo generar la variante. Por favor intenta de nuevo.");
    } finally {
      if (isMounted.current) {
         setIsReversioning(false);
      }
    }
  };

  // 2. Resize / Reformat
  const handleResize = async (targetFormat: AdFormat) => {
    if (isBusy || !process.env.API_KEY) return;
    setIsResizing(true);
    setShowResizeMenu(false);

    try {
      let newImageUrl;
      if (adSet.referenceImage) {
         try {
            // If we have a reference product, use Image-to-Image
            newImageUrl = await editProductImage(adSet.referenceImage, currentResult.imagePrompt, process.env.API_KEY, targetFormat);
         } catch (e) {
            // Fallback
             newImageUrl = await generateImage(currentResult.imagePrompt, process.env.API_KEY, targetFormat);
         }
      } else {
         // Standard generation
         newImageUrl = await generateImage(currentResult.imagePrompt, process.env.API_KEY, targetFormat);
      }
      
      const newAd: GeneratedAd = {
        ...currentResult,
        id: crypto.randomUUID(),
        imageUrl: newImageUrl,
        userRequest: `Redimensionado a ${targetFormat}`,
        timestamp: Date.now()
      };
      
      if (isMounted.current) {
         onManualAdd(newAd);
      }
    } catch (e) {
      console.error("Resize failed", e);
      alert("Error al redimensionar. Intenta de nuevo.");
    } finally {
      if (isMounted.current) {
         setIsResizing(false);
      }
    }
  };

  // 3. Product Enhancement (Upload - Image-to-Image)
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !process.env.API_KEY) return;

    setIsEnhancing(true);
    setShowResizeMenu(false);
    
    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      try {
        // Call Service to Enhance - STRICTLY IMAGE-TO-IMAGE
        const enhancedImageUrl = await editProductImage(base64String, currentResult.imagePrompt, process.env.API_KEY!, adSet.format);
        
        const newAd: GeneratedAd = {
          ...currentResult,
          id: crypto.randomUUID(),
          imageUrl: enhancedImageUrl,
          userRequest: 'Mejoras de Producto (Studio Mode)',
          timestamp: Date.now()
        };
        
        if (isMounted.current) {
           onManualAdd(newAd);
        }
      } catch (err) {
        console.error("Enhancement failed", err);
        alert("Error al procesar la imagen subida. Intenta con una imagen más pequeña.");
      } finally {
        if (isMounted.current) {
           setIsEnhancing(false);
        }
      }
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Helper for Carousel Slicing
  const getCarouselSlideStyle = (slideIndex: number, totalSlides: number) => {
    const position = slideIndex * (100 / (totalSlides - 1));
    return {
      backgroundImage: `url(${currentResult.imageUrl})`,
      backgroundSize: `${totalSlides * 100}% auto`, 
      backgroundPosition: `${position}% center`,
      backgroundRepeat: 'no-repeat'
    };
  };

  // Ensure we have valid slides array for rendering
  const renderSlides = isCarousel ? (activeScript.slides || []) : [];
  if (isCarousel && renderSlides.length < 4) {
     while(renderSlides.length < 4) {
        renderSlides.push({
           slideNumber: renderSlides.length + 1,
           headline: "Slide Extra",
           body: "Generando contenido...",
           visualDescription: ""
        });
     }
  }

  return (
    <div className="animate-fade-in flex flex-col h-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange}
      />

      {/* Breadcrumb / Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
           <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
             {adSet.name}
             {customColors && (
                <div className="flex gap-1 ml-2" title="Custom Palette">
                   {customColors.map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{backgroundColor: c}}></div>
                   ))}
                </div>
             )}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
             <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{adSet.archetype}</span>
             <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{adSet.format}</span>
             {adSet.referenceImage && (
               <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 text-gold-400 border-gold-500/30">
                  <Check className="w-3 h-3" /> Producto Real
               </span>
             )}
          </div>
        </div>
      </div>

      {/* History Navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-sm text-slate-400">
          Iteración <span className="text-gold-400 font-bold">{safeIndex + 1}</span> de {adSet.ads.length}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigateHistory('prev')}
            disabled={safeIndex === 0}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigateHistory('next')}
            disabled={safeIndex === adSet.ads.length - 1}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Visual Column (Image/Video) */}
        <div className="order-2 lg:order-1">
          <div className={`glass-panel rounded-2xl p-1 overflow-hidden shadow-2xl relative group bg-black/40 flex items-center justify-center
             ${isCarousel ? 'aspect-video' : 'min-h-[300px]'}
          `}>
            
            {/* Render Video if available, otherwise Image */}
            {currentResult.videoUrl ? (
               <div className="relative w-full h-full">
                 <video 
                   src={currentResult.videoUrl} 
                   controls 
                   autoPlay 
                   loop 
                   className="w-full h-full object-contain rounded-xl"
                 />
                 <div className="absolute top-4 left-4 z-20">
                   <span className="px-3 py-1 bg-gold-500 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                     <Video className="w-3 h-3" />
                     Veo Animated
                   </span>
                 </div>
               </div>
            ) : (
              <>
                {/* Image Loader Overlay */}
                {(imageLoading || isResizing || isEnhancing || isReversioning) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-gold-400 text-sm font-medium animate-pulse">
                         {isResizing ? 'Redimensionando...' : 
                          isEnhancing ? 'Procesando Imagen (Img-to-Img)...' : 
                          isReversioning ? 'Generando Variante...' :
                          'Renderizando Visual...'}
                      </p>
                    </div>
                  </div>
                )}

                <img 
                  key={currentResult.id} // Force re-mount on new ID to trigger onLoad correctly
                  src={currentResult.imageUrl} 
                  alt="AI Generated Ad Visual" 
                  className={`w-full h-full object-contain rounded-xl transition-opacity duration-700 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                     console.error("Image failed to load");
                     setImageLoading(false);
                  }} 
                />

                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <span className="px-3 py-1 bg-gold-500 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-2">
                     {isCarousel ? <Images className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                     {isCarousel ? 'Panorama Completo (16:9)' : 'Gemini Image'}
                  </span>
                </div>

                {/* Top Right Tools */}
                <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   {/* Combined Tools Menu */}
                   <div className="relative">
                      <button 
                        onClick={() => !isBusy && setShowResizeMenu(!showResizeMenu)}
                        className={`px-3 py-2 bg-slate-900/90 backdrop-blur text-white rounded-full hover:bg-gold-500 hover:text-slate-900 transition-colors flex items-center gap-2 shadow-xl border border-white/10
                           ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        title="Herramientas de Imagen"
                      >
                         <span className="text-xs font-bold hidden sm:inline">Editar</span>
                         <Wand2 className="w-3 h-3 sm:hidden" />
                         <ChevronDown className="w-3 h-3" />
                      </button>
                      
                      {showResizeMenu && (
                         <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30 animate-fade-in ring-1 ring-black/50">
                            
                            {/* Section: Studio Mode */}
                             <div className="p-2">
                                <div className="px-2 py-1 text-[10px] uppercase text-gold-500 font-bold tracking-wider mb-1">
                                   Studio Mode
                                </div>
                                <button 
                                   onClick={() => { handleUploadClick(); }}
                                   className="w-full p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-left flex items-center gap-3 border border-slate-700/50 hover:border-gold-500/30 transition-all group/item"
                                >
                                   <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500 group-hover/item:bg-gold-500 group-hover/item:text-slate-900 transition-colors">
                                       <Camera className="w-4 h-4" />
                                   </div>
                                   <div>
                                      <div className="text-xs font-bold text-white">Subir Producto Real</div>
                                      <div className="text-[10px] text-slate-400">Usa Image-to-Image</div>
                                   </div>
                                </button>
                             </div>

                             <div className="h-px bg-slate-800 mx-2 my-1"></div>

                             {/* Section: Variations */}
                             <div className="p-2 pt-1">
                                <div className="px-2 py-1 text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">
                                   Variaciones
                                </div>
                                <button 
                                   onClick={handleReversion}
                                   disabled={isBusy}
                                   className="w-full px-3 py-2 rounded hover:bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-3 transition-colors disabled:opacity-50"
                                >
                                   <RefreshCw className="w-4 h-4 opacity-50" />
                                   Generar Variante
                                </button>
                             </div>
                            
                             <div className="h-px bg-slate-800 mx-2 my-1"></div>

                            {/* Section: Resize */}
                            <div className="p-2 pt-1">
                               <div className="px-2 py-1 text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">
                                  Redimensionar (Formato)
                               </div>
                               <div className="space-y-1">
                                  <button onClick={() => handleResize(AdFormat.SQUARE)} className="w-full px-3 py-2 rounded hover:bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-3 transition-colors">
                                      <div className="w-4 h-4 border-2 border-current rounded-sm opacity-50"></div>
                                      Cuadrado (1:1)
                                  </button>
                                  <button onClick={() => handleResize(AdFormat.STORY)} className="w-full px-3 py-2 rounded hover:bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-3 transition-colors">
                                      <div className="w-3 h-4 border-2 border-current rounded-sm opacity-50"></div>
                                      Vertical (9:16)
                                  </button>
                                  <button onClick={() => handleResize(AdFormat.LANDSCAPE)} className="w-full px-3 py-2 rounded hover:bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-3 transition-colors">
                                      <div className="w-5 h-3 border-2 border-current rounded-sm opacity-50"></div>
                                      Horizontal (16:9)
                                  </button>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                </div>

                {/* Bottom Actions Overlay */}
                <div className="absolute bottom-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <button 
                     onClick={() => onAnimate(currentResult.id)}
                     disabled={isVideoGenerating}
                     className="px-4 py-2.5 bg-slate-900/90 backdrop-blur text-white rounded-full hover:bg-gold-500 hover:text-slate-900 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isVideoGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                        <PlayCircle className="w-5 h-5" />
                     )}
                     <span className="text-sm font-bold">Animar con Veo</span>
                   </button>

                   <a 
                     href={currentResult.imageUrl} 
                     download={`ad-visual-${adSet.id}-${safeIndex}.png`}
                     target="_blank"
                     rel="noreferrer"
                     className="p-2.5 bg-slate-900/90 backdrop-blur text-white rounded-full hover:bg-gold-500 hover:text-slate-900 transition-colors"
                     title="Descargar Imagen"
                   >
                     <Download className="w-5 h-5" />
                   </a>
                </div>
              </>
            )}
            
            {/* Veo Generating Overlay */}
            {isVideoGenerating && !currentResult.videoUrl && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
                 <div className="text-center p-6 bg-slate-800 rounded-2xl border border-gold-500/30 shadow-2xl">
                   <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                   <p className="text-gold-400 font-bold text-lg mb-1">Creando Video con Veo...</p>
                   <p className="text-slate-400 text-sm">Esto puede tomar unos segundos</p>
                 </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 px-2 space-y-3">
             <p className="text-xs text-slate-500 font-mono truncate opacity-50 hover:opacity-100 transition-opacity">
               Prompt: {currentResult.imagePrompt}
             </p>

             {/* Research Sources Display */}
             {currentResult.researchSources && currentResult.researchSources.length > 0 && (
               <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                 <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-3 h-3 text-gold-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fuentes de Investigación</span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {currentResult.researchSources.map((source, idx) => (
                     <a 
                       key={idx} 
                       href={source.uri} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-[10px] px-2 py-1 bg-slate-900 rounded border border-slate-700 text-slate-400 hover:text-gold-400 hover:border-gold-500/30 transition-colors truncate max-w-[200px]"
                     >
                       {source.title}
                     </a>
                   ))}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Script Column */}
        <div className="order-1 lg:order-2 flex flex-col h-full">
          <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-2xl flex-1 border-t-4 border-t-gold-500 flex flex-col"
             style={dynamicStyle ? { borderColor: dynamicStyle.borderColor } : {}}
          >
            
            <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold-400" style={dynamicStyle ? { color: dynamicStyle.textColor } : {}} />
                  {isCarousel ? 'Secuencia de Carrusel (Seamless)' : 'Guion Generado'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isCarousel ? 'Diseño panorámico dividido en 4 slides' : 'Elige la mejor variante para el visual'}
                </p>
              </div>
              <button 
                onClick={copyToClipboard}
                className="text-slate-400 hover:text-gold-400 transition-colors p-1"
                title="Copiar texto"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Script Options Tabs */}
            {scripts.length > 1 && (
               <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                  {scripts.map((_, idx) => (
                     <button
                        key={idx}
                        onClick={() => setActiveScriptTab(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                           ${activeScriptTab === idx 
                              ? 'bg-gold-500 text-slate-900 shadow-lg shadow-gold-500/20' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                           }
                        `}
                        style={activeScriptTab === idx && dynamicStyle ? { backgroundColor: dynamicStyle.textColor, color: '#000000' } : {}}
                     >
                        Opción {idx + 1}
                     </button>
                  ))}
               </div>
            )}

            <div className="flex-1 overflow-y-hidden flex flex-col">
              
              {activeScript ? (
                <>
                  {/* CAROUSEL VIEW: Horizontal Scroll */}
                  {isCarousel ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory h-full custom-scrollbar items-stretch">
                         {renderSlides.map((slide, sIdx) => (
                            <div 
                              key={sIdx} 
                              className="min-w-[260px] w-[260px] snap-center bg-slate-800/50 p-0 rounded-xl border border-slate-700/50 relative flex flex-col shrink-0 overflow-hidden group hover:border-gold-500/30 transition-all"
                              style={dynamicStyle ? { borderColor: `${dynamicStyle.borderColor}40` } : {}}
                            >
                               {/* Header Image Slice */}
                               <div className="h-48 w-full bg-black relative overflow-hidden">
                                  {!imageLoading ? (
                                    <div 
                                      className="w-full h-full transition-transform duration-500 hover:scale-105" 
                                      style={getCarouselSlideStyle(sIdx, 4)}
                                    ></div>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                      <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
                                    </div>
                                  )}
                                  <div 
                                     className="absolute top-0 left-0 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-br-xl text-xs font-bold uppercase text-white flex items-center gap-2 border-b border-r border-slate-700"
                                     style={dynamicStyle ? { backgroundColor: dynamicStyle.borderColor, color: '#000000', borderColor: dynamicStyle.borderColor } : {}}
                                   >
                                      <LayoutTemplate className="w-3 h-3" /> Slide {slide.slideNumber}
                                   </div>
                               </div>

                               <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar bg-slate-800/20">
                                  <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Headline</label>
                                    <h4 className="text-md font-bold text-white leading-tight">{slide.headline}</h4>
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Body Copy</label>
                                    <p className="text-sm text-slate-300">{slide.body}</p>
                                  </div>
                                  <div className="pt-3 border-t border-slate-700/30">
                                     <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Idea Visual</label>
                                     <p className="text-xs text-slate-400 italic leading-relaxed">{slide.visualDescription}</p>
                                  </div>
                               </div>
                            </div>
                         ))}
                         {/* Final CTA Slide */}
                         <div className="min-w-[260px] w-[260px] snap-center bg-slate-800/30 p-5 rounded-xl border-2 border-dashed border-slate-700/50 flex flex-col items-center justify-center text-center shrink-0">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Caption / CTA Final</p>
                            <p className="text-gold-400 font-bold text-lg" style={dynamicStyle ? { color: dynamicStyle.textColor } : {}}>{activeScript.cta}</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD VIDEO/IMAGE AD VIEW (Vertical Scroll) */
                    <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Título / Headline</label>
                        <p className="text-lg md:text-xl font-bold text-white leading-tight">
                          {activeScript.title}
                        </p>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-lg border-l-2 border-gold-500"
                         style={dynamicStyle ? { borderLeftColor: dynamicStyle.textColor } : {}}
                      >
                        <label className="text-xs uppercase tracking-wider text-gold-400/80 font-bold mb-1 block"
                           style={dynamicStyle ? { color: dynamicStyle.textColor } : {}}
                        >Hook (3s)</label>
                        <p className="text-slate-200 font-medium">
                          {activeScript.hook}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Cuerpo del Mensaje</label>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                          {activeScript.body}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-700/50">
                        <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Call to Action (CTA)</label>
                        <p className="text-gold-400 font-bold text-lg mt-1"
                           style={dynamicStyle ? { color: dynamicStyle.textColor } : {}}
                        >
                          {activeScript.cta}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-500 italic">No script data available.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Refinement Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-700/50 mt-auto">
         <form onSubmit={handleRefineSubmit} className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-slate-500 ml-2 hidden sm:block" />
            <input 
              type="text" 
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              placeholder="Pide una corrección (ej: 'Añade un filtro retro' o 'Haz el texto más corto')..."
              className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 text-sm"
              disabled={isRefining}
            />
            <button 
              type="submit"
              disabled={!refineText.trim() || isRefining}
              className={`p-2.5 rounded-lg transition-all flex items-center justify-center
                ${!refineText.trim() || isRefining ? 'bg-slate-800 text-slate-500' : 'bg-gold-500 text-slate-900 hover:bg-gold-400'}
              `}
            >
              {isRefining ? (
                <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-900 rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
         </form>
      </div>
    </div>
  );
};

export default ResultCard;
