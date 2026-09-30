import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { usePlayer } from '../context/PlayerContext';

const API = 'http://localhost:5000';
const LOGIN_PATH = '/auth#login'; // palitan kung iba ang route ng Auth page mo

export default function AccountGuard() {
  const { playerData } = usePlayer();
  const rawEmail = playerData?.email || localStorage.getItem('active_user_email') || '';
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    if (!rawEmail) return undefined;
    const socket = io(API);

    socket.on('connect', () => socket.emit('user_connected', { email: rawEmail }));

    socket.on('account_suspended', (d) => {
      sessionStorage.setItem('suspended_notice', JSON.stringify({
        email: rawEmail,
        reason: d?.reason,
        liftUntil: d?.liftUntil,
      }));
      ['active_user_email', `user_${rawEmail}`, 'activeRoomSession', 'activeSession', 'completedSessionData']
        .forEach((k) => localStorage.removeItem(k));
      socket.disconnect();
      window.location.replace(LOGIN_PATH); // full reload = wala nang natirang state / timer
    });

    socket.on('account_warning', (d) => setWarning(d));

    return () => socket.disconnect();
  }, [rawEmail]);

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