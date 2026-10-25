import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './landing.css';

/* The fox image lives in your public folder: public/media/kitsu_fox.png */

// Carousel cards (icon = SVG path)
const CAROUSEL_CARDS = [
  { id: 1, title: 'AI Notes', description: 'Drop a PDF, get summaries, flashcards & quizzes.', path: 'M9.8 15.9L9 21l-.8-5.1L3 15l5.2-.8L9 9l.8 5.2L15 15zM18 7.5l-.5 2.2L15 10l2.5.3.5 2.2.5-2.2L21 10l-2.5-.3z' },
  { id: 2, title: 'Study Rooms', description: 'Up to 6 friends in shared pixel-art rooms with a synced timer.', path: 'M4 9h16M4 9a2 2 0 012-2h12a2 2 0 012 2M4 9v6a2 2 0 002 2h12a2 2 0 002-2V9M3 14h18M6 17v2M18 17v2' },
  { id: 3, title: 'Pre & Post Tests', description: 'Measure real growth with auto-generated knowledge checks.', path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4' },
  { id: 4, title: 'Badges & XP', description: 'Daily rewards, level-ups, and badges that feel earned.', path: 'M12 15v5m-3-3l3 3 3-3M8 11a4 4 0 118 0 4 4 0 01-8 0z' },
  { id: 5, title: 'Cosmetics', description: 'Spend coins on avatar items and cozy room decorations.', path: 'M20 12a8 8 0 11-16 0 8 8 0 0116 0zM12 8v8M10 10h4M10 14h4' },
  { id: 6, title: 'With Friends', description: 'Add buddies, see who\u2019s online, and start studying together.', path: 'M4.3 6.3a4.5 4.5 0 000 6.4L12 20.4l7.7-7.7a4.5 4.5 0 00-6.4-6.4L12 7.6l-1.3-1.3a4.5 4.5 0 00-6.4 0z' }
];

// Little animal avatars for the "students leveling up today" row (fox, cat, bunny)
const AV_FACES = [
  "<svg viewBox=\"173 146 54 46\" width=\"100%\" height=\"100%\" aria-hidden=\"true\" style=\"display:block\"><g class=\"chr\"><g class=\"chr-legs\"><rect class=\"chr-l1\" x=\"190\" y=\"216\" width=\"8\" height=\"14\" fill=\"#3b2418\"/><rect class=\"chr-l2\" x=\"202\" y=\"216\" width=\"8\" height=\"14\" fill=\"#3b2418\"/></g><g class=\"chr-up\"><g class=\"chr-tail\"><path d=\"M214 215Q242 220 238 190Q231 205 214 203Z\" fill=\"#E87339\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M238 190Q236 199 232 203Q240 202 238 190Z\" fill=\"#fbeed8\"/></g><g class=\"chr-al\"><rect x=\"178\" y=\"192\" width=\"8\" height=\"20\" rx=\"3\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"178\" y=\"209\" width=\"8\" height=\"6\" rx=\"2\" fill=\"#E87339\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/></g><g class=\"chr-ar\"><rect x=\"214\" y=\"192\" width=\"8\" height=\"20\" rx=\"3\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"214\" y=\"209\" width=\"8\" height=\"6\" rx=\"2\" fill=\"#E87339\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/></g><rect x=\"186\" y=\"190\" width=\"28\" height=\"26\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" /><g class=\"chr-head\"><polygon points=\"189,171 190,156 202,169\" fill=\"#E87339\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"211,171 210,156 198,169\" fill=\"#E87339\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"192,168 192,161 197,168\" fill=\"#3b2418\"/><polygon points=\"208,168 208,161 203,168\" fill=\"#3b2418\"/><rect x=\"188\" y=\"168\" width=\"24\" height=\"22\" fill=\"#E87339\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"190,181 210,181 200,189\" fill=\"#fbeed8\"/><polygon points=\"189,182 189,189 195,189\" fill=\"#fbeed8\"/><polygon points=\"211,182 211,189 205,189\" fill=\"#fbeed8\"/><rect x=\"198\" y=\"181\" width=\"4\" height=\"3\" fill=\"#3b2418\"/><g class=\"chr-eyes\"><rect class=\"chr-eye\" x=\"194\" y=\"176\" width=\"4\" height=\"4\" fill=\"#3b2418\"/><rect class=\"chr-eye\" x=\"204\" y=\"176\" width=\"4\" height=\"4\" fill=\"#3b2418\"/></g></g></g></g></svg>",
  "<svg viewBox=\"173 146 54 46\" width=\"100%\" height=\"100%\" aria-hidden=\"true\" style=\"display:block\"><g class=\"chr\"><g class=\"chr-legs\"><rect class=\"chr-l1\" x=\"190\" y=\"216\" width=\"8\" height=\"14\" fill=\"#3b2418\"/><rect class=\"chr-l2\" x=\"202\" y=\"216\" width=\"8\" height=\"14\" fill=\"#3b2418\"/></g><g class=\"chr-up\"><g class=\"chr-tail\"><path d=\"M215 214Q240 216 235 190\" fill=\"none\" stroke=\"#3b2418\" stroke-width=\"9\" stroke-linecap=\"round\"/><path d=\"M215 214Q240 216 235 190\" fill=\"none\" stroke=\"#aaa49c\" stroke-width=\"4\" stroke-linecap=\"round\"/></g><g class=\"chr-al\"><rect x=\"178\" y=\"192\" width=\"8\" height=\"20\" rx=\"3\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"178\" y=\"209\" width=\"8\" height=\"6\" rx=\"2\" fill=\"#aaa49c\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/></g><g class=\"chr-ar\"><rect x=\"214\" y=\"192\" width=\"8\" height=\"20\" rx=\"3\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"214\" y=\"209\" width=\"8\" height=\"6\" rx=\"2\" fill=\"#aaa49c\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/></g><rect x=\"186\" y=\"190\" width=\"28\" height=\"26\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" /><g class=\"chr-head\"><polygon points=\"189,171 190,157 201,169\" fill=\"#aaa49c\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"211,171 210,157 199,169\" fill=\"#aaa49c\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"192,168 192,162 197,168\" fill=\"#f2a0a0\"/><polygon points=\"208,168 208,162 203,168\" fill=\"#f2a0a0\"/><rect x=\"188\" y=\"168\" width=\"24\" height=\"22\" fill=\"#aaa49c\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M196 169v4M200 169v5M204 169v4\" stroke=\"#7d7a74\" stroke-width=\"2\"/><rect x=\"194\" y=\"182\" width=\"12\" height=\"7\" rx=\"2\" fill=\"#fbeed8\"/><rect x=\"198\" y=\"181\" width=\"4\" height=\"3\" fill=\"#f2a0a0\"/><path d=\"M186 183l-6-1M186 186l-6 2M214 183l6-1M214 186l6 2\" stroke=\"#3b2418\" stroke-width=\"1.5\"/><g class=\"chr-eyes\"><rect class=\"chr-eye\" x=\"194\" y=\"176\" width=\"4\" height=\"4\" fill=\"#3b2418\"/><rect class=\"chr-eye\" x=\"204\" y=\"176\" width=\"4\" height=\"4\" fill=\"#3b2418\"/></g></g></g></g></svg>",
  "<svg viewBox=\"173 146 54 46\" width=\"100%\" height=\"100%\" aria-hidden=\"true\" style=\"display:block\"><g class=\"chr\"><g class=\"chr-legs\"><rect class=\"chr-l1\" x=\"190\" y=\"216\" width=\"8\" height=\"14\" fill=\"#3b2418\"/><rect class=\"chr-l2\" x=\"202\" y=\"216\" width=\"8\" height=\"14\" fill=\"#3b2418\"/></g><g class=\"chr-up\"><g class=\"chr-tail\"><circle cx=\"222\" cy=\"211\" r=\"5.5\" fill=\"#fdf6e8\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/></g><g class=\"chr-al\"><rect x=\"178\" y=\"192\" width=\"8\" height=\"20\" rx=\"3\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"178\" y=\"209\" width=\"8\" height=\"6\" rx=\"2\" fill=\"#f1e8dc\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/></g><g class=\"chr-ar\"><rect x=\"214\" y=\"192\" width=\"8\" height=\"20\" rx=\"3\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"214\" y=\"209\" width=\"8\" height=\"6\" rx=\"2\" fill=\"#f1e8dc\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/></g><rect x=\"186\" y=\"190\" width=\"28\" height=\"26\" fill=\"#8f9bc0\" stroke=\"#3b2418\" stroke-width=\"3\" /><g class=\"chr-head\"><rect x=\"190\" y=\"150\" width=\"7\" height=\"22\" rx=\"3.5\" fill=\"#f1e8dc\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"203\" y=\"150\" width=\"7\" height=\"22\" rx=\"3.5\" fill=\"#f1e8dc\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"192.5\" y=\"154\" width=\"2\" height=\"14\" fill=\"#f2a0a0\"/><rect x=\"205.5\" y=\"154\" width=\"2\" height=\"14\" fill=\"#f2a0a0\"/><rect x=\"188\" y=\"168\" width=\"24\" height=\"22\" fill=\"#f1e8dc\" stroke=\"#3b2418\" stroke-width=\"3\" stroke-linejoin=\"round\"/><rect x=\"189\" y=\"181\" width=\"5\" height=\"4\" fill=\"#f2a0a0\" opacity=\".8\"/><rect x=\"206\" y=\"181\" width=\"5\" height=\"4\" fill=\"#f2a0a0\" opacity=\".8\"/><rect x=\"198\" y=\"181\" width=\"4\" height=\"3\" fill=\"#f2a0a0\"/><rect x=\"198\" y=\"185\" width=\"4\" height=\"4\" fill=\"#fdf6e8\" stroke=\"#3b2418\" stroke-width=\"1.5\"/><g class=\"chr-eyes\"><rect class=\"chr-eye\" x=\"194\" y=\"176\" width=\"4\" height=\"4\" fill=\"#3b2418\"/><rect class=\"chr-eye\" x=\"204\" y=\"176\" width=\"4\" height=\"4\" fill=\"#3b2418\"/></g></g></g></g></svg>",
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ------------------------------------------------------------------ */
/* Section scrolling (same behavior as the HTML version)               */
/* Features -> lands on the FEATURES heading with breathing room above */
/* FAQs     -> lands just under the fixed header                       */
/* ------------------------------------------------------------------ */
const scrollToSection = (selector, getOffset) => {
  const el = document.querySelector(selector);
  if (!el) return;
  window.scrollTo({
    top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - getOffset()),
    behavior: 'smooth'
  });
};

const goFeatures = () =>
  scrollToSection('.fh', () =>
    Math.max(100, Math.min(Math.round(window.innerHeight * 0.38), window.innerHeight - 500))
  );

const goFaqs = () =>
  scrollToSection('.faq .st', () => (document.querySelector('header')?.offsetHeight || 88) + 48);

// Falling autumn leaves in the hero (22 leaves, random every visit)
const LEAF_COLORS = ['#d9803a', '#c4531c', '#e8a15a', '#b5651d', '#e87339'];
function makeLeaves() {
  const r = Math.random;
  const reduce = prefersReducedMotion();
  return Array.from({ length: 22 }, (_, k) => {
    const s = {
      left: `${r() * 100}%`,
      '--s': `${9 + r() * 8}px`,
      '--c': LEAF_COLORS[k % 5],
      '--d': `${16 + r() * 14}s`,
      '--dl': `-${r() * 28}s`,
      '--dx': `${(r() - 0.5) * 160}px`,
      '--r': `${(r() < 0.5 ? -1 : 1) * (240 + r() * 300)}deg`
    };
    if (reduce) {
      s.animation = 'none';
      s.top = `${r() * 90}vh`;
      s.transform = `rotate(${r() * 360}deg)`;
    }
    return s;
  });
}

/* ------------------------------------------------------------------ */
/* About / Contact / Terms / Privacy modals                            */
/* ------------------------------------------------------------------ */
const LEGAL_ICONS = {
  about: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7.5v.5" />
    </>
  ),
  contact: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  terms: (
    <>
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h7M9 16h7" />
    </>
  ),
  privacy: (
    <>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  )
};

