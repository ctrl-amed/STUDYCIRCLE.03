import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useTimer } from '../hooks/useTimer';
import { ActiveSessionWidget, RecentActivityWidget } from '../components/UserHomepageWidgets';
import CustomRoom from '../components/CustomRoom';
import CustomAvatar from '../components/CustomAvatar';
import EmojiPicker from 'emoji-picker-react';

// --- MULTIPLAYER & SINGLEPLAYER AVATAR POSITIONS ---
const avatarConfig = {
  scale: 0.85,
  bottom: '15%',
  left: '50%',
  offsetX: 0,
  offsetY: 0,
};

// Dynamic position maps based on total member count in the room
const memberPositionsByCount = {
  1: [
    { bottom: '25%', left: '50%', scale: 0.85 } // Center
  ],
  2: [
    { bottom: '25%', left: '38%', scale: 0.85 },
    { bottom: '25%', left: '62%', scale: 0.85 }
  ],
  3: [
    { bottom: '28%', left: '32%', scale: 0.85 },
    { bottom: '25%', left: '50%', scale: 0.85 }, // Center User
    { bottom: '28%', left: '68%', scale: 0.85 }
  ],
  4: [
    { bottom: '28%', left: '26%', scale: 0.85 },
    { bottom: '25%', left: '42%', scale: 0.85 },
    { bottom: '25%', left: '58%', scale: 0.85 },
    { bottom: '28%', left: '74%', scale: 0.85 }
  ],
  5: [
    { bottom: '25%', left: '22%', scale: 0.85 },
    { bottom: '30%', left: '36%', scale: 0.85 },
    { bottom: '25%', left: '50%', scale: 0.85 }, // Center User
    { bottom: '30%', left: '64%', scale: 0.85 },
    { bottom: '25%', left: '78%', scale: 0.85 }
  ],
  6: [
    { bottom: '25%', left: '18%', scale: 0.85 },
    { bottom: '30%', left: '31%', scale: 0.85 },
    { bottom: '25%', left: '44%', scale: 0.85 },
    { bottom: '35%', left: '56%', scale: 0.85 },
    { bottom: '30%', left: '69%', scale: 0.85 },
    { bottom: '25%', left: '82%', scale: 0.85 }
  ]
};

// Mock pool of available players
const mockPlayerList = [
  { 
    id: 1, 
    username: "PIXEL_SAM", 
    level: 5,
    status: "IN SESSION",
    totalFocusTime: "124h 15m",
    config: { body: "BODY1", face: "FACE2", tops: "TOP3", bottoms: "BOTTOM2", hair: "HAIR1" }
  },
  { 
    id: 2, 
    username: "LOFI_LUNA", 
    level: 12,
    status: "ONLINE",
    totalFocusTime: "88h 40m",
    config: { body: "BODY1", face: "FACE1", tops: "TOP5", bottoms: "BOTTOM4", hair: "HAIR3" }
  },
  { 
    id: 3, 
    username: "STUDY_BEAR", 
    level: 3,
    status: "IN SESSION",
    totalFocusTime: "45h 10m",
    config: { body: "BODY1", face: "FACE3", tops: "TOP1", bottoms: "BOTTOM1" }
  },
  { 
    id: 4, 
    username: "COZY_CAT",  
    level: 8,
    status: "ONLINE",
    totalFocusTime: "92h 05m",
    config: { body: "BODY1", face: "FACE4", tops: "TOP2", bottoms: "BOTTOM3", hair: "HAIR2" }
  },
  { 
    id: 5, 
    username: "NIGHT_OWL", 
    level: 15,
    status: "IN SESSION",
    totalFocusTime: "210h 30m",
    config: { body: "BODY1", face: "FACE1", tops: "TOP4", bottoms: "BOTTOM6", hair: "HAIR4" }
  }
];

// --- MOCK FALLBACK ROOM DATA ---
const mockRoomData = {
  roomName: "Algorithms & Data Structures Study Group",
  course: "CS 201 - Data Structures",
  privacy: "public",
  maxMembers: 6,
  hostId: "m1",
  members: [],
  auditLogs: [
    { id: 1, user: "ACORN_HERO", action: "started a 52-17 focus session", time: "2m ago" },
    { id: 2, user: "LOFI_LUNA", action: "completed a task: Binary Search Trees", time: "5m ago" },
    { id: 3, user: "PIXEL_SAM", action: "joined the room", time: "12m ago" },
    { id: 4, user: "NIGHT_OWL", action: "paused their focus timer", time: "18m ago" },
    { id: 5, user: "COZY_CAT", action: "joined the room", time: "25m ago" },
  ],
  chatMessages: [
    { sender: "LOFI_LUNA", text: "Hey everyone! Let's get through Module 4 today.", time: "10:15 AM" },
    { sender: "PIXEL_SAM", text: "Focused mode on 🚀", time: "10:16 AM" },
    { sender: "ACORN_HERO", text: "Let's do this!", time: "10:18 AM" },
  ]
};

const initialRecentActivities = [
  { activity: 'Reading', technique: '52-17', duration: '1h 45m', date: 'Today' },
  { activity: 'Writing', technique: 'Pomodoro', duration: '2h 15m', date: 'Today' },
  { activity: 'Review', technique: '90m Focus', duration: '45m', date: 'Yesterday' },
  { activity: 'Practice', technique: 'Pomodoro', duration: '1h 10m', date: 'Yesterday' },
  { activity: 'Memorize', technique: '52-17', duration: '30m', date: 'Aug 15, 2026' },
  { activity: 'Creation', technique: '90m Focus', duration: '1h 30m', date: 'Aug 12, 2026' },
];

