import React, { useState } from 'react';

export default function CreateSession() {
  // --- MOCK ALGORITHM RECOMMENDATION DATA ---
  const mockRecommendedData = {
    techniqueName: 'Pomodoro (25m focus / 5m break)',
    number_session: 4,
    focus: 25,
    break: 5,
  };

  // --- STATE MANAGEMENT ---
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedWorkType, setSelectedWorkType] = useState('');
  const [draftTasks, setDraftTasks] = useState([]);
  const [selectedTechnique, setSelectedTechnique] = useState('recommended');
  const [customSessionCount, setCustomSessionCount] = useState('1');

  // Work Type Options
  const workOptions = [
    {
      id: 'reading',
      label: 'READING',
      desc: 'Focus consumption of texts and articles.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M21.5 5.134a1 1 0 0 1 .493.748L22 6v13a1 1 0 0 1-1.5.866A8 8 0 0 0 13 19.6V4.426a10 10 0 0 1 8.5.708M11 4.427l.001 15.174a8 8 0 0 0-7.234.117l-.327.18l-.103.044l-.049.016l-.11.026l-.061.01L3 20h-.042l-.11-.012l-.077-.014l-.108-.032l-.126-.056l-.095-.056l-.089-.067l-.06-.056l-.073-.082l-.064-.089l-.022-.036l-.032-.06l-.044-.103l-.016-.049l-.026-.11l-.01-.061l-.004-.049L2 6a1 1 0 0 1 .5-.866a10 10 0 0 1 8.5-.707" />
        </svg>
      ),
    },
    {
      id: 'writing',
      label: 'WRITING',
      desc: 'Drafting essays, reports, or creative work.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="-0.5 -0.5 24 24">
          <path d="M-0.5 -0.5h24v24H-0.5z" fill="none" />
          <path fill="currentColor" d="m21.289.98l.59.59c.813.814.69 2.257-.277 3.223L9.435 16.96l-3.942 1.442c-.495.182-.977-.054-1.075-.525a.93.93 0 0 1 .045-.51l1.47-3.976L18.066 1.257c.967-.966 2.41-1.09 3.223-.276zM8.904 2.19a1 1 0 1 1 0 2h-4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4a1 1 0 0 1 2 0v4a4 4 0 0 1-4 4h-12a4 4 0 0 1-4-4v-12a4 4 0 0 1 4-4z" />
        </svg>
      ),
    },
    {
      id: 'review',
      label: 'REVIEW',
      desc: 'Analyze notes, flashcards, or past materials.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M7 14h1.625q.2 0 .388-.075t.337-.225l4.7-4.7q.225-.225.338-.513t.112-.562t-.125-.537t-.325-.488l-.9-.95q-.225-.225-.5-.337t-.575-.113q-.275 0-.562.113T11 5.95l-4.7 4.7q-.15.15-.225.338T6 11.375V13q0 .425.288.713T7 14m6-6.075L12.075 7zM7.5 12.5v-.95l2.525-2.525l.5.45l.45.5L8.45 12.5zm3.025-3.025l.45.5l-.95-.95zm.65 4.525H17q.425 0 .713-.288T18 13t-.288-.712T17 12h-3.825zM6 18l-2.3 2.3q-.475.475-1.088.213T2 19.575V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-.85-2H20V4H4v13.125zM4 16V4z" />
        </svg>
      ),
    },
    {
      id: 'practice',
      label: 'PRACTICE',
      desc: 'Strengthen skills through exercises.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83l3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75z" />
        </svg>
      ),
    },
    {
      id: 'memorize',
      label: 'MEMORIZE',
      desc: 'Improve recall of key facts.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M21.33 12.91c.09 1.55-.62 3.04-1.89 3.95l.77 1.49c.23.45.26.98.06 1.45c-.19.47-.58.84-1.06 1l-.79.25a1.69 1.69 0 0 1-1.86-.55L14.44 18c-.89-.15-1.73-.53-2.44-1.1c-.5.15-1 .23-1.5.23c-.88 0-1.76-.27-2.5-.79c-.53.16-1.07.23-1.62.22c-.79.01-1.57-.15-2.3-.45a4.1 4.1 0 0 1-2.43-3.61c-.08-.72.04-1.45.35-2.11c-.29-.75-.32-1.57-.07-2.33C2.3 7.11 3 6.32 3.87 5.82c.58-1.69 2.21-2.82 4-2.7c1.6-1.5 4.05-1.66 5.83-.37c.42-.11.86-.17 1.3-.17c1.36-.03 2.65.57 3.5 1.64c2.04.53 3.5 2.35 3.58 4.47c.05 1.11-.25 2.2-.86 3.13c.07.36.11.72.11 1.09m-5-1.41c.57.07 1.02.5 1.02 1.07a1 1 0 0 1-1 1h-.63c-.32.9-.88 1.69-1.62 2.29c.25.09.51.14.77.21c5.13-.07 4.53-3.2 4.53-3.25a2.59 2.59 0 0 0-2.69-2.49a1 1 0 0 1-1-1a1 1 0 0 1 1-1c1.23.03 2.41.49 3.33 1.3c.05-.29.08-.59.08-.89c-.06-1.24-.62-2.32-2.87-2.53c-1.25-2.96-4.4-1.32-4.4-.4c-.03.23.21.72.25.75a1 1 0 0 1 1 1c0 .55-.45 1-1 1c-.53-.02-1.03-.22-1.43-.56c-.48.31-1.03.5-1.6.56c-.57.05-1.04-.35-1.07-.9a.97.97 0 0 1 .88-1.1c.16-.02.94-.14.94-.77c0-.66.25-1.29.68-1.79c-.92-.25-1.91.08-2.91 1.29C6.75 5 6 5.25 5.45 7.2C4.5 7.67 4 8 3.78 9c1.08-.22 2.19-.13 3.22.25c.5.19.78.75.59 1.29c-.19.52-.77.78-1.29.59c-.73-.32-1.55-.34-2.3-.06c-.32.27-.32.83-.32 1.27c0 .74.37 1.43 1 1.83c.53.27 1.12.41 1.71.4q-.225-.39-.39-.81a1.038 1.038 0 0 1 1.96-.68c.4 1.14 1.42 1.92 2.62 2.05c1.37-.07 2.59-.88 3.19-2.13c.23-1.38 1.34-1.5 2.56-1.5m2 7.47l-.62-1.3l-.71.16l1 1.25zm-4.65-8.61a1 1 0 0 0-.91-1.03c-.71-.04-1.4.2-1.93.67c-.57.58-.87 1.38-.84 2.19a1 1 0 0 0 1 1c.57 0 1-.45 1-1c0-.27.07-.54.23-.76c.12-.1.27-.15.43-.15c.55.03 1.02-.38 1.02-.92" />
        </svg>
      ),
    },
    {
      id: 'creation',
      label: 'CREATION',
      desc: 'Develop ideas through projects.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5A1.5 1.5 0 0 1 14.5 5A1.5 1.5 0 0 1 16 6.5A1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5A1.5 1.5 0 0 1 9.5 5A1.5 1.5 0 0 1 11 6.5A1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5A1.5 1.5 0 0 1 6.5 9A1.5 1.5 0 0 1 8 10.5A1.5 1.5 0 0 1 6.5 12M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1c-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8" />
        </svg>
      ),
    },
  ];

  // Specific Techniques
  const techniqueDetails = {
    recommended: {
      title: 'Recommended Strategy',
      focus: mockRecommendedData.focus,
      break: mockRecommendedData.break,
      sessions: mockRecommendedData.number_session,
    },
    pomodoro: { title: 'Pomodoro', focus: 1, break: 1 },
    '52-17': { title: '52-17 Method', focus: 52, break: 17 },
    '90m': { title: '90m Deep Work', focus: 90, break: 20 },
  };

  const handleClose = () => {
    window.parent.postMessage('CLOSE_CREATE_SESSION_MODAL', '*');
  };

  // --- DRAFT TASK HANDLERS ---
  const addDraftTaskRow = () => {
    setDraftTasks((prev) => [...prev, '']);
  };

  const updateDraftTaskRow = (index, value) => {
    setDraftTasks((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const deleteDraftTaskRow = (index) => {
    setDraftTasks((prev) => prev.filter((_, i) => i !== index));
  };

  // --- STEP NAVIGATION ---
  const handleStep1Continue = () => {
    if (!selectedWorkType) {
      alert('Please select a work type before continuing.');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Continue = () => {
    const validTasks = draftTasks.filter((t) => t.trim() !== '');
    if (validTasks.length === 0) {
      alert('Please add at least one task for this session.');
      return;
    }
    setCurrentStep(3);
  };

  // --- SAVE & CONFIRM ---
  const handleConfirmSession = () => {
    const validTasks = draftTasks.filter((t) => t.trim() !== '');
    const activeTech = techniqueDetails[selectedTechnique] || techniqueDetails.recommended;

    const focusTime = activeTech.focus;
    const breakTime = activeTech.break;
    const finalSessions =
      selectedTechnique === 'recommended' ? mockRecommendedData.number_session : customSessionCount || '1';

    const newSession = {
      workType: selectedWorkType || 'General Work',
      techniqueKey: selectedTechnique,
      techniqueName: activeTech.title,
      focusTime,
      breakTime,
      sessionCount: finalSessions,
      tasks: validTasks,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('activeSession', JSON.stringify(newSession));
    window.parent.postMessage('CLOSE_CREATE_SESSION_MODAL', '*');
  };

  const getReviewDetails = () => {
    const activeTech = techniqueDetails[selectedTechnique] || techniqueDetails.recommended;
    return {
      title: activeTech.title,
      focus: activeTech.focus,
      break: activeTech.break,
      sessions: selectedTechnique === 'recommended' ? mockRecommendedData.number_session : customSessionCount || '1',
    };
  };

  return (
    <div className="min-h-screen bg-[#FAE9CE] text-[#3D2013] flex flex-col relative overflow-x-hidden">
      {/* HEADER WITH CLOSE BUTTON */}
      <header className="relative z-20 pt-3 sm:pt-6 px-4 sm:px-6 w-full max-w-7xl mx-auto flex items-center justify-end shrink-0">
        <button
          type="button"
          onClick={handleClose}
          title="Close and Go Back"
          className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FEF4E0] border-[2px] md:border-[3px] border-[#3D2013] text-[#3D2013] hover:bg-[#E87339] hover:text-[#FFFFF6] transition-all duration-150 retro-shadow cursor-pointer flex items-center justify-center shrink-0 rounded-full"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      {/* BACKGROUND DECORATIONS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
        <img src="media/leaves_design.png" alt="" className="absolute top-[3%] left-[12%] w-6 h-6 rotate-[-15deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute top-[4%] right-[15%] w-6 h-6 rotate-[45deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute top-[22%] left-[3%] w-5 h-5 rotate-[30deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute top-[58%] left-[8%] w-5 h-5 rotate-[-30deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute top-[25%] right-[4%] w-6 h-6 rotate-[15deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute top-[60%] right-[7%] w-5 h-5 rotate-[60deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute bottom-[12%] left-[42%] w-5 h-5 rotate-[10deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute bottom-[4%] left-[48%] w-6 h-6 rotate-[-45deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute bottom-[8%] right-[32%] w-5 h-5 rotate-[25deg]" />
        <img src="media/leaves_design.png" alt="" className="absolute bottom-[2%] left-[6%] w-6 h-6 rotate-[75deg]" />
      </div>

      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.06) 1px, transparent 1px)', backgroundSize: '100% 5px' }}
      />

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 flex flex-col justify-center items-center">
        <div className="w-full flex flex-col justify-between">

          {/* ==================== FORM STEP 1: WORK TYPE ==================== */}
          {currentStep === 1 && (
            <section className="flex flex-col justify-between h-full flex-1">
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-10">
                  <h1 className="font-pressstart text-xl sm:text-3xl md:text-4xl inline-block bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent leading-relaxed">
                    WHAT ARE YOU WORKING ON?
                  </h1>
                  <p className="font-pressstart text-[9px] sm:text-xs text-[#3D2013]/80 mt-2">
                    Choose the type of work you want to focus on.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 pt-2">
                  {workOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedWorkType(opt.id)}
                      className={`bg-[#FEF4E0] rounded-[12px] border-[1px] border-[#3D2013] p-3 sm:p-6 min-h-[120px] sm:min-h-[180px] text-left flex flex-col transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] ${
                        selectedWorkType === opt.id
                          ? 'bg-gradient-to-b from-[#FDE4D0] to-[#FFD2AE]'
                          : ''
                      }`}
                    >
                      <span className="text-xl sm:text-3xl mb-2 sm:mb-4 block text-[#E16F37]">
                        {opt.icon}
                      </span>
                      <div className="space-y-1 sm:space-y-2">
                        <span className="font-pressstart text-[11px] sm:text-[20px] md:text-[24px] block text-[#511B00] leading-none">
                          {opt.label}
                        </span>
                        <span className="font-pixel text-[13px] sm:text-[16px] md:text-[20px] text-[#3D2013]/70 leading-tight block">
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="font-pressstart text-[10px] bg-[#FEF4E0] border-[2px] border-[#3D2013] px-5 py-3 w-1/2 sm:w-44 text-center cursor-pointer hover:bg-[#FEF4E0] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  BACK
                </button>
                <button
                  type="button"
                  onClick={handleStep1Continue}
                  className="font-pressstart text-[10px] bg-[#E87339] text-white border-[2px] border-[#3D2013] px-5 py-3 w-1/2 sm:w-44 text-center cursor-pointer hover:opacity-90 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  CONTINUE
                </button>
              </div>
            </section>
          )}

          {/* ==================== FORM STEP 2: TASK LIST ==================== */}
          {currentStep === 2 && (
            <section className="flex flex-col justify-between h-full flex-1">
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-10">
                  <h2 className="font-pressstart text-xl sm:text-3xl md:text-4xl inline-block bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent leading-relaxed">
                    WHAT’S YOUR TASK?
                  </h2>
                  <p className="font-pressstart text-[9px] sm:text-xs text-[#3D2013]/80 mt-2">
                    Tell us what you want to accomplish during this session.
                  </p>
                </div>

                <div className="bg-[#FEF4E0] rounded-[12px] border-[1px] border-[#3D2013] p-4 sm:p-6 flex flex-col h-[280px] sm:h-[320px] max-w-xl mx-auto w-full">
                  <div className="flex items-center gap-2 mb-3 shrink-0">
                    <span className="text-lg sm:text-xl block text-[#E16F37]">✏️</span>
                    <label className="font-pressstart text-[11px] sm:text-[13px] text-[#511B00] block">
                      YOUR TASK
                    </label>
                  </div>

                  <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-1 min-h-0">
                    {draftTasks.length === 0 ? (
                      <p className="font-pressstart text-[8px] sm:text-[9px] text-[#3D2013]/60 italic py-2">
                        No tasks added yet. Click "+ Add Task" below to start!
                      </p>
                    ) : (
                      draftTasks.map((taskText, index) => (
                        <div key={index} className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={taskText}
                            onChange={(e) => updateDraftTaskRow(index, e.target.value)}
                            placeholder="Enter task item..."
                            className="flex-1 bg-[#FEF4E0] text-[#3D2013] border-[2px] border-[#3D2013] p-2 font-pressstart text-[8px] sm:text-[9px] focus:outline-none focus:bg-[#FFFFFF] placeholder-[#3D2013]/40 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => deleteDraftTaskRow(index)}
                            title="Delete Task"
                            className="w-6 h-6 bg-[#A53914] border-[2px] border-[#482A1D] flex items-center justify-center text-[#FEF4E0] font-pressstart text-[10px] hover:brightness-110 active:scale-90 cursor-pointer shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addDraftTaskRow}
                    className="self-start w-auto bg-[#97B591] text-[#3D2013] border-[2px] border-[#3D2013] px-4 py-2 font-pressstart text-[9px] sm:text-[10px] cursor-pointer transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] flex items-center justify-center gap-1.5 mt-3 shrink-0"
                  >
                    + Add Task
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="font-pressstart text-[10px] bg-[#FEF4E0] border-[2px] border-[#3D2013] px-5 py-3 w-1/2 sm:w-44 text-center cursor-pointer hover:bg-[#FEF4E0] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  BACK
                </button>
                <button
                  type="button"
                  onClick={handleStep2Continue}
                  className="font-pressstart text-[10px] bg-[#E87339] text-white border-[2px] border-[#3D2013] px-5 py-3 w-1/2 sm:w-44 text-center cursor-pointer hover:opacity-90 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  CONTINUE
                </button>
              </div>
            </section>
          )}

          {/* ==================== FORM STEP 3: TECHNIQUE ==================== */}
          {currentStep === 3 && (
            <section className="flex flex-col justify-between h-full flex-1">
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-10">
                  <h2 className="font-pressstart text-xl sm:text-3xl md:text-4xl inline-block bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent leading-relaxed">
                    RECOMMENDED FOR YOU
                  </h2>
                  <p className="font-pressstart text-[9px] sm:text-xs text-[#3D2013]/80 mt-2">
                    Today’s study plan strategy.
                  </p>
                </div>

                <div className="flex flex-col gap-3.5 pt-1 max-w-2xl mx-auto w-full">
                  {/* RECOMMENDED TECHNIQUE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setSelectedTechnique('recommended')}
                    className={`bg-[#FEF4E0] rounded-[12px] border-[1px] border-[#3D2013] p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-3 transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] ${
                      selectedTechnique === 'recommended'
                        ? 'ring-2 ring-[#E87339] bg-gradient-to-b from-[#FDE4D0] to-[#FFD2AE]'
                        : ''
                    }`}
                  >
                    <div className="font-pressstart text-[30px] sm:text-[40px] leading-snug tracking-wide bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent">
                      STUDY TECHNIQUE
                    </div>
                    <div className="w-full h-[1px] bg-[#3D2013]/20" />
                    <div className="w-full grid grid-cols-3 items-center justify-center divide-x divide-[#3D2013]/20">
                      <div className="flex items-center justify-center gap-3 px-1">
                        <span className="text-[#E87339] text-2xl">⏱</span>
                        <div className="flex flex-col text-left">
                          <span className="font-pressstart text-[15px] sm:text-[20px] leading-none text-[#511B00]">
                            {mockRecommendedData.focus}m
                          </span>
                          <span className="font-pixel text-[15px] sm:text-[20px] text-[#511B00]/70 mt-1">
                            FOCUS TIME
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3 px-1">
                        <span className="text-[#E87339] text-2xl">☕</span>
                        <div className="flex flex-col text-left">
                          <span className="font-pressstart text-[15px] sm:text-[20px] leading-none text-[#511B00]">
                            {mockRecommendedData.break}m
                          </span>
                          <span className="font-pixel text-[15px] sm:text-[20px] text-[#511B00]/70 mt-1">
                            BREAK TIME
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3 px-1">
                        <span className="text-[#E87339] text-2xl">🎯</span>
                        <div className="flex flex-col text-left">
                          <span className="font-pressstart text-[15px] sm:text-[20px] leading-none text-[#511B00]">
                            {mockRecommendedData.number_session}
                          </span>
                          <span className="font-pixel text-[15px] sm:text-[20px] text-[#511B00]/70 mt-1">
                            SESSIONS
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="pt-2">
                    <h3 className="font-pressstart text-[10px] sm:text-[11px] text-[#3D2013] text-left">
                      OTHER OPTIONS
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {[
                      { key: 'pomodoro', title: 'pomodoro (25/5)', sub: 'Standard Interval' },
                      { key: '52-17', title: '52-17', sub: 'Long Focus Period' },
                      { key: '90m', title: '90-minute study', sub: 'Deep Immersion' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedTechnique(item.key)}
                        className={`bg-[#FEF4E0] rounded-[12px] border-[1px] border-[#3D2013] p-4 text-left flex flex-col justify-between transition-all duration-150 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] ${
                          selectedTechnique === item.key
                            ? 'bg-gradient-to-b from-[#FDE4D0] to-[#FFD2AE]'
                            : ''
                        }`}
                      >
                        <div className="font-pressstart text-[10px] sm:text-[11px] text-[#511B00] leading-snug uppercase">
                          {item.title}
                        </div>
                        <div className="text-[15px] sm:text-[20px] font-pixel text-[#3D2013]/70 mt-2">
                          {item.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTechnique !== 'recommended' && (
                  <div className="pt-2 max-w-2xl mx-auto w-full">
                    <label className="block font-pressstart text-[9px] sm:text-[10px] text-[#3D2013] mb-1.5">
                      Enter number of sessions:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customSessionCount}
                      onChange={(e) => setCustomSessionCount(e.target.value)}
                      className="w-full sm:w-1/2 bg-[#FEF4E0] rounded-[8px] border-[1px] border-[#3D2013] px-3.5 py-2 font-pressstart text-[9px] sm:text-[10px] text-[#3D2013] outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="font-pressstart text-[8px] sm:text-[10px] bg-[#FEF4E0] text-[#511B00] border-[2px] border-[#3D2013] px-5 py-3 w-fit text-center cursor-pointer hover:bg-[#FEF4E0] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  BACK
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="font-pressstart text-[7px] sm:text-[10px] bg-[#E87339] text-white border-[2px] border-[#3D2013] px-4 sm:px-6 py-3 w-fit text-center cursor-pointer hover:opacity-90 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  {selectedTechnique === 'recommended' ? 'USE RECOMMENDATION' : 'CONTINUE WITH THIS TECHNIQUE'}
                </button>
              </div>
            </section>
          )}

          {/* ==================== FORM STEP 4: REVIEW & CONFIRM ==================== */}
          {currentStep === 4 && (
            <section className="flex flex-col justify-between h-full flex-1">
              <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto w-full">
                <div className="text-center mb-6 sm:mb-10">
                  <h1 className="font-pressstart text-xl sm:text-3xl md:text-4xl inline-block bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent leading-relaxed">
                    REVIEW YOUR SESSION
                  </h1>
                  <p className="font-pressstart text-[9px] sm:text-xs text-[#3D2013]/80 mt-2">
                    Double-check your study session details before starting.
                  </p>
                </div>

                <div className="bg-[#FEF4E0] rounded-[12px] border-[1px] border-[#3D2013] p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
                  {/* WORK TYPE REVIEW */}
                  <div className="border-b border-[#3D2013]/20 pb-3 text-center">
                    <span className="block font-pressstart uppercase text-[8px] sm:text-[10px] text-[#3D2013]/60 mb-1">
                      Focus Type
                    </span>
                    <span className="font-pixel text-[40px] sm:text-[50px] font-bold text-[#E87339] uppercase">
                      {selectedWorkType || 'GENERAL'}
                    </span>
                  </div>

                  {/* TECHNIQUE BREAKDOWN CARD */}
                  {(() => {
                    const review = getReviewDetails();
                    return (
                      <div className="bg-[#FEF4E0] rounded-[12px] border-[1px] border-[#3D2013] p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-3">
                        <div className="font-pressstart text-[18px] sm:text-[24px] leading-snug tracking-wide bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent uppercase">
                          {review.title}
                        </div>
                        <div className="w-full h-[1px] bg-[#3D2013]/20" />
                        <div className="w-full grid grid-cols-3 items-center justify-center divide-x divide-[#3D2013]/20">
                          <div className="flex items-center justify-center gap-2 sm:gap-3 px-1">
                            <span className="text-[#E87339] text-xl">⏱</span>
                            <div className="flex flex-col text-left">
                              <span className="font-pressstart text-[13px] sm:text-[18px] leading-none text-[#511B00]">
                                {review.focus}m
                              </span>
                              <span className="font-pixel text-[12px] sm:text-[16px] text-[#511B00]/70 mt-1">
                                FOCUS TIME
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 sm:gap-3 px-1">
                            <span className="text-[#E87339] text-xl">☕</span>
                            <div className="flex flex-col text-left">
                              <span className="font-pressstart text-[13px] sm:text-[18px] leading-none text-[#511B00]">
                                {review.break}m
                              </span>
                              <span className="font-pixel text-[12px] sm:text-[16px] text-[#511B00]/70 mt-1">
                                BREAK TIME
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 sm:gap-3 px-1">
                            <span className="text-[#E87339] text-xl">🎯</span>
                            <div className="flex flex-col text-left">
                              <span className="font-pressstart text-[13px] sm:text-[18px] leading-none text-[#511B00]">
                                {review.sessions}
                              </span>
                              <span className="font-pixel text-[12px] sm:text-[16px] text-[#511B00]/70 mt-1">
                                SESSIONS
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* CHECKLIST ITEMS */}
                  <div>
                    <span className="block font-pressstart uppercase text-[8px] sm:text-[10px] text-[#3D2013]/60 mb-2">
                      Checklist Items
                    </span>
                    <ul className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 font-pixel text-[13px] sm:text-[16px] text-[#511B00]">
                      {draftTasks
                        .filter((t) => t.trim() !== '')
                        .map((task, idx) => (
                          <li
                            key={idx}
                            className="bg-[#FEF4E0] border border-[#3D2013] px-2.5 py-1.5 font-bold text-[#3D2013] flex items-center gap-2"
                          >
                            <span className="w-2 h-2 bg-[#E87339] border border-[#3D2013] shrink-0" />
                            <span>{task}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 mt-6 max-w-2xl mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="font-pressstart text-[8px] sm:text-[10px] bg-[#FEF4E0] text-[#511B00] border-[2px] border-[#3D2013] px-5 py-3 w-1/2 sm:w-44 text-center cursor-pointer hover:bg-[#FEF4E0] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  BACK
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSession}
                  className="font-pressstart text-[7px] sm:text-[10px] bg-[#E87339] text-white border-[2px] border-[#3D2013] px-4 sm:px-6 py-3 w-1/2 sm:w-44 text-center cursor-pointer hover:opacity-90 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#3D2013] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#3D2013] transition-all"
                >
                  CREATE SESSION
                </button>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}