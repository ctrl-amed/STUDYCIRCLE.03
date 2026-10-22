import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import './Loading.css';
console.log('NEW LOADER FILE LOADED');

const TIPS = [
  'Tip: short breaks help you focus longer.',
  'Tip: pick one small task to get started.',
  'Tip: studying with friends keeps you on track.',
  'Tip: a tidy desk makes it easier to begin.',
];

const STEPS_LOGIN = ['Checking your account', 'Loading your study room', 'Almost there'];
const STEPS_SIGNUP = ['Creating your profile', 'Decorating your study room', 'Almost there'];

const BLOCKS = 10;
const FOX_SRC = `${import.meta.env.BASE_URL}media/kitsu_fox.png`;

const randomTip = () => TIPS[Math.floor(Math.random() * TIPS.length)];

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [statusText, setStatusText] = useState('Loading...');
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(TIPS[0]);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepFade, setStepFade] = useState(false);

  const leaveTimerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const stepRef = useRef(0);

  // Signup-style flows ("Setting Up Profile...") get the signup wording; everything else is login.
  const isSignup = /setting up|creating/i.test(statusText);
  const steps = isSignup ? STEPS_SIGNUP : STEPS_LOGIN;
  const title = isSignup ? 'Setting up your account' : 'HELLO TEST';

  const showLoading = useCallback((status = 'Loading...') => {
    clearTimeout(leaveTimerRef.current);
    setStatusText(status);
    setProgress(0);
    setTip(randomTip());
    setStepIdx(0);
    stepRef.current = 0;
    setStepFade(false);
    setIsLeaving(false);
    setIsVisible(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLeaving(true);
    clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsLeaving(false);
    }, 520);
  }, []);

  const updateProgress = useCallback((percent) => {
    setProgress(Math.min(100, Math.max(0, percent)));
  }, []);

  // Status line changes with progress (fades out, swaps text, fades in)
  useEffect(() => {
    if (!isVisible) return;
    const next = progress < 35 ? 0 : progress < 75 ? 1 : 2;
    if (next === stepRef.current) return;
    stepRef.current = next;
    setStepFade(true);
    clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setStepIdx(next);
      setStepFade(false);
    }, 180);
  }, [progress, isVisible]);

  useEffect(() => () => {
    clearTimeout(leaveTimerRef.current);
    clearTimeout(stepTimerRef.current);
  }, []);

  // Simulated load helper (same signature as before; the 4th "admin" arg is accepted but unused)
  const startSimulatedLoad = (status, durationMs = 2000, callback = null) => {
    showLoading(status);
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
          if (typeof callback === 'function') callback();
          hideLoading();
        }, 200);
      } else {
        updateProgress(current);
      }
    }, stepTime);
  };

  const litBlocks = Math.round((progress / 100) * BLOCKS);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, updateProgress, startSimulatedLoad }}>
      {children}

      {/* OVERLAY DOM */}
      {isVisible && (
        <div
          className={`sc-ld${isLeaving ? ' out' : ''}`}
          role="status"
          aria-live="polite"
          aria-busy={!isLeaving}
        >
          <span
            className="sc-ld-fox"
            aria-hidden="true"
            style={{ backgroundImage: `url(${FOX_SRC})` }}
          />

          <h2 className="sc-ld-t">{title}</h2>

          <div className="sc-ld-b" aria-hidden="true">
            {Array.from({ length: BLOCKS }, (_, i) => (
              <b key={i} className={i < litBlocks ? 'on' : ''} />
            ))}
          </div>

          <p className="sc-ld-s" style={{ opacity: stepFade ? 0 : 1 }}>
            {steps[stepIdx]}
          </p>

          <p className="sc-ld-tip">{tip}</p>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);