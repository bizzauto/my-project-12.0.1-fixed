import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Zap, Check, Brain } from 'lucide-react';
import { useUIMode } from '../contexts/UIModeContext';

const OrbsLayer: React.FC = () => {
  // Pause orbs while user is actively scrolling to keep mobile scroll snappy.
  const [paused, setPaused] = useState(false);
  const timer = useRef<any>(null);
  useEffect(() => {
    const onScroll = () => {
      setPaused(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPaused(false), 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchmove', onScroll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ animationPlayState: paused ? 'paused' : 'running' }}
    >
      <div className="ai-orb ai-orb-1" style={{ animationPlayState: paused ? 'paused' : 'running' }} />
      <div className="ai-orb ai-orb-2" style={{ animationPlayState: paused ? 'paused' : 'running' }} />
      <div className="ai-orb ai-orb-3" style={{ animationPlayState: paused ? 'paused' : 'running' }} />
    </div>
  );
};

const UIModeToggle: React.FC = () => {
  const { mode, setMode } = useUIMode();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (mode === 'ai') {
      const dismissed = sessionStorage.getItem('ai_banner_dismissed');
      if (!dismissed) setShowBanner(true);
    }
  }, [mode]);

  const dismissBanner = () => {
    setShowBanner(false);
    try { sessionStorage.setItem('ai_banner_dismissed', '1'); } catch {/* ignore */}
  };

  return (
    <>
      {/* Floating background orbs - only in AI mode.
          Paused while user is actively scrolling to keep mobile scroll buttery-smooth. */}
      {mode === 'ai' && (
        <OrbsLayer />
      )}

      {/* Welcome banner on first AI activation */}
      {showBanner && mode === 'ai' && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm ai-glass rounded-2xl p-4 ai-fade-in-up ai-glow-pulse">
          <button
            onClick={dismissBanner}
            className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={14} className="text-slate-400" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg ai-aurora flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <h3 className="font-bold text-white text-sm">AI Mode Activated!</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Experience the new AI-powered interface with animated insights, smart recommendations, and premium visuals.
          </p>
          <button
            onClick={() => { setMode('classic'); dismissBanner(); }}
            className="mt-3 w-full px-3 py-1.5 text-xs font-medium text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Switch back to Classic
          </button>
        </div>
      )}

      {/* Fixed toggle button - bottom right */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        {mode === 'classic' ? (
          <button
            onClick={() => setMode('ai')}
            className="group flex items-center gap-2 px-4 py-3 ai-aurora text-white font-semibold rounded-full shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all hover:scale-105"
            title="Try our AI-powered UI"
          >
            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline text-sm">Try AI UI</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500" />
            </span>
          </button>
        ) : (
          <button
            onClick={() => setMode('classic')}
            className="group flex items-center gap-2 px-4 py-3 ai-glass text-slate-200 font-semibold rounded-full hover:bg-white/10 transition-all"
            title="Switch to Classic UI"
          >
            <Brain size={18} className="group-hover:scale-110 transition-transform text-indigo-300" />
            <span className="hidden sm:inline text-sm">AI Mode</span>
            <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              <Check size={10} />
            </span>
          </button>
        )}
      </div>
    </>
  );
};

export default UIModeToggle;
