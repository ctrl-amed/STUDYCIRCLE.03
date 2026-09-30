import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { usePlayer } from '../context/PlayerContext';

const API = 'http://localhost:5000';
const LOGIN_PATH = `${import.meta.env.BASE_URL}auth#login`;

// Ginagamit din ng UserHomepage
export function forceSuspendedLogout(email, d) {
  if (sessionStorage.getItem('suspended_notice')) return; // isang beses lang
  sessionStorage.setItem('suspended_notice', JSON.stringify({
    email,
    reason: d?.reason,
    liftUntil: d?.liftUntil,
  }));
  ['active_user_email', 'user_email', 'user', `user_${email}`,
   'activeRoomSession', 'activeSession', 'completedSessionData']
    .forEach((k) => localStorage.removeItem(k));
  window.location.replace(LOGIN_PATH); // full reload = wala nang natirang timer / state
}

export default function AccountGuard() {
  const { playerData } = usePlayer();
  const email = playerData?.email || localStorage.getItem('active_user_email') || '';
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    if (!email) return undefined;
    const socket = io(API);

    socket.on('connect', () => socket.emit('user_connected', { email }));
    socket.on('account_suspended', (d) => forceSuspendedLogout(email, d));
    socket.on('account_warning', (d) => setWarning(d));

    // Fallback: kahit mag-fail ang socket, mahuhuli pa rin ang suspension
    const check = async () => {
      try {
        const r = await fetch(`${API}/api/account-status?email=${encodeURIComponent(email)}`);
        const d = await r.json();
        if (d.suspended) forceSuspendedLogout(email, d);
      } catch (e) { /* offline, subukan ulit mamaya */ }
    };
    check();
    const timer = setInterval(check, 10000);
    window.addEventListener('focus', check);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', check);
      socket.disconnect();
    };
  }, [email]);

  if (!warning) return null;
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-theme-dark/70 backdrop-blur-xs">
      <div className="bg-theme-surface border-4 border-theme-dark rounded-[16px] w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center gap-4">
        <div className="text-4xl">⚠️</div>
        <h3 className="font-pressstart text-[14px] text-theme-danger uppercase">OFFICIAL WARNING</h3>
        <p className="font-pixel text-[18px] text-theme-dark leading-snug">
          You received a warning for: <span className="text-theme-primary">{warning.reason}</span>
        </p>
        {warning.notes && <p className="font-pixel text-[15px] text-theme-dark/70">{warning.notes}</p>}
        <p className="font-pixel text-[15px] text-theme-dark/70">Further violations may lead to suspension.</p>
        <button
          onClick={() => setWarning(null)}
          className="mt-2 font-pressstart text-[10px] text-theme-white bg-theme-primary border-2 border-theme-dark px-6 py-3 w-full retro-shadow cursor-pointer uppercase"
        >
          I UNDERSTAND
        </button>
      </div>
    </div>
  );
}