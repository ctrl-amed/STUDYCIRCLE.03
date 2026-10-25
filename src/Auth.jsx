import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useLoading } from './context/LoadingContext';
import { usePlayer } from './context/PlayerContext';
import './Auth.css';

// FIX: your old URLs were "http://https://studycircle-03.onrender.com/..." (invalid).
// One constant now, used everywhere. Swap to http://localhost:5000 for local dev.
const API_URL = 'http://127.0.0.1:5000';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,}$/;
const studentIdRegex = /^[a-zA-Z]\d{8}$/;
const umakEmailRegex = /^[a-zA-Z0-9._%+-]+@umak\.edu\.ph$/i;
const defaultGuideText =
  'Create a strong password using 8 or more characters, including uppercase and lowercase letters, a number, and a special character.';

const safeKey = (email) => email.replace(/[^a-zA-Z0-9]/g, '_');

/* ------------------------------------------------------------------ */
/* Small presentational pieces (defined OUTSIDE Auth so inputs keep    */
/* focus while typing)                                                  */
/* ------------------------------------------------------------------ */

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
      {open ? (
        <path strokeLinecap="square" strokeLinejoin="square" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.243L9.88 9.88" />
      ) : (
        <>
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M2.5 12C3.7 7.9 7.5 5 12 5s8.3 2.9 9.5 7c-1.2 4.1-5 7-9.5 7s-8.3-2.9-9.5-7z" />
        </>
      )}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

/** Text / email field with optional error line */
function Field({ id, label, type = 'text', value, onChange, placeholder, error, invalid }) {
  return (
    <div className="sc-field">
      <label htmlFor={id}>{label}</label>
      <div className="sc-pw">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
          className={`sc-input${invalid ?? error ? ' bad' : ''}`}
        />
      </div>
      {error && <p className="sc-err">✘ {error}</p>}
    </div>
  );
}

/** Password field with show/hide eye. `children` renders under the input (error / hint). */
function PasswordField({ id, label, value, onChange, show, onToggle, invalid, children }) {
  return (
    <div className="sc-field">
      <label htmlFor={id}>{label}</label>
      <div className="sc-pw">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="........"
          autoComplete="off"
          className={`sc-input has-eye${invalid ? ' bad' : ''}`}
        />
        <button type="button" className="sc-eye" onClick={onToggle} aria-label="Show or hide password">
          <EyeIcon open={show} />
        </button>
      </div>
      {children}
    </div>
  );
}

function OrDivider() {
  return <div className="sc-or">OR</div>;
}

function GoogleButton({ onClick, children }) {
  return (
    <button type="button" className="sc-gbtn" onClick={onClick}>
      <GoogleIcon />
      <span>{children}</span>
    </button>
  );
}

const LEGAL_ICONS = {
  terms: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h7M9 16h7" />
    </svg>
  ),
  privacy: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  ),
};