const activityIcons = {
  Reading: (
    <svg className="w-5 h-5 text-theme-dark" viewBox="0 0 2048 2048" fill="currentColor">
      <path d="M1920 256v1664H0V256h256V128h384q88 0 169 27t151 81q69-54 150-81t170-27h384v128zm-640 0q-70 0-136 23t-120 69v1254q59-33 124-49t132-17h256V256zM384 1536h256q67 0 132 16t124 50V348q-54-45-120-68t-136-24H384zm-256 256h806q-32-31-65-54t-68-40t-75-25t-86-9H256V384H128zM1792 384h-128v1280h-384q-46 0-85 8t-75 25t-69 40t-65 55h806z" />
    </svg>
  ),
  Writing: (
    <svg className="w-5 h-5 text-theme-dark" viewBox="-2 -2 24 24" fill="currentColor">
      <path d="m5.72 14.456l1.761-.508l10.603-10.73a.456.456 0 0 0-.003-.64l-.635-.642a.443.443 0 0 0-.632-.003L6.239 12.635zM18.703.664l.635.643c.876.887.884 2.318.016 3.196L8.428 15.561l-3.764 1.084a.9.9 0 0 1-1.11-.623.9.9 0 0 1-.002-.506l1.095-3.84L15.544.647a2.215 2.215 0 0 1 3.159.016zM7.184 1.817c.496 0 .898.407.898.909a.903.903 0 0 1-.898.909H3.592c-.992 0-1.796.814-1.796 1.817v10.906c0 1.004.804 1.818 1.796 1.818h10.776c.992 0 1.797-.814 1.797-1.818v-3.635c0-.502.402-.909.898-.909s.898.407.898.91v3.634c0 2.008-1.609 3.636-3.593 3.636H3.592C1.608 19.994 0 18.366 0 16.358V5.452c0-2.007 1.608-3.635 3.592-3.635z" />
    </svg>
  ),
  Review: (
    <svg className="w-5 h-5 text-theme-dark" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14h1.625q.2 0 .388-.075t.337-.225l4.7-4.7q.225-.225.338-.513t.112-.562t-.125-.537t-.325-.488l-.9-.95q-.225-.225-.5-.337t-.575-.113q-.275 0-.562.113T11 5.95l-4.7 4.7q-.15.15-.225.338T6 11.375V13q0 .425.288.713T7 14m6-6.075L12.075 7zM7.5 12.5v-.95l2.525-2.525l.5.45l.45.5L8.45 12.5zm3.025-3.025l.45.5l-.95-.95zm.65 4.525H17q.425 0 .713-.288T18 13t-.288-.712T17 12h-3.825zM6 18l-2.3 2.3q-.475.475-1.088.213T2 19.575V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-.85-2H20V4H4v13.125zM4 16V4z" />
    </svg>
  ),
};

