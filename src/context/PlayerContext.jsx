import { createContext, useContext, useState, useEffect } from 'react';

const COINS_KEY = 'player_user_coins';

const initialPlayerData = {
  username: "ACORN_HERO",
  level: 10,
  currentXP: 4500,
  maxXP: 10000,
  avatarUrl: "",
  coins: localStorage.getItem(COINS_KEY) ? parseInt(localStorage.getItem(COINS_KEY), 10) : 1250,
  friendsCount: 14,
  streakDays: 7,
  notifCount: 3,
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

  // Sync state if localStorage changes from another tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === COINS_KEY) {
        setPlayerData((prev) => ({ ...prev, coins: parseInt(e.newValue, 10) || 1250 }));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <PlayerContext.Provider value={{ playerData, setPlayerData, updateCoins, updateStreak }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);