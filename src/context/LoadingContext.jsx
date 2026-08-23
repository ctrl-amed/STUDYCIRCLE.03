import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const RETRO_QUOTES = [
  "Success comes from consistent, small efforts...",
  "Press onward, one pomodoro at a time!",
  "Great achievements require time and patience.",
  "Focus is a muscle. Train it every day.",
  "Your future self will thank you for today's focus.",
  "Small daily steps lead to huge long-term results.",
  "Rest when you're done, not when you're tired.",
  "Distraction is the enemy of deep work.",
  "Clear minds yield the sharpest focus.",
  "Consistency beats intensity every single time."
];

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [statusText, setStatusText] = useState('Loading...');
  const [progress, setProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(RETRO_QUOTES[0]);
  const [quoteFade, setQuoteFade] = useState(false);

  const quoteIntervalRef = useRef(null);

  const getRandomQuote = (excludeQuote = '') => {
    const filtered = RETRO_QUOTES.filter((q) => q !== excludeQuote);
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
  };

  // Quote rotation effect
  useEffect(() => {
    if (isVisible) {
      setCurrentQuote(getRandomQuote());
      quoteIntervalRef.current = setInterval(() => {
        setQuoteFade(true);
        setTimeout(() => {
          setCurrentQuote((prev) => getRandomQuote(prev));
          setQuoteFade(false);
        }, 300);
      }, 5000);
    } else {
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
    }

    return () => {
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
    };
  }, [isVisible]);

  const showLoading = (status = 'Loading...', admin = false) => {
    setStatusText(status);
    setIsAdmin(admin);
    setProgress(0);
    setIsVisible(true);
  };

  const hideLoading = () => {
    setIsVisible(false);
  };

  const updateProgress = (percent) => {
    setProgress(Math.min(100, Math.max(0, percent)));
  };

  // Simulated load helper
  const startSimulatedLoad = (status, durationMs = 2000, callback = null, admin = false) => {
    showLoading(status, admin);
    let current = 0;
    const stepTime = 50;
    const increment = 100 / (durationMs / stepTime);

    const timer = setInterval(() => {
      current += increment + Math.random() * 2;
      if (current >= 100) {
        current = 100;
        updateProgress(100);
        clearInterval(timer);

        setTimeout(() => {
          if (typeof callback === 'function') {
            callback();
          }
          hideLoading();
        }, 200);
      } else {
        updateProgress(current);
      }
    }, stepTime);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, updateProgress, startSimulatedLoad }}>
      {children}

      {/* OVERLAY DOM */}
      {isVisible && (
        <div
          className={`fixed inset-0 flex flex-col items-center justify-center z-50 select-none transition-colors duration-300 ${
            isAdmin ? 'bg-[#3D2013]' : 'bg-[#FBF2E3]'
          }`}
        >
          {/* Line texture layer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: isAdmin
                ? 'linear-gradient(rgba(251, 242, 227, 0.15) 1px, transparent 1px)'
                : 'linear-gradient(rgba(61, 32, 19, 0.08) 1px, transparent 1px)',
              backgroundSize: '100% 5px',
            }}
          />

          {/* Centered Cozy Ambient Glow */}
          <div
            className="absolute w-[50%] h-[50%] sm:w-[25%] sm:h-[50%] max-w-xl rounded-full pointer-events-none opacity-75 filter blur-3xl z-0"
            style={{
              background: 'radial-gradient(circle, rgba(253, 146, 62, 0.5) 0%, rgba(253, 146, 62, 0) 100%)',
            }}
          />

          {/* Content Container */}
          <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
            {/* Pixel Mascot */}
            <img
              src="media/kitsu_logo.png"
              alt="StudyCircle Logo"
              className="w-24 h-24 mb-4 object-contain animate-bounce"
              style={{ animationDuration: '2s' }}
            />

            {/* Title */}
            <h1
              className={`font-pixel text-4xl tracking-wide mb-2 drop-shadow-[2px_2px_0px_rgba(232,115,57,0.4)] ${
                isAdmin ? 'text-[#FBF2E3]' : 'text-[#3D2013]'
              }`}
            >
              StudyCircle
            </h1>

            {/* Dynamic Status Subtitle */}
            <p
              className={`font-pixel text-xs tracking-widest uppercase mb-8 ${
                isAdmin ? 'text-[#FD923E]' : 'text-[#E87339]'
              }`}
            >
              ◆ {statusText} ◆
            </p>

            {/* Retro Progress Container */}
            <div
              className={`w-full max-w-xs border-4 p-1 ${
                isAdmin
                  ? 'border-[#FBF2E3] bg-[#2A160D] shadow-[4px_4px_0px_#FD923E]'
                  : 'border-[#3D2013] bg-[#F8E9D2] shadow-[4px_4px_0px_#3D2013]'
              }`}
            >
              <div
                className="h-5 bg-[#E87339] transition-all duration-200 ease-out"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>

            {/* Retro Bar Footnotes */}
            <div
              className={`w-full max-w-xs flex justify-between font-pixel text-lg mt-1 px-1 ${
                isAdmin ? 'text-[#FBF2E3]' : 'text-[#3D2013]'
              }`}
            >
              <span>LOADING</span>
              <span>{Math.round(progress)}%</span>
            </div>

            {/* Dynamic Motivational Quote Footer */}
            <p
              className={`font-pixel text-xl italic tracking-wide mt-12 opacity-90 max-w-xs leading-snug transition-opacity duration-300 ${
                quoteFade ? 'opacity-0' : 'opacity-100'
              } ${isAdmin ? 'text-[#FBF2E3]' : 'text-[#3D2013]'}`}
            >
              "{currentQuote}"
            </p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);