// small icons used in place of the numbers (Contact modal)
const SEC_ICONS = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17v.5" />
    </>
  ),
  people: (
    <>
      <path d="M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5" />
    </>
  )
};

const LEGAL = {
  about: {
    tag: 'ABOUT',
    title: 'About StudyCircle',
    intro: 'StudyCircle is a cozy, AI-powered study room where you learn together with friends, guided by Kitsu the fox.',
    ok: 'GOT IT',
    sections: [
      ['Study together', 'Join or create pixel-art study rooms, share a checklist and a Pomodoro timer, and see who is focusing with you.'],
      ['Study smarter', 'Upload your notes and Kitsu turns them into summaries, flashcards, and pre and post tests. Each session gets a suggested technique that fits your task and time.'],
      ['Stay motivated', 'Earn XP, coins, badges, and streaks, then spend them on animals, outfits, and room decorations.'],
      ['Made to be calm', 'No pressure, no clutter. Just a warm room, a friend or two, and a plan for the next hour.']
    ]
  },
  contact: {
    tag: 'CONTACT',
    title: 'Contact Us',
    intro: 'Questions, feedback, or something not working? We would love to hear from you.',
    ok: 'EMAIL US',
    href: 'mailto:studycircle@gmail.com?subject=StudyCircle%20question',
    sections: [
      ['Email us', 'studycircle@gmail.com. Send us questions, ideas, or bug reports.', 'mail'],
      ['Reply time', 'We read every message and reply as soon as we can.', 'clock'],
      ['Account help', 'For login problems, try Forgot Password on the login page first. If it still fails, email us with your username and student ID.', 'help'],
      ['Community', 'Join the conversation on Discord, Facebook, or Reddit using the links in the footer.', 'people']
    ]
  },
  terms: {
    tag: 'LEGAL',
    title: 'Terms of Service',
    intro: 'By using StudyCircle, you agree to follow our community guidelines and code of conduct.',
    ok: 'I UNDERSTAND',
    sections: [
      ['Account Responsibility', 'You are responsible for all activity under your username.'],
      ['Respectful Behavior', 'Be supportive to fellow study circle members.'],
      ['Age Limit', 'You must be at least 18 years old to register an account.']
    ]
  },
  privacy: {
    tag: 'LEGAL',
    title: 'Privacy Policy',
    intro: 'We value your personal privacy and process data responsibly.',
    ok: 'I UNDERSTAND',
    sections: [
      ['Data Collection', 'We collect your email address and username for authentication.'],
      ['Data Usage', 'Your study data is used strictly to power your StudyCircle dashboard and rewards.'],
      ['Security', 'We do not sell your personal data to third-party services.']
    ]
  }
};

