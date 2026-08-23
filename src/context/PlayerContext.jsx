import { createContext, useContext, useState, useEffect } from 'react';

const COINS_KEY = 'player_user_coins';
const TOTAL_FOCUS_KEY = 'total_focus_seconds';
const TOTAL_SESSIONS_KEY = 'total_completed_sessions';

const initialPlayerData = {
  username: "ACORN_HERO",
  level: 10,
  currentXP: 4500,
  maxXP: 10000,
  avatarUrl: "",
  coins: localStorage.getItem(COINS_KEY) ? parseInt(localStorage.getItem(COINS_KEY), 10) : 1250,
  totalFocusSeconds: localStorage.getItem(TOTAL_FOCUS_KEY) ? parseInt(localStorage.getItem(TOTAL_FOCUS_KEY), 10) : 0,
  totalSessions: localStorage.getItem(TOTAL_SESSIONS_KEY) ? parseInt(localStorage.getItem(TOTAL_SESSIONS_KEY), 10) : 0,
  friendsCount: 0,
  streakDays: 9,
  bestStreak: 14,
  notifCount: 0,
  weeklyActivity: [
    { day: 'MON', count: 3, completed: true },
    { day: 'TUE', count: 5, completed: true },
    { day: 'WED', count: 2, completed: true },
    { day: 'THU', count: 4, completed: true },
    { day: 'FRI', count: 6, completed: true },
    { day: 'SAT', count: 0, completed: false },
    { day: 'SUN', count: 0, completed: false },
  ],
  productiveDays: [
    { day: 'Mon', count: 4 },
    { day: 'Tue', count: 7 },
    { day: 'Wed', count: 5 },
    { day: 'Thu', count: 8 },
    { day: 'Fri', count: 6 },
    { day: 'Sat', count: 2 },
    { day: 'Sun', count: 1 },
  ],
};

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [playerData, setPlayerData] = useState(initialPlayerData);

  const updateCoins = (newAmount) => {
    const finalAmount = Math.max(0, newAmount);
    localStorage.setItem(COINS_KEY, finalAmount.toString());
    setPlayerData((prev) => ({ ...prev, coins: finalAmount }));
  };

  const updateStreak = (newStreak) => {
    setPlayerData((prev) => ({ ...prev, streakDays: Math.max(0, newStreak) }));
  };

  const addFocusTime = (addedSeconds) => {
    setPlayerData((prev) => {
      const newTotal = prev.totalFocusSeconds + addedSeconds;
      localStorage.setItem(TOTAL_FOCUS_KEY, newTotal.toString());
      return { ...prev, totalFocusSeconds: newTotal };
    });
  };

  const incrementTotalSessions = (countToAdd = 1) => {
    setPlayerData((prev) => {
      const newTotal = prev.totalSessions + countToAdd;
      localStorage.setItem(TOTAL_SESSIONS_KEY, newTotal.toString());
      return { ...prev, totalSessions: newTotal };
    });
  };

  // Sync state if localStorage changes from another tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === COINS_KEY) {
        setPlayerData((prev) => ({ ...prev, coins: parseInt(e.newValue, 10) || 1250 }));
      }
      if (e.key === TOTAL_FOCUS_KEY) {
        setPlayerData((prev) => ({ ...prev, totalFocusSeconds: parseInt(e.newValue, 10) || 0 }));
      }
      if (e.key === TOTAL_SESSIONS_KEY) {
        setPlayerData((prev) => ({ ...prev, totalSessions: parseInt(e.newValue, 10) || 0 }));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        playerData,
        setPlayerData,
        updateCoins,
        updateStreak,
        addFocusTime,
        incrementTotalSessions,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);