const LEGAL_CONTENT = {
  terms: {
    title: 'Terms of Service',
    intro: 'By using StudyCircle, you agree to follow our community guidelines and code of conduct.',
    sections: [
      ['Account Responsibility', 'You are responsible for all activity under your username.'],
      ['Respectful Behavior', 'Be supportive to fellow study circle members.'],
      ['Age Limit', 'You must be at least 18 years old to register an account.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'We value your personal privacy and process data responsibly.',
    sections: [
      ['Data Collection', 'We collect your email address and username for authentication.'],
      ['Data Usage', 'Your study data is used strictly to power your StudyCircle dashboard and rewards.'],
      ['Security', 'We do not sell your personal data to third-party services.'],
    ],
  },
};

function LegalModal({ kind, onClose }) {
  const c = LEGAL_CONTENT[kind];
  return (
    <div
      className="sc-md lgm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sc-lg">
        <div className="sc-lg-h">
          <span className="sc-lg-i" aria-hidden="true">{LEGAL_ICONS[kind]}</span>
          <div className="sc-lg-t">
            <small>STUDYCIRCLE ★ LEGAL</small>
            <h3>{c.title}</h3>
          </div>
          <button type="button" className="sc-lg-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>
        <div className="sc-lg-b">
          <p className="sc-lg-in">{c.intro}</p>
          {c.sections.map(([h, p], i) => (
            <div className="sc-lg-s" key={h}>
              <span className="sc-lg-n">{i + 1}</span>
              <div>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="sc-lg-f">
          <span>Thanks for being part of the circle! ★</span>
          <button type="button" className="sc-lg-ok" onClick={onClose}>I UNDERSTAND</button>
        </div>
      </div>
    </div>
  );
}

/** The "I'm 18+ and agree to Terms / Privacy" checkbox row, used by the Google modal */
function ConsentCheck({ checked, onChange, error, onOpenTerms, onOpenPrivacy }) {
  return (
    <div className="sc-field">
      <label className="sc-check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>
          You confirm that you are at least 18 years old, and that you have read and agree to our{' '}
          <button type="button" className="sc-tx" onClick={onOpenTerms}>Terms of Service</button>{' '}
          and{' '}
          <button type="button" className="sc-tx" onClick={onOpenPrivacy}>Privacy Policy</button>.
        </span>
      </label>
      {error && <p className="sc-err">✘ {error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { startSimulatedLoad } = useLoading();
  const { setPlayerData } = usePlayer();

  // 'login' | 'signup' | 'reset'
  const [activeView, setActiveView] = useState('login');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Suspended account
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedUserData, setSuspendedUserData] = useState(null);

  // Professor / IT admin first-login password change
  const [adminPending, setAdminPending] = useState(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPwErr, setAdminPwErr] = useState('');

  // Sign up
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupStudentId, setSignupStudentId] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupUsernameErr, setSignupUsernameErr] = useState('');
  const [signupEmailErr, setSignupEmailErr] = useState('');
  const [signupStudentIdErr, setSignupStudentIdErr] = useState('');
  const [signupPasswordErr, setSignupPasswordErr] = useState('');
  const [signupConfirmPasswordErr, setSignupConfirmPasswordErr] = useState(defaultGuideText);
  const [isConfirmPasswordCustomError, setIsConfirmPasswordCustomError] = useState(false);

  // Sign up consent modal
  const [signupConsentPending, setSignupConsentPending] = useState(false);
  const [signupAgeTermsChecked, setSignupAgeTermsChecked] = useState(false);
  const [signupTermsErr, setSignupTermsErr] = useState('');

  // Google OAuth
  const [googleUserPending, setGoogleUserPending] = useState(null);
  const [googleUsernameInput, setGoogleUsernameInput] = useState('');
  const [googleUsernameErr, setGoogleUsernameErr] = useState('');
  const [googleAgeTermsChecked, setGoogleAgeTermsChecked] = useState(false);
  const [googleTermsErr, setGoogleTermsErr] = useState('');
  const [googleStudentId, setGoogleStudentId] = useState('');
  const [googleStudentIdErr, setGoogleStudentIdErr] = useState('');

  // Legal modals: null | 'terms' | 'privacy'
  const [legalModal, setLegalModal] = useState(null);

  // Reset password
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');

  // Toasts
  const [toasts, setToasts] = useState([]);

  const triggerToast = (message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
  if (location.hash === '#signup') setActiveView('signup');
  else if (location.hash === '#login') setActiveView('login');
  window.scrollTo({ top: 0, left: 0 });
}, [location.hash]);

  useEffect(() => {
    const raw = sessionStorage.getItem('suspended_notice');
    if (!raw) return;
    sessionStorage.removeItem('suspended_notice');
    try {
      setSuspendedUserData(JSON.parse(raw));
      setShowSuspendedModal(true);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (localStorage.getItem('passwordChangedSuccess') === 'true') {
      localStorage.removeItem('passwordChangedSuccess');
      triggerToast('Password changed successfully!');
    }
  }, []);

  const switchView = (view) => {
    setActiveView(view);
    setLoginError('');
    setResetError('');
    setSignupUsernameErr('');
    setSignupEmailErr('');
    setSignupStudentIdErr('');
    setSignupPasswordErr('');
    setSignupConfirmPasswordErr(defaultGuideText);
    setIsConfirmPasswordCustomError(false);
    window.scrollTo({ top: 0, left: 0 });
  };

  /* ---------------- live validation ---------------- */
  const validateUsername = (val = signupUsername) => {
    if (val.trim() === '') { setSignupUsernameErr("Username field can't be empty."); return false; }
    setSignupUsernameErr('');
    return true;
  };

  const validateEmail = (val = signupEmail) => {
    const t = val.trim();
    if (t === '') { setSignupEmailErr("Email field can't be empty."); return false; }
    if (!umakEmailRegex.test(t)) { setSignupEmailErr('You must use a valid @umak.edu.ph email address.'); return false; }
    setSignupEmailErr('');
    return true;
  };

  const validateStudentId = (val = signupStudentId) => {
    const t = val.trim();
    if (t === '') { setSignupStudentIdErr("Student ID field can't be empty."); return false; }
    if (!studentIdRegex.test(t)) {
      setSignupStudentIdErr('Student ID must start with 1 letter followed by exactly 8 numbers (e.g., A12345678).');
      return false;
    }
    setSignupStudentIdErr('');
    return true;
  };

  const validatePassword = (val = signupPassword) => {
    if (val === '') { setSignupPasswordErr("Password field can't be empty."); return false; }
    if (!passwordRegex.test(val)) {
      setSignupPasswordErr('Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.');
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

  /* ---------------- shared: save user + update player ---------------- */
  const persistUser = (user, { saveAssets = false } = {}) => {
    localStorage.setItem('active_user_email', user.email);
    localStorage.setItem(`user_${user.email}`, JSON.stringify(user));

    if (saveAssets) {
      const k = safeKey(user.email);
      if (user.avatarConfig) localStorage.setItem(`user_avatar_config_${k}`, JSON.stringify(user.avatarConfig));
      if (user.roomConfig) localStorage.setItem(`user_furniture_config_${k}`, JSON.stringify(user.roomConfig));
      if (user.unlockedItems) localStorage.setItem(`user_unlocked_assets_${k}`, JSON.stringify(user.unlockedItems));
    }

    setPlayerData((prev) => ({
      ...prev,
      username: user.username,
      email: user.email,
      coins: user.coins ?? prev.coins,
      streakDays: user.streak ?? prev.streakDays,
      avatarConfig: user.avatarConfig || prev.avatarConfig,
      roomConfig: user.roomConfig || prev.roomConfig,
      unlockedItems: user.unlockedItems || prev.unlockedItems,
    }));
  };

  /* ---------------- Google OAuth ---------------- */
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

    if (!umakEmailRegex.test(decoded.email)) {
      setLoginError('✘ You must sign in with a valid @umak.edu.ph email.');
      switchView('login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/google-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: decoded.email, google_id: decoded.sub || decoded.id }),
      });
      const data = await response.json();

      if (data.suspended || data.is_suspended) {
        setSuspendedUserData({
          email: decoded.email,
          reason: data.reason || 'Community Guidelines Violation',
          liftUntil: data.liftUntil || 'Until reviewed by IT administration',
        });
        setShowSuspendedModal(true);
        return;
      }

      if (!response.ok) {
        setLoginError(data.error || 'Google sign in failed.');
        return;
      }

      if (data.user) {
        persistUser(data.user);
        startSimulatedLoad('Setting Up Profile...', 2000, () => navigate('/dashboard'), false);
        return;
      }

      if (data.needs_username) {
        setGoogleUserPending(decoded);
        setGoogleUsernameInput((decoded.name || 'user').toLowerCase().replace(/\s+/g, '_'));
        setGoogleStudentId('');
        setGoogleStudentIdErr('');
        setGoogleAgeTermsChecked(false);
        setGoogleTermsErr('');
        setGoogleUsernameErr('');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Unable to connect to Flask server.');
    }
  };

  const googleLoginTrigger = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setLoginError('Google sign in failed. Please try again.'),
  });

  const closeGoogleModal = () => {
    setGoogleUserPending(null);
    setGoogleStudentId('');
    setGoogleStudentIdErr('');
    setGoogleAgeTermsChecked(false);
    setGoogleTermsErr('');
  };

  const handleGoogleUsernameSubmit = async (e) => {
    e.preventDefault();
    const trimmedUser = googleUsernameInput.trim();
    const trimmedStudentId = googleStudentId.trim();
    const usernameRegex = /^[a-zA-Z0-9_-]{1,20}$/;

    if (!trimmedUser) { setGoogleUsernameErr("Username field can't be empty."); return; }
    if (!usernameRegex.test(trimmedUser)) {
      setGoogleUsernameErr('Username must be 1 to 20 characters and contain only letters, numbers, hyphens, or underscores.');
      return;
    }
    if (!studentIdRegex.test(trimmedStudentId)) {
      setGoogleStudentIdErr('Student ID must start with 1 letter followed by exactly 8 numbers (e.g., A12345678).');
      return;
    }
    if (!googleAgeTermsChecked) {
      setGoogleTermsErr('You must confirm you are at least 18 years old and agree to the Terms and Privacy Policy.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/google-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUser,
          email: googleUserPending.email,
          student_id: trimmedStudentId,
          google_id: googleUserPending.sub || googleUserPending.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.field === 'student_id') setGoogleStudentIdErr(data.error);
        else setGoogleUsernameErr(data.error || 'Google sign in failed.');
        return;
      }

      if (data.user) persistUser(data.user, { saveAssets: true });

      setGoogleUserPending(null);
      startSimulatedLoad('Setting Up Profile...', 2000, () => navigate('/dashboard'), false);
    } catch (err) {
      console.error(err);
      setGoogleUsernameErr('Unable to connect to Flask server.');
    }
  };

  /* ---------------- login ---------------- */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const emailVal = loginEmail.trim();
    const passwordVal = loginPassword;

    if (!emailVal || !passwordVal) {
      setLoginError('✘ Please fill in all fields.');
      return;
    }

    // Professor / IT admin login first; falls through to student login if not an admin.
    try {
      const adminRes = await fetch(`${API_URL}/api/itadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      if (adminRes.status === 429) {
        const d = await adminRes.json();
        setLoginError(`✘ ${d.error}`);
        return;
      }

      if (adminRes.ok) {
        const adminData = await adminRes.json();
        sessionStorage.setItem('admin_token', adminData.token);
        sessionStorage.setItem('admin_user', JSON.stringify(adminData.admin));
        localStorage.setItem('active_user_email', emailVal);

        if (adminData.mustChangePassword) {
          setAdminPending(adminData);
          return;
        }

        startSimulatedLoad('Signing In as IT Admin...', 1500, () => navigate('/itadmin/dashboard'), false);
        return;
      }
    } catch (err) {
      // server unreachable: the student login below will show the connection error
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });
      const data = await response.json();

      if (data.suspended || data.is_suspended) {
        setSuspendedUserData({
          email: emailVal,
          reason: data.reason || 'Community Guidelines Violation',
          liftUntil: data.liftUntil || 'Until reviewed by IT administration',
        });
        setShowSuspendedModal(true);
        return;
      }

      if (!response.ok) {
        setLoginError(`✘ ${data.error || 'Invalid email or password.'}`);
        return;
      }

      if (data.user) persistUser(data.user, { saveAssets: true });

      startSimulatedLoad('Signing In...', 2000, () => navigate('/dashboard'), false);
    } catch (err) {
      console.error(err);
      setLoginError('✘ Unable to connect to Flask server.');
    }
  };

  const handleAdminPasswordChange = async (e) => {
    e.preventDefault();

    if (!passwordRegex.test(adminNewPassword)) {
      setAdminPwErr('Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPwErr('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/itadmin/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminPending.token}` },
        body: JSON.stringify({ old_password: loginPassword, new_password: adminNewPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAdminPwErr(data.error || 'Could not change password.');
        return;
      }

      sessionStorage.setItem('admin_token', data.token);
      setAdminPending(null);
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setLoginPassword('');

      startSimulatedLoad('Signing In as IT Admin...', 1500, () => navigate('/itadmin/dashboard'), false);
    } catch (err) {
      setAdminPwErr('Unable to connect to server.');
    }
  };

  /* ---------------- sign up ---------------- */
  const handleSignupSubmit = (e) => {
    e.preventDefault();

    const isUserValid = validateUsername();
    const isEmailValid = validateEmail();
    const isStudentIdValid = validateStudentId();
    const isPassValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();

    if (!isUserValid || !isEmailValid || !isStudentIdValid || !isPassValid || !isConfirmValid) return;

    setSignupConsentPending(true);
    setSignupAgeTermsChecked(false);
    setSignupTermsErr('');
  };

  const handleConfirmSignupConsent = async (e) => {
    e.preventDefault();

    if (!signupAgeTermsChecked) {
      setSignupTermsErr('You must confirm you are at least 18 years old and agree to the Terms and Privacy Policy.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUsername.trim(),
          email: signupEmail.trim(),
          student_id: signupStudentId.trim(),
          password: signupPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSignupConsentPending(false);
        if (data.field === 'email') setSignupEmailErr(data.error);
        else if (data.field === 'username') setSignupUsernameErr(data.error);
        else if (data.field === 'student_id') setSignupStudentIdErr(data.error);
        else setSignupTermsErr(data.error || 'Signup failed.');
        return;
      }

      if (data.user) {
        localStorage.setItem('active_user_email', data.user.email);
        localStorage.setItem(`user_${data.user.email}`, JSON.stringify(data.user));
        setPlayerData((prev) => ({
          ...prev,
          username: data.user.username,
          email: data.user.email,
          coins: data.user.coins ?? prev.coins,
          streakDays: data.user.streak ?? prev.streakDays,
        }));
      }

      setSignupUsername('');
      setSignupEmail('');
      setSignupStudentId('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setSignupConsentPending(false);

      triggerToast('Account created successfully!');
      startSimulatedLoad('Setting Up Profile...', 1500, () => navigate('/dashboard'), false);
    } catch (err) {
      console.error(err);
      setSignupConsentPending(false);
      setSignupTermsErr('Unable to connect to Flask server.');
    }
  };

  /* ---------------- reset password ---------------- */
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = resetEmail.trim();

    if (trimmedEmail === '') {
      setResetError('✘ Textbox is empty! Please enter your email.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        setResetError(`✘ ${data.error || 'Request failed.'}`);
        return;
      }

      setResetError('');
      setResetEmail('');
      switchView('login');
      triggerToast('Password reset link sent!');
    } catch (err) {
      console.error(err);
      setResetError('✘ Unable to connect to server.');
    }
  };

  /* ================================================================== */
  /* RENDER                                                              */
  /* ================================================================== */
  return (
    <div className="sc-auth">
      {/* ---------- HEADER ---------- */}
      <header className="sc-hd">
        <div className="sc-hd-in">
          <Link to="/" className="sc-logo">
            <img src="/media/kitsu_logo.png" alt="Kitsu Logo" />
            <span>StudyCircle</span>
          </Link>

          <nav className="sc-nav">
            <Link to="/">Home</Link>
            <Link to="/#section-2">Features</Link>
            <Link to="/#section-3">FAQs</Link>
          </nav>

          <div className="sc-actions">
            <button type="button" className="sc-btn" onClick={() => switchView('login')}>LOGIN</button>
            <button type="button" className="sc-btn p" onClick={() => switchView('signup')}>SIGN UP</button>
          </div>
        </div>
      </header>

      {/* ---------- AUTH CARD ---------- */}
      <section className="sc-au">
        <div className={`sc-card${activeView === 'reset' ? ' rs' : ''}`}>
          {activeView !== 'reset' && (
            <div className="sc-tabs">
              <button type="button" className={activeView === 'login' ? 'on' : ''} onClick={() => switchView('login')}>LOGIN</button>
              <button type="button" className={activeView === 'signup' ? 'on' : ''} onClick={() => switchView('signup')}>SIGN UP</button>
            </div>
          )}

          {/* LOGIN */}
          {activeView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="sc-form" noValidate>
              <h2>Welcome back!</h2>
              <p className="sc-sub-text">Pick up right where you left off.</p>

              <Field
                id="le"
                label="EMAIL"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@umak.edu.ph"
                invalid={!!loginError}
              />

              <PasswordField
                id="lp"
                label="PASSWORD"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                show={showLoginPassword}
                onToggle={() => setShowLoginPassword((s) => !s)}
                invalid={!!loginError}
              >
                {loginError && <p className="sc-err">{loginError}</p>}
              </PasswordField>

              <button type="submit" className="sc-sub">LOGIN</button>

              <div className="sc-ctr">
                <button type="button" className="sc-link" onClick={() => switchView('reset')}>Forgot Password?</button>
              </div>

              <OrDivider />
              <GoogleButton onClick={() => googleLoginTrigger()}>SIGN IN WITH GOOGLE</GoogleButton>
            </form>
          )}

          {/* SIGN UP */}
          {activeView === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="sc-form" noValidate>
              <h2>Join the circle!</h2>
              <p className="sc-sub-text">Create your StudyCircle account now.</p>

              <Field
                id="su"
                label="USERNAME"
                value={signupUsername}
                onChange={(e) => { setSignupUsername(e.target.value); validateUsername(e.target.value); }}
                placeholder="acorn_hero"
                error={signupUsernameErr}
              />

              <Field
                id="se"
                label="EMAIL"
                type="email"
                value={signupEmail}
                onChange={(e) => { setSignupEmail(e.target.value); validateEmail(e.target.value); }}
                placeholder="you@umak.edu.ph"
                error={signupEmailErr}
              />

              <Field
                id="ss"
                label="STUDENT ID"
                value={signupStudentId}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 9);
                  setSignupStudentId(val);
                  validateStudentId(val);
                }}
                placeholder="A12345678"
                error={signupStudentIdErr}
              />

              <PasswordField
                id="sp"
                label="PASSWORD"
                value={signupPassword}
                onChange={(e) => {
                  setSignupPassword(e.target.value);
                  validatePassword(e.target.value);
                  if (signupConfirmPassword !== '') validateConfirmPassword(signupConfirmPassword, e.target.value);
                }}
                show={showSignupPassword}
                onToggle={() => setShowSignupPassword((s) => !s)}
                invalid={!!signupPasswordErr}
              >
                {signupPasswordErr && <p className="sc-err">✘ {signupPasswordErr}</p>}
              </PasswordField>

              <PasswordField
                id="sc"
                label="CONFIRM PASSWORD"
                value={signupConfirmPassword}
                onChange={(e) => {
                  setSignupConfirmPassword(e.target.value);
                  validateConfirmPassword(e.target.value, signupPassword);
                }}
                show={showSignupConfirmPassword}
                onToggle={() => setShowSignupConfirmPassword((s) => !s)}
                invalid={isConfirmPasswordCustomError}
              >
                <p className={`sc-err${isConfirmPasswordCustomError ? '' : ' g'}`}>
                  {isConfirmPasswordCustomError ? `✘ ${signupConfirmPasswordErr}` : signupConfirmPasswordErr}
                </p>
              </PasswordField>

              <p className="sc-terms">
                By clicking Sign Up or continuing with Google, you agree to StudyCircle’s{' '}
                <button type="button" className="sc-tx" onClick={() => setLegalModal('terms')}>Terms &amp; Conditions</button>{' '}
                and{' '}
                <button type="button" className="sc-tx" onClick={() => setLegalModal('privacy')}>Privacy Policy</button>.
              </p>

              <button type="submit" className="sc-sub">SIGN UP</button>

              <OrDivider />
              <GoogleButton onClick={() => googleLoginTrigger()}>SIGN UP WITH GOOGLE</GoogleButton>
            </form>
          )}

          {/* RESET PASSWORD */}
          {activeView === 'reset' && (
            <form onSubmit={handleResetSubmit} className="sc-rs" noValidate>
              <div className="sc-lg-h">
                <span className="sc-lg-i" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
                    <rect x="3" y="5" width="18" height="14" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <div className="sc-lg-t">
                  <small>STUDYCIRCLE ★ ACCOUNT</small>
                  <h3>Reset Password</h3>
                </div>
              </div>

              <div className="sc-lg-b">
                <p className="sc-lg-in">We’ll send a password reset link to your UMak email.</p>

                <div className="sc-field">
                  <label htmlFor="re">EMAIL</label>
                  <div className="sc-pw">
                    <input
                      id="re"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@umak.edu.ph"
                      autoComplete="off"
                      className={`sc-input${resetError ? ' bad' : ''}`}
                    />
                  </div>
                  {resetError && <p className="sc-err">{resetError}</p>}
                </div>

                <button type="submit" className="sc-sub">SEND RESET LINK</button>
              </div>

              <div className="sc-lg-f">
                <span>Remembered it?</span>
                <button type="button" className="sc-link" onClick={() => switchView('login')}>← Back to login</button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ---------- SUSPENDED MODAL ---------- */}
      {showSuspendedModal && (
        <div className="sc-md">
          <div className="sc-mb">
            <h3 className="danger">ACCOUNT SUSPENDED</h3>
            <p>Your StudyCircle account has been suspended due to a violation of community guidelines.</p>

            {suspendedUserData && (
              <div className="sc-box">
                <span>ACCOUNT: {suspendedUserData.email}</span>
                <span className="red">Reason: {suspendedUserData.reason}</span>
              </div>
            )}

            {suspendedUserData?.liftUntil && (
              <div className="sc-box accent">
                <span>Suspension Duration / Expiration:</span>
                <span className="big">{suspendedUserData.liftUntil}</span>
              </div>
            )}

            <p className="sc-note">
              If you believe this is a mistake, please contact support at{' '}
              <span style={{ color: 'var(--primary)' }}>support@studycircle.app</span>.
            </p>

            <button
              type="button"
              className="sc-mbtn pr full"
              onClick={() => {
                setShowSuspendedModal(false);
                setLoginPassword('');
                setSuspendedUserData(null);
              }}
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      )}

      {/* ---------- ADMIN FIRST-LOGIN PASSWORD MODAL ---------- */}
      {adminPending && (
        <div className="sc-md">
          <div className="sc-mb">
            <h3>Set a New Password</h3>
            <p>
              Welcome, {adminPending.admin.fullName}! You’re using a temporary password. Please set your own before continuing.
            </p>

            <form onSubmit={handleAdminPasswordChange} className="sc-form" style={{ gap: 12 }} noValidate>
              <Field
                id="an"
                label="NEW PASSWORD"
                type="password"
                value={adminNewPassword}
                onChange={(e) => { setAdminNewPassword(e.target.value); setAdminPwErr(''); }}
              />
              <Field
                id="ac"
                label="CONFIRM PASSWORD"
                type="password"
                value={adminConfirmPassword}
                onChange={(e) => { setAdminConfirmPassword(e.target.value); setAdminPwErr(''); }}
              />
              {adminPwErr && <p className="sc-err">✘ {adminPwErr}</p>}
              <button type="submit" className="sc-mbtn pr full">SAVE &amp; CONTINUE</button>
            </form>
          </div>
        </div>
      )}

      {/* ---------- SIGN UP CONFIRMATION MODAL ---------- */}
      {signupConsentPending && (
        <div className="sc-md" role="dialog" aria-modal="true" aria-labelledby="sc-cr-title">
          <form className="sc-lg sc-cr" onSubmit={handleConfirmSignupConsent} noValidate>
            {/* header */}
            <div className="sc-lg-h">
              <span className="sc-lg-i" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
                  <path d="M8.5 12l2.5 2.5 4.5-5" />
                </svg>
              </span>
              <div className="sc-lg-t">
                <small>STUDYCIRCLE ★ ALMOST THERE</small>
                <h3 id="sc-cr-title">Confirm Registration</h3>
              </div>
            </div>

            {/* body */}
            <div className="sc-lg-b">
              <p className="sc-lg-in">
                You are almost ready to start learning with StudyCircle! Please confirm your details and agreement to continue.
              </p>

              <div className="sc-cr-sum">
                <div className="sc-cr-row">
                  <span className="sc-cr-k">USERNAME</span>
                  <span className="sc-cr-v">{signupUsername.trim()}</span>
                </div>
                <div className="sc-cr-row">
                  <span className="sc-cr-k">EMAIL</span>
                  <span className="sc-cr-v">{signupEmail.trim()}</span>
                </div>
                <div className="sc-cr-row">
                  <span className="sc-cr-k">STUDENT ID</span>
                  <span className="sc-cr-v">{signupStudentId.trim().toUpperCase()}</span>
                </div>
              </div>

              <label className={`sc-cr-check${signupAgeTermsChecked ? ' on' : ''}${signupTermsErr ? ' bad' : ''}`}>
                <input
                  type="checkbox"
                  checked={signupAgeTermsChecked}
                  onChange={(e) => {
                    setSignupAgeTermsChecked(e.target.checked);
                    if (e.target.checked) setSignupTermsErr('');
                  }}
                />
                <span className="sc-cr-box" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                <span className="sc-cr-txt">
                  You confirm that you are at least 18 years old, and that you have read and agree to our{' '}
                  <button type="button" className="sc-tx" onClick={() => setLegalModal('terms')}>Terms of Service</button>{' '}
                  and{' '}
                  <button type="button" className="sc-tx" onClick={() => setLegalModal('privacy')}>Privacy Policy</button>.
                </span>
              </label>
              {signupTermsErr && <p className="sc-err sc-cr-err">✘ {signupTermsErr}</p>}
            </div>

            {/* footer */}
            <div className="sc-lg-f">
              <button
                type="button"
                className="sc-cr-cancel"
                onClick={() => {
                  setSignupConsentPending(false);
                  setSignupAgeTermsChecked(false);
                  setSignupTermsErr('');
                }}
              >
                CANCEL
              </button>
              <button type="submit" className={`sc-lg-ok${signupAgeTermsChecked ? '' : ' dim'}`}>
                COMPLETE SIGNUP
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- GOOGLE USERNAME MODAL ---------- */}
      {googleUserPending && (
        <div className="sc-md">
          <div className="sc-mb">
            <div className="sc-gprofile">
              {googleUserPending.picture && <img src={googleUserPending.picture} alt="Google Avatar" />}
              <div>
                <h3>Choose Username</h3>
                <small>{googleUserPending.email}</small>
              </div>
            </div>

            <p>Welcome to StudyCircle! Please pick a unique username to complete setting up your account.</p>

            <form onSubmit={handleGoogleUsernameSubmit} className="sc-form" style={{ gap: 12 }} noValidate>
              <div className="sc-field">
                <label htmlFor="gu">USERNAME</label>
                <div className="sc-pw">
                  <input
                    id="gu"
                    type="text"
                    value={googleUsernameInput}
                    onChange={(e) => { setGoogleUsernameInput(e.target.value); setGoogleUsernameErr(''); }}
                    placeholder="acorn_hero"
                    autoComplete="off"
                    className={`sc-input${googleUsernameErr ? ' bad' : ''}`}
                  />
                </div>
                <p className="sc-note">
                  Usernames can be changed at any time. They must be 1 to 20 characters, containing only letters a to z, numbers 0 to 9, hyphens, or underscores.
                </p>
                {googleUsernameErr && <p className="sc-err">✘ {googleUsernameErr}</p>}
              </div>

              <Field
                id="gs"
                label="STUDENT ID"
                value={googleStudentId}
                onChange={(e) => {
                  setGoogleStudentId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 9));
                  setGoogleStudentIdErr('');
                }}
                placeholder="A12345678"
                error={googleStudentIdErr}
              />

              <ConsentCheck
                checked={googleAgeTermsChecked}
                onChange={(v) => { setGoogleAgeTermsChecked(v); if (v) setGoogleTermsErr(''); }}
                error={googleTermsErr}
                onOpenTerms={() => setLegalModal('terms')}
                onOpenPrivacy={() => setLegalModal('privacy')}
              />

              <div className="sc-row center">
                <button type="button" className="sc-mbtn" onClick={closeGoogleModal}>CANCEL</button>
                <button type="submit" className="sc-mbtn pr">COMPLETE</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- TERMS / PRIVACY (always on top) ---------- */}
      {legalModal && <LegalModal kind={legalModal} onClose={() => setLegalModal(null)} />}

      {/* ---------- TOASTS ---------- */}
      <div className="sc-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div className="sc-toast" key={t.id}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="#788D55" strokeWidth="4" />
            </svg>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ---------- FOOTER ---------- */}
      <footer className="sc-ft">
        <div className="sc-ft-j">
          <div className="sc-ft-l">
            <img src="/media/kitsu_logo.png" alt="Kitsu Logo" />
            <div>
              <div className="sc-ft-e">★ JOIN THE CIRCLE ★</div>
              <h3>Kitsu is waiting.</h3>
              <p>Level up your learning with AI-powered study adventures.</p>
            </div>
          </div>
          <button type="button" className="sc-btn g" onClick={() => switchView('signup')}>JOIN NOW!</button>
        </div>

        <div className="sc-ft-g">
          <div className="sc-ft-a">
            <div className="sc-ft-brand">
              <img src="/media/kitsu_logo.png" alt="Kitsu Logo" />
              <span className="sc-ft-e">STUDYCIRCLE</span>
            </div>
            <p>
              Turn studying into an adventure with StudyCircle! Upload your notes, let AI create personalized quizzes, join cozy pixel-art study rooms, and level up with XP, badges, and exciting rewards as you learn.
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/media/coin_logo.png" alt="Coin Logo" style={{ width: 31, height: 31, objectFit: 'contain' }} />
              12,000+ students leveling up today
            </p>
          </div>

          <div>
            <h4>PRODUCT</h4>
            <nav>
              <Link to="/#section-2">Features</Link>
              <Link to="/#section-3">FAQs</Link>
              <Link to="/">Learn Now!</Link>
              <button type="button" onClick={() => switchView('login')}>Login</button>
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
              <Link to="/#about">About</Link>
              <button type="button" onClick={() => setLegalModal('privacy')}>Privacy</button>
              <button type="button" onClick={() => setLegalModal('terms')}>Terms</button>
              <Link to="/#contact">Contact</Link>
            </nav>
          </div>
        </div>

        <div className="sc-ft-cp">
          <span>✦ © 2026 StudyCircle · Brewed with chamomile</span>
          <span>V1.0 · All rights reserved</span>
        </div>
      </footer>
    </div>
  );
}