function LegalModal({ kind, onClose }) {
  const d = LEGAL[kind];
  const okRef = useRef(null);

  // Esc closes it, page scroll is locked while open, focus goes to the main button
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    okRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lg-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="lg">
        <div className="lg-h">
          <span className="lg-i" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
              {LEGAL_ICONS[kind]}
            </svg>
          </span>
          <div className="lg-t">
            <small>STUDYCIRCLE ★ {d.tag}</small>
            <h3 id="lg-title">{d.title}</h3>
          </div>
          <button type="button" className="lg-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>
        <div className="lg-b">
          <p className="lg-in">{d.intro}</p>
          {d.sections.map(([h, p, ic], k) => (
            <div className="lg-s" key={h}>
              <span className={`lg-n${ic ? ' ic' : ''}`}>
                {ic ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {SEC_ICONS[ic]}
                  </svg>
                ) : (
                  k + 1
                )}
              </span>
              <div>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="lg-f">
          <span>Thanks for being part of the circle! ★</span>
          {d.href ? (
            <a className="lg-ok" href={d.href} ref={okRef}>{d.ok}</a>
          ) : (
            <button type="button" className="lg-ok" ref={okRef} onClick={onClose}>{d.ok}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Endless, snapping feature carousel (3 copies of the list so there is always a card on both sides)
function Carousel() {
  const csRef = useRef(null);
  const iRef = useRef(0);
  const paused = useRef(false);
  const drag = useRef({ on: false, x: 0, left: 0 });
  const [active, setActive] = useState(0);
  const N = CAROUSEL_CARDS.length;

  const cards = () => csRef.current.children;
  const ctr = (el) => el.offsetLeft - csRef.current.clientWidth / 2 + el.offsetWidth / 2;
  const near = () => {
    const cs = csRef.current;
    const mid = cs.scrollLeft + cs.clientWidth / 2;
    let best = 0;
    let bestDist = 1e9;
    [...cards()].forEach((c, k) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = k; }
    });
    return best;
  };
  const mark = (n) => { iRef.current = n; setActive(n); };
  const jump = (x) => {
    const cs = csRef.current;
    cs.style.scrollSnapType = 'none';
    cs.style.scrollBehavior = 'auto';
    cs.scrollLeft = x;
    cs.style.scrollBehavior = '';
    cs.style.scrollSnapType = '';
  };
  const go = (n) => {
    const cs = csRef.current;
    if (!cs) return;
    const i = (n + N) % N;
    mark(i);
    cs.scrollTo({ left: ctr(cards()[N + i]), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const cs = csRef.current;
    let t;
    jump(ctr(cards()[N]));
    mark(0);
    // once scrolling stops, silently hop back to the middle copy so the loop never runs out
    const onScroll = () => {
      const g = near();
      if (g % N !== iRef.current) mark(g % N);
      clearTimeout(t);
      t = setTimeout(() => {
        const g2 = near();
        if (g2 < N || g2 >= 2 * N) jump(ctr(cards()[N + (g2 % N)]));
      }, 140);
    };
    const onResize = () => jump(ctr(cards()[N + iRef.current]));
    cs.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cs.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
    };
  }, []);

  // auto-advance every 2.6s (paused while hovering, touching or dragging)
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => {
      if (!paused.current && !document.hidden) go(iRef.current + 1);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  // mouse drag to scroll
  const onMouseDown = (e) => {
    const cs = csRef.current;
    drag.current = { on: true, x: e.pageX, left: cs.scrollLeft };
    cs.style.scrollSnapType = 'none';
    cs.style.scrollBehavior = 'auto';
    cs.classList.add('dragging');
  };
  const onMouseMove = (e) => {
    if (!drag.current.on) return;
    e.preventDefault();
    csRef.current.scrollLeft = drag.current.left - (e.pageX - drag.current.x) * 1.2;
  };
  const endDrag = () => {
    if (!drag.current.on) return;
    drag.current.on = false;
    const cs = csRef.current;
    cs.classList.remove('dragging');
    cs.style.scrollBehavior = '';
    cs.style.scrollSnapType = '';
    cs.scrollTo({ left: ctr(cards()[near()]), behavior: 'smooth' });
  };

  return (
    <div
      className="cw"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; endDrag(); }}
      onTouchStart={() => { paused.current = true; }}
      onTouchEnd={() => { paused.current = false; }}
    >
      <div
        className="cs"
        ref={csRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
      >
        {[0, 1, 2].map((copy) =>
          CAROUSEL_CARDS.map((c) => (
            <div className="cd" key={`${copy}-${c.id}`} aria-hidden={copy !== 1 ? 'true' : undefined}>
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.path} />
                </svg>
              </div>
              <h3>{c.title}</h3>
              <p>{c.description}</p>
            </div>
          ))
        )}
      </div>
      <div className="dots" style={{ marginTop: '8px' }}>
        {CAROUSEL_CARDS.map((c, k) => (
          <i
            key={c.id}
            className={active === k ? 'on' : ''}
            role="button"
            tabIndex={0}
            aria-label={`Show ${c.title}`}
            onClick={() => go(k)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(k); } }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [leaves] = useState(makeLeaves);
  const { hash } = useLocation();

  // About / Contact / Terms / Privacy modal: null = closed, otherwise 'about' | 'contact' | 'terms' | 'privacy'
  const [legal, setLegal] = useState(null);
  const closeLegal = useCallback(() => setLegal(null), []);
  const openLegal = (kind) => (e) => { e.preventDefault(); setLegal(kind); };

  // smooth anchor scrolling that leaves room for the fixed header
  useEffect(() => {
    const el = document.documentElement;
    const prev = { b: el.style.scrollBehavior, t: el.style.scrollPaddingTop };
    el.style.scrollBehavior = 'smooth';
    el.style.scrollPaddingTop = '90px';
    return () => { el.style.scrollBehavior = prev.b; el.style.scrollPaddingTop = prev.t; };
  }, []);

  // arriving from another page with /#section-2 or /#section-3 (e.g. from the login page)
  useEffect(() => {
    if (hash === '#section-2') setTimeout(goFeatures, 50);
    if (hash === '#section-3') setTimeout(goFaqs, 50);
  }, [hash]);

  return (
    <div className="sc">
      {/* HEADER */}
      <header>
        <div className="hd">
          <a className="logo ps" href="#">
            <span className="fox" aria-hidden="true" />
            <span>StudyCircle</span>
          </a>
          <div className="auth">
            <Link to="/auth#login" className="btn">LOGIN</Link>
            <Link to="/auth#signup" className="btn p">SIGN UP</Link>
          </div>
          <nav>
            <a href="#">Home</a>
            <a href="#section-2" onClick={(e) => { e.preventDefault(); goFeatures(); }}>Features</a>
            <a href="#section-3" onClick={(e) => { e.preventDefault(); goFaqs(); }}>FAQs</a>
          </nav>
        </div>
      </header>

      {/* HERO + FEATURES */}
      <section className="hero" id="hero-and-showcase">
        <div className="glow" style={{ left: 'calc(10% - 450px)', top: '11vh' }} />
        <div className="glow" style={{ left: '90%', top: '59vh' }} />
        <div className="fl ck" aria-hidden="true">
          <span className="spk" style={{ right: '-16px', top: '-14px' }}>✦</span>
          <span className="spk" style={{ right: '-26px', top: '8px', fontSize: '14px' }}>✦</span>
          <div className="bar">
            <i className="tk">✓</i>
            SHARED CHECKLIST
          </div>
          <ul>
            <li className="d">Read Chapter 4: Vectors</li>
            <li className="d">Watch eigenvalue lecture</li>
            <li>Solve practice set 3.1–3.8</li>
            <li>Make flashcards for theorems</li>
            <li>Review pre-test mistakes</li>
          </ul>
        </div>
        <div className="fl pm" aria-hidden="true">
          <span className="spk" style={{ left: '-20px', bottom: '30px' }}>✦</span>
          <span className="spk" style={{ left: '-32px', bottom: '8px', fontSize: '14px' }}>✦</span>
          <div className="bar">
            <i className="tm" />
            POMODORO
          </div>
          <div className="ring">
            <span>
              21:50
              <small>FOCUS</small>
            </span>
          </div>
          <div className="r">
            <span>❚❚ PAUSE</span>
            <span>↻ RESET</span>
          </div>
          <div className="sg">
            <i className="f" />
            <i className="f" />
            <i />
            <i />
          </div>
          <div className="ss">SESSION 2 OF 4 · BREAK IN 25:00</div>
        </div>
        <div className="in">
          <h1 className="t">
            Study with
            <br />
            Friends.
            <br />
            <span className="grad">Level up</span>
            <br />
            Together.
          </h1>
          <p className="lead">
            StudyCircle is a cozy, AI-powered learning RPG. Upload your notes, generate pre & post-tests, hop into pixel-art study rooms, and earn XP, badges, and decorations along the way.
          </p>
          <div className="cta">
            <Link to="/auth#signup" className="btn g">
              START STUDYING
              {' '}
              <svg viewBox="0 0 10 8" width="20" height="16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" style={{ marginLeft: '10px', marginTop: '-6px' }}>
                <path d="M0 3h8v2H0zM6 1h1v6H6zM7 2h1v4H7zM8 3h2v2H8z" />
              </svg>
            </Link>
            <Link to="/auth#login" className="btn">I HAVE AN ACCOUNT</Link>
          </div>
          <div className="proof">
            <span className="av" aria-hidden="true">
              {AV_FACES.map((f, k) => (
                <b key={k} dangerouslySetInnerHTML={{ __html: f }} />
              ))}
            </span>
            <p style={{ margin: '0' }}>
              <b>1,245</b>
              {' '}
              students leveling up today
            </p>
          </div>
          <div className="room">
            <div className="g2" />
            <div className="rm">
              <svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Kitsu the fox sitting in a cozy study room">
                <defs>
                  <pattern id="wp" width="40" height="40" patternUnits="userSpaceOnUse">
                    <rect width="40" height="40" fill="#ecd2ad" />
                    <rect width="20" height="40" fill="#e7cba3" />
                    <rect x="8" y="14" width="4" height="4" fill="#dfbd90" />
                    <rect x="28" y="30" width="4" height="4" fill="#dfbd90" />
                  </pattern>
                  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffe6bf" />
                    <stop offset="1" stopColor="#ffb27a" />
                  </linearGradient>
                </defs>
                <rect width="640" height="296" fill="url(#wp)" />
                <rect y="262" width="640" height="34" fill="#c9a17a" />
                <path d="M0 262H640" stroke="#3b2418" strokeWidth="3" />
                <rect y="292" width="640" height="108" fill="#b27a47" />
                <path d="M0 326H640M0 360H640M90 292V326M230 292V326M370 292V326M510 292V326M40 326V360M180 326V360M320 326V360M460 326V360M600 326V360M120 360V400M260 360V400M400 360V400M540 360V400" stroke="#8d5d33" strokeWidth="3" />
                <path d="M0 294H640" stroke="#3b2418" strokeWidth="5" />
                <path d="M0 14Q160 66 320 14Q480 66 640 14" fill="none" stroke="#3b2418" strokeWidth="3" />
                <polygon points="31,20 49,20 40,40" fill="#E87339" stroke="#3b2418" strokeWidth="2" />
                <polygon points="71,24 89,24 80,44" fill="#F5C73B" stroke="#3b2418" strokeWidth="2" />
                <polygon points="111,26 129,26 120,46" fill="#c4531c" stroke="#3b2418" strokeWidth="2" />
                <polygon points="151,27 169,27 160,47" fill="#fbeed8" stroke="#3b2418" strokeWidth="2" />
                <polygon points="191,26 209,26 200,46" fill="#E87339" stroke="#3b2418" strokeWidth="2" />
                <polygon points="231,24 249,24 240,44" fill="#F5C73B" stroke="#3b2418" strokeWidth="2" />
                <polygon points="271,20 289,20 280,40" fill="#c4531c" stroke="#3b2418" strokeWidth="2" />
                <polygon points="351,20 369,20 360,40" fill="#fbeed8" stroke="#3b2418" strokeWidth="2" />
                <polygon points="391,24 409,24 400,44" fill="#E87339" stroke="#3b2418" strokeWidth="2" />
                <polygon points="431,26 449,26 440,46" fill="#F5C73B" stroke="#3b2418" strokeWidth="2" />
                <polygon points="471,27 489,27 480,47" fill="#c4531c" stroke="#3b2418" strokeWidth="2" />
                <polygon points="511,26 529,26 520,46" fill="#fbeed8" stroke="#3b2418" strokeWidth="2" />
                <polygon points="551,24 569,24 560,44" fill="#E87339" stroke="#3b2418" strokeWidth="2" />
                <polygon points="591,20 609,20 600,40" fill="#F5C73B" stroke="#3b2418" strokeWidth="2" />
                <rect x="244" y="34" width="152" height="130" rx="8" fill="#7a4e2c" stroke="#3b2418" strokeWidth="4" />
                <rect x="256" y="46" width="128" height="106" fill="url(#sky)" stroke="#3b2418" strokeWidth="3" />
                <circle cx="322" cy="104" r="20" fill="#ffd470" />
                <path d="M256 152V128Q286 104 318 124T384 114V152Z" fill="#e0813f" />
                <circle cx="276" cy="124" r="10" fill="#c4531c" />
                <circle cx="360" cy="122" r="12" fill="#F5C73B" />
                <circle cx="343" cy="132" r="9" fill="#E87339" />
                <path d="M320 46V152M256 99H384" stroke="#7a4e2c" strokeWidth="5" />
                <rect x="238" y="160" width="164" height="12" fill="#a8703d" stroke="#3b2418" strokeWidth="3" />
                <rect x="30" y="140" width="176" height="10" fill="#a8703d" stroke="#3b2418" strokeWidth="3" />
                <path d="M50 150v14M186 150v14" stroke="#3b2418" strokeWidth="4" />
                <rect x="40" y="106" width="14" height="34" fill="#c4531c" stroke="#3b2418" strokeWidth="3" />
                <rect x="56" y="112" width="12" height="28" fill="#F5C73B" stroke="#3b2418" strokeWidth="3" />
                <rect x="70" y="102" width="16" height="38" fill="#6b8a4f" stroke="#3b2418" strokeWidth="3" />
                <rect x="88" y="110" width="12" height="30" fill="#E87339" stroke="#3b2418" strokeWidth="3" />
                <rect x="102" y="104" width="15" height="36" fill="#7a4e2c" stroke="#3b2418" strokeWidth="3" />
                <rect x="119" y="114" width="12" height="26" fill="#fbeed8" stroke="#3b2418" strokeWidth="3" />
                <rect x="133" y="108" width="14" height="32" fill="#c4531c" stroke="#3b2418" strokeWidth="3" />
                <rect x="149" y="111" width="13" height="29" fill="#F5C73B" stroke="#3b2418" strokeWidth="3" />
                <rect x="168" y="104" width="26" height="22" fill="#c4531c" stroke="#3b2418" strokeWidth="3" />
                <path d="M181 104c-12-14-4-24 0-26 4 2 12 12 0 26z" fill="#6b8a4f" stroke="#3b2418" strokeWidth="3" />
                <rect x="468" y="96" width="62" height="78" fill="#fbeed8" stroke="#3b2418" strokeWidth="5" />
                <rect x="478" y="106" width="42" height="58" fill="#ffd9a8" />
                <path d="M499 160c-22-6-24-34-4-44 4 16 18 20 4 44z" fill="#E87339" stroke="#3b2418" strokeWidth="3" />
                <rect x="546" y="112" width="44" height="44" fill="#fbeed8" stroke="#3b2418" strokeWidth="5" />
                <circle cx="568" cy="134" r="10" fill="#F5C73B" stroke="#3b2418" strokeWidth="3" />
                <rect x="430" y="246" width="190" height="14" fill="#a8703d" stroke="#3b2418" strokeWidth="4" />
                <rect x="442" y="260" width="72" height="54" fill="#7a4e2c" stroke="#3b2418" strokeWidth="4" />
                <path d="M442 287H514" stroke="#3b2418" strokeWidth="3" />
                <rect x="472" y="270" width="12" height="4" fill="#F5C73B" />
                <rect x="472" y="296" width="12" height="4" fill="#F5C73B" />
                <rect x="594" y="260" width="14" height="54" fill="#7a4e2c" stroke="#3b2418" strokeWidth="4" />
                <path d="M528 246L514 188L552 176" fill="none" stroke="#2f6b3a" strokeWidth="6" strokeLinecap="round" />
                <rect x="512" y="236" width="34" height="10" fill="#2f6b3a" stroke="#3b2418" strokeWidth="3" />
                <ellipse cx="560" cy="176" rx="22" ry="10" transform="rotate(20 560 176)" fill="#3b8a4a" stroke="#3b2418" strokeWidth="3" />
                <path d="M548 186L588 242H540Z" fill="#fff3c4" opacity=".35" />
                <rect x="566" y="214" width="40" height="12" fill="#c4531c" stroke="#3b2418" strokeWidth="3" />
                <rect x="570" y="202" width="34" height="12" fill="#6b8a4f" stroke="#3b2418" strokeWidth="3" />
                <rect x="598" y="228" width="16" height="18" fill="#fbeed8" stroke="#3b2418" strokeWidth="3" />
                <ellipse cx="300" cy="352" rx="156" ry="30" fill="#F5C73B" stroke="#3b2418" strokeWidth="4" />
                <ellipse cx="300" cy="352" rx="124" ry="20" fill="none" stroke="#fbeed8" strokeWidth="3" strokeDasharray="8 6" />
                <ellipse cx="300" cy="350" rx="52" ry="9" fill="#3b2418" opacity=".3" />
                <image href="/media/kitsu_fox.png" x="230" y="184" width="140" height="168" style={{ imageRendering: 'pixelated' }} />
                <rect x="388" y="334" width="30" height="24" fill="#c4531c" stroke="#3b2418" strokeWidth="3" />
                <path d="M403 334c-16-4-22-20-18-30 10 2 16 12 18 30zM403 334c16-4 24-18 20-28-10 2-18 10-20 28z" fill="#6b8a4f" stroke="#3b2418" strokeWidth="3" />
                <circle cx="478" cy="352" r="10" fill="#F5C73B" stroke="#3b2418" strokeWidth="3" />
                <g fill="#f2b84b">
                  <rect x="214" y="206" width="6" height="6" />
                  <rect x="396" y="210" width="6" height="6" />
                  <rect x="450" y="378" width="6" height="6" />
                  <rect x="170" y="376" width="6" height="6" />
                </g>
              </svg>
              <div className="tag t1">
                <i className="ti">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
                  </svg>
                </i>
                <span>
                  <b>+300 Coins</b>
                  <small>Pre-Test Cleared!</small>
                </span>
              </div>
              <div className="tag t2">
                <i className="ti">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                    <path d="M13 2L5 14h6l-1 8 8-12h-6z" />
                  </svg>
                </i>
                <span>
                  <b>+20 XP</b>
                  <small>Day 2 Login</small>
                </span>
              </div>
              <div className="tag t3">
                <i className="ti">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </i>
                <span>
                  <b>Task Done!</b>
                  <small>Ask Kitsu for questions!</small>
                </span>
              </div>
            </div>
          </div>
          <div className="fh" id="section-2">
            <span>★</span>
            <h2 style={{ margin: '0', font: 'inherit' }}>FEATURES</h2>
            <span>★</span>
          </div>
          <p className="tg grad">
            Every Tool you need.
            <br />
            None of the Boring.
          </p>
        </div>
        <Carousel />
        <div className="lv" aria-hidden="true">
          {leaves.map((s, k) => (
            <i key={k} style={s} />
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="ctas">
        <div className="st">
          <span>★</span>
          <span>IMPROVE LEARNING TODAY</span>
          <span>★</span>
        </div>
        <h2>Ready to level up your learning journey?</h2>
        <p>
          Upload notes, generate quizzes with AI, study with friends, and earn rewards as you progress toward your academic goals.
        </p>
        <Link to="/auth#signup" className="btn">JOIN STUDYCIRCLE</Link>
      </section>

      {/* FAQS */}
      <section className="faq" id="section-3">
        <div className="fq">
          <div className="st">
            <span>★</span>
            <h2 style={{ margin: '0', font: 'inherit' }}>FREQUENTLY ASKED QUESTIONS</h2>
            <span>★</span>
          </div>
          <h3>The questions you’re probably asking.</h3>
        </div>
        <div className="list">
          <details>
            <summary>
              <span>Is StudyCircle Free?</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div>
              <p>
                Yes! StudyCircle is completely free to use. We believe in providing students with the best tools to enhance their learning experience without any cost.
              </p>
            </div>
          </details>
          <details>
            <summary>
              <span>How does the AI Learning Assistant work?</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div>
              <p>
                Upload your notes, PDFs, or simply enter a topic, and let AI transform your study materials into personalized summaries, interactive flashcards, and engaging quizzes designed to help you learn faster, retain more information, and prepare effectively for exams.
              </p>
            </div>
          </details>
          <details>
            <summary>
              <span>Can I study alone?</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div>
              <p>
                Absolutely! You can create a private study room just for yourself and use all of StudyCircle’s features, including the AI Learning Assistant, flashcards, summaries, and quizzes. Whether you prefer solo studying or collaborating with others, StudyCircle is designed to support both.
              </p>
            </div>
          </details>
          <details>
            <summary>
              <span>What’s the max room size?</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div>
              <p>
                Each study room can have up to 6 players at a time. This keeps sessions interactive, organized, and productive while giving everyone a chance to participate.
              </p>
            </div>
          </details>
        </div>
        <div className="q">
          <h4>Still have questions?</h4>
          <a href="mailto:studycircle@gmail.com">Contact us at studycircle@gmail.com</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="j">
          <div className="l">
            <span className="fox" aria-hidden="true" />
            <div>
              <div className="e">★ JOIN THE CIRCLE ★</div>
              <h3>Kitsu is waiting.</h3>
              <p>Level up your learning with AI-powered study adventures.</p>
            </div>
          </div>
          <Link to="/auth#signup" className="btn g">JOIN NOW!</Link>
        </div>
        <div className="fg">
          <div className="a">
            <div className="e" style={{ font: "12px 'Press Start 2P',monospace", color: 'var(--primary)', letterSpacing: '.1em' }}>
              <span className="fox" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', width: '24px', height: '29px', marginRight: '8px' }} />
              STUDYCIRCLE
            </div>
            <p>
              Turn studying into an adventure with StudyCircle! Upload your notes, let AI create personalized quizzes, join cozy pixel-art study rooms, and level up with XP, badges, and exciting rewards as you learn.
            </p>
            <p>🪙 12,000+ students leveling up today</p>
          </div>
          <div>
            <h4>PRODUCT</h4>
            <nav>
              <a href="#section-2" onClick={(e) => { e.preventDefault(); goFeatures(); }}>Features</a>
              <a href="#section-3" onClick={(e) => { e.preventDefault(); goFaqs(); }}>FAQs</a>
              <Link to="/auth#signup">Learn Now!</Link>
              <Link to="/auth#login">Login</Link>
            </nav>
          </div>
          <div>
            <h4>COMMUNITY</h4>
            <nav>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://reddit.com" target="_blank" rel="noopener noreferrer">Reddit</a>
            </nav>
          </div>
          <div>
            <h4>COMPANY</h4>
            <nav>
              <a href="#about" onClick={openLegal('about')}>About</a>
              <a href="#privacy" onClick={openLegal('privacy')}>Privacy</a>
              <a href="#terms" onClick={openLegal('terms')}>Terms</a>
              <a href="#contact" onClick={openLegal('contact')}>Contact</a>
            </nav>
          </div>
        </div>
        <div className="cp">
          <span>✦ © 2026 StudyCircle · Brewed with chamomile</span>
          <span>V1.0 · All rights reserved</span>
        </div>
      </footer>

      {/* ABOUT / CONTACT / TERMS / PRIVACY MODAL */}
      {legal && <LegalModal kind={legal} onClose={closeLegal} />}
    </div>
  );
}