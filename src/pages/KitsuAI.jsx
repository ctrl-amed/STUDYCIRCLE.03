import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

export default function KitsuAI() {
  const navigate = useNavigate();
  const { playerData } = usePlayer();

  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Uploaded sources state
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Tools & Navigation state
  const [currentActiveTool, setCurrentActiveTool] = useState(''); // 'Pre-quiz', 'Post-quiz', 'Flashcards', 'Notes'
  const [activeStep, setActiveStep] = useState('menu'); // 'menu', 'step1', 'step2'
  const [generatedItems, setGeneratedItems] = useState([]);
  const [currentGeneratedItem, setCurrentGeneratedItem] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Modals state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Flashcards Interactive State
  const [flashcardState, setFlashcardState] = useState({
    cards: [],
    currentIndex: 0,
    isFlipped: false,
  });

  // Quiz Interactive State
  const [quizState, setQuizState] = useState({
    activeQuiz: null,
    currentQuestionIndex: 0,
    userAnswers: {},
    isCompleted: false,
  });

  // Notes State
  const [notesContent, setNotesContent] = useState('');

  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // --- KUNIN ANG PINAKABAGONG SAVED TOOLS MULA SA DATABASE TUWING MAG-RE-REFRESH ---
  useEffect(() => {
    const fetchUserTools = async () => {
      if (!playerData?.email) return;
      try {
        const response = await fetch(`http://localhost:5000/api/get-user-tools?email=${encodeURIComponent(playerData.email)}`);
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.inventory)) {
          const dbSavedTools = data.inventory
            .filter(item => typeof item === 'object' && item !== null && item.type && item.payload)
            .map(item => ({
              id: item.id || Date.now().toString(),
              title: item.title || `${item.type} - Saved`,
              type: item.type,
              badgeColor: item.type === 'Pre-quiz' ? 'bg-theme-safe' : item.type === 'Post-quiz' ? 'bg-[#708EA4]' : item.type === 'Flashcards' ? 'bg-theme-danger' : 'bg-[#E34B00]',
              payload: item.payload,
              userAnswers: item.userAnswers || {},
              isCompleted: item.isCompleted || false
            }));
          setGeneratedItems(dbSavedTools);
        }
      } catch (err) {
        console.error("Error fetching user tools:", err);
      }
    };

    fetchUserTools();
  }, [playerData?.email]);

  const handleClose = () => {
    if (window.parent !== window) {
      window.parent.postMessage('CLOSE_KITSU_MODAL', '*');
    } else {
      navigate('/dashboard');
    }
  };

  const simulateTypingEffect = (fullText) => {
    let index = 0;
    let currentText = '';
    const tempId = Date.now() + 1;

    setMessages((prev) => [...prev, { id: tempId, text: '', sender: 'kitsu' }]);

    const interval = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText.charAt(index);
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, text: currentText } : msg))
        );
        index++;
      } else {
        clearInterval(interval);
      }
    }, 15);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiThinking) return;
    if (showWelcome) setShowWelcome(false);

    const userText = inputMessage;
    setMessages((prev) => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
    setInputMessage('');
    setIsAiThinking(true);

    try {
      const response = await fetch('http://localhost:5000/api/kitsu-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      const data = await response.json();
      setIsAiThinking(false);

      if (response.ok && data.success) {
        simulateTypingEffect(data.reply);
      } else {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: "Oops! Kitsu couldn't reach the AI server right now.", sender: 'kitsu' }]);
      }
    } catch (err) {
      setIsAiThinking(false);
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: "Network error connecting to Gemini API.", sender: 'kitsu' }]);
    }
  };

  const [selectedUploadFile, setSelectedUploadFile] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedUploadFile(file);
    const newFileId = Date.now().toString();
    const fileEntry = { 
      id: newFileId, 
      name: file.name, 
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, 
      addedBy: 'You', 
      fileObj: file 
    };

    setUploadedFiles((prev) => [...prev, fileEntry]);
    setSelectedFileIds((prev) => [...prev, newFileId]);
    setShowPdfModal(false);
  };

  const openToolForm = (toolName) => {
    setCurrentActiveTool(toolName);
    setActiveStep('step1');
  };

  // --- REVIEW SAVED TOOL (DIREKTANG MAGBUBUKAS SA SUMMARY O CONTENT NA HINDI PINAPASAGUT MULI) ---
  const handleReviewSavedTool = (item) => {
    setCurrentActiveTool(item.type);
    if (item.type === 'Flashcards' && item.payload) {
      setFlashcardState({ cards: item.payload, currentIndex: 0, isFlipped: false });
    } else if ((item.type === 'Pre-quiz' || item.type === 'Post-quiz') && item.payload) {
      setQuizState({ 
        activeQuiz: item.payload, 
        currentQuestionIndex: 0, 
        userAnswers: item.userAnswers || {}, 
        isCompleted: true // Diretso sa summary screen para makita ang score at sagot noon
      });
    } else if (item.type === 'Notes' && item.payload) {
      setNotesContent(item.payload);
    }
    setCurrentGeneratedItem(item);
    setActiveStep('step2');
  };

  const handleStep1Next = async () => {
    if (uploadedFiles.length > 0 && selectedFileIds.length === 0) {
      alert('Please select at least one source file to continue.');
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append('toolType', currentActiveTool);

      const targetFileObj = uploadedFiles.find(f => selectedFileIds.includes(f.id))?.fileObj || selectedUploadFile;
      
      if (targetFileObj) {
        formData.append('file', targetFileObj);
      } else {
        const dummyBlob = new Blob(["Sample study text content for generation."], { type: 'text/plain' });
        formData.append('file', dummyBlob, "source_fallback.txt");
      }

      const response = await fetch('http://localhost:5000/api/generate-ai-tool', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate tool content.");
      }

      let parsedContent = data.data;
      let toolPayload = null;

      if (currentActiveTool === 'Flashcards') {
        let cardsArr = [];
        try {
          cardsArr = JSON.parse(parsedContent);
        } catch (e) {
          cardsArr = [{ term: 'Summary', definition: parsedContent }];
        }
        toolPayload = cardsArr.map((c, idx) => ({ id: idx + 1, term: c.term, definition: c.definition }));
        setFlashcardState({ cards: toolPayload, currentIndex: 0, isFlipped: false });
      } else if (currentActiveTool === 'Pre-quiz' || currentActiveTool === 'Post-quiz') {
        let quizObj = { questions: [] };
        try {
          quizObj = JSON.parse(parsedContent);
        } catch (e) {
          quizObj = {
            questions: [
              { question: "Review generated summary notes from your source.", options: ["Understood", "Review Again"], correctAnswer: 0 }
            ]
          };
        }
        toolPayload = quizObj;
        setQuizState({ 
          activeQuiz: quizObj, 
          currentQuestionIndex: 0, 
          userAnswers: {}, 
          isCompleted: false 
        });
      } else if (currentActiveTool === 'Notes') {
        toolPayload = parsedContent;
        setNotesContent(parsedContent);
      }

      let newItem = {
        id: Date.now().toString(),
        title: `${currentActiveTool} - ${new Date().toLocaleDateString()}`,
        type: currentActiveTool,
        badgeColor: currentActiveTool === 'Pre-quiz' ? 'bg-theme-safe' : currentActiveTool === 'Post-quiz' ? 'bg-[#708EA4]' : currentActiveTool === 'Flashcards' ? 'bg-theme-danger' : 'bg-[#E34B00]',
        payload: toolPayload,
        userAnswers: {},
        isCompleted: false
      };

      setCurrentGeneratedItem(newItem);
      setActiveStep('step2');
    } catch (err) {
      console.error("Generation error:", err);
      alert(err.message || "Failed to generate AI tool content.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- I-SAVE ANG TOOL SA DATABASE KAPAG PININDOT ANG SAVE TOOL ---
  const saveAndExitTool = async () => {
    if (!currentGeneratedItem || !playerData?.email) {
      setActiveStep('menu');
      setCurrentActiveTool('');
      return;
    }

    const itemToSave = {
      ...currentGeneratedItem,
      userAnswers: quizState.userAnswers || {},
      isCompleted: quizState.isCompleted || false
    };

    const updatedItems = [itemToSave, ...generatedItems.filter(i => i.id !== itemToSave.id)];
    setGeneratedItems(updatedItems);

    try {
      await fetch('http://localhost:5000/api/save-user-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: playerData.email,
          tool: itemToSave
        })
      });
    } catch (e) {
      console.error("Error saving tool to database:", e);
    }

    setActiveStep('menu');
    setCurrentActiveTool('');
    setShowBackModal(false);
  };

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="bg-theme-muted dark:bg-zinc-900 h-dvh w-screen overflow-hidden relative text-theme-dark flex flex-col justify-between select-none p-3 sm:p-4 gap-3 transition-colors duration-200">
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
          className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-surface border-[2px] md:border-[3px] border-theme-dark text-theme-dark hover:bg-theme-primary hover:text-white rounded-full transition-all retro-shadow cursor-pointer flex items-center justify-center shrink-0"
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
                        : 'self-start bg-theme-surface text-theme-dark dark:bg-zinc-800'
                    }`}
                  >
                    <span className="font-pressstart text-[9px] block mb-1 text-theme-primary">
                      {msg.sender === 'user' ? 'You:' : 'Kitsu AI:'}
                    </span>
                    {msg.text}
                  </div>
                ))}
                {isAiThinking && (
                  <div className="self-start bg-theme-surface p-3 border-2 border-theme-dark font-pixel text-sm rounded animate-pulse">
                    Kitsu is thinking... 💭
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          <div className="p-3 shrink-0">
            <div className="w-full bg-theme-surface dark:bg-zinc-800 border-2 border-theme-dark rounded-[12px] p-2 flex items-center gap-2">
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
                disabled={isAiThinking}
                className="w-8 h-8 rounded-full bg-theme-primary text-white border border-theme-dark flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 disabled:opacity-50"
              >
                ➔
              </button>
            </div>
          </div>
        </section>

        {/* TOOLS COLUMN */}
        <section className="w-full md:w-[40%] bg-theme-surface dark:bg-zinc-800 border-2 border-theme-dark rounded-[12px] flex flex-col shadow-md overflow-hidden shrink-0 p-3">
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

                {generatedItems.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="font-pressstart text-[9px] text-theme-dark/70">SAVED TOOLS (Click to Review)</span>
                    {generatedItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleReviewSavedTool(item)}
                        className="p-2.5 bg-theme-muted dark:bg-zinc-700 border border-theme-dark rounded-xl flex items-center justify-between cursor-pointer hover:border-theme-primary transition"
                      >
                        <span className="font-pressstart text-[9px] text-theme-dark truncate">{item.title}</span>
                        <span className={`text-white font-pressstart text-[7px] px-2 py-0.5 rounded ${item.badgeColor}`}>
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-theme-dark/20">
                  <button
                    onClick={() => setShowPdfModal(true)}
                    className="w-full font-pressstart text-[10px] bg-theme-surface dark:bg-zinc-700 border-2 border-theme-dark py-2.5 rounded-lg retro-shadow cursor-pointer hover:bg-theme-muted"
                  >
                    + Add Sources
                  </button>

                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                    {uploadedFiles.length === 0 ? (
                      <span className="font-pixel text-xs text-theme-dark/60 text-center py-2">No sources added yet. Click above to upload.</span>
                    ) : (
                      uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-theme-muted dark:bg-zinc-700 border border-theme-dark/20 rounded-lg">
                          <span className="font-pressstart text-[8px] text-theme-dark truncate">{file.name}</span>
                          <span className="font-pixel text-[10px] text-theme-dark/60">{file.size}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {activeStep === 'step1' && (
              <div className="flex flex-col gap-3">
                <span className="font-pressstart text-[10px] text-theme-dark">Select Source Files:</span>
                <div className="flex flex-col gap-2">
                  {uploadedFiles.length === 0 ? (
                    <span className="font-pixel text-xs text-theme-dark/60">No files uploaded. Proceeding will use a default context or fallback.</span>
                  ) : (
                    uploadedFiles.map((file) => (
                      <label key={file.id} className="flex items-center gap-2 p-2 bg-theme-muted dark:bg-zinc-700 border border-theme-dark/30 rounded-lg cursor-pointer">
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
                    ))
                  )}
                </div>
                <button
                  onClick={handleStep1Next}
                  disabled={isGenerating}
                  className="mt-4 w-full bg-theme-primary text-white font-pressstart text-xs py-3 rounded-xl border-2 border-theme-dark cursor-pointer hover:opacity-90 disabled:opacity-50"
                >
                  {isGenerating ? 'Analyzing with AI... 🦊' : `Generate ${currentActiveTool}`}
                </button>
              </div>
            )}

            {activeStep === 'step2' && (
              <div className="flex flex-col gap-3">
                {currentActiveTool === 'Flashcards' && (
                  <div className="flex flex-col gap-3">
                    <div
                      onClick={() => setFlashcardState((prev) => ({ ...prev, isFlipped: !prev.isFlipped }))}
                      className="border-2 border-theme-dark rounded-xl p-6 min-h-[160px] bg-theme-surface dark:bg-zinc-700 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm select-none"
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
                    <div className="flex justify-between items-center px-2">
                      <button
                        onClick={() => setFlashcardState(p => ({ ...p, currentIndex: Math.max(0, p.currentIndex - 1), isFlipped: false }))}
                        className="font-pressstart text-[8px] px-3 py-1 bg-theme-muted border border-theme-dark rounded cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="font-pixel text-xs">
                        Card {flashcardState.currentIndex + 1} of {flashcardState.cards.length}
                      </span>
                      <button
                        onClick={() => setFlashcardState(p => ({ ...p, currentIndex: Math.min(p.cards.length - 1, p.currentIndex + 1), isFlipped: false }))}
                        className="font-pressstart text-[8px] px-3 py-1 bg-theme-muted border border-theme-dark rounded cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {currentActiveTool === 'Notes' && (
                  <div className="flex flex-col gap-2 p-3 bg-theme-muted dark:bg-zinc-700 border-2 border-theme-dark rounded-xl max-h-60 overflow-y-auto font-pixel text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {notesContent || "No notes generated."}
                  </div>
                )}

                {(currentActiveTool === 'Pre-quiz' || currentActiveTool === 'Post-quiz') && quizState.activeQuiz && (
                  <div className="flex flex-col gap-3 p-3 bg-theme-muted dark:bg-zinc-700 border-2 border-theme-dark rounded-xl">
                    {!quizState.isCompleted ? (
                      <>
                        <div className="flex justify-between text-[8px] font-pressstart text-theme-dark/70">
                          <span>Question {quizState.currentQuestionIndex + 1} of {quizState.activeQuiz.questions.length}</span>
                        </div>
                        <p className="font-pressstart text-xs text-theme-dark">
                          {quizState.activeQuiz.questions[quizState.currentQuestionIndex].question}
                        </p>
                        <div className="flex flex-col gap-2">
                          {quizState.activeQuiz.questions[quizState.currentQuestionIndex].options.map((opt, i) => {
                            const isSelected = quizState.userAnswers[quizState.currentQuestionIndex] === i;
                            const labelLetter = optionLetters[i] || '';
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  setQuizState(prev => ({
                                    ...prev,
                                    userAnswers: { ...prev.userAnswers, [prev.currentQuestionIndex]: i }
                                  }));
                                }}
                                className={`p-2 border border-theme-dark rounded text-left font-pixel text-xs cursor-pointer ${
                                  isSelected ? 'bg-theme-primary text-white' : 'bg-theme-surface dark:bg-zinc-800 text-theme-dark'
                                }`}
                              >
                                <strong>{labelLetter}.</strong> {opt}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => {
                            if (quizState.userAnswers[quizState.currentQuestionIndex] === undefined) {
                              alert("Please select an answer first.");
                              return;
                            }
                            if (quizState.currentQuestionIndex < quizState.activeQuiz.questions.length - 1) {
                              setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
                            } else {
                              setQuizState(prev => ({ ...prev, isCompleted: true }));
                            }
                          }}
                          className="mt-2 w-full bg-theme-primary text-white font-pressstart text-[9px] py-2 rounded border border-theme-dark cursor-pointer"
                        >
                          {quizState.currentQuestionIndex < quizState.activeQuiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 text-center py-2">
                        <h3 className="font-pressstart text-sm text-theme-primary">Quiz Summary</h3>
                        {(() => {
                          let correctCount = 0;
                          quizState.activeQuiz.questions.forEach((q, idx) => {
                            if (quizState.userAnswers[idx] === q.correctAnswer) correctCount++;
                          });
                          const totalQ = quizState.activeQuiz.questions.length;
                          return (
                            <p className="font-pressstart text-xs text-theme-dark">
                              Score: {correctCount} / {totalQ}
                            </p>
                          );
                        })()}
                        
                        <div className="flex flex-col gap-2 text-left bg-theme-surface p-2 rounded border border-theme-dark max-h-40 overflow-y-auto">
                          {quizState.activeQuiz.questions.map((q, idx) => {
                            const userAnsIdx = quizState.userAnswers[idx];
                            const isCorrect = userAnsIdx === q.correctAnswer;
                            return (
                              <div key={idx} className="font-pixel text-xs pb-2 border-b border-theme-dark/10">
                                <p className="font-bold">Q{idx + 1}: {q.question}</p>
                                <p className={isCorrect ? "text-theme-safe" : "text-theme-danger"}>
                                  Your Answer: {optionLetters[userAnsIdx] || ''}. {q.options[userAnsIdx] ?? 'None'} {isCorrect ? '✓' : '✗'}
                                </p>
                                {!isCorrect && <p className="text-theme-safe text-[10px]">Correct: {optionLetters[q.correctAnswer]}. {q.options[q.correctAnswer]}</p>}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            setQuizState({
                              activeQuiz: quizState.activeQuiz,
                              currentQuestionIndex: 0,
                              userAnswers: {},
                              isCompleted: false,
                            });
                          }}
                          className="w-full bg-theme-muted text-theme-dark font-pressstart text-[8px] py-2 rounded border border-theme-dark cursor-pointer"
                        >
                          Retake Quiz
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={saveAndExitTool}
                  className="w-full bg-theme-safe text-white font-pressstart text-xs py-3 rounded-xl border-2 border-theme-dark cursor-pointer hover:opacity-90"
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
          <div className="bg-theme-surface dark:bg-zinc-900 border-4 border-theme-dark rounded-2xl p-6 max-w-md w-full flex flex-col gap-4">
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
            <button
              onClick={() => setShowPdfModal(false)}
              className="font-pressstart text-[9px] border border-theme-dark py-2 rounded text-theme-dark cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showBackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50">
          <div className="bg-theme-surface dark:bg-zinc-900 border-4 border-theme-dark rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4">
            <h3 className="font-pressstart text-xs text-theme-dark">Unsaved Changes</h3>
            <p className="font-pixel text-xs text-theme-dark/80">Do you want to save this generated tool?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveStep('menu');
                  setShowBackModal(false);
                }}
                className="flex-1 font-pressstart text-[9px] py-2 bg-theme-muted border border-theme-dark rounded text-theme-dark cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={saveAndExitTool}
                className="flex-1 font-pressstart text-[9px] py-2 bg-theme-safe text-white border border-theme-dark rounded cursor-pointer"
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