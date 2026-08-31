import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useLoading } from './context/LoadingContext';

// Mock database arrays for validation checks
const mockDatabase = ['user@studycircle.app', 'acorn@studycircle.app', 'admin@studycircle.app'];
const mockUsernames = ['acorn_hero', 'study_master', 'admin_boss'];

// Mock Account Credentials
const userAccount = {
  email: 'user@studycircle.app',
  password: 'password123',
};

const adminAccount = {
  email: 'admin@studycircle.app',
  password: 'adminpassword123',
};

// Password Rules & Standard Guidance Text
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,}$/;
const defaultGuideText =
  'Create a strong password using 8 or more characters, including uppercase and lowercase letters, a number, and a special character.';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { startSimulatedLoad } = useLoading();

  // Active View State: 'login' | 'signup' | 'reset'
  const [activeView, setActiveView] = useState('login');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Sign Up Form States
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const [signupUsernameErr, setSignupUsernameErr] = useState('');
  const [signupEmailErr, setSignupEmailErr] = useState('');
  const [signupPasswordErr, setSignupPasswordErr] = useState('');
  const [signupConfirmPasswordErr, setSignupConfirmPasswordErr] = useState(defaultGuideText);
  const [isConfirmPasswordCustomError, setIsConfirmPasswordCustomError] = useState(false);

  // Sign Up Terms Consent Modal States (Manual Form)
  const [signupConsentPending, setSignupConsentPending] = useState(false);
  const [signupAgeTermsChecked, setSignupAgeTermsChecked] = useState(false);
  const [signupTermsErr, setSignupTermsErr] = useState('');

  // Google OAuth Modal/Prompt States
  const [googleUserPending, setGoogleUserPending] = useState(null);
  const [googleUsernameInput, setGoogleUsernameInput] = useState('');
  const [googleUsernameErr, setGoogleUsernameErr] = useState('');
  const [googleAgeTermsChecked, setGoogleAgeTermsChecked] = useState(false);
  const [googleTermsErr, setGoogleTermsErr] = useState('');

  // Legal Content Modal States
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Reset Password Form States
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');

  // Toasts State
  const [toasts, setToasts] = useState([]);

  // Toast Helper
  const triggerToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Sync state with URL Hash
  useEffect(() => {
    if (location.hash === '#signup') {
      setActiveView('signup');
    } else if (location.hash === '#login') {
      setActiveView('login');
    }
  }, [location.hash]);

  // Check for incoming success toast from previous actions
  useEffect(() => {
    if (localStorage.getItem('passwordChangedSuccess') === 'true') {
      localStorage.removeItem('passwordChangedSuccess');
      triggerToast('Password changed successfully!');
    }
  }, []);

  // Clear Validation Messages when switching views
  const switchView = (view) => {
    setActiveView(view);
    setLoginError('');
    setResetError('');
    setSignupUsernameErr('');
    setSignupEmailErr('');
    setSignupPasswordErr('');
    setSignupConfirmPasswordErr(defaultGuideText);
    setIsConfirmPasswordCustomError(false);
  };

  // --- LIVE VALIDATION FUNCTIONS ---
  const validateUsername = (val = signupUsername) => {
    const trimmed = val.trim();
    if (trimmed === '') {
      setSignupUsernameErr("Username field can't be empty.");
      return false;
    }
    if (mockUsernames.includes(trimmed.toLowerCase())) {
      setSignupUsernameErr('Username is already taken.');
      return false;
    }
    setSignupUsernameErr('');
    return true;
  };

  const validateEmail = (val = signupEmail) => {
    const trimmed = val.trim();
    if (trimmed === '') {
      setSignupEmailErr("Email field can't be empty.");
      return false;
    }
    if (mockDatabase.includes(trimmed.toLowerCase())) {
      setSignupEmailErr('This email is already registered.');
      return false;
    }
    setSignupEmailErr('');
    return true;
  };

  const validatePassword = (val = signupPassword) => {
    if (val === '') {
      setSignupPasswordErr("Password field can't be empty.");
      return false;
    }
    if (!passwordRegex.test(val)) {
      setSignupPasswordErr(
        'Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
      );
      return false;
    }
    setSignupPasswordErr('');
    return true;
  };

  const validateConfirmPassword = (confirmVal = signupConfirmPassword, mainVal = signupPassword) => {
    if (confirmVal === '') {
      setSignupConfirmPasswordErr("Confirm password field can't be empty.");
      setIsConfirmPasswordCustomError(true);
      return false;
    }
    if (mainVal !== confirmVal) {
      setSignupConfirmPasswordErr('Passwords do not match.');
      setIsConfirmPasswordCustomError(true);
      return false;
    }
    setSignupConfirmPasswordErr(defaultGuideText);
    setIsConfirmPasswordCustomError(false);
    return true;
  };

  // --- GOOGLE OAUTH HANDLERS ---
  const handleGoogleSuccess = async (credentialResponse) => {
    let decoded;
    if (credentialResponse.credential) {
      decoded = jwtDecode(credentialResponse.credential);
    } else if (credentialResponse.access_token) {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${credentialResponse.access_token}` },
      });
      decoded = await res.json();
    }

    if (!decoded || !decoded.email) return;

    const userEmail = decoded.email.toLowerCase();
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const existingUser = registeredUsers.find((u) => u.email === userEmail);

    if (existingUser) {
      localStorage.setItem('currentUser', JSON.stringify(existingUser));
      startSimulatedLoad('Signing In with Google...', 2000, () => {
        navigate('/dashboard');
      }, false);
    } else {
      setGoogleUserPending(decoded);
      const suggestedUsername = (decoded.name || 'user').toLowerCase().replace(/\s+/g, '_');
      setGoogleUsernameInput(suggestedUsername);
      setGoogleAgeTermsChecked(false);
      setGoogleTermsErr('');
      setGoogleUsernameErr('');
    }
  };

  const googleLoginTrigger = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setLoginError('Google sign in failed. Please try again.'),
  });

  const handleGoogleUsernameSubmit = (e) => {
    e.preventDefault();
    const trimmedUser = googleUsernameInput.trim();
    const usernameRegex = /^[a-zA-Z0-9_-]{1,20}$/;

    if (!trimmedUser) {
      setGoogleUsernameErr("Username field can't be empty.");
      return;
    }

    if (!usernameRegex.test(trimmedUser)) {
      setGoogleUsernameErr('Username must be 1 to 20 characters and contain only letters, numbers, hyphens, or underscores.');
      return;
    }

    if (!googleAgeTermsChecked) {
      setGoogleTermsErr('You must confirm you are at least 18 years old and agree to the Terms and Privacy Policy.');
      return;
    }

    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const isTakenInMock = mockUsernames.includes(trimmedUser.toLowerCase());
    const isTakenInStorage = registeredUsers.some((u) => u.username.toLowerCase() === trimmedUser.toLowerCase());

    if (isTakenInMock || isTakenInStorage) {
      setGoogleUsernameErr('Username is already taken. Try another.');
      return;
    }

    const newUser = {
      username: trimmedUser,
      email: googleUserPending.email,
      avatar: googleUserPending.picture,
      googleId: googleUserPending.sub || googleUserPending.id,
      authProvider: 'google',
    };

    registeredUsers.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    localStorage.setItem('justSignedUp', 'true');

    setGoogleUserPending(null);

    startSimulatedLoad('Setting Up Profile...', 2000, () => {
      navigate('/dashboard');
    }, false);
  };

  // --- SUBMIT HANDLERS ---
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    const emailVal = loginEmail.trim().toLowerCase();
    const passwordVal = loginPassword;

    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const foundUser = registeredUsers.find((u) => u.email === emailVal);

    if (emailVal === adminAccount.email && passwordVal === adminAccount.password) {
      startSimulatedLoad('Authenticating Admin...', 2000, () => {
        navigate('/admin/dashboard');
      }, true);
    } else if (emailVal === userAccount.email && passwordVal === userAccount.password) {
      startSimulatedLoad('Signing In...', 2000, () => {
        navigate('/dashboard');
      }, false);
    } else if (foundUser && foundUser.password === passwordVal) {
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      startSimulatedLoad('Signing In...', 2000, () => {
        navigate('/dashboard');
      }, false);
    } else if (foundUser && foundUser.authProvider === 'google') {
      setLoginError('✘ This email is registered via Google. Please click "Sign in with Google".');
    } else {
      setLoginError('✘ Invalid email or password.');
    }
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();

    const isUserValid = validateUsername();
    const isEmailValid = validateEmail();
    const isPassValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();

    if (!isUserValid || !isEmailValid || !isPassValid || !isConfirmValid) return;

    // Open consent modal before saving account
    setSignupConsentPending(true);
    setSignupAgeTermsChecked(false);
    setSignupTermsErr('');
  };

  const handleConfirmSignupConsent = (e) => {
    e.preventDefault();

    if (!signupAgeTermsChecked) {
      setSignupTermsErr('You must confirm you are at least 18 years old and agree to the Terms and Privacy Policy.');
      return;
    }

    const newUser = {
      username: signupUsername.trim(),
      email: signupEmail.trim().toLowerCase(),
      password: signupPassword,
      authProvider: 'local',
    };

    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    registeredUsers.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    localStorage.setItem('currentUser', JSON.stringify(newUser));

    setSignupUsername('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setSignupConsentPending(false);

    localStorage.setItem('justSignedUp', 'true');

    startSimulatedLoad('Creating Account...', 2000, () => {
      navigate('/dashboard');
    }, false);
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    const trimmedEmail = resetEmail.trim();

    if (trimmedEmail === '') {
      setResetError('✘ Textbox is empty! Please enter your email.');
      return;
    }

    if (!mockDatabase.includes(trimmedEmail.toLowerCase())) {
      setResetError('✘ Email address not found in our system.');
      return;
    }

    setResetError('');
    setResetEmail('');
    switchView('login');
    triggerToast('Password link sent!');
  };

  return (
    <div className="bg-gray-100 antialiased scroll-smooth min-h-screen flex flex-col justify-between">
      {/* HEADER SECTION */}
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
            <button
              onClick={() => switchView('login')}
              className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-dark bg-theme-muted border-2 md:border-2 border-theme-dark px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 block text-center transition-all duration-150 retro-shadow cursor-pointer"
            >
              LOGIN
            </button>
            <button
              onClick={() => switchView('signup')}
              className="font-pressstart text-[6px] sm:text-[8px] md:text-[12px] text-theme-surface bg-theme-primary border-2 md:border-2 border-theme-dark px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 block text-center transition-all duration-150 retro-shadow cursor-pointer"
            >
              SIGN UP
            </button>
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

      {/* HERO & FORM SECTION */}
      <section id="hero-and-showcase" className="relative w-full min-h-screen bg-theme-surface pt-15 md:pt-20 flex flex-col items-center overflow-hidden">
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

        <div className="relative z-10 max-w-6xl w-full px-6 flex flex-col items-center justify-center pt-12 md:pt-20 pb-30">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-3xl p-6 w-full max-w-md shadow-md">
            {activeView !== 'reset' && (
              <div id="modal-tabs" className="flex border-2 border-theme-dark rounded-xl p-1 bg-transparent mb-6 font-pressstart text-[15px] sm:text-[15px] leading-4">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className={`flex-1 py-2 text-center transition-all duration-150 cursor-pointer ${
                    activeView === 'login'
                      ? 'text-white bg-theme-safe rounded-lg border-2 border-theme-dark'
                      : 'text-theme-dark hover:text-theme-primary'
                  }`}
                >
                  LOGIN
                </button>
                <button
                  type="button"
                  onClick={() => switchView('signup')}
                  className={`flex-1 py-2 text-center transition-all duration-150 cursor-pointer ${
                    activeView === 'signup'
                      ? 'text-white bg-theme-safe rounded-lg border-2 border-theme-dark'
                      : 'text-theme-dark hover:text-theme-primary'
                  }`}
                >
                  SIGN UP
                </button>
              </div>
            )}

            {/* LOGIN FORM */}
            {activeView === 'login' && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <h2 className="font-pressstart text-xl text-theme-dark">Welcome back!</h2>
                <p className="font-pixel text-lg text-theme-dark">Pick up right where you left off.</p>

                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">EMAIL</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@studycircle.app"
                    className={`border-2 bg-theme-muted p-2 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                      loginError ? 'border-[#A94A4A]' : 'border-theme-dark'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">PASSWORD</label>
                  <div className="relative w-full">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="........"
                      className={`border-2 bg-theme-muted p-2 pr-10 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                        loginError ? 'border-[#A94A4A]' : 'border-theme-dark'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-dark hover:text-theme-primary bg-transparent border-none p-0 cursor-pointer flex items-center justify-center focus:outline-none"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        {showLoginPassword ? (
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
                  {loginError && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-danger mt-0.5">{loginError}</p>}
                </div>

                <button
                  type="submit"
                  className="font-pressstart text-theme-surface bg-theme-primary border-4 border-theme-dark py-3 mt-2 transition-all duration-150 retro-shadow cursor-pointer"
                >
                  LOGIN
                </button>

                <div className="text-center mt-1">
                  <button
                    type="button"
                    onClick={() => switchView('reset')}
                    className="font-pressstart text-[11px] text-theme-dark hover:underline decoration-2 transition-all duration-150 bg-transparent border-none p-0 cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

{/* OR DIVIDER WITH DASHED LINES */}
<div className="flex items-center gap-2 my-1">
  <div className="flex-1 border-t-2 border-theme-dark" />
  <span className="font-pressstart text-[8px] text-theme-dark">OR</span>
  <div className="flex-1 border-t-2 border-theme-dark" />
</div>

                <button
                  type="button"
                  onClick={() => googleLoginTrigger()}
                  className="font-pressstart text-[10px] sm:text-[11px] text-theme-dark bg-theme-surface border-2 border-theme-dark py-2.5 px-4 flex items-center justify-center gap-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>SIGN IN WITH GOOGLE</span>
                </button>
              </form>
            )}

            {/* SIGN UP FORM */}
            {activeView === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
                <h2 className="font-pressstart text-xl text-theme-dark">Join the circle!</h2>
                <p className="font-pixel text-lg text-theme-dark">Create your StudyCircle account now.</p>

                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">USERNAME</label>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => {
                      setSignupUsername(e.target.value);
                      validateUsername(e.target.value);
                    }}
                    placeholder="acorn_hero"
                    className={`border-2 bg-theme-muted p-2 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                      signupUsernameErr ? 'border-[#A94A4A]' : 'border-theme-dark'
                    }`}
                  />
                  {signupUsernameErr && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-danger mt-0.5">✘ {signupUsernameErr}</p>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">EMAIL</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    placeholder="you@studycircle.app"
                    className={`border-2 bg-theme-muted p-2 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                      signupEmailErr ? 'border-[#A94A4A]' : 'border-theme-dark'
                    }`}
                  />
                  {signupEmailErr && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-danger mt-0.5">✘ {signupEmailErr}</p>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">PASSWORD</label>
                  <div className="relative w-full">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => {
                        setSignupPassword(e.target.value);
                        validatePassword(e.target.value);
                        if (signupConfirmPassword !== '') validateConfirmPassword(signupConfirmPassword, e.target.value);
                      }}
                      placeholder="........"
                      className={`border-2 bg-theme-muted p-2 pr-10 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                        signupPasswordErr ? 'border-[#A94A4A]' : 'border-theme-dark'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-dark hover:text-theme-primary bg-transparent border-none p-0 cursor-pointer flex items-center justify-center focus:outline-none"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        {showSignupPassword ? (
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
                  {signupPasswordErr && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-danger mt-0.5">✘ {signupPasswordErr}</p>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">CONFIRM PASSWORD</label>
                  <div className="relative w-full">
                    <input
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      value={signupConfirmPassword}
                      onChange={(e) => {
                        setSignupConfirmPassword(e.target.value);
                        validateConfirmPassword(e.target.value, signupPassword);
                      }}
                      placeholder="........"
                      className={`border-2 bg-theme-muted p-2 pr-10 font-pixel text-lg outline-none w-full transition-colors duration-150 ${
                        isConfirmPasswordCustomError ? 'border-[#A94A4A]' : 'border-theme-dark'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-dark hover:text-theme-primary bg-transparent border-none p-0 cursor-pointer flex items-center justify-center focus:outline-none"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        {showSignupConfirmPassword ? (
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
                      isConfirmPasswordCustomError ? 'text-theme-danger text-[15px] sm:text-[15px]' : 'text-theme-dark text-[15px] sm:text-[15px]'
                    }`}
                  >
                    {isConfirmPasswordCustomError ? `✘ ${signupConfirmPasswordErr}` : signupConfirmPasswordErr}
                  </p>
                </div>

                <p className="font-pixel text-[15px] sm:text-[15px] text-theme-dark leading-4">
                  By clicking Sign Up or continuing with Google, you agree to StudyCircle's{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-theme-primary underline cursor-pointer hover:opacity-80 inline"
                  >
                    Terms & Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-theme-primary underline cursor-pointer hover:opacity-80 inline"
                  >
                    Privacy Policy
                  </button>.
                </p>

                <button
                  type="submit"
                  className="font-pressstart text-theme-surface bg-theme-primary border-4 border-theme-dark py-3 mt-1 transition-all duration-150 retro-shadow cursor-pointer"
                >
                  SIGN UP
                </button>

{/* OR DIVIDER WITH DASHED LINES */}
<div className="flex items-center gap-2 my-1">
  <div className="flex-1 border-t-2 border-theme-dark" />
  <span className="font-pressstart text-[8px] text-theme-dark">OR</span>
  <div className="flex-1 border-t-2 border-theme-dark" />
</div>

                <button
                  type="button"
                  onClick={() => googleLoginTrigger()}
                  className="font-pressstart text-[10px] sm:text-[11px] text-theme-dark bg-theme-surface border-2 border-theme-dark py-2.5 px-4 flex items-center justify-center gap-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>SIGN UP WITH GOOGLE</span>
                </button>
              </form>
            )}

            {/* RESET PASSWORD FORM */}
            {activeView === 'reset' && (
              <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                <div className="mb-1">
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="font-pressstart text-[11px] text-theme-dark hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                  >
                    ← Back to login page
                  </button>
                </div>

                <h2 className="font-pressstart text-xl text-theme-dark mt-2">Reset Password</h2>
                <p className="font-pixel text-lg text-theme-dark">We'll send a password reset link to your email.</p>

                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">EMAIL</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@studycircle.app"
                    className="border-2 border-theme-dark bg-theme-muted p-2 font-pixel text-lg outline-none w-full"
                  />
                  {resetError && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-primary mt-0.5">{resetError}</p>}
                </div>

                <button
                  type="submit"
                  className="font-pressstart text-theme-surface bg-theme-primary border-4 border-theme-dark py-3 mt-4 transition-all duration-150 retro-shadow cursor-pointer"
                >
                  SEND RESET LINK
                </button>
              </form>
            )}
          </div>
        </div>

        {/* MANUAL SIGNUP CONFIRMATION MODAL */}
        {signupConsentPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-sm">
            <div className="bg-theme-surface border-4 border-theme-dark rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <h3 className="font-pressstart text-[15px] sm:text-[18px] leading-4 text-theme-dark">Confirm Registration</h3>

              <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-dark">
                You are almost ready to start learning with StudyCircle! Please confirm your agreement to continue.
              </p>

              <form onSubmit={handleConfirmSignupConsent} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 mt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signupAgeTermsChecked}
                      onChange={(e) => {
                        setSignupAgeTermsChecked(e.target.checked);
                        if (e.target.checked) setSignupTermsErr('');
                      }}
                      className="mt-1 accent-theme-primary cursor-pointer w-4 h-4 shrink-0"
                    />
                    <span className="font-pixel text-[15px] sm:text-[15px] leading-4 text-theme-dark leading-4">
                      You confirm that you are at least 18 years old, and that you have read and agree to our{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-theme-primary underline font-bold cursor-pointer hover:opacity-80 inline"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-theme-primary underline font-bold cursor-pointer hover:opacity-80 inline"
                      >
                        Privacy Policy
                      </button>.
                    </span>
                  </label>
                  {signupTermsErr && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-danger">✘ {signupTermsErr}</p>}
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupConsentPending(false);
                      setSignupAgeTermsChecked(false);
                      setSignupTermsErr('');
                    }}
                    className="font-pressstart text-[15px] sm:text-[15px] leading-4 bg-theme-muted border-2 border-theme-dark px-3 py-2 text-theme-dark cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="font-pressstart text-[15px] sm:text-[15px] leading-4 bg-theme-primary text-theme-surface border-2 border-theme-dark px-4 py-2 cursor-pointer retro-shadow"
                  >
                    COMPLETE SIGNUP
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* GOOGLE USERNAME MODAL */}
        {googleUserPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-sm">
            <div className="bg-theme-surface border-4 border-theme-dark rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                {googleUserPending.picture && (
                  <img src={googleUserPending.picture} alt="Google Avatar" className="w-10 h-10 rounded-full border-2 border-theme-dark" />
                )}
                <div>
                  <h3 className="font-pressstart text-[15px] sm:text-[18px] leading-4 text-theme-dark">Choose Username</h3>
                  <p className="font-pixel text-[15px] sm:text-[15px] leading-4 text-theme-dark">{googleUserPending.email}</p>
                </div>
              </div>

              <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-dark">
                Welcome to StudyCircle! Please pick a unique username to complete setting up your account.
              </p>

              <form onSubmit={handleGoogleUsernameSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-pressstart text-[10px] text-theme-dark">USERNAME</label>
                  <input
                    type="text"
                    value={googleUsernameInput}
                    onChange={(e) => {
                      setGoogleUsernameInput(e.target.value);
                      setGoogleUsernameErr('');
                    }}
                    placeholder="acorn_hero"
                    className={`border-2 bg-theme-muted p-2 font-pixel text-lg outline-none w-full ${
                      googleUsernameErr ? 'border-[#A94A4A]' : 'border-theme-dark'
                    }`}
                  />
                  <p className="font-pixel text-[15px] sm:text-[15px] leading-4 text-theme-dark mt-1">
                    Usernames can be changed at any time. They must be 1 to 20 characters, containing only letters a to z, numbers 0 to 9, hyphens, or underscores.
                  </p>
                  {googleUsernameErr && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-danger">✘ {googleUsernameErr}</p>}
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={googleAgeTermsChecked}
                      onChange={(e) => {
                        setGoogleAgeTermsChecked(e.target.checked);
                        if (e.target.checked) setGoogleTermsErr('');
                      }}
                      className="mt-1 accent-theme-primary cursor-pointer w-4 h-4 shrink-0"
                    />
                    <span className="font-pixel text-[15px] sm:text-[15px] leading-4 text-theme-dark leading-4">
                      You confirm that you are at least 18 years old, and that you have read and agree to our{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-theme-primary underline font-bold cursor-pointer hover:opacity-80 inline"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-theme-primary underline font-bold cursor-pointer hover:opacity-80 inline"
                      >
                        Privacy Policy
                      </button>.
                    </span>
                  </label>
                  {googleTermsErr && <p className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-danger">✘ {googleTermsErr}</p>}
                </div>

                <div className="flex gap-2 justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleUserPending(null);
                      setGoogleAgeTermsChecked(false);
                      setGoogleTermsErr('');
                    }}
                    className="font-pressstart text-[15px] sm:text-[15px] leading-4 bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 cursor-pointer retro-shadow"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="font-pressstart text-[15px] sm:text-[15px] leading-4 bg-theme-primary text-theme-surface border-2 border-theme-dark px-4 py-2 cursor-pointer retro-shadow"
                  >
                    COMPLETE
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TERMS OF SERVICE MODAL */}
        {showTermsModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-theme-dark/70 backdrop-blur-xs">
            <div className="bg-theme-surface border-4 border-theme-dark rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[80vh]">
              <h3 className="font-pressstart text-[15px] sm:text-[18px] leading-4 text-theme-dark border-b-2 border-theme-dark pb-2">Terms of Service</h3>
              <div className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-dark overflow-y-auto flex flex-col gap-2 pr-2">
                <p>By using StudyCircle, you agree to follow our community guidelines and code of conduct.</p>
                <p>1. Account Responsibility: You are responsible for all activity under your username.</p>
                <p>2. Respectful Behavior: Be supportive to fellow study circle members.</p>
                <p>3. Age Limit: You must be at least 18 years old to register an account.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="font-pressstart text-[15px] sm:text-[15px] leading-4 bg-theme-primary text-theme-surface border-2 border-theme-dark px-4 py-2 self-end cursor-pointer retro-shadow mt-2"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* PRIVACY POLICY MODAL */}
        {showPrivacyModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-theme-dark/70 backdrop-blur-xs">
            <div className="bg-theme-surface border-4 border-theme-dark rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[80vh]">
              <h3 className="font-pressstart text-[15px] sm:text-[18px] leading-4 text-theme-dark border-b-2 border-theme-dark pb-2">Privacy Policy</h3>
              <div className="font-pixel text-[15px] sm:text-[18px] leading-4 text-theme-dark overflow-y-auto flex flex-col gap-2 pr-2">
                <p>We value your personal privacy and process data responsibly.</p>
                <p>1. Data Collection: We collect your email address and username for authentication.</p>
                <p>2. Data Usage: Your study data is used strictly to power your StudyCircle dashboard and rewards.</p>
                <p>3. Security: We do not sell your personal data to third-party services.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="font-pressstart text-[15px] sm:text-[15px] leading-4 bg-theme-primary text-theme-surface border-2 border-theme-dark px-4 py-2 self-end cursor-pointer retro-shadow mt-2"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* TOASTS CONTAINER */}
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
                <span className="font-pressstart text-[12px] text-theme-dark whitespace-normal break-words leading-4 tracking-wide">{toast.message}</span>
              </div>
              <div className="w-full bg-transparent h-1.5 flex justify-center mt-auto overflow-hidden">
                <div className="w-full h-full bg-theme-safe animate-progress-center"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER SECTION */}
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
              <button
                onClick={() => switchView('signup')}
                className="font-pressstart text-[7px] sm:text-[10px] md:text-[12px] text-theme-surface bg-theme-safe border-[2px] md:border-2 border-theme-dark px-3 py-2 sm:px-5 sm:py-3 md:px-6 md:py-3.5 block text-center transition-all duration-150 retro-shadow cursor-pointer"
              >
                JOIN NOW!
              </button>
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
                <button onClick={() => switchView('login')} className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit text-left cursor-pointer">Login</button>
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
                <button onClick={() => setShowPrivacyModal(true)} className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit text-left cursor-pointer">Privacy</button>
                <button onClick={() => setShowTermsModal(true)} className="font-pixel text-[15px] sm:text-[20px] md:text-[24px] text-theme-surface leading-none select-none transition-all duration-150 hover:translate-x-1 inline-block w-fit text-left cursor-pointer">Terms</button>
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