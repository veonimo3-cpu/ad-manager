import React, { useState, useEffect } from 'react';
import { Loader2, Lightbulb, Zap } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
}

const TIPS = [
  "El 80% del éxito de un anuncio es el Hook (los primeros 3 segundos).",
  "La gente no compra productos, compra mejores versiones de sí mismos.",
  "Los 'Ugly Ads' (anuncios con estética amateur) suelen tener mayor CTR que los producidos.",
  "Usa contrastes altos en los subtítulos para detener el scroll.",
  "El formato Carrusel aumenta el tiempo de retención en un 40%.",
  "Si tu anuncio parece un anuncio, la gente lo ignorará.",
  "Habla de beneficios emocionales, no solo de características técnicas.",
  "El sonido es clave en TikTok, pero los subtítulos son vitales en Instagram.",
  "Usa la curiosidad ('Lo que nadie te dice sobre...') para aumentar el click-through.",
  "Prueba al menos 3 ganchos diferentes para el mismo video."
];

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Cycle tips every 2.5 seconds
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 2500);

    // Fake progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 5;
      });
    }, 300);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-lg rounded-xl animate-fade-in">
      <div className="w-full max-w-lg px-8 text-center">
        
        {/* Icon Animation */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 bg-gold-500/20 rounded-full animate-ping"></div>
          <div className="relative bg-slate-900 border-2 border-gold-500 rounded-full w-full h-full flex items-center justify-center shadow-xl shadow-gold-500/20">
            <Zap className="w-8 h-8 text-gold-500 animate-pulse" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-2">Generando Campaña Viral</h3>
        <p className="text-slate-400 mb-8 text-sm">Analizando tendencias y redactando copy persuasivo...</p>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-gradient-to-r from-gold-400 to-yellow-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Tips Card */}
        <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Lightbulb className="w-12 h-12" />
          </div>
          <p className="text-gold-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
            <Lightbulb className="w-3 h-3" /> Pro Tip
          </p>
          <p className="text-slate-200 text-lg font-medium leading-relaxed transition-all duration-500 min-h-[80px] flex items-center justify-center">
            "{TIPS[currentTip]}"
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoadingOverlay;