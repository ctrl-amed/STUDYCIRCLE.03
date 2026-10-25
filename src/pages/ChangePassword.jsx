import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../Auth.css';

// Same constant as Auth.jsx. The old URL here was "http://https://studycircle-03.onrender.com/..."
// which is invalid. Swap to your deployed URL when you go live.
const API_URL = 'http://127.0.0.1:5000';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,}$/;

const RULES = [
  { id: 'len', label: '8+ characters', test: (v) => v.length >= 8 },
  { id: 'up', label: 'Uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'low', label: 'Lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'num', label: 'A number', test: (v) => /\d/.test(v) },
  { id: 'sp', label: 'Special character', test: (v) => /[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]/.test(v) },
];

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];

// how many of the 5 rules pass -> meter level 0..4
const levelFor = (passed) => (passed === 0 ? 0 : passed <= 2 ? 1 : passed === 3 ? 2 : passed === 4 ? 3 : 4);

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
          autoComplete="new-password"
          className={`sc-input has-eye${invalid ? ' bad' : ''}`}
        />
        <button type="button" className="sc-eye" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}>
          <EyeIcon open={show} />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false); // becomes true after the first submit attempt
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const passed = RULES.filter((r) => r.test(newPassword)).length;
  const level = levelFor(passed);
  const allMet = passwordRegex.test(newPassword);
  const matches = confirmPassword !== '' && confirmPassword === newPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setTouched(true);
    if (!allMet || !matches || busy) return;

    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Auth.jsx reads this flag and shows the "Password changed successfully!" toast
        localStorage.setItem('passwordChangedSuccess', 'true');
        navigate('/auth#login');
        return;
      }
      setFormError(data.error || 'Could not change your password. The link may have expired.');
    } catch (err) {
      console.error(err);
      setFormError('Unable to connect to server.');
    }
    setBusy(false);
  };

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
            <Link to="/auth#login" className="sc-btn">LOGIN</Link>
            <Link to="/auth#signup" className="sc-btn p">SIGN UP</Link>
          </div>
        </div>
      </header>

      {/* ---------- CARD ---------- */}
      <section className="sc-au">
        {!token ? (
          /* link is missing the token */
          <div className="sc-lg sc-cp">
            <div className="sc-lg-h">
              <span className="sc-lg-i" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M12 3l10 18H2z" />
                  <path d="M12 10v5M12 18v.5" />
                </svg>
              </span>
              <div className="sc-lg-t">
                <small>STUDYCIRCLE ★ SECURITY</small>
                <h3>Link not valid</h3>
              </div>
            </div>
            <div className="sc-lg-b">
              <p className="sc-cp-state">
                This password reset link is missing or has expired. Go back to the login page and use “Forgot Password?” to get a new one.
              </p>
              <Link to="/auth#login" className="sc-sub sc-cp-btn">BACK TO LOGIN</Link>
            </div>
          </div>
        ) : (
          <form className="sc-lg sc-cp" onSubmit={handleSubmit} noValidate>
            <div className="sc-lg-h">
              <span className="sc-lg-i" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
                  <rect x="5" y="11" width="14" height="10" />
                  <path d="M8 11V8a4 4 0 018 0v3M12 15v2" />
                </svg>
              </span>
              <div className="sc-lg-t">
                <small>STUDYCIRCLE ★ SECURITY</small>
                <h3>Change Password</h3>
              </div>
            </div>

            <div className="sc-lg-b">
              <p className="sc-lg-in">Create a new password to secure your account.</p>

              {/* NEW PASSWORD */}
              <PasswordField
                id="np"
                label="NEW PASSWORD"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                show={showNew}
                onToggle={() => setShowNew((s) => !s)}
                invalid={touched && !allMet}
              >
                <div className="sc-cp-meter" data-l={level} aria-hidden="true">
                  <i /><i /><i /><i />
                </div>
                <div className="sc-cp-ml" aria-live="polite">
                  <span>Password strength</span>
                  <b>{newPassword ? STRENGTH_LABEL[level] : '—'}</b>
                </div>
              </PasswordField>

              <ul className="sc-cp-req" aria-label="Password requirements">
                {RULES.map((r) => {
                  const ok = r.test(newPassword);
                  return (
                    <li key={r.id} className={ok ? 'ok' : touched ? 'bad' : ''}>
                      <i aria-hidden="true" />
                      <span>{r.label}</span>
                    </li>
                  );
                })}
              </ul>

              {/* CONFIRM PASSWORD */}
              <PasswordField
                id="cp"
                label="CONFIRM NEW PASSWORD"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                show={showConfirm}
                onToggle={() => setShowConfirm((s) => !s)}
                invalid={confirmPassword !== '' && !matches}
              >
                {confirmPassword !== '' && (
                  <p className={`sc-cp-match ${matches ? 'ok' : 'bad'}`}>
                    {matches ? '✔ Passwords match.' : '✘ Passwords do not match.'}
                  </p>
                )}
                {touched && confirmPassword === '' && (
                  <p className="sc-cp-match bad">✘ Confirm password field can't be empty.</p>
                )}
              </PasswordField>

              {formError && <div className="sc-cp-alert" role="alert">✘ {formError}</div>}

              <button type="submit" className="sc-sub" disabled={busy}>
                {busy ? 'CHANGING...' : 'CHANGE PASSWORD'}
              </button>
            </div>

            <div className="sc-lg-f">
              <span>Remembered it?</span>
              <Link to="/auth#login" className="sc-link">← Back to login</Link>
            </div>
          </form>
        )}
      </section>

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
          <Link to="/auth#signup" className="sc-btn g">JOIN NOW!</Link>
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
              <Link to="/#about">About</Link>
              <Link to="/#privacy">Privacy</Link>
              <Link to="/#terms">Terms</Link>
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