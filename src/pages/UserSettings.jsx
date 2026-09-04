import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function UserSettings() {
  const { playerData, setPlayerData } = usePlayer();

  // Settings State - Kunin ang email mula sa playerData kung meron
  const [settingsData, setSettingsData] = useState(() => ({
    email: playerData?.email || 'hero@acorn.study',
    passwordHash: playerData?.passwordHash || 'Password123!',
    dailyReminderEnabled: true,
    dailyReminderTime: '08:00',
    manualReminders: [
      { id: 1, title: 'Midterms Study Session', datetime: '2026-06-15T14:30' },
    ],
  }));

  useEffect(() => {
    if (playerData?.email) {
      setSettingsData((prev) => ({ ...prev, email: playerData.email }));
    }
  }, [playerData]);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  // Modals Visibility
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Edit Username Modal Form State
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Edit Email Modal Form State
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Change Password Modal Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [oldPassError, setOldPassError] = useState('');
  const [newPassError, setNewPassError] = useState('');
  const [passwordNote, setPasswordNote] = useState('');

  // Study Reminders Form State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderTimeInput, setReminderTimeInput] = useState(settingsData.dailyReminderTime);
  const [manualDatetimeInput, setManualDatetimeInput] = useState('');

  // Password Strength Regex
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Toast Generator
  const showSuccessToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- USERNAME HANDLERS (Connected to Backend) ---
  const handleOpenUsernameModal = () => {
    setNewUsername('');
    setUsernameError('');
    setShowUsernameModal(true);
  };

  const handleUsernameInputChange = (val) => {
    setNewUsername(val);
    if (val.length === 0) {
      setUsernameError('');
    } else if (val.length < 6 || val.length > 20) {
      setUsernameError('Username must be between 6 and 20 characters.');
    } else {
      setUsernameError('');
    }
  };

  const handleSaveUsername = async () => {
    const val = newUsername.trim();
    if (val.length < 6 || val.length > 20) {
      setUsernameError('Invalid length (6-20 chars required).');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_email: playerData?.email,
          new_username: val,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setUsernameError(data.error || 'Failed to update username in database.');
        return;
      }

      setPlayerData((prev) => {
        const updated = { ...prev, username: val };
        const savedUser = JSON.parse(localStorage.getItem('user')) || {};
        localStorage.setItem('user', JSON.stringify({ ...savedUser, username: val }));
        return updated;
      });

      setShowUsernameModal(false);
      showSuccessToast('Username updated successfully!');
    } catch (err) {
      console.error(err);
      setUsernameError('Unable to connect to server.');
    }
  };

  // --- EMAIL HANDLERS (Connected to Backend) ---
  const handleOpenEmailModal = () => {
    setNewEmail('');
    setEmailError('');
    setShowEmailModal(true);
  };

  const handleSaveEmail = async () => {
    const val = newEmail.trim();
    if (!val) {
      setEmailError('Email field cannot be empty.');
      return;
    }
    if (!emailRegex.test(val)) {
      setEmailError('Invalid email address format (missing @ or domain).');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_email: playerData?.email,
          new_email: val,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setEmailError(data.error || 'Failed to update email in database.');
        return;
      }

      setSettingsData((prev) => ({ ...prev, email: val }));
      setPlayerData((prev) => {
        const updated = { ...prev, email: val };
        const savedUser = JSON.parse(localStorage.getItem('user')) || {};
        localStorage.setItem('user', JSON.stringify({ ...savedUser, email: val }));
        localStorage.setItem('active_user_email', val);
        return updated;
      });

      setShowEmailModal(false);
      showSuccessToast('Email updated successfully!');
    } catch (err) {
      console.error(err);
      setEmailError('Unable to connect to server.');
    }
  };

  // --- PASSWORD HANDLERS ---
  const handleOpenPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOldPassError('');
    setNewPassError('');
    setPasswordNote('');
    setShowOldPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setShowPasswordModal(true);
  };

  const handleNewPassChange = (val) => {
    setNewPassword(val);
    if (!val) {
      setNewPassError('');
    } else if (!strongPasswordRegex.test(val)) {
      setNewPassError(
        'Password not strong enough. Must contain 8+ characters, uppercase, lowercase, number, and special char.'
      );
    } else {
      setNewPassError('');
    }

    if (confirmPassword && confirmPassword !== val) {
      setPasswordNote('Passwords do not match.');
    } else if (confirmPassword && confirmPassword === val) {
      setPasswordNote('');
    }
  };

  const handleConfirmPassChange = (val) => {
    setConfirmPassword(val);
    if (!val) {
      setPasswordNote('');
    } else if (val !== newPassword) {
      setPasswordNote('Passwords do not match.');
    } else {
      setPasswordNote('');
    }
  };

  const handleSavePassword = async () => {
    let hasError = false;

    if (!oldPassword) {
      setOldPassError('Old password is required.');
      hasError = true;
    }

    if (!newPassword) {
      setNewPassError('New password is required.');
      hasError = true;
    } else if (!strongPasswordRegex.test(newPassword)) {
      setNewPassError('Password not strong enough.');
      hasError = true;
    }

    if (!confirmPassword) {
      setPasswordNote('Confirm password is required.');
      hasError = true;
    } else if (confirmPassword !== newPassword) {
      setPasswordNote('Passwords do not match.');
      hasError = true;
    }

    if (hasError) return;

    try {
      const response = await fetch('http://localhost:5000/api/change-password-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: playerData?.email,
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setOldPassError(data.error || 'Wrong credentials');
        return;
      }

      setSettingsData((prev) => ({ ...prev, passwordHash: newPassword }));
      setShowPasswordModal(false);
      showSuccessToast('Password changed successfully!');
    } catch (err) {
      console.error(err);
      setOldPassError('Unable to connect to server.');
    }
  };

  // --- REMINDERS HANDLERS (Connected to Backend) ---
  const toggleDailyReminder = async () => {
    const newEnabledState = !settingsData.dailyReminderEnabled;
    
    setSettingsData((prev) => ({
      ...prev,
      dailyReminderEnabled: newEnabledState,
    }));

    try {
      await fetch('http://localhost:5000/api/update-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: playerData?.email,
          enabled: newEnabledState,
          time: settingsData.dailyReminderTime
        })
      });
      showSuccessToast('Daily reminder status updated!');
    } catch (error) {
      console.error('Error updating reminder status:', error);
    }
  };

  const handleSaveTime = async () => {
    if (!reminderTimeInput) return;
    
    setSettingsData((prev) => ({ ...prev, dailyReminderTime: reminderTimeInput }));
    setShowTimePicker(false);

    try {
      await fetch('http://localhost:5000/api/update-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: playerData?.email,
          enabled: settingsData.dailyReminderEnabled,
          time: reminderTimeInput
        })
      });
      showSuccessToast('Reminder time saved successfully!');
    } catch (error) {
      console.error('Error saving reminder time:', error);
    }
  };

  const handleAddManualReminder = () => {
    if (!manualDatetimeInput) return;
    setSettingsData((prev) => ({
      ...prev,
      manualReminders: [
        ...prev.manualReminders,
        { id: Date.now(), title: 'Custom Reminder', datetime: manualDatetimeInput },
      ],
    }));
    setManualDatetimeInput('');
    showSuccessToast('Manual reminder added!');
  };

  const handleRemoveManualReminder = (id) => {
    setSettingsData((prev) => ({
      ...prev,
      manualReminders: prev.manualReminders.filter((r) => r.id !== id),
    }));
    showSuccessToast('Manual reminder removed!');
  };

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5 pb-10">
      {/* RETRO TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 pointer-events-none flex flex-col gap-3">
          <div
            key={toastMessage}
            className="bg-theme-surface border-4 border-theme-dark p-4 flex flex-col gap-2 relative shadow-md transition-all duration-300 max-w-xs retro-shadow pointer-events-auto opacity-100 translate-y-0 rounded-none! overflow-hidden dark:bg-zinc-900"
            style={{ boxShadow: '4px 4px 0px #3D2013' }}
          >
            <div className="flex items-start gap-3 pr-2">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#788D55" strokeWidth="4" strokeLinecap="square" strokeLinejoin="square" />
              </svg>
              <span className="font-pressstart text-[11px] sm:text-[12px] text-theme-dark tracking-wide break-words leading-relaxed">
                {toastMessage}
              </span>
            </div>
            <div className="w-full bg-transparent h-1.5 flex justify-center mt-auto overflow-hidden">
              <div className="w-full h-full bg-theme-safe animate-progress-center" />
            </div>
          </div>
        </div>
      )}

      {/* ROW 1: TITLE & SUBTEXT */}
      <div className="flex flex-col gap-1">
        <h1 className="font-pressstart text-3xl sm:text-4xl md:text-5xl inline-block level-up-gradient bg-clip-text text-transparent w-fit">
          SETTINGS
        </h1>
        <p className="font-pressstart text-[10px] sm:text-xs text-theme-dark/80">
          Manage your account and get study reminders.
        </p>
      </div>

      {/* TWO COLUMNS CARD LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT CARD: ACCOUNT SETTINGS */}
        <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-5 sm:p-6 shadow-md flex flex-col gap-5 dark:bg-zinc-800">
          <div className="flex items-center gap-3 border-b-2 border-theme-dark/20 pb-3">
            <svg className="w-[1em] h-[1em] text-[20px] text-theme-primary" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11 7c0 1.66-1.34 3-3 3S5 8.66 5 7s1.34-3 3-3s3 1.34 3 3" />
              <path fillRule="evenodd" d="M16 8c0 4.42-3.58 8-8 8s-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8M4 13.75C4.16 13.484 5.71 11 7.99 11c2.27 0 3.83 2.49 3.99 2.75A6.98 6.98 0 0 0 14.99 8c0-3.87-3.13-7-7-7s-7 3.13-7 7c0 2.38 1.19 4.49 3.01 5.75" clipRule="evenodd" />
            </svg>
            <h2 className="font-pressstart text-[12px] sm:text-[14px] text-theme-dark">ACCOUNT</h2>
          </div>

          <div className="flex flex-col gap-4">
            {/* USERNAME ROW */}
            <div className="flex items-center justify-between pb-4 border-b-[1.5px] border-dashed border-theme-dark/30">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-pixel text-[14px] text-theme-dark/70 uppercase">Username</span>
                <span className="font-pressstart text-[12px] text-theme-dark truncate mt-1">
                  {playerData?.username || 'ACORN_HERO'}
                </span>
              </div>
              <button
                onClick={handleOpenUsernameModal}
                className="h-8 sm:h-11 bg-theme-muted border-[2px] border-theme-dark px-2 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 retro-shadow shrink-0 cursor-pointer hover:bg-theme-muted dark:bg-zinc-700"
              >
                <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-theme-dark" viewBox="0 0 24 24" fill="none">
                  <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 6.34l-3.75-3.75-2.53 2.54 3.75 3.75 2.53-2.54z" />
                </svg>
                <span className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark">EDIT</span>
              </button>
            </div>

            {/* EMAIL ROW */}
            <div className="flex items-center justify-between pb-4 border-b-[1.5px] border-dashed border-theme-dark/30">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-pixel text-[14px] text-theme-dark/70 uppercase">Email</span>
                <span className="font-pressstart text-[9px] sm:text-[12px] text-theme-dark break-all leading-tight sm:leading-normal mt-1">
                  {playerData?.email || settingsData.email}
                </span>
              </div>
              <button
                onClick={handleOpenEmailModal}
                className="h-8 sm:h-11 bg-theme-muted border-[2px] border-theme-dark px-2 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 retro-shadow shrink-0 cursor-pointer hover:bg-theme-muted dark:bg-zinc-700"
              >
                <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-theme-dark" viewBox="0 0 24 24" fill="none">
                  <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 6.34l-3.75-3.75-2.53 2.54 3.75 3.75 2.53-2.54z" />
                </svg>
                <span className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark">EDIT</span>
              </button>
            </div>

            {/* CHANGE PASSWORD ROW */}
            <button
              onClick={handleOpenPasswordModal}
              className="w-full flex items-center justify-between pt-1 group cursor-pointer text-left bg-transparent border-none p-0"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-theme-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="font-pressstart text-[10px] sm:text-[11px] text-theme-dark group-hover:text-theme-primary transition-colors">
                  Change password
                </span>
              </div>
              <span className="font-pressstart text-[10px] text-theme-dark group-hover:text-theme-primary flex items-center gap-1">
                <span className="transition-transform group-hover:translate-x-0.5">&gt;</span>
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT CARD: STUDY REMINDERS */}
        <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-5 sm:p-6 shadow-md flex flex-col gap-5 dark:bg-zinc-800">
          <div className="flex items-center gap-3 border-b-2 border-theme-dark/20 pb-3">
            <svg className="w-[1em] h-[1em] text-[20px] text-theme-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            <h2 className="font-pressstart text-[12px] sm:text-[14px] text-theme-dark">Study reminders</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 pb-4 border-b-[1.5px] border-dashed border-theme-dark/30">
              <div className="flex items-center justify-between">
                <div className="flex flex-col pr-2">
                  <span className="font-pressstart text-[10px] sm:text-[11px] text-theme-dark">
                    DAILY STUDY REMINDER
                  </span>
                  <span className="font-pixel text-[13px] text-theme-dark/70 mt-1">
                    Get a reminder via email to keep you focused.
                  </span>
                </div>
                <button
                  onClick={toggleDailyReminder}
                  className={`w-12 h-6 border-[2px] border-theme-dark rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 ${
                    settingsData.dailyReminderEnabled ? 'bg-theme-primary' : 'bg-theme-dark/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-theme-muted border border-theme-dark rounded-full absolute top-[2px] left-[2px] transition-transform duration-200 ${
                      settingsData.dailyReminderEnabled ? 'translate-x-[24px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settingsData.dailyReminderEnabled && (
                <div className="flex flex-col gap-2 mt-2 bg-theme-muted p-3 rounded-[6px] border border-theme-dark/30 dark:bg-zinc-700">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[13px] text-theme-dark">
                      You will be reminded daily at {settingsData.dailyReminderTime}
                    </span>
                    <button
                      onClick={() => setShowTimePicker(!showTimePicker)}
                      className="font-pressstart text-[8px] bg-theme-primary text-white border border-theme-dark px-2 py-1 cursor-pointer hover:opacity-90"
                    >
                      EDIT
                    </button>
                  </div>
                  {showTimePicker && (
                    <div className="flex items-center gap-2 pt-2 border-t border-theme-dark/20">
                      <input
                        type="time"
                        value={reminderTimeInput}
                        onChange={(e) => setReminderTimeInput(e.target.value)}
                        className="bg-theme-surface border border-theme-dark px-2 py-1 font-pixel text-[14px] text-theme-dark rounded dark:bg-zinc-800"
                      />
                      <button
                        onClick={handleSaveTime}
                        className="font-pressstart text-[8px] bg-theme-safe text-white border border-theme-dark px-3 py-1.5 cursor-pointer hover:opacity-90"
                      >
                        SAVE
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!settingsData.dailyReminderEnabled && (
              <div className="flex flex-col gap-3 pt-1">
                <span className="font-pressstart text-[10px] text-theme-dark">MANUAL REMINDERS</span>
                <span className="font-pixel text-[13px] text-theme-dark/70">
                  Set a specific custom date and time for a reminder.
                </span>

                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <input
                    type="datetime-local"
                    value={manualDatetimeInput}
                    onChange={(e) => setManualDatetimeInput(e.target.value)}
                    className="bg-theme-muted border-[1.5px] border-theme-dark p-2 font-pixel text-[13px] text-theme-dark rounded-[6px] flex-1 dark:bg-zinc-700"
                  />
                  <button
                    onClick={handleAddManualReminder}
                    className="font-pressstart text-[9px] bg-theme-primary text-white border-[2px] border-theme-dark px-4 py-2 hover:opacity-90 cursor-pointer"
                  >
                    SAVE
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {settingsData.manualReminders.length === 0 ? (
                    <span className="font-pixel text-[12px] text-theme-dark/60 italic">
                      No manual reminders set.
                    </span>
                  ) : (
                    settingsData.manualReminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="flex items-center justify-between bg-theme-muted p-2 rounded-[6px] border border-theme-dark/30 font-pixel text-[13px] dark:bg-zinc-700"
                      >
                        <span className="text-theme-dark">
                          📅 {new Date(rem.datetime).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveManualReminder(rem.id)}
                          className="text-theme-danger font-pressstart text-[8px] hover:underline cursor-pointer"
                        >
                          REMOVE
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* 1. EDIT USERNAME MODAL */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-theme-dark/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-md shadow-2xl flex flex-col gap-4 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b-2 border-theme-dark/20 pb-3">
              <h3 className="font-pressstart text-[12px] text-theme-primary">Edit Username</h3>
              <button
                onClick={() => setShowUsernameModal(false)}
                className="font-pressstart text-[10px] text-theme-dark hover:text-theme-primary cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 font-pixel text-[14px] text-theme-dark">
              <div className="flex flex-col gap-1">
                <span className="text-theme-dark/70">Current Username:</span>
                <span className="font-pressstart text-[11px]">
                  {playerData?.username || 'ACORN_HERO'}
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-2">
                <label className="text-theme-dark">New Username:</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={20}
                    value={newUsername}
                    onChange={(e) => handleUsernameInputChange(e.target.value)}
                    placeholder="Enter new username"
                    className="w-full bg-theme-muted border-[1.5px] border-theme-dark p-2.5 pr-12 font-pixel text-[15px] rounded-[6px] outline-none dark:bg-zinc-800"
                  />
                  <span className="absolute right-3 top-2.5 text-[12px] text-theme-dark/60">
                    {newUsername.length}/20
                  </span>
                </div>
                <p className={`font-pixel text-[12px] mt-1 leading-tight ${usernameError ? 'text-theme-danger' : 'text-theme-dark/70'}`}>
                  {usernameError ? `✘ ${usernameError}` : 'Usernames must be 6-20 characters long and can include letters, numbers, and special characters.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-theme-dark/20">
              <button
                type="button"
                onClick={() => setShowUsernameModal(false)}
                className="font-pressstart text-[9px] bg-transparent border-[2px] border-theme-dark px-4 py-2 hover:bg-theme-dark/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUsername}
                type="button"
                className="font-pressstart text-[9px] bg-theme-primary text-white border-[2px] border-theme-dark px-4 py-2 hover:opacity-90 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT EMAIL MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-theme-dark/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-md shadow-2xl flex flex-col gap-4 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b-2 border-theme-dark/20 pb-3">
              <h3 className="font-pressstart text-[12px] text-theme-primary">Edit Email</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="font-pressstart text-[10px] text-theme-dark hover:text-theme-primary cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 font-pixel text-[14px] text-theme-dark">
              <div className="flex flex-col gap-1">
                <span className="text-theme-dark/70">Current Email:</span>
                <span className="font-pressstart text-[11px] break-all">{playerData?.email || settingsData.email}</span>
              </div>
              <div className="flex flex-col gap-1 pt-2">
                <label className="text-theme-dark">New Email:</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  className="w-full bg-theme-muted border-[1.5px] border-theme-dark p-2.5 font-pixel text-[15px] rounded-[6px] outline-none dark:bg-zinc-800"
                />
                {emailError && (
                  <p className="font-pixel text-[12px] text-theme-danger mt-1 leading-tight">
                    ✘ {emailError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-theme-dark/20">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="font-pressstart text-[9px] bg-transparent border-[2px] border-theme-dark px-4 py-2 hover:bg-theme-dark/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmail}
                type="button"
                className="font-pressstart text-[9px] bg-theme-primary text-white border-[2px] border-theme-dark px-4 py-2 hover:opacity-90 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-theme-dark/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-lg shadow-2xl flex flex-col gap-4 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b-2 border-theme-dark/20 pb-3">
              <h3 className="font-pressstart text-[12px] text-theme-primary">Change password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="font-pressstart text-[10px] text-theme-dark hover:text-theme-primary cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 font-pixel text-[14px] text-theme-dark">
              {/* Old Password Field */}
              <div className="flex flex-col gap-1">
                <label className="text-theme-dark font-pressstart text-[9px]">Old Password</label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value);
                      setOldPassError('');
                    }}
                    placeholder="Enter old password"
                    className="w-full bg-theme-muted border-[1.5px] border-theme-dark p-2.5 pr-10 font-pixel text-[15px] rounded-[6px] outline-none dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-3 text-theme-dark/70 hover:text-theme-dark cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {oldPassError && (
                  <p className="font-pixel text-[12px] text-theme-danger mt-1 leading-tight">
                    ✘ {oldPassError}
                  </p>
                )}
              </div>

              {/* New Password Field */}
              <div className="flex flex-col gap-1">
                <label className="text-theme-dark font-pressstart text-[9px]">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => handleNewPassChange(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-theme-muted border-[1.5px] border-theme-dark p-2.5 pr-10 font-pixel text-[15px] rounded-[6px] outline-none dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-theme-dark/70 hover:text-theme-dark cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {newPassError && (
                  <p className="font-pixel text-[12px] text-theme-danger mt-1 leading-tight">
                    ✘ {newPassError}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-1">
                <label className="text-theme-dark font-pressstart text-[9px]">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPassChange(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-theme-muted border-[1.5px] border-theme-dark p-2.5 pr-10 font-pixel text-[15px] rounded-[6px] outline-none dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-3 text-theme-dark/70 hover:text-theme-dark cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                <p className={`font-pixel text-[12px] mt-1 leading-tight ${passwordNote ? 'text-theme-danger' : 'text-theme-dark/70'}`}>
                  {passwordNote ? `✘ ${passwordNote}` : 'Create a strong password using 8 or more characters, including uppercase and lowercase letters, a number, and a special character.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-theme-dark/20">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="font-pressstart text-[9px] bg-transparent border-[2px] border-theme-dark px-4 py-2 hover:bg-theme-dark/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePassword}
                type="button"
                className="font-pressstart text-[9px] sm:text-[10px] bg-theme-primary text-white border-[2px] border-theme-dark px-4 py-2 hover:opacity-90 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}