const leaderboardData = {
  'all-time': [
    { rank: 1, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1', username: 'PixelKing', score: '420h 15m' },
    { rank: 2, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow', username: 'ACORN_HERO', score: '380h 40m' },
    { rank: 3, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Retro', username: 'RetroGamer', score: '310h 05m' },
    { rank: 4, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Byte', username: 'ByteWizard', score: '295h 50m' },
  ],
  'this-month': [
    { rank: 1, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow', username: 'ACORN_HERO', score: '85h 20m' },
    { rank: 2, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1', username: 'PixelKing', score: '72h 10m' },
    { rank: 3, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Cyber', username: 'CyberSamurai', score: '68h 45m' },
  ],
  streaks: [
    { rank: 1, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Byte', username: 'ByteWizard', streak: '142 d' },
    { rank: 2, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1', username: 'PixelKing', streak: '98 d' },
    { rank: 3, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Retro', username: 'ACORN_HERO', streak: '75 d' },
  ],
};

export default function UserHomepage({ isMultiplayer: propIsMultiplayer = false }) {
  const { playerData } = usePlayer();
  const location = useLocation();

  const player = {
    username: playerData?.username || 'ACORN_HERO',
    streakDays: playerData?.streakDays ?? 0,
    level: playerData?.level ?? 1,
    coins: playerData?.coins ?? 0,
  };

  const userActivities = playerData?.userActivities || {};
  const timer = useTimer(player);
  const activeCardRef = useRef(null);

  // Singleplayer Date & Greeting State
  const [greetingText, setGreetingText] = useState('Good Afternoon');
  const [currentDateStr, setCurrentDateStr] = useState('');

  // Modals Visibility Controls
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showRoomActivityModal, setShowRoomActivityModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Active Member Profile Popover State
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);

  // Leaderboard Tab Selection
  const [activeTab, setActiveTab] = useState('all-time');

  // Calendar State & Touch Popover Control
  const [currentCalDate, setCurrentCalDate] = useState(new Date(2026, 7, 1));
  const [activePopoverDate, setActivePopoverDate] = useState(null);

  // Dynamic Room / Multiplayer Detection
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomData, setRoomData] = useState(mockRoomData);
  const [roomChat, setRoomChat] = useState(mockRoomData.chatMessages);
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatContainerRef = useRef(null);

  // Listen for session updates from CreateSession modal iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data === 'CLOSE_CREATE_SESSION_MODAL') {
        const raw = localStorage.getItem('activeSession');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
              const newLogs = parsed.tasks.map((taskText, index) => ({
                id: `session_task_${index}_${Date.now()}`,
                user: player.username,
                action: `task: ${taskText}`,
                time: 'Just now',
              }));
              setRoomData((prev) => ({
                ...prev,
                auditLogs: newLogs,
              }));
            }
          } catch (err) {
            console.error('Error parsing activeSession:', err);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [player.username]);

  // Read Room Session from localStorage or router state on load/route change
  useEffect(() => {
    const storedSession = localStorage.getItem('activeRoomSession');
    const stateIsMultiplayer = location.state?.isMultiplayer;

    if (storedSession || stateIsMultiplayer || propIsMultiplayer) {
      setIsMultiplayer(true);
      
      let parsed = null;
      if (storedSession) {
        try {
          parsed = JSON.parse(storedSession);
        } catch (e) {
          console.error("Error parsing room session:", e);
        }
      } else if (location.state?.room) {
        parsed = location.state.room;
      }

      const hostUsername = parsed?.host || "CodeWizard";
      const totalMemberCount = Math.min(parsed?.currentMembers || 2, parsed?.maxMembers || 6);

      // Current user object
      const currentUser = {
        id: "user_me",
        username: player.username,
        isHost: hostUsername === player.username,
        status: "IN SESSION",
        avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.username}`,
        level: player.level,
        totalFocusTime: "150h 20m",
        isCurrentUser: true,
      };

      // Filter out current user from mock pool if present
      const availableMocks = mockPlayerList.filter((m) => m.username !== player.username);

      // If current user is host or room count is 1
      let membersList = [];

      if (totalMemberCount <= 1) {
        membersList = [currentUser];
      } else {
        // Need (totalMemberCount - 1) mock members
        const otherMembersCount = totalMemberCount - 1;
        const otherMembers = availableMocks.slice(0, otherMembersCount).map((m) => ({
          ...m,
          isHost: m.username === hostUsername,
          avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${m.username}`,
        }));

        // Ensure host is always included if present in mock pool
        if (!currentUser.isHost && !otherMembers.some((m) => m.isHost)) {
          otherMembers[0] = {
            ...mockPlayerList[0],
            username: hostUsername,
            isHost: true,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${hostUsername}`,
          };
        }

        // Insert current user into center index if 3 or 5 members
        const midIndex = Math.floor(otherMembers.length / 2);
        otherMembers.splice(midIndex, 0, currentUser);
        membersList = otherMembers;
      }

      setRoomData((prev) => ({
        ...prev,
        roomName: parsed?.name || parsed?.roomName || prev.roomName,
        course: parsed?.course || prev.course,
        privacy: parsed?.privacy || prev.privacy || "public",
        maxMembers: parsed?.maxMembers || 6,
        members: membersList,
      }));
    } else {
      setIsMultiplayer(false);
    }
  }, [location, propIsMultiplayer, player.username, player.level]);

  useEffect(() => {
    const now = new Date();
    const hours = now.getHours();
    let timeOfDay = 'Morning';
    if (hours >= 12 && hours < 17) timeOfDay = 'Afternoon';
    else if (hours >= 17) timeOfDay = 'Evening';

    setGreetingText(`Good ${timeOfDay}`);
    setCurrentDateStr(
      now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    );

    const today = now.toISOString().split('T')[0];
    const lastSavedDate = localStorage.getItem('tracker_date');
    if (lastSavedDate !== today) {
      localStorage.setItem('tracker_date', today);
      localStorage.setItem('daily_focus_seconds', '0');
    }
  }, []);

  // Dismiss calendar popovers or active avatar profiles when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setActivePopoverDate(null);
      setActiveProfileId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isMultiplayer && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [roomChat, isMultiplayer]);

  const handlePrevMonth = () => {
    setCurrentCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSendRoomMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setRoomChat((prev) => [
      ...prev,
      {
        sender: player.username,
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emojiData) => {
    setChatInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Kick member function for room hosts
  const handleKickMember = (memberId, memberUsername) => {
    setRoomData((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== memberId),
      auditLogs: [
        {
          id: Date.now(),
          user: player.username,
          action: `kicked ${memberUsername} from the room`,
          time: 'Just now',
        },
        ...prev.auditLogs,
      ],
    }));
    setActiveProfileId(null);
  };

  // Toggle friend request state
  const handleAddFriend = (memberId) => {
    if (!sentFriendRequests.includes(memberId)) {
      setSentFriendRequests((prev) => [...prev, memberId]);
    }
  };

  const renderActivityItem = (item, idx) => {
    const iconSvg = activityIcons[item.activity] || activityIcons.Reading;
    return (
      <div
        key={idx}
        className="flex items-center justify-between p-2 rounded-[8px] transition-colors hover:bg-theme-muted/50"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-[6px] bg-theme-muted border-[1.5px] border-theme-dark flex items-center justify-center text-lg shrink-0">
            {iconSvg}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-pressstart text-[10px] text-theme-dark truncate uppercase">
              {item.activity}
            </span>
            <span className="font-pressstart text-[8px] text-theme-dark/60 truncate mt-0.5">
              {item.duration} | {item.technique}
            </span>
          </div>
        </div>
        <div className="shrink-0 pl-2">
          <span className="font-pixel text-[15px] text-theme-dark/70 px-2 py-1 uppercase">
            {item.date}
          </span>
        </div>
      </div>
    );
  };

  const renderCalendarDays = (isCompact = true) => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className={isCompact ? 'h-full min-h-0' : 'min-h-[40px] sm:min-h-[48px]'}
        />
      );
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

      const dayActivities = userActivities[dateKey] || [];
      const hasActivity = dayActivities.length > 0;
      const isToday =
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      const isTopRow = day + firstDayIndex <= 7;
      const colIndex = (day + firstDayIndex - 1) % 7;
      const isLeftEdge = colIndex <= 1;
      const isRightEdge = colIndex >= 5;

      const verticalPos = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';

      let horizontalPos = 'left-1/2 -translate-x-1/2';
      let arrowHorizontal = 'left-1/2 -translate-x-1/2';

      if (isLeftEdge) {
        horizontalPos = 'left-0 -translate-x-1 sm:translate-x-0';
        arrowHorizontal = 'left-4';
      } else if (isRightEdge) {
        horizontalPos = 'right-0 translate-x-1 sm:translate-x-0';
        arrowHorizontal = 'right-4';
      }

      const arrowVertical = isTopRow
        ? 'bottom-full border-b-4 border-b-theme-dark'
        : 'top-full border-t-4 border-t-theme-dark';

      const arrowPos = `${arrowVertical} ${arrowHorizontal} border-x-4 border-x-transparent`;
      const isPopoverActive = activePopoverDate === dateKey;

      cells.push(
        <div
          key={day}
          onClick={(e) => {
            if (hasActivity) {
              e.stopPropagation();
              setActivePopoverDate((prev) => (prev === dateKey ? null : dateKey));
            }
          }}
          className={`relative flex flex-col items-center justify-center p-1 rounded-[6px] transition-all cursor-pointer min-h-[40px] sm:min-h-[48px] group cal-day-cell ${
            isToday
              ? 'bg-theme-primary text-theme-surface border-[1.5px] border-theme-dark'
              : 'bg-theme-surface hover:bg-theme-muted text-theme-dark'
          } ${isPopoverActive ? 'z-50' : ''}`}
        >
          <span className={`font-pressstart text-[9px] sm:text-[11px] ${isToday ? 'text-theme-surface' : 'text-theme-dark'}`}>
            {day}
          </span>

          {hasActivity && (
            <span
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${
                isToday ? 'bg-theme-surface' : 'bg-theme-primary'
              } border-[1px] border-theme-dark rounded-full mt-1 shrink-0`}
            />
          )}

          {hasActivity && (
            <div
              className={`cal-popover absolute ${verticalPos} ${horizontalPos} ${
                isPopoverActive ? 'flex' : 'hidden sm:group-hover:flex'
              } flex-col gap-1.5 w-48 sm:w-56 bg-theme-muted rounded-[8px] p-2.5 shadow-xl z-50 pointer-events-none transition-all`}
            >
              {dayActivities.map((act, index) => {
                const isLast = index === dayActivities.length - 1;
                return (
                  <div
                    key={index}
                    className={`flex flex-col gap-1 ${
                      !isLast ? 'border-b border-theme-dark/20 pb-1.5' : ''
                    }`}
                  >
                    <span className="font-pressstart text-[9px] sm:text-[10px] text-theme-primary font-bold truncate">
                      {act.name}
                    </span>
                    <div className="flex items-center justify-between w-full font-pressstart text-[7px] sm:text-[8px] text-theme-dark/80">
                      <span className="font-bold text-theme-dark">{act.duration}</span>
                      <span className="bg-theme-dark/10 px-1.5 py-0.5 rounded text-theme-dark shrink-0">
                        {act.technique}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className={`absolute ${arrowPos}`} />
            </div>
          )}
        </div>
      );
    }
    return cells;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const hasActiveSession = Boolean(timer.activeSession && timer.tasksList && timer.tasksList.length > 0);
  const completedTasksCount = timer.tasksList ? timer.tasksList.filter((t) => t.completed).length : 0;

  // Retrieve current positional layout map based on active member length
  const memberCountKey = Math.min(Math.max(roomData.members.length, 1), 6);
  const activePositionMap = memberPositionsByCount[memberCountKey] || memberPositionsByCount[1];

  // Identify if current logged user is room host
  const isCurrentUserHost = roomData.members.some((m) => m.isCurrentUser && m.isHost);

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5">
      {/* 1ST ROW: 2 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        {/* LEFT COLUMN: GREETING & AVATAR ROOM */}
        <section className="flex flex-col gap-2 sm:gap-4 p-2 sm:p-4">
          <div>
            {isMultiplayer ? (
              <>
                <h2 className="font-pressstart text-[14px] sm:text-[18px] mb-1 level-up-gradient bg-clip-text text-transparent w-fit truncate">
                  {roomData.roomName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 font-pixel text-[16px] sm:text-[20px] text-theme-dark/80">
                  <span className="bg-theme-primary/20 text-theme-primary px-2 py-0.5 rounded-[4px] font-pressstart text-[9px]">
                    {roomData.members.length}/{roomData.maxMembers} MEMBERS
                  </span>
                  <span>|</span>
                  <span className="text-[#788D55] font-bold uppercase">{roomData.privacy || 'PUBLIC'}</span>
                  <span>|</span>
                  <span className="truncate">{roomData.course}</span>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-pressstart text-[14px] sm:text-[18px] mb-1 level-up-gradient bg-clip-text text-transparent w-fit">
                  {greetingText}, {player.username}
                </h2>
                <div className="flex items-center gap-2 font-pixel text-[20px] sm:text-[25px] text-theme-dark/80">
                  <svg className="w-5 h-5 text-theme-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0-2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5z" />
                  </svg>
                  <span>{currentDateStr} | Ready to focus?</span>
                </div>
              </>
            )}
          </div>

          {/* ROOM DISPLAY CONTAINER */}
          <div className="relative w-full flex items-center justify-center rounded-[12px] min-h-[300px]">
            <div className="relative flex items-center justify-center max-w-[1100px] w-full mx-auto">
              <div
                className="absolute w-[80%] h-[80%] sm:w-[100%] sm:h-[100%] rounded-full pointer-events-none opacity-75 filter blur-3xl z-0"
                style={{
                  background:
                    'radial-gradient(circle, rgba(253, 146, 62, 0.5) 0%, rgba(253, 146, 62, 0) 100%)',
                }}
              />

              <CustomRoom />

              {isMultiplayer ? (
                roomData.members.map((member, index) => {
                  const pos = activePositionMap[index % activePositionMap.length];
                  const memberKey = member.id || member.username || index;
                  const isProfileOpen = activeProfileId === memberKey;
                  const isFriendRequestSent = sentFriendRequests.includes(memberKey);

                  return (
<div
  key={memberKey}
  onClick={(e) => {
    e.stopPropagation();
    setActiveProfileId((prev) => (prev === memberKey ? null : memberKey));
  }}
  className={`absolute w-[180px] h-[180px] origin-bottom pointer-events-auto transition-all duration-150 cursor-pointer group ${
    isProfileOpen ? 'z-50' : 'z-20'
  }`}
  style={{
    bottom: pos.bottom,
    left: pos.left,
    transform: `translate(-50%, 0) scale(${pos.scale})`,
  }}
>
{/* PLAYER NAMETAG */}
<div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#000000]/40 px-2 sm:px-3 py-1 sm:py-1.5 whitespace-nowrap shadow-md pointer-events-none flex items-center justify-center gap-1 z-30">
  {member.isHost && (
    <svg
      className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FFD700] shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      title="Host"
    >
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M6 20q-.425 0-.712-.288T5 19t.288-.712T6 18h12q.425 0 .713.288T19 19t-.288.713T18 20zm.7-3.5q-.725 0-1.287-.475t-.688-1.2l-1-6.35q-.05 0-.112.013T3.5 8.5q-.625 0-1.062-.437T2 7t.438-1.062T3.5 5.5t1.063.438T5 7q0 .175-.038.325t-.087.275L8 9l3.125-4.275q-.275-.2-.45-.525t-.175-.7q0-.625.438-1.063T12 2t1.063.438T13.5 3.5q0 .375-.175.7t-.45.525L16 9l3.125-1.4q-.05-.125-.088-.275T19 7q0-.625.438-1.063T20.5 5.5t1.063.438T22 7t-.437 1.063T20.5 8.5q-.05 0-.112-.012t-.113-.013l-1 6.35q-.125.725-.687 1.2T17.3 16.5z" />
    </svg>
  )}
  <span className="font-pressstart text-[6px] sm:text-[7px] text-[#FFFFFF]">
    {member.username} {member.isCurrentUser}
  </span>
</div>

{/* AVATAR PROFILE POPOVER */}
                      {isProfileOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-[105%] left-1/2 -translate-x-1/2 w-56 sm:w-64 bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[10px] p-2.5 shadow-2xl z-50 flex items-center gap-3 cursor-default animate-fade-in"
                        >
                          {/* ROUND AVATAR WITH OVERLAPPING LEVEL BADGE */}
                          <div className="relative shrink-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full border-[2px] border-[#3D2013] bg-[#FAE9CE] overflow-hidden flex items-center justify-center">
                              <img
                                src={member.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.username}`}
                                alt="Player Avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[#FD923E] border-[2px] border-[#3D2013] px-1 py-0.5 text-center flex items-center justify-center min-w-[18px] rounded-[4px] leading-none z-10">
                              <span className="font-pressstart text-[8px] text-[#3D2013] font-bold">
                                {member.level || 1}
                              </span>
                            </div>
                          </div>

                          {/* USER DETAILS */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
                            <div className="flex items-center gap-1 min-w-0">
                              <h2 className="font-pressstart text-[11px] text-[#3D2013] tracking-tight truncate leading-none">
                                {member.username}
                              </h2>
                              {member.isHost && (
                                <span className="bg-[#E87339] text-[#FFFFF6] font-pressstart text-[5px] px-1 py-0.5 rounded shrink-0">
                                  HOST
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-[#3D2013]/70">
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m4.2 14.2L11 13V7h1.5v5.2l4.5 2.7z" />
                              </svg>
                              <span className="font-pressstart text-[8px] text-[#3D2013]">
                                {member.totalFocusTime || '12h 00m'}
                              </span>
                            </div>

                            {/* ADD FRIEND BUTTON */}
                            {!member.isCurrentUser && (
                              <button
                                onClick={() => handleAddFriend(memberKey)}
                                disabled={isFriendRequestSent}
                                className={`mt-0.5 font-pressstart text-[6px] px-2 py-1 border rounded transition-all cursor-pointer w-fit ${
                                  isFriendRequestSent
                                    ? 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed opacity-80'
                                    : 'bg-[#E87339] text-[#FFFFF6] border-[#3D2013] hover:bg-[#d0622c]'
                                }`}
                              >
                                {isFriendRequestSent ? 'SENT' : '+ ADD'}
                              </button>
                            )}
                          </div>

                          {/* RIGHT SIDE ACTIONS: KICK & CLOSE */}
                          <div className="flex flex-col items-end gap-2 shrink-0 self-start">
                            {/* CLOSE BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveProfileId(null);
                              }}
                              className="font-pressstart text-[8px] text-[#3D2013] hover:text-[#E87339] cursor-pointer p-0.5 leading-none"
                              title="Close profile"
                            >
                              ✕
                            </button>

                            {/* KICK BUTTON */}
                            {isCurrentUserHost && !member.isCurrentUser && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleKickMember(member.id, member.username);
                                }}
                                className="bg-[#A53914] text-[#FFFFF6] font-pressstart text-[6px] px-2 py-1 rounded border border-[#3D2013] hover:bg-red-800 transition-colors cursor-pointer"
                                title="Kick player from room"
                              >
                                KICK
                              </button>
                            )}
                          </div>

                          {/* POPOVER ARROW */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-[#3D2013]" />
                        </div>
                      )}

                      <CustomAvatar
                        config={member.config}
                        state={member.status === 'IN SESSION' ? 'focus' : 'idle'}
                      />
                    </div>
                  );
                })
              ) : (
                <div
                  className="absolute w-[200px] h-[200px] origin-bottom pointer-events-auto z-20 transition-all duration-150"
                  style={{
                    bottom: avatarConfig.bottom,
                    left: avatarConfig.left,
                    transform: `translate(-50%, 0) scale(${avatarConfig.scale}) translate(${avatarConfig.offsetX}px, ${avatarConfig.offsetY}px)`,
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-[#000000]/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-[4px] whitespace-nowrap shadow-md pointer-events-none flex items-center justify-center z-30">
                    <span id="avatar-nametag" className="font-pressstart text-[6px] sm:text-[8px] text-[#FFFFFF] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {player.username}
                    </span>
                  </div>
                  <CustomAvatar state="idle" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: TIMER & (ROOM ACTIVITY OR RECENT ACTIVITY) */}
        <div className="flex flex-col gap-5 w-full">
          <ActiveSessionWidget
            activeSession={timer.activeSession}
            remainingTimeSec={timer.remainingTimeSec}
            isTimerRunning={timer.isTimerRunning}
            isFocusPhase={timer.isFocusPhase}
            currentSessionCount={timer.currentSessionCount}
            totalSessions={timer.totalSessions}
            toggleTimer={timer.toggleTimer}
            cancelSession={timer.cancelSession}
            toggleDocumentPiP={timer.toggleDocumentPiP}
            toggleFullscreen={timer.toggleFullscreen}
            cardRef={activeCardRef}
            isWidgetFloating={timer.isWidgetFloating}
            isWidgetFullscreen={timer.isWidgetFullscreen}
            streakDays={player.streakDays}
            focusTimeFormatted={timer.dailyFocusFormatted}
          />

          {isMultiplayer ? (
            <section className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-theme-dark/20">
                <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">
                  {hasActiveSession ? 'SESSION TASKS' : 'ROOM ACTIVITY LOG'}
                </h3>
                <div className="flex items-center gap-3">
                  {hasActiveSession ? (
                    <span className="font-pressstart text-[9px] sm:text-[10px] text-theme-primary">
                      {completedTasksCount}/{timer.tasksList.length} COMPLETED
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRoomActivityModal(true)}
                        className="p-1 text-theme-dark hover:text-theme-primary transition-colors cursor-pointer"
                        title="View All Logs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H4v-5m0 5l6.5-6.5M15 4h5v5m0-5l-6.5 6.5" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto max-h-[200px] pr-1">
                {hasActiveSession ? (
                  timer.tasksList.map((task, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-2.5 p-2 bg-theme-muted/60 border border-theme-dark/30 rounded-[6px] hover:bg-theme-muted cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => timer.toggleTaskCompletion(idx)}
                        className="w-4 h-4 accent-theme-primary border-theme-dark rounded cursor-pointer shrink-0"
                      />
                      <span
                        className={`font-pressstart text-[8px] sm:text-[9px] text-theme-dark break-words ${
                          task.completed ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {task.text}
                      </span>
                    </label>
                  ))
                ) : (
                  roomData.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 rounded-[6px] bg-theme-muted/50 border border-theme-dark/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-pressstart text-[9px] text-theme-primary font-bold">{log.user}</span>
                        <span className="font-pixel text-[14px] text-theme-dark truncate">{log.action}</span>
                      </div>
                      <span className="font-pressstart text-[7px] text-theme-dark/50 shrink-0">{log.time}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : (
            <RecentActivityWidget
              activeSession={timer.activeSession}
              tasksList={timer.tasksList}
              toggleTaskCompletion={timer.toggleTaskCompletion}
              recentActivities={initialRecentActivities}
              onViewAll={() => setShowRecentModal(true)}
            />
          )}
        </div>
      </div>

      {/* 2ND ROW: OVERVIEW, (MEMBERS OR LEADERBOARD), AND (ROOM CHAT OR CALENDAR) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full">
        <section className="md:col-span-3 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
          <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark">OVERVIEW</h3>
          <div className="w-full h-full min-h-[120px] bg-theme-muted border-2 border-dashed border-theme-dark/50 rounded-[8px] p-4 flex items-center justify-center text-center">
            <span className="font-pressstart text-[9px] text-theme-dark/60">
              LVL {player.level} • {player.coins} COINS
            </span>
          </div>
        </section>

        {/* MIDDLE COLUMN: ROOM MEMBERS OR LEADERBOARD */}
        {isMultiplayer ? (
          <section className="md:col-span-4 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">
                ROOM MEMBERS ({roomData.members.length})
              </h3>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[250px] pr-1">
              {roomData.members.map((member, idx) => (
                <div
                  key={member.id || idx}
                  className={`flex items-center justify-between p-2.5 rounded-[8px] border-[1.5px] ${
                    member.isHost 
                      ? 'bg-[#FEF4E0] border-theme-primary shadow-sm' 
                      : 'bg-theme-muted/40 border-theme-dark/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={member.avatar} alt="PFP" className="w-7 h-7 rounded-full border border-theme-dark bg-theme-surface shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-pressstart text-[9px] text-theme-dark truncate">{member.username}</span>
                        {member.isHost && (
                          <span className="bg-theme-primary text-[#FFFFF6] font-pressstart text-[6px] px-1 py-0.2 rounded">HOST</span>
                        )}
                        {member.isCurrentUser && (
                          <span className="font-pressstart text-[7px] text-theme-primary">(YOU)</span>
                        )}
                      </div>
                      <span className="font-pressstart text-[7px] text-theme-dark/60">LVL {member.level}</span>
                    </div>
                  </div>

                  <span className={`font-pressstart text-[7px] px-2 py-1 rounded border ${
                    member.status === 'IN SESSION'
                      ? 'bg-[#788D55]/20 text-[#788D55] border-[#788D55]'
                      : 'bg-theme-dark/10 text-theme-dark/70 border-theme-dark/30'
                  }`}>
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="md:col-span-4 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-theme-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 21q-.425 0-.712-.288T2 20V10q0-.425.288-.712T3 9h3.5q.425 0 .713.288T7.5 10v10q0 .425-.288.713T6.5 21zm7.25 0q-.425 0-.712-.288T9.25 20V4q0-.425.288-.712T10.25 3h3.5q.425 0 .713.288T14.75 4v16q0 .425-.288.713T13.75 21zm7.25 0q-.425 0-.712-.288T16.5 20v-8q0-.425.288-.712T17.5 11H21q.425 0 .713.288T22 12v8q0 .425-.288.713T21 21z" />
                </svg>
                <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">
                  Leaderboards
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(true)}
                className="p-1 hover:text-theme-primary cursor-pointer text-theme-dark transition-colors"
                title="View Full Leaderboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H4v-5m0 5l6.5-6.5M15 4h5v5m0-5l-6.5 6.5" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 p-1">
              {['all-time', 'this-month', 'streaks'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 font-pressstart text-[8px] sm:text-[9px] rounded-none! border-[1.5px] sm:border-2 border-theme-dark transition-all duration-150 retro-shadow cursor-pointer ${
                    activeTab === tab
                      ? 'bg-theme-primary text-[#FFFFF6]'
                      : 'bg-theme-muted text-theme-dark hover:bg-[#f3dcba]'
                  }`}
                >
                  {tab.replace('-', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] pr-1">
              {(leaderboardData[activeTab] || []).map((item) => {
                const isCurrentUser = item.username === player.username;
                return (
                  <div
                    key={item.rank}
                    className={`flex items-center justify-between p-2 rounded-[8px] ${
                      isCurrentUser
                        ? 'bg-[#C97845]/50 border-[1.5px] border-theme-dark'
                        : 'bg-theme-muted/40 border-[1.5px] border-theme-dark/20 hover:bg-theme-muted'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`font-pressstart text-[10px] w-5 text-center ${
                          item.rank <= 3 ? 'text-theme-primary font-bold' : 'text-theme-dark/60'
                        }`}
                      >
                        #{item.rank}
                      </span>
                      <img
                        src={item.pfp}
                        alt={item.username}
                        className="w-7 h-7 rounded-[4px] border border-theme-dark bg-theme-surface shrink-0"
                      />
                      <span className="font-pressstart text-[9px] text-theme-dark truncate">
                        {item.username} {isCurrentUser && <span className="text-[7px] text-theme-primary">(YOU)</span>}
                      </span>
                    </div>
                    <span className="font-pressstart text-[9px] text-theme-dark">
                      {item.score || item.streak}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* RIGHT COLUMN: ROOM CHAT OR CALENDAR */}
        {isMultiplayer ? (
          <section className="md:col-span-5 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-3 sm:p-4 shadow-md flex flex-col gap-2.5 relative">
            <div className="flex items-center justify-between pb-2 border-b border-theme-dark/20">
              <h3 className="font-pressstart text-[10px] sm:text-[12px] text-theme-dark">ROOM CHAT</h3>
            </div>

            <div ref={chatContainerRef} className="flex-1 min-h-[180px] max-h-[220px] overflow-y-auto flex flex-col gap-2 p-2 bg-theme-muted/30 border border-theme-dark/20 rounded-[8px]">
              {roomChat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === player.username ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <span className="font-pressstart text-[7px] text-theme-dark/60 mb-0.5">{msg.sender}</span>
                  <div className={`px-2.5 py-1.5 font-pixel text-[14px] rounded-[6px] border ${
                    msg.sender === player.username 
                      ? 'bg-theme-primary text-[#FFFFF6] border-theme-dark' 
                      : 'bg-theme-surface text-theme-dark border-theme-dark/30'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {showEmojiPicker && (
              <div className="absolute bottom-14 right-4 z-50 shadow-2xl">
                <EmojiPicker onEmojiClick={handleEmojiSelect} width={280} height={300} />
              </div>
            )}

            <form onSubmit={handleSendRoomMessage} className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-theme-surface border-2 border-theme-dark rounded-[8px] px-2 py-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type in room chat..."
                  className="flex-1 bg-transparent font-pixel text-[14px] text-theme-dark focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-sm cursor-pointer hover:scale-110 transition shrink-0 ml-1"
                >
                  😀
                </button>
              </div>
              <button
                type="submit"
                className="bg-theme-primary text-[#FFFFF6] border-2 border-theme-dark px-3 py-1.5 rounded-[8px] font-pressstart text-[9px] hover:bg-[#d0622c] cursor-pointer"
              >
                SEND
              </button>
            </form>
          </section>
        ) : (
          <section className="md:col-span-5 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-3 sm:p-4 shadow-md flex flex-col gap-2.5 relative">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-theme-dark/20">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-theme-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-pressstart text-[10px] sm:text-[12px] text-theme-dark truncate">
                  {monthNames[currentCalDate.getMonth()]} {currentCalDate.getFullYear()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handlePrevMonth} 
                    className="p-1 sm:p-1.5 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer"
                    aria-label="Previous Month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="currentColor" d="M12.727 3.687a1 1 0 1 0-1.454-1.374l-8.5 9a1 1 0 0 0 0 1.374l8.5 9.001a1 1 0 1 0 1.454-1.373L4.875 12z" />
                    </svg>
                  </button>
                  <button 
                    onClick={handleNextMonth} 
                    className="p-1 sm:p-1.5 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer"
                    aria-label="Next Month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="currentColor" d="M11.273 3.687a1 1 0 1 1 1.454-1.374l8.5 9a1 1 0 0 1 0 1.374l-8.5 9.001a1 1 0 1 1-1.454-1.373L19.125 12z" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => setShowCalendarModal(true)}
                  className="p-1 sm:p-1.5 rounded-[6px] text-theme-dark hover:bg-theme-muted hover:text-theme-primary transition-all cursor-pointer"
                  title="Full Screen"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H4v-5m0 5l6.5-6.5M15 4h5v5m0-5l-6.5 6.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="w-full flex-1 flex flex-col justify-between p-2 sm:p-3 overflow-hidden">
              <div className="grid grid-cols-7 gap-1 text-center font-pressstart text-[7.5px] sm:text-[9px] text-theme-dark/70 pb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-1.5 flex-1 auto-rows-fr h-full">
                {renderCalendarDays(true)}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* RECENT ACTIVITIES MODAL */}
      {showRecentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark">
                ALL RECENT ACTIVITY
              </h3>
              <button
                onClick={() => setShowRecentModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 max-h-[60vh]">
              {initialRecentActivities.map((item, idx) => renderActivityItem(item, idx))}
            </div>
          </div>
        </div>
      )}

      {/* FULL ROOM ACTIVITY LOG MODAL */}
      {showRoomActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark uppercase">
                ALL ROOM ACTIVITY LOGS
              </h3>
              <button
                onClick={() => setShowRoomActivityModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[60vh]">
              {roomData.auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2.5 rounded-[6px] bg-theme-muted/50 border border-theme-dark/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-pressstart text-[9px] text-theme-primary font-bold">{log.user}</span>
                    <span className="font-pixel text-[15px] text-theme-dark truncate">{log.action}</span>
                  </div>
                  <span className="font-pressstart text-[8px] text-theme-dark/50 shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN LEADERBOARD MODAL */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-theme-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 21q-.425 0-.712-.288T2 20V10q0-.425.288-.712T3 9h3.5q.425 0 .713.288T7.5 10v10q0 .425-.288.713T6.5 21zm7.25 0q-.425 0-.712-.288T9.25 20V4q0-.425.288-.712T10.25 3h3.5q.425 0 .713.288T14.75 4v16q0 .425-.288.713T13.75 21zm7.25 0q-.425 0-.712-.288T16.5 20v-8q0-.425.288-.712T17.5 11H21q.425 0 .713.288T22 12v8q0 .425-.288.713T21 21z" />
                </svg>
                <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark uppercase">
                  Full Leaderboard
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 p-1">
              {['all-time', 'this-month', 'streaks'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 font-pressstart text-[9px] rounded-none! border-[1.5px] sm:border-2 border-theme-dark transition-all duration-150 retro-shadow cursor-pointer ${
                    activeTab === tab
                      ? 'bg-theme-primary text-theme-surface'
                      : 'bg-theme-muted text-theme-dark hover:bg-[#f3dcba]'
                  }`}
                >
                  {tab.replace('-', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60vh] pr-2">
              {(leaderboardData[activeTab] || []).map((item) => {
                const isCurrentUser = item.username === player.username;
                return (
                  <div
                    key={item.rank}
                    className={`flex items-center justify-between p-2 rounded-[8px] ${
                      isCurrentUser
                        ? 'bg-[#C97845]/50 border-[1.5px] border-theme-dark'
                        : 'bg-theme-muted/40 border-[1.5px] border-theme-dark/20 hover:bg-theme-muted'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-pressstart text-[10px] w-5 text-center text-theme-dark">
                        #{item.rank}
                      </span>
                      <img
                        src={item.pfp}
                        alt={item.username}
                        className="w-7 h-7 rounded-[4px] border border-theme-dark bg-theme-surface shrink-0"
                      />
                      <span className="font-pressstart text-[9px] text-theme-dark truncate">
                        {item.username} {isCurrentUser && <span className="text-[7px] text-theme-primary">(YOU)</span>}
                      </span>
                    </div>
                    <span className="font-pressstart text-[9px] text-theme-dark">
                      {item.score || item.streak}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN CALENDAR OVERLAY */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
          <div className="w-full max-w-2xl h-[75vh] bg-theme-surface border-2 border-theme-dark rounded-[12px] shadow-2xl flex flex-col p-3 sm:p-4 gap-2">
            <div className="flex items-center justify-between gap-2 pb-2 shrink-0 border-b border-theme-dark/20">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-5 h-5 text-theme-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark truncate">
                  {monthNames[currentCalDate.getMonth()]} {currentCalDate.getFullYear()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handlePrevMonth} 
                    className="p-1 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer"
                    aria-label="Previous Month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="currentColor" d="M12.727 3.687a1 1 0 1 0-1.454-1.374l-8.5 9a1 1 0 0 0 0 1.374l8.5 9.001a1 1 0 1 0 1.454-1.373L4.875 12z" />
                    </svg>
                  </button>
                  <button 
                    onClick={handleNextMonth} 
                    className="p-1 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer"
                    aria-label="Next Month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="currentColor" d="M11.273 3.687a1 1 0 1 1 1.454-1.374l8.5 9a1 1 0 0 1 0 1.374l-8.5 9.001a1 1 0 1 1-1.454-1.373L19.125 12z" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-1 rounded-[6px] text-theme-dark hover:bg-theme-muted hover:text-theme-primary transition-all cursor-pointer"
                  title="Minimize Modal"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="m10 15.4l-5.9 5.9q-.275.275-.7.275t-.275-.7t.275-.7L8.6 14H5q-.425 0-.712-.288T4 13t.288-.712T5 12h6q.425 0 .713.288T12 13v6q0 .425-.288.713T11 20t-.712-.288T10 19zm5.4-5.4H19q.425 0 .713.288T20 11t-.288.713T19 12h-6q-.425 0-.712-.288T12 11V5q0-.425.288-.712T13 4t.713.288T14 5v3.6l5.9-5.9q.275-.275.7-.275t.7.275t.275.7t-.275.7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="w-full flex-1 flex flex-col justify-between p-2 overflow-y-auto">
              <div className="grid grid-cols-7 gap-1 text-center font-pressstart text-[9px] sm:text-[11px] text-theme-dark/70 pb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1 flex-1 auto-rows-fr">
                {renderCalendarDays(false)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SESSION COMPLETE REWARD MODAL */}
      {timer.showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-[#FEF4E0] border-4 border-[#3D2013] rounded-[16px] w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-bounce-short">
            <div className="text-5xl">🎉</div>
            
            <h3 className="font-pressstart text-[16px] text-[#E87339] uppercase">
              SESSION COMPLETE!
            </h3>

            <p className="font-pixel text-[18px] text-[#3D2013] leading-snug">
              Awesome job! You finished all your planned study sessions.
            </p>

            <div className="bg-[#FAE9CE] border-2 border-[#3D2013] p-3 rounded-[8px] w-full flex items-center justify-around">
              <div className="flex flex-col">
                <span className="font-pressstart text-[12px] text-[#E87339]">+50 XP</span>
                <span className="font-pixel text-[14px] text-[#3D2013]/70">REWARD</span>
              </div>
              <div className="w-[1px] h-8 bg-[#3D2013]/20" />
              <div className="flex flex-col">
                <span className="font-pressstart text-[12px] text-[#E87339]">+10 COINS</span>
                <span className="font-pixel text-[14px] text-[#3D2013]/70">BONUS</span>
              </div>
            </div>

            <button
              onClick={timer.closeRewardModal}
              className="mt-2 font-pressstart text-[10px] text-[#FFFFF6] bg-[#E87339] border-2 border-[#3D2013] px-6 py-3 retro-shadow hover:bg-[#d0622c] cursor-pointer"
            >
              CLAIM REWARD
            </button>
          </div>
        </div>
      )}
    </main>
  );
}