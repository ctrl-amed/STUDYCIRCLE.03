import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Data array for carousel cards
const CAROUSEL_CARDS = [
  {
    id: 1,
    title: 'AI Notes',
    description: 'Drop a PDF, get summaries, flashcards & quizzes.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 7.5l-.547 2.203L15 10l2.453.297L18 12.5l.547-2.203L21 10l-2.453-.297L18 7.5z" />
      </svg>
    )
  },
  {
    id: 2,
    title: 'Study Rooms',
    description: 'Up to 6 friends in shared pressstart-art rooms with a synced timer.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16M4 9a2 2 0 012-2h12a2 2 0 012 2M4 9v6a2 2 0 002 2h12a2 2 0 002-2V9M3 14h18M6 17v2M18 17v2" />
      </svg>
    )
  },
  {
    id: 3,
    title: 'Pre & Post Tests',
    description: 'Measure real growth with auto-generated knowledge checks.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  {
    id: 4,
    title: 'Badges & XP',
    description: 'Daily rewards, level-ups, and badges that feel earned.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v5m-3-3.04l3 3 3-3M8 11a4 4 0 118 0 4 4 0 01-8 0z" />
      </svg>
    )
  },
  {
    id: 5,
    title: 'Cosmetics',
    description: 'Spend coins on avatar items and cozy room decorations.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
        <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M10 10h4M10 14h4" />
      </svg>
    )
  },
  {
    id: 6,
    title: 'With Friends',
    description: "Add buddies, see who's online, and start studying together.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  }
];

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);
  const isTransitioning = useRef(false);

  // Mouse Drag Tracking Refs
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const totalOriginals = CAROUSEL_CARDS.length;

  const displayCards = [
    ...CAROUSEL_CARDS,
    ...CAROUSEL_CARDS,
    ...CAROUSEL_CARDS,
    ...CAROUSEL_CARDS
  ];

  const getGapSize = () => (window.innerWidth < 640 ? 16 : 24);

  const getCardWidth = () => {
    if (!containerRef.current) return 300;
    const card = containerRef.current.querySelector('.card-item');
    return card ? card.offsetWidth : 300;
  };

  const scrollToCard = (index, smooth = true) => {
    if (isTransitioning.current || !containerRef.current) return;
    isTransitioning.current = true;

    const container = containerRef.current;
    const cardWidth = getCardWidth();
    const gap = getGapSize();
    const targetScrollLeft = (cardWidth + gap) * (totalOriginals + index) - (container.offsetWidth / 2) + (cardWidth / 2);

    container.style.scrollBehavior = smooth ? 'smooth' : 'auto';
    container.scrollLeft = targetScrollLeft;

    setTimeout(() => {
      let newIndex = index;
      if (newIndex >= totalOriginals) {
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = (cardWidth + gap) * totalOriginals - (container.offsetWidth / 2) + (cardWidth / 2);
        newIndex = 0;
      } else if (newIndex < 0) {
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = (cardWidth + gap) * (totalOriginals * 2 - 1) - (container.offsetWidth / 2) + (cardWidth / 2);
        newIndex = totalOriginals - 1;
      }
      setActiveIndex(newIndex);
      isTransitioning.current = false;
    }, 400);
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    setIsHovered(true);
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftStart.current = containerRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
    setIsHovered(false);
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
    setIsHovered(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const cardWidth = getCardWidth();
      const gap = getGapSize();
      const firstRealCardOffset = (cardWidth + gap) * totalOriginals - (container.offsetWidth / 2) + (cardWidth / 2);
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = firstRealCardOffset;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered && !isTransitioning.current) {
        scrollToCard(activeIndex + 1);
      }
    }, 2600);

    return () => clearInterval(interval);
  }, [activeIndex, isHovered]);

  const handleScroll = () => {
    if (isTransitioning.current || !containerRef.current) return;

    const container = containerRef.current;
    const cardWidth = getCardWidth();
    const gap = getGapSize();
    const totalWidthPerCard = cardWidth + gap;

    if (totalWidthPerCard <= 0) return;

    const centerPos = container.scrollLeft + (container.offsetWidth / 2) - (cardWidth / 2);
    const rawIndex = Math.round(centerPos / totalWidthPerCard);
    const normalizedIndex = ((rawIndex % totalOriginals) + totalOriginals) % totalOriginals;

    if (normalizedIndex !== activeIndex) {
      setActiveIndex(normalizedIndex);
    }

    const set0End = totalWidthPerCard * totalOriginals;
    const set3Start = totalWidthPerCard * totalOriginals * 3;

    if (container.scrollLeft < set0End / 2) {
      container.style.scrollBehavior = 'auto';
      container.scrollLeft += totalWidthPerCard * totalOriginals;
    } else if (container.scrollLeft > set3Start - container.offsetWidth / 2) {
      container.style.scrollBehavior = 'auto';
      container.scrollLeft -= totalWidthPerCard * totalOriginals;
    }
  };

  return (
    <div className="bg-gray-100 antialiased scroll-smooth">

      {/* HEADER SECTION */}
      <header 
        className="fixed top-0 left-0 w-full z-50 bg-theme-surface"
        style={{
          backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.08) 1px, transparent 1px)',
          backgroundSize: '100% 5px'
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex flex-wrap items-center justify-between gap-2 md:gap-4">
          
          <a href="#" className="flex items-center gap-2 no-underline">
            <img src="media/kitsu_logo.png" alt="Kitsu Logo" className="h-8 sm:h-9 md:h-10 w-auto block" />
            <span className="font-pressstart text-[11px] md:text-[15px] text-theme-dark hidden sm:block">
              StudyCircle
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3 order-2 md:order-3">
            <Link 
              to="/auth#login" 
              className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark bg-theme-muted border-2 md:border-2 border-theme-dark px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 block text-center transition-all duration-150 retro-shadow"
            >
              LOGIN
            </Link>
            <Link 
              to="/auth#signup" 
              className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-surface bg-theme-primary border-2 md:border-2 border-theme-dark px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 block text-center transition-all duration-150 retro-shadow"
            >
              SIGN UP
            </Link>
          </div>

          <nav className="w-full md:w-auto flex justify-center gap-4 sm:gap-5 md:gap-6 order-3 md:order-2 pt-2 md:pt-0 border-t-2 border-dashed border-theme-dark md:border-none">
            <a href="#" className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark hover:text-theme-primary no-underline transition-colors">Home</a>
            <a href="#section-2" className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark hover:text-theme-primary no-underline transition-colors">Features</a>
            <a href="#section-3" className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark hover:text-theme-primary no-underline transition-colors">FAQs</a>
          </nav>

        </div>
      </header>


      {/* UNIFIED HERO & FEATURES SECTION */}
      <section 
        id="hero-and-showcase" 
        className="relative w-full min-h-screen bg-linear-to-b from-[#FBF2E3] from-45% to-[#3D2013] to-70% pt-28 md:pt-36 flex flex-col items-center overflow-hidden"
      >  
        
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none z-0" 
          style={{
            backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.08) 1px, transparent 1px)',
            backgroundSize: '100% 5px'
          }}
        />
          
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen sm:h-[110vh] z-0 pointer-events-none">
          <div 
            className="absolute right-[20%] sm:right-[25%] md:right-[90%] top-[10%] sm:top-[8%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full opacity-50 filter blur-3xl mix-blend-screen"
            style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)' }}
          />

          <div 
            className="absolute left-[20%] sm:left-[25%] md:left-[90%] top-[52%] sm:top-[54%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full opacity-50 filter blur-3xl mix-blend-screen"
            style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)' }}
          />

          <img 
            src="media/checklist_feature.png" 
            alt="Checklist" 
            className="absolute animate-checklist-appear drop-shadow-2xl z-10 w-28 sm:w-64 md:w-80 lg:w-[350px] right-[2%] sm:right-[-4%] md:right-[-2%] lg:right-[-3%] top-[13%] sm:top-[12%] md:top-[15%]" 
          />

          <img 
            src="media/pomodoro_feature.png" 
            alt="Pomodoro" 
            className="absolute animate-pomodoro-appear drop-shadow-2xl z-10 w-28 sm:w-64 md:w-80 lg:w-[350px] left-[2%] sm:left-[-4%] md:left-[-2%] lg:left-[-3%] top-[55%] sm:top-[57%] md:top-[60%] lg:top-[65%]" 
          />
        </div>

        <div className="relative z-10 max-w-6xl w-full px-6 flex flex-col items-center">
          
          <div className="w-full flex flex-col items-center text-center md:pt-10">
            <h1 className="font-pressstart mt-12 md:mt-20 text-[24px] sm:text-[36px] md:text-[46px] lg:text-[54px] text-theme-dark leading-[1.1] sm:leading-[1.1] md:leading-[1.2] tracking-normal mb-8 select-none">
              Study with<br />
              Friends.<br />
              <span className="level-up-gradient">Level up</span><br/>
              Together.
            </h1>

            <p className="font-vt text-[15px] sm:text-[22px] md:text-[24px] text-theme-dark leading-[1.1] max-w-2xl mx-auto mb-10 opacity-95">
              StudyCircle is a cozy, AI-powered learning RPG. Upload your notes, generate pre &amp; post-tests, hop into pressstart-art study rooms, and earn XP, badges, and decorations along the way.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
              <Link to="/auth#signup" className="w-full max-w-[130px] sm:max-w-none sm:w-auto font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-surface bg-theme-safe border-2 md:border-2 border-theme-dark px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3.5 block text-center transition-all duration-150 retro-shadow">
                START STUDYING &rarr;
              </Link>
              <Link to="/auth#login" className="w-full max-w-[130px] sm:max-w-none sm:w-auto font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark bg-theme-muted border-2 md:border-2 border-theme-dark px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3.5 block text-center transition-all duration-150 retro-shadow">
                I HAVE AN ACCOUNT
              </Link>
            </div>
          </div>

          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 mt-12 mb-20 md:mb-32">
            <div className="flex flex-row items-center -space-x-3">
              <img src="media/profile1.png" alt="Student 1" className="w-10 h-10 rounded-full border-2 border-theme-dark object-cover relative z-10 bg-gray-200" />
              <img src="media/profile2.png" alt="Student 2" className="w-10 h-10 rounded-full border-2 border-theme-dark object-cover relative z-20 bg-gray-200" />
              <img src="media/profile3.png" alt="Student 3" className="w-10 h-10 rounded-full border-2 border-theme-dark object-cover relative z-30 bg-gray-200" />
            </div>
            <p className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark tracking-wide text-center sm:text-left">
              <span className="font-bold">1,245</span> students leveling up today
            </p>
          </div>

          <div className="w-full flex flex-col items-center">
            <div id="section-2" className="w-full flex justify-center px-4">
              <div className="relative w-full max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl flex justify-center items-center">
                <div 
                  className="absolute w-[150%] h-[120%] sm:w-[150%] sm:h-[150%] rounded-full pointer-events-none opacity-75 filter blur-3xl z-0"
                  style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.5) 0%, rgba(253, 146, 62, 0) 100%)' }}
                />
                <img src="media/kitsu_room.png" alt="Kitsu Study Room" className="relative z-10 w-full h-auto object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] rounded-lg select-none" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-16 md:mt-24 select-none">
              <span className="font-pressstart text-[10px] sm:text-[12px] text-theme-surface">&#9733;</span>
              <h2 className="font-pressstart text-[10px] sm:text-[12px] text-theme-surface tracking-widest">FEATURES</h2>
              <span className="font-pressstart text-[10px] sm:text-[12px] text-theme-surface">&#9733;</span>
            </div>

            <p className="font-pressstart text-[10px] sm:text-[14px] md:text-[18px] lg:text-[22px] tagline-gradient text-center leading-[1.8] mt-4 max-w-3xl mx-auto select-none">
              Every Tool you need.<br />
              None of the Boring.
            </p>
          </div>

        </div>

        <div className="relative w-full overflow-hidden mt-4 mb-16 before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-[10%] sm:before:w-[15%] before:bg-linear-to-r before:from-[#3D2013] before:to-transparent before:pointer-events-none after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-[10%] sm:after:w-[15%] after:bg-linear-to-l after:from-[#3D2013] after:to-transparent after:pointer-events-none">
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
            className="flex gap-4 sm:gap-6 overflow-x-auto py-4 w-full scrollbar-hide cursor-grab active:cursor-grabbing select-none"
            style={{ scrollSnapType: 'x mandatory', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            {displayCards.map((card, idx) => (
              <div 
                key={`${card.id}-${idx}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="card-item w-[260px] h-[175px] sm:w-[300px] sm:h-[190px] bg-[#482A1D] border-2 border-theme-surface rounded-[20px] p-4 snap-center flex flex-col justify-between transition-all duration-150 hover:-translate-y-1 hover:-translate-x-1 cursor-pointer shrink-0 select-none"
                style={{ boxShadow: '6px 6px 0px #E6751B' }}
              >
                <div className="flex flex-col h-full justify-between pointer-events-none">
                  <div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-safe border-2 border-theme-surface flex items-center justify-center text-theme-surface mb-2">
                      {card.icon}
                    </div>
                    <h3 className="font-pressstart text-[15px] sm:text-[16px] text-theme-surface tracking-wide mb-1 select-none">
                      {card.title}
                    </h3>
                    <p className="font-vt text-[16px] sm:text-[19px] text-theme-surface leading-tight opacity-90 select-none">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            {CAROUSEL_CARDS.map((_, idx) => (
              <span
                key={idx}
                onClick={() => scrollToCard(idx)}
                className={`w-2.5 h-2.5 rounded-full bg-theme-surface cursor-pointer transition-all duration-200 ${
                  idx === activeIndex ? 'opacity-100 scale-125' : 'opacity-40'
                }`}
              />
            ))}
          </div>
        </div>

      </section>


      {/* SECTION 2: FEATURES / INFORMATION SECTION */}
      <section className="relative bg-[#E6751B] flex items-center justify-center py-12 md:py-16 overflow-hidden">
        
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <div 
            className="absolute inset-0 w-full h-full" 
            style={{
              backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.12) 1px, transparent 1px)',
              backgroundSize: '100% 5px'
            }}
          />

          <div className="relative w-full h-full">
            <img src="media/book_design.png" alt="Decorative Book" className="absolute select-none pointer-events-none w-20 sm:w-36 md:w-48 lg:w-56 left-0 sm:left-[2%] md:left-[5%] top-0 drop-shadow-lg" />
            <img src="media/pen_design.png" alt="Decorative Pen" className="absolute select-none pointer-events-none w-32 sm:w-48 md:w-[300px] lg:w-[400px] right-4 sm:right-[2%] md:right-[3%] bottom-6 sm:bottom-10 md:bottom-12 drop-shadow-lg" />
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto w-full px-6 z-10 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2 select-none mt-0 sm:mt-12">
            <span className="font-pressstart text-[10px] sm:text-[12px] text-theme-surface">&#9733;</span>
            <h2 className="font-pressstart text-[7px] sm:text-[12px] text-theme-surface tracking-widest uppercase">
              IMPROVE LEARNING TODAY
            </h2>
            <span className="font-pressstart text-[10px] sm:text-[12px] text-theme-surface">&#9733;</span>
          </div>

          <h1 className="font-pressstart text-[10px] sm:text-[14px] md:text-[18px] lg:text-[32px] text-theme-surface leading-normal md:leading-[1.1] mt-4 sm:mt-9 max-w-3xl select-none">
            Ready to level up your learning journey?
          </h1>

          <p className="font-vt text-[15px] sm:text-[20px] md:text-[32px] text-theme-dark leading-none mt-4 sm:mt-8 select-none">
            Upload notes, generate quizzes with AI, study with friends, and earn rewards as you progress toward your academic goals.
          </p>

          <div className="mt-8">
            <Link to="/auth#signup" className="w-full max-w-[130px] sm:max-w-none sm:w-auto font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark bg-theme-muted border-2 md:border-2 border-theme-dark px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3.5 block text-center transition-all duration-150 retro-shadow">
              JOIN STUDYCIRCLE
            </Link>
          </div>
        </div>
      </section>


      {/* SECTION 3: FAQS SECTION */}
      <section 
        id="section-3" 
        className="relative min-h-screen flex items-center justify-center py-16 sm:py-20 md:py-24 overflow-hidden bg-theme-muted"
        style={{
          backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.08) 1px, transparent 1px)',
          backgroundSize: '100% 5px'
        }}
      >
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex flex-col items-center gap-10 sm:gap-14 select-none">
          
          <div className="text-center flex flex-col gap-3 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-theme-primary">
              <span className="font-pressstart text-[10px] sm:text-[12px]">&#9733;</span>
              <h2 className="font-pressstart text-[8px] sm:text-[10px] md:text-[12px] tracking-widest uppercase">
                FREQUENTLY ASKED QUESTIONS
              </h2>
              <span className="font-pressstart text-[10px] sm:text-[12px]">&#9733;</span>
            </div>
            <h3 className="font-pressstart text-[10px] sm:text-[14px] md:text-[18px] text-theme-dark tracking-wide leading-tight">
              The questions you're probably asking.
            </h3>
          </div>

          <div className="w-full flex flex-col gap-5 sm:gap-6">
            
            <details className="group w-full block bg-theme-muted border-2 sm:border-4 border-theme-dark text-theme-dark transition-all duration-150 transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#3D2013] shadow-[4px_4px_0px_0px_#3D2013]">
              <summary className="list-none flex items-center justify-between p-4 sm:p-5 cursor-pointer font-pressstart text-[10px] sm:text-[14px] md:text-[18px] tracking-wide focus:outline-none select-none">
                <span>Is StudyCircle Free?</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t-[3px] sm:border-t-4 border-theme-dark p-4 sm:p-5 bg-theme-muted/40">
                <p className="font-vt text-[18px] sm:text-[22px] md:text-[24px] text-[#996749] leading-[1.3] text-left">
                  Yes! StudyCircle is completely free to use. We believe in providing students with the best tools to enhance their learning experience without any cost.
                </p>
              </div>
            </details>

            <details className="group w-full block bg-theme-muted border-2 sm:border-4 border-theme-dark text-theme-dark transition-all duration-150 transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#3D2013] shadow-[4px_4px_0px_0px_#3D2013]">
              <summary className="list-none flex items-center justify-between p-4 sm:p-5 cursor-pointer font-pressstart text-[10px] sm:text-[14px] md:text-[18px] tracking-wide focus:outline-none select-none">
                <span>How does the AI Learning Assistant work?</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t-[3px] sm:border-t-4 border-theme-dark p-4 sm:p-5 bg-theme-muted/40">
                <p className="font-vt text-[18px] sm:text-[22px] md:text-[24px] text-[#996749] leading-[1.3] text-left">
                  Upload your notes, PDFs, or simply enter a topic, and let AI transform your study materials into personalized summaries, interactive flashcards, and engaging quizzes designed to help you learn faster, retain more information, and prepare effectively for exams.
                </p>
              </div>
            </details>

            <details className="group w-full block bg-theme-muted border-2 sm:border-4 border-theme-dark text-theme-dark transition-all duration-150 transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#3D2013] shadow-[4px_4px_0px_0px_#3D2013]">
              <summary className="list-none flex items-center justify-between p-4 sm:p-5 cursor-pointer font-pressstart text-[10px] sm:text-[14px] md:text-[18px] tracking-wide focus:outline-none select-none">
                <span>Can I study alone?</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t-[3px] sm:border-t-4 border-theme-dark p-4 sm:p-5 bg-theme-muted/40">
                <p className="font-vt text-[18px] sm:text-[22px] md:text-[24px] text-[#996749] leading-[1.3] text-left">
                  Absolutely! You can create a private study room just for yourself and use all of StudyCircle's features, including the AI Learning Assistant, flashcards, summaries, and quizzes. Whether you prefer solo studying or collaborating with others, StudyCircle is designed to support both.
                </p>
              </div>
            </details>

            <details className="group w-full block bg-theme-muted border-2 sm:border-4 border-theme-dark text-theme-dark transition-all duration-150 transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#3D2013] shadow-[4px_4px_0px_0px_#3D2013]">
              <summary className="list-none flex items-center justify-between p-4 sm:p-5 cursor-pointer font-pressstart text-[10px] sm:text-[14px] md:text-[18px] tracking-wide focus:outline-none select-none">
                <span>What’s the max room size?</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t-[3px] sm:border-t-4 border-theme-dark p-4 sm:p-5 bg-theme-muted/40">
                <p className="font-vt text-[18px] sm:text-[22px] md:text-[24px] text-[#996749] leading-[1.3] text-left">
                  Each study room can have up to 6 players at a time. This keeps sessions interactive, organized, and productive while giving everyone a chance to participate.
                </p>
              </div>
            </details>

          </div>

          <div className="text-center mt-2 flex flex-col gap-2">
            <h4 className="font-pressstart text-[8px] sm:text-[10px] md:text-[12px] text-[#FD923E] tracking-wider uppercase">
              Still have questions?
            </h4>
            <a href="mailto:studycircle@gmail.com" className="font-pressstart text-[8px] sm:text-[10px] md:text-[12px] text-theme-dark tracking-wide underline decoration-2 underline-offset-4 hover:text-[#FD923E] transition-colors duration-150">
              Contact us at studycircle@gmail.com
            </a>
          </div>

        </div>
      </section>


      {/* FOOTER SECTION */}
      <footer 
        className="text-theme-surface border-t-4 border-theme-dark"
        style={{
          backgroundColor: '#482A1D',
          backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.25) 1px, transparent 1px)',
          backgroundSize: '100% 5px'
        }}
      >
        <div className="w-full px-6 md:px-12">
          
          <div className="flex flex-row items-center justify-between gap-4 w-full border-b border-[#E16F37]/10 pb-8 py-5 sm:py-8 md:py-10 select-none">
            <div className="flex items-center gap-3 sm:gap-5 md:gap-6">
              <img src="media/kitsu_logo.png" alt="Kitsu Logo" className="h-10 w-auto sm:h-16 md:h-20 lg:h-24 block shrink-0" />
              <div className="flex flex-col gap-1 sm:gap-2">
                <div className="flex items-center gap-1">
                  <span className="font-pressstart text-[8px] sm:text-[10px] md:text-[12px] text-theme-primary">&#9733;</span>
                  <span className="font-pressstart text-[8px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">JOIN THE CIRCLE</span>
                  <span className="font-pressstart text-[8px] sm:text-[10px] md:text-[12px] text-theme-primary">&#9733;</span>
                </div>
                <h3 className="font-pressstart text-[11px] sm:text-lg md:text-[24px] text-theme-muted leading-none">
                  Kitsu is waiting.
                </h3>
                <p className="font-vt text-[15px] sm:text-[20px] md:text-[20px] text-theme-surface leading-none select-none">
                  Level up your learning with AI-powered study adventures.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Link to="/auth#signup" className="font-pressstart text-[7px] sm:text-[10px] md:text-[12px] text-theme-surface bg-theme-safe border-2 md:border-2 border-theme-dark px-3 py-2 sm:px-5 sm:py-3 md:px-6 md:py-3.5 block text-center transition-all duration-150 retro-shadow">
                JOIN NOW!
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 py-5 sm:py-8 md:py-10 px-4 sm:px-10 md:px-16">
            <div className="flex flex-col gap-4 lg:col-span-4">
              <div className="flex items-center gap-3">
                <img src="media/kitsu_logo.png" alt="Kitsu Logo" className="h-8 w-auto block select-none" />
                <span className="font-pressstart text-[10px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">StudyCircle</span>
              </div>
              <p className="font-vt text-[15px] sm:text-[20px] md:text-[20px] text-theme-surface leading-[1.2] select-none">
                Turn studying into an adventure with StudyCircle! Upload your notes, let AI create personalized quizzes, join cozy pressstart-art study rooms, and level up with XP, badges, and exciting rewards as you learn.
              </p>
              <div className="flex items-center gap-2 mt-2 select-none">
                <img src="media/coin_logo.png" alt="Coin Logo" className="w-[31px] h-[31px] object-contain block" />
                <span className="font-vt text-[15px] sm:text-[20px] md:text-[20px] text-theme-surface leading-none select-none">12,000+ students leveling up today</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2 lg:col-start-7">
              <h4 className="font-pressstart text-[10px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">PRODUCT</h4>
              <nav className="flex flex-col gap-2">
                <a href="#section-2" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Features</a>
                <a href="#section-3" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">FAQs</a>
                <a href="#learn" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Learn Now!</a>
                <Link to="/auth#login" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Login</Link>
              </nav>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <h4 className="font-pressstart text-[10px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">COMMUNITY</h4>
              <nav className="flex flex-col gap-2">
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Discord</a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Facebook</a>
                <a href="https://reddit.com" target="_blank" rel="noopener noreferrer" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Reddit</a>
              </nav>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <h4 className="font-pressstart text-[10px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">COMPANY</h4>
              <nav className="flex flex-col gap-2">
                <a href="#about" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">About</a>
                <a href="#privacy" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Privacy</a>
                <a href="#terms" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Terms</a>
                <a href="#contact" className="font-vt text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Contact</a>
              </nav>
            </div>
          </div>

          <div className="w-full border-b border-[#E16F37]/10 select-none pb-4" />

          <div className="w-full py-3 sm:py-4">
            <div className="flex flex-col md:flex-row items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <img src="media/sparkle_icon.png" alt="Sparkle" className="h-3.5 w-auto object-contain block shrink-0 animate-pulse" />
                <p className="font-pressstart text-[5px] sm:text-[10px] md:text-[12px] text-[#B6AAA5] tracking-wide leading-none">
                  © 2026 StudyCircle · Brewed with chamomile
                </p>
              </div>

              <div className="flex items-center">
                <p className="font-pressstart text-[5px] sm:text-[10px] md:text-[12px] text-[#B6AAA5] tracking-wide leading-none">
                  V1.0 · All rights reserved
                </p>
              </div>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}