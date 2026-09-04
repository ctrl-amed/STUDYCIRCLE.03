import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// Password Rules & Standard Guidance Text (Matching Auth.jsx)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,}$/;
const defaultGuideText =
  'Create a strong password using 8 or more characters, including uppercase and lowercase letters, a number, and a special character.';

export default function ChangePassword() {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token');

  console.log("Current Token from URL (Fixed):", token);

  // Form Field State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility State
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Live Validation State
  const [newPasswordErr, setNewPasswordErr] = useState('');
  const [confirmPasswordErr, setConfirmPasswordErr] = useState(defaultGuideText);
  const [isConfirmPasswordCustomError, setIsConfirmPasswordCustomError] = useState(false);

  // Toasts State
  const [toasts, setToasts] = useState([]);

  // Toast Helper Function
  const triggerToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Check for incoming success toast from local storage if redirected internally
  useEffect(() => {
    if (localStorage.getItem('passwordChangedSuccess') === 'true') {
      localStorage.removeItem('passwordChangedSuccess');
      triggerToast('Password changed successfully!');
    }
  }, []);

  // --- LIVE VALIDATION FUNCTIONS (Matching Auth.jsx) ---
  const validateNewPassword = (val = newPassword) => {
    if (val === '') {
      setNewPasswordErr("Password field can't be empty.");
      return false;
    }
    if (!passwordRegex.test(val)) {
      setNewPasswordErr(
        'Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
      );
      return false;
    }
    setNewPasswordErr('');
    return true;
  };

  const validateConfirmPassword = (confirmVal = confirmPassword, mainVal = newPassword) => {
    if (confirmVal === '') {
      setConfirmPasswordErr("Confirm password field can't be empty.");
      setIsConfirmPasswordCustomError(true);
      return false;
    }
    if (mainVal !== confirmVal) {
      setConfirmPasswordErr('Passwords do not match.');
      setIsConfirmPasswordCustomError(true);
      return false;
    }
    setConfirmPasswordErr(defaultGuideText);
    setIsConfirmPasswordCustomError(false);
    return true;
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Current Token from URL:", token);

    const isPassValid = validateNewPassword();
    const isConfirmValid = validateConfirmPassword();

    if (!isPassValid || !isConfirmValid) return;
    if (!token) {
      triggerToast("Error: Reset token is missing or invalid.");
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, new_password: newPassword })
      });
      
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('passwordChangedSuccess', 'true');
        navigate('/auth#login');
      } else {
        triggerToast(`Error: ${data.error}`);
      }
    } catch (err) {
      triggerToast('Unable to connect to server.');
      console.error(err);
    }
  };

  return (
    <div className="bg-gray-100 antialiased scroll-smooth min-h-screen flex flex-col justify-between">
      {/* ================= HEADER SECTION (ALIGNED WITH AUTH.JSX) ================= */}
      <header
        className="fixed top-0 left-0 w-full z-50 bg-theme-surface"
        style={{
          backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.08) 1px, transparent 1px)',
          backgroundSize: '100% 5px',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex flex-wrap items-center justify-between gap-2 md:gap-4">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <img src="media/kitsu_logo.png" alt="Kitsu Logo" className="h-8 sm:h-9 md:h-10 w-auto block" />
            <span className="font-pressstart text-[11px] md:text-[15px] text-theme-dark hidden sm:block">
              StudyCircle
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 order-2 md:order-3">
            <Link
              to="/auth#login"
              className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark bg-theme-muted border-2 md:border-2 border-theme-dark px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 block text-center transition-all duration-150 retro-shadow cursor-pointer"
            >
              LOGIN
            </Link>
            <Link
              to="/auth#signup"
              className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-surface bg-theme-primary border-2 md:border-2 border-theme-dark px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 block text-center transition-all duration-150 retro-shadow cursor-pointer"
            >
              SIGN UP
            </Link>
          </div>

          <nav className="w-full md:w-auto flex justify-center gap-4 sm:gap-5 md:gap-6 order-3 md:order-2 pt-2 md:pt-0 border-t-2 border-dashed border-[#4A2E21] md:border-none">
            <Link to="/" className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark hover:text-theme-primary no-underline transition-colors">
              Home
            </Link>
            <Link to="/#section-2" className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark hover:text-theme-primary no-underline transition-colors">
              Features
            </Link>
            <Link to="/#section-3" className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark hover:text-theme-primary no-underline transition-colors">
              FAQs
            </Link>
          </nav>
        </div>
      </header>

      {/* ================= HERO & FORM SECTION (ALIGNED WITH AUTH.JSX HERO) ================= */}
      <section id="hero-and-showcase" className="relative w-full min-h-screen bg-theme-surface pt-15 md:pt-20 flex flex-col items-center justify-center overflow-hidden flex-1">
        <div
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.08) 1px, transparent 1px)',
            backgroundSize: '100% 5px',
          }}
        />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[100vh] sm:h-[110vh] z-0 pointer-events-none">
          <div
            className="absolute left-[20%] sm:left-[25%] md:left-[90%] top-[10%] sm:top-[8%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full pointer-events-none opacity-50 filter blur-3xl mix-blend-screen"
            style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)' }}
          />
          <div
            className="absolute right-[20%] sm:right-[25%] md:right-[90%] top-[52%] sm:top-[54%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full pointer-events-none opacity-50 filter blur-3xl mix-blend-screen"
            style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)' }}
          />

          <img
            src="media/calendar_feature.png"
            alt="Checklist"
            className="absolute animate-checklist-appear drop-shadow-2xl z-10 w-28 sm:w-64 md:w-80 lg:w-[350px] left-[2%] sm:left-[-4%] md:left-[-2%] lg:left-[-3%] top-[13%] sm:top-[12%] md:top-[15%]"
          />
          <img
            src="media/study_feature.png"
            alt="Pomodoro"
            className="absolute animate-pomodoro-appear drop-shadow-2xl z-10 w-28 sm:w-64 md:w-80 lg:w-[350px] right-[2%] sm:right-[-4%] md:right-[-2%] lg:right-[-3%] top-[90%] sm:top-[57%] md:top-[60%] lg:top-[55%]"
          />
        </div>

        <div className="relative z-10 max-w-6xl w-full px-6 flex flex-col items-center justify-center my-auto pt-12 md:pt-20 pb-6">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-3xl p-6 w-full max-w-md shadow-md">
            {/* CHANGE PASSWORD FORM */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <h2 className="font-pressstart text-xl text-theme-dark">Change Password</h2>
              <p className="font-pixel text-lg text-theme-dark">
                Create a new password to secure your account.
              </p>

              {/* New Password Field */}
              <div className="flex flex-col gap-1">
                <label className="font-pressstart text-[10px] text-theme-dark">NEW PASSWORD</label>
                <div className="relative w-full">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      validateNewPassword(e.target.value);
                      if (confirmPassword !== '') validateConfirmPassword(confirmPassword, e.target.value);
                    }}
                    placeholder="........"
                    className={`border-2 bg-theme-muted p-2 pr-10 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                      newPasswordErr ? 'border-[#A94A4A]' : 'border-theme-dark'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#563B2D] hover:text-theme-primary bg-transparent border-none p-0 cursor-pointer flex items-center justify-center focus:outline-none"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      {showNewPassword ? (
                        <path strokeLinecap="square" strokeLinejoin="square" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      ) : (
                        <>
                          <path strokeLinecap="square" strokeLinejoin="square" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="square" strokeLinejoin="square" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                {newPasswordErr && <p className="font-pixel text-sm text-[#A94A4A] mt-0.5">✘ {newPasswordErr}</p>}
              </div>

              {/* Confirm New Password Field */}
              <div className="flex flex-col gap-1">
                <label className="font-pressstart text-[10px] text-theme-dark">CONFIRM NEW PASSWORD</label>
                <div className="relative w-full">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      validateConfirmPassword(e.target.value, newPassword);
                    }}
                    placeholder="........"
                    className={`border-2 bg-theme-muted p-2 pr-10 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                      isConfirmPasswordCustomError ? 'border-[#A94A4A]' : 'border-theme-dark'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#563B2D] hover:text-theme-primary bg-transparent border-none p-0 cursor-pointer flex items-center justify-center focus:outline-none"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      {showConfirmPassword ? (
                        <path strokeLinecap="square" strokeLinejoin="square" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.243L9.88 9.88" />
                      ) : (
                        <>
                          <path strokeLinecap="square" strokeLinejoin="square" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="square" strokeLinejoin="square" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                <p
                  className={`font-pixel leading-tight mt-1 transition-colors duration-150 ${
                    isConfirmPasswordCustomError ? 'text-[#A94A4A] text-sm' : 'text-theme-dark text-[10px] sm:text-[12px] md:text-[14px] lg:text-[16px]'
                  }`}
                >
                  {isConfirmPasswordCustomError ? `✘ ${confirmPasswordErr}` : confirmPasswordErr}
                </p>
              </div>

              <button
                type="submit"
                className="font-pressstart text-theme-surface bg-theme-primary border-4 border-theme-dark py-3 mt-2 transition-all duration-150 retro-shadow cursor-pointer"
              >
                CHANGE PASSWORD
              </button>
            </form>
          </div>
        </div>

        {/* ================= TOASTS CONTAINER ================= */}
        <div id="toast-container" className="fixed top-28 right-6 z-50 pointer-events-none flex flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-theme-surface border-4 border-theme-dark p-4 flex flex-col gap-2 relative shadow-md transition-all duration-300 max-w-xs retro-shadow pointer-events-auto opacity-100 translate-y-0 rounded-none! overflow-hidden"
              style={{ boxShadow: '4px 4px 0px #3D2013' }}
            >
              <div className="flex items-center gap-3 pr-2">
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="#788D55" strokeWidth="4" strokeLinecap="square" strokeLinejoin="square" />
                </svg>
                <span className="font-pressstart text-[11px] sm:text-[12px] text-[#482A1D] tracking-wide whitespace-normal break-words leading-snug">
                  {toast.message}
                </span>
              </div>
              <div className="w-full bg-transparent h-1.5 flex justify-center mt-auto overflow-hidden">
                <div className="w-full h-full bg-theme-safe animate-progress-center"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FOOTER SECTION (ALIGNED WITH AUTH.JSX) ================= */}
      <footer
        className="text-theme-surface border-t-4 border-theme-dark"
        style={{
          backgroundColor: '#482A1D',
          backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.25) 1px, transparent 1px)',
          backgroundSize: '100% 5px',
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
                <h3 className="font-pressstart text-[11px] sm:text-lg md:text-[24px] text-theme-muted leading-none">Kitsu is waiting.</h3>
                <p className="font-pixel text-[15px] sm:text-[20px] md:text-[20px] text-theme-surface leading-none select-none">Level up your learning with AI-powered study adventures.</p>
              </div>
            </div>
            <div className="shrink-0">
              <Link
                to="/auth#signup"
                className="font-pressstart text-[7px] sm:text-[10px] md:text-[12px] text-theme-surface bg-theme-safe border-[2px] md:border-2 border-theme-dark px-3 py-2 sm:px-5 sm:py-3 md:px-6 md:py-3.5 block text-center transition-all duration-150 retro-shadow cursor-pointer"
              >
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
              <p className="font-pixel text-[15px] sm:text-[20px] md:text-[20px] text-theme-surface leading-[1.2] select-none">
                Turn studying into an adventure with StudyCircle! Upload your notes, let AI create personalized quizzes, join cozy pressstart-art study rooms, and level up with XP, badges, and exciting rewards as you learn.
              </p>
              <div className="flex items-center gap-2 mt-2 select-none">
                <img src="media/coin_logo.png" alt="Coin Logo" className="w-[31px] h-[31px] object-contain block" />
                <span className="font-pixel text-[15px] sm:text-[20px] md:text-[20px] text-theme-surface leading-none select-none">12,000+ students leveling up today</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2 lg:col-start-7">
              <h4 className="font-pressstart text-[10px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">PRODUCT</h4>
              <nav className="flex flex-col gap-2">
                <Link to="/#section-2" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Features</Link>
                <Link to="/#section-3" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">FAQs</Link>
                <Link to="/" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Learn Now!</Link>
                <Link to="/auth#login" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit text-left cursor-pointer">Login</Link>
              </nav>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <h4 className="font-pressstart text-[10px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">COMMUNITY</h4>
              <nav className="flex flex-col gap-2">
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Discord</a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Facebook</a>
                <a href="https://reddit.com" target="_blank" rel="noopener noreferrer" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Reddit</a>
              </nav>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <h4 className="font-pressstart text-[10px] sm:text-[10px] md:text-[12px] text-theme-primary tracking-wider uppercase">COMPANY</h4>
              <nav className="flex flex-col gap-2">
                <Link to="/#about" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">About</Link>
                <Link to="/#privacy" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Privacy</Link>
                <Link to="/#terms" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Terms</Link>
                <Link to="/#contact" className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit">Contact</Link>
              </nav>
            </div>
          </div>

          <div className="w-full border-b border-[#E16F37]/10 select-none pb-4"></div>

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