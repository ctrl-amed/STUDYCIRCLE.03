import { createContext, useContext, useState, useEffect } from 'react';

const COINS_KEY = 'player_user_coins';
const TOTAL_FOCUS_KEY = 'total_focus_seconds';
const TOTAL_SESSIONS_KEY = 'total_completed_sessions';
const ACTIVITIES_KEY = 'user_activities';
const ROOMS_CREATED_KEY = 'user_rooms_created';
const AVERAGE_SESSION_KEY = 'user_average_session';

const defaultUserActivities = {
  '2026-08-01': [
    { name: 'Reading', duration: '1h 00m', technique: 'Pomodoro' },
    { name: 'Practice', duration: '45m', technique: '52-17' },
  ],
  '2026-08-05': [{ name: 'Writing', duration: '2h 15m', technique: '90m' }],
  '2026-08-12': [{ name: 'Creation', duration: '1h 30m', technique: 'Pomodoro' }],
  '2026-08-15': [{ name: 'Memorize', duration: '30m', technique: '52-17' }],
  '2026-08-17': [
    { name: 'Review', duration: '45m', technique: 'Pomodoro' },
    { name: 'Practice', duration: '1h 10m', technique: '90m' },
  ],
  '2026-08-18': [
    { name: 'Reading', duration: '1h 45m', technique: '52-17' },
    { name: 'Writing', duration: '2h 15m', technique: '90m' },
  ],
};

const initialPlayerData = {
  username: "ACORN_HERO",
  level: 1,
  currentXP: 1,
  maxXP: 10,
  avatarUrl: "",
  coins: localStorage.getItem(COINS_KEY) ? parseInt(localStorage.getItem(COINS_KEY), 10) : 10000,
  totalFocusSeconds: localStorage.getItem(TOTAL_FOCUS_KEY) ? parseInt(localStorage.getItem(TOTAL_FOCUS_KEY), 10) : 0,
  totalSessions: localStorage.getItem(TOTAL_SESSIONS_KEY) ? parseInt(localStorage.getItem(TOTAL_SESSIONS_KEY), 10) : 0,
  roomsCreated: localStorage.getItem(ROOMS_CREATED_KEY) ? parseInt(localStorage.getItem(ROOMS_CREATED_KEY), 10) : 1, // 1 room hosted by ACORN_HERO in UserRooms
  averageSession: localStorage.getItem(AVERAGE_SESSION_KEY) ? localStorage.getItem(AVERAGE_SESSION_KEY) : '0%',
  userActivities: localStorage.getItem(ACTIVITIES_KEY) ? JSON.parse(localStorage.getItem(ACTIVITIES_KEY)) : defaultUserActivities,
  friendsCount: 0,
  streakDays: 0,
  bestStreak: 0,
  notifCount: 0,
  weeklyActivity: [
    { day: 'MON', count: 0, completed: false },
    { day: 'TUE', count: 0, completed: false },
    { day: 'WED', count: 0, completed: false },
    { day: 'THU', count: 0, completed: false },
    { day: 'FRI', count: 0, completed: false },
    { day: 'SAT', count: 0, completed: false },
    { day: 'SUN', count: 0, completed: false },
  ],
  productiveDays: [
    { day: 'Mon', count: 0 },
    { day: 'Tue', count: 0 },
    { day: 'Wed', count: 0 },
    { day: 'Thu', count: 0 },
    { day: 'Fri', count: 0 },
    { day: 'Sat', count: 0 },
    { day: 'Sun', count: 0 },
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

  const incrementRoomsCreated = (countToAdd = 1) => {
    setPlayerData((prev) => {
      const newTotal = (prev.roomsCreated || 0) + countToAdd;
      localStorage.setItem(ROOMS_CREATED_KEY, newTotal.toString());
      return { ...prev, roomsCreated: newTotal };
    });
  };

  const updateAverageSession = (newAvg) => {
    localStorage.setItem(AVERAGE_SESSION_KEY, newAvg);
    setPlayerData((prev) => ({ ...prev, averageSession: newAvg }));
  };

  const addUserActivity = (dateKey, activityObj) => {
    setPlayerData((prev) => {
      const updatedActivities = { ...prev.userActivities };
      if (!updatedActivities[dateKey]) {
        updatedActivities[dateKey] = [];
      }
      updatedActivities[dateKey] = [...updatedActivities[dateKey], activityObj];

      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(updatedActivities));
      return { ...prev, userActivities: updatedActivities };
    });
  };

  // Sync state if localStorage changes from another tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === COINS_KEY) {
        setPlayerData((prev) => ({ ...prev, coins: parseInt(e.newValue, 10) || 0 }));
      }
      if (e.key === TOTAL_FOCUS_KEY) {
        setPlayerData((prev) => ({ ...prev, totalFocusSeconds: parseInt(e.newValue, 10) || 0 }));
      }
      if (e.key === TOTAL_SESSIONS_KEY) {
        setPlayerData((prev) => ({ ...prev, totalSessions: parseInt(e.newValue, 10) || 0 }));
      }
      if (e.key === ROOMS_CREATED_KEY) {
        setPlayerData((prev) => ({ ...prev, roomsCreated: parseInt(e.newValue, 10) || 0 }));
      }
      if (e.key === AVERAGE_SESSION_KEY) {
        setPlayerData((prev) => ({ ...prev, averageSession: e.newValue || '0%' }));
      }
      if (e.key === ACTIVITIES_KEY) {
        setPlayerData((prev) => ({
          ...prev,
          userActivities: e.newValue ? JSON.parse(e.newValue) : defaultUserActivities,
        }));
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
        incrementRoomsCreated,
        updateAverageSession,
        addUserActivity,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);