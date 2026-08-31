import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KitsuAI() {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  // Uploaded sources state
  const [uploadedFiles, setUploadedFiles] = useState([
    { id: '1', name: 'Cell_Biology_Ch3.pdf', size: '2.4 MB', addedBy: 'Player 1' },
    { id: '2', name: 'Organic_Chemistry_Summary.pdf', size: '1.1 MB', addedBy: 'You' },
  ]);

  // Tools & Navigation state
  const [currentActiveTool, setCurrentActiveTool] = useState(''); // 'Pre-quiz', 'Post-quiz', 'Flashcards', 'Notes'
  const [activeStep, setActiveStep] = useState('menu'); // 'menu', 'step1', 'step2'
  const [generatedItems, setGeneratedItems] = useState([]);
  const [currentGeneratedItem, setCurrentGeneratedItem] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState(['1', '2']);

  // Modals state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Flashcards Interactive State
  const [flashcardState, setFlashcardState] = useState({
    topic: 'Cellular Respiration',
    sourcesCount: 2,
    cards: [
      { id: 1, term: 'ATP (Adenosine Triphosphate)', definition: 'High-energy molecule that stores and supplies the cell with needed energy.' },
      { id: 2, term: 'Glycolysis', definition: 'Anaerobic process occurring in cytoplasm that breaks down glucose into pyruvate.' },
      { id: 3, term: 'Mitochondria', definition: 'Double-membrane organelle responsible for generating most cellular ATP via oxidative phosphorylation.' },
      { id: 4, term: 'Krebs Cycle', definition: 'A series of chemical reactions in the mitochondrial matrix used by aerobic organisms to generate energy.' },
    ],
    currentIndex: 0,
    isFlipped: false,
    isListView: false,
  });

  // Quiz Interactive State
  const [quizState, setQuizState] = useState({
    activeQuiz: null,
    currentQuestionIndex: 0,
    userAnswers: {},
    isCompleted: false,
    isReviewing: false,
  });

  // Notes State
  const [notesState] = useState({
    topic: 'Cellular Respiration & Metabolism',
    sourcesCount: 2,
    notesContent: [
      {
        heading: 'Overview & Purpose',
        body: 'Cellular respiration is a set of metabolic reactions taking place in cells to convert biochemical energy from nutrients into ATP.',
      },
      {
        heading: 'Primary Stages',
        bullets: [
          'Glycolysis: Converts glucose into pyruvate in the cytoplasm.',
          'Krebs Cycle: Operates inside mitochondrial matrix.',
          'Electron Transport Chain: Drives ATP synthesis.',
        ],
      },
    ],
  });

  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle closing either inside iframe overlay or via standalone route navigation
  const handleClose = () => {
    if (window.parent !== window) {
      window.parent.postMessage('CLOSE_KITSU_MODAL', '*');
    } else {
      navigate('/dashboard');
    }
  };

  // --- CHAT LOGIC ---
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    if (showWelcome) setShowWelcome(false);

    const userMsg = { id: Date.now(), text: inputMessage, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Trigger AI response
    setTimeout(() => {
      const responses = [
        "Great point! Let's keep pushing forward.",
        "I'm right here with you! What topic should we study next?",
        "Awesome focus! Don't forget to take quick stretch breaks.",
        "That sounds clear! Need me to generate a quiz on this?",
      ];
      const replyText = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: replyText, sender: 'kitsu' }]);
    }, 600);
  };

  // --- FILE UPLOAD SIMULATION ---
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress({ filename: file.name, percent: 0 });
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress({ filename: file.name, percent: progress });
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploadedFiles((prev) => [
            ...prev,
            { id: Date.now().toString(), name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, addedBy: 'You' },
          ]);
          setUploadProgress(null);
          setShowPdfModal(false);
        }, 300);
      }
    }, 150);
  };

  // --- TOOL FORM HANDLERS ---
  const openToolForm = (toolName) => {
    setCurrentActiveTool(toolName);
    setActiveStep('step1');
  };

  const handleStep1Next = () => {
    if (uploadedFiles.length > 0 && selectedFileIds.length === 0) {
      alert('Please select at least one source file to continue.');
      return;
    }

    let newItem = {
      id: Date.now().toString(),
      title: `${currentActiveTool} - ${new Date().toLocaleDateString()}`,
      type: currentActiveTool,
      badgeColor:
        currentActiveTool === 'Pre-quiz'
          ? 'bg-theme-safe'
          : currentActiveTool === 'Post-quiz'
          ? 'bg-[#708EA4]'
          : currentActiveTool === 'Flashcards'
          ? 'bg-theme-danger'
          : 'bg-[#E34B00]',
    };

    if (currentActiveTool === 'Pre-quiz' || currentActiveTool === 'Post-quiz') {
      const mockQuiz = {
        topic: 'Cell Biology',
        type: currentActiveTool,
        sourcesCount: selectedFileIds.length,
        totalQuestions: 2,
        questions: [
          { id: 1, question: 'What is the primary powerhouse of the cell?', options: ['Ribosome', 'Mitochondria', 'Nucleus'], correctAnswer: 1 },
          { id: 2, question: 'Which organelle synthesizes proteins?', options: ['Ribosome', 'Lysosome', 'Vacuole'], correctAnswer: 0 },
        ],
      };
      setQuizState({ activeQuiz: mockQuiz, currentQuestionIndex: 0, userAnswers: {}, isCompleted: false, isReviewing: false });
    }

    setCurrentGeneratedItem(newItem);
    setActiveStep('step2');
  };

  const saveAndExitTool = () => {
    if (currentGeneratedItem) {
      setGeneratedItems((prev) => [currentGeneratedItem, ...prev]);
    }
    setActiveStep('menu');
    setCurrentActiveTool('');
    setShowBackModal(false);
  };

  return (
    <div className="bg-theme-muted h-dvh w-screen overflow-hidden relative text-theme-dark flex flex-col justify-between select-none p-3 sm:p-4 gap-3">
      {/* HEADER */}
      <header className="relative z-20 w-full flex items-center justify-between shrink-0 gap-1.5 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
          <div className="relative w-8 h-8 sm:w-12 sm:h-12 rounded-full border-[3px] sm:border-[5px] border-theme-safe bg-theme-surface shadow-md flex items-center justify-center shrink-0 overflow-hidden">
            <span className="font-pixel text-xs sm:text-base">YOU</span>
          </div>

          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[8px] sm:rounded-[12px] px-2 sm:px-4 py-1 sm:py-2 shadow-md flex items-center justify-center shrink min-w-0">
            <h1 className="font-pressstart text-[10px] sm:text-[16px] text-theme-dark tracking-tight">
              Study Circle AI
            </h1>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-surface border-[2px] md:border-[3px] border-theme-dark text-theme-dark hover:bg-theme-primary hover:text-theme-white rounded-full transition-all retro-shadow cursor-pointer flex items-center justify-center shrink-0"
        >
          ✕
        </button>
      </header>

      {/* BODY CONTENT */}
      <main className="relative z-10 w-full flex-1 flex flex-col md:flex-row gap-3 overflow-hidden">
        {/* CHAT COLUMN */}
        <section className="flex-1 w-full md:w-[60%] bg-gradient-to-b from-[#FFF2DD] to-[#FFEAC8] rounded-[12px] border-2 border-theme-dark flex flex-col shadow-md overflow-hidden min-w-0">
          <div className="flex items-center justify-between min-h-[44px] px-3 pt-3 pb-2 shrink-0 border-b border-theme-dark">
            <h2 className="font-bold text-sm sm:text-base">Kitsu AI</h2>
          </div>

          <div className="flex-1 flex flex-col px-3 pb-2 overflow-y-auto relative">
            {showWelcome ? (
              <div className="my-auto flex flex-col items-center justify-center text-center px-4 py-6 gap-3 max-w-xl mx-auto">
                <div className="text-5xl mb-2">🦊</div>
                <h3 className="font-pressstart text-lg sm:text-2xl text-theme-dark">
                  Study with <span className="text-theme-primary">Kitsu</span>
                </h3>
                <p className="font-pixel text-sm sm:text-base text-theme-dark/80">
                  Ask questions, summarize documents, or generate quizzes directly from your sources.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] font-pixel text-sm sm:text-base p-3 border-2 border-theme-dark ${
                      msg.sender === 'user'
                        ? 'self-end bg-[#FCB980] text-theme-dark'
                        : 'self-start bg-theme-surface text-theme-dark'
                    }`}
                  >
                    <span className="font-pressstart text-[9px] block mb-1 text-theme-primary">
                      {msg.sender === 'user' ? 'You:' : 'Kitsu AI:'}
                    </span>
                    {msg.text}
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          <div className="p-3 shrink-0">
            <div className="w-full bg-theme-surface border-2 border-theme-dark rounded-[12px] p-2 flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your study message..."
                className="flex-1 bg-transparent border-none outline-none font-pixel text-sm text-theme-dark"
              />
              <button
                onClick={handleSendMessage}
                className="w-8 h-8 rounded-full bg-theme-primary text-white border border-theme-dark flex items-center justify-center shrink-0 cursor-pointer"
              >
                ➔
              </button>
            </div>
          </div>
        </section>

        {/* TOOLS COLUMN */}
        <section className="w-full md:w-[40%] bg-theme-surface border-2 border-theme-dark rounded-[12px] flex flex-col shadow-md overflow-hidden shrink-0 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-theme-dark mb-3">
            <h2 className="font-bold text-sm sm:text-base">
              {activeStep === 'menu' ? 'Tools' : currentActiveTool}
            </h2>
            {activeStep !== 'menu' && (
              <button
                onClick={() => setShowBackModal(true)}
                className="font-pixel text-xs text-theme-primary hover:underline cursor-pointer"
              >
                Back to Tools
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {/* MAIN TOOLS MENU */}
            {activeStep === 'menu' && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => openToolForm('Pre-quiz')}
                    className="bg-gradient-to-b from-[#788D55]/20 to-[#788D55]/60 border border-theme-dark rounded-xl p-3 text-left font-pressstart text-xs text-theme-dark cursor-pointer hover:opacity-90"
                  >
                    Pre-quiz
                  </button>
                  <button
                    onClick={() => openToolForm('Post-quiz')}
                    className="bg-gradient-to-b from-[#708EA4]/20 to-[#708EA4]/60 border border-theme-dark rounded-xl p-3 text-left font-pressstart text-xs text-theme-dark cursor-pointer hover:opacity-90"
                  >
                    Post-quiz
                  </button>
                  <button
                    onClick={() => openToolForm('Flashcards')}
                    className="bg-gradient-to-b from-[#A53914]/20 to-[#A53914]/60 border border-theme-dark rounded-xl p-3 text-left font-pressstart text-xs text-theme-dark cursor-pointer hover:opacity-90"
                  >
                    Flashcards
                  </button>
                  <button
                    onClick={() => openToolForm('Notes')}
                    className="bg-gradient-to-b from-[#E34B00]/20 to-[#E34B00]/60 border border-theme-dark rounded-xl p-3 text-left font-pressstart text-xs text-theme-dark cursor-pointer hover:opacity-90"
                  >
                    Notes
                  </button>
                </div>

                {/* SAVED ITEMS */}
                {generatedItems.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="font-pressstart text-[9px] text-theme-dark/70">SAVED TOOLS</span>
                    {generatedItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-[#FFF8EC] border border-theme-dark rounded-xl flex items-center justify-between"
                      >
                        <span className="font-pressstart text-[9px] text-theme-dark truncate">{item.title}</span>
                        <span className={`text-white font-pressstart text-[7px] px-2 py-0.5 rounded ${item.badgeColor}`}>
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ADD SOURCES BUTTON & LIST */}
                <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-theme-dark/20">
                  <button
                    onClick={() => setShowPdfModal(true)}
                    className="w-full font-pressstart text-[10px] bg-theme-surface border-2 border-theme-dark py-2.5 rounded-lg retro-shadow cursor-pointer hover:bg-theme-muted"
                  >
                    + Add Sources
                  </button>

                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-[#FFF8EC] border border-theme-dark/20 rounded-lg">
                        <span className="font-pressstart text-[8px] text-theme-dark truncate">{file.name}</span>
                        <span className="font-pixel text-[10px] text-theme-dark/60">{file.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* STEP 1: SOURCE SELECT */}
            {activeStep === 'step1' && (
              <div className="flex flex-col gap-3">
                <span className="font-pressstart text-[10px] text-theme-dark">Select Source Files:</span>
                <div className="flex flex-col gap-2">
                  {uploadedFiles.map((file) => (
                    <label key={file.id} className="flex items-center gap-2 p-2 bg-[#FFF8EC] border border-theme-dark/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFileIds.includes(file.id)}
                        onChange={() => {
                          setSelectedFileIds((prev) =>
                            prev.includes(file.id) ? prev.filter((id) => id !== file.id) : [...prev, file.id]
                          );
                        }}
                      />
                      <span className="font-pressstart text-[9px] text-theme-dark">{file.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleStep1Next}
                  className="mt-4 w-full bg-theme-primary text-white font-pressstart text-xs py-3 rounded-xl border-2 border-theme-dark cursor-pointer hover:bg-[#d6652d]"
                >
                  Generate {currentActiveTool}
                </button>
              </div>
            )}

            {/* STEP 2: GENERATED TOOL DISPLAY */}
            {activeStep === 'step2' && (
              <div className="flex flex-col gap-3">
                {currentActiveTool === 'Flashcards' && (
                  <div
                    onClick={() => setFlashcardState((prev) => ({ ...prev, isFlipped: !prev.isFlipped }))}
                    className="border-2 border-theme-dark rounded-xl p-6 min-h-[160px] bg-theme-surface flex flex-col items-center justify-center text-center cursor-pointer shadow-sm select-none"
                  >
                    {!flashcardState.isFlipped ? (
                      <p className="font-pressstart text-xs text-theme-dark">
                        {flashcardState.cards[flashcardState.currentIndex]?.term}
                      </p>
                    ) : (
                      <p className="font-pixel text-sm text-theme-dark">
                        {flashcardState.cards[flashcardState.currentIndex]?.definition}
                      </p>
                    )}
                  </div>
                )}

                {currentActiveTool === 'Notes' && (
                  <div className="flex flex-col gap-2 p-3 bg-[#FFF8EC] border-2 border-theme-dark rounded-xl max-h-60 overflow-y-auto">
                    {notesState.notesContent.map((sec, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <h4 className="font-pressstart text-[9px] text-theme-primary">{sec.heading}</h4>
                        {sec.body && <p className="font-pixel text-xs text-theme-dark">{sec.body}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {(currentActiveTool === 'Pre-quiz' || currentActiveTool === 'Post-quiz') && quizState.activeQuiz && (
                  <div className="flex flex-col gap-3 p-3 bg-[#FFF8EC] border-2 border-theme-dark rounded-xl">
                    <p className="font-pressstart text-xs text-theme-dark">
                      Q{quizState.currentQuestionIndex + 1}.{' '}
                      {quizState.activeQuiz.questions[quizState.currentQuestionIndex].question}
                    </p>
                    <div className="flex flex-col gap-2">
                      {quizState.activeQuiz.questions[quizState.currentQuestionIndex].options.map((opt, i) => (
                        <button
                          key={i}
                          className="p-2 bg-theme-surface border border-theme-dark rounded text-left font-pixel text-xs text-theme-dark"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={saveAndExitTool}
                  className="w-full bg-theme-safe text-white font-pressstart text-xs py-3 rounded-xl border-2 border-theme-dark cursor-pointer hover:bg-[#5B6D3F]"
                >
                  Save Tool
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* MODALS */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-2xl p-6 max-w-md w-full flex flex-col gap-4">
            <h3 className="font-pressstart text-xs text-theme-dark">Upload PDF File</h3>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-theme-primary p-8 rounded-xl font-pressstart text-[10px] text-theme-dark cursor-pointer hover:bg-theme-muted"
            >
              Click to select PDF
            </button>
            {uploadProgress && (
              <div className="font-pixel text-xs text-theme-dark">
                Uploading {uploadProgress.filename}... {uploadProgress.percent}%
              </div>
            )}
            <button
              onClick={() => setShowPdfModal(false)}
              className="font-pressstart text-[9px] border border-theme-dark py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showBackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4">
            <h3 className="font-pressstart text-xs text-theme-dark">Unsaved Changes</h3>
            <p className="font-pixel text-xs text-theme-dark/80">Do you want to save this generated tool?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveStep('menu');
                  setShowBackModal(false);
                }}
                className="flex-1 font-pressstart text-[9px] py-2 bg-theme-muted border border-theme-dark rounded"
              >
                Discard
              </button>
              <button
                onClick={saveAndExitTool}
                className="flex-1 font-pressstart text-[9px] py-2 bg-theme-safe text-white border border-theme-dark rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}