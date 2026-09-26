// src/pages/UserHomepage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useTimer } from '../hooks/useTimer';
import { ActiveSessionWidget, RecentActivityWidget } from '../components/UserHomepageWidgets';
import CustomRoom from '../components/CustomRoom';
import CustomAvatar from '../components/CustomAvatar';
import EmojiPicker from 'emoji-picker-react';
import { io } from 'socket.io-client';

const LOFI_TRACKS = [
  { id: 'lofi1', name: 'Midnight Coffee', artist: 'Lofi Girl & Chill', src: 'media/BGM/LOFI1.mp3' },
  { id: 'lofi2', name: 'Rainy Study Session', artist: 'Pixel Beats', src: 'media/BGM/LOFI2.mp3' },
  { id: 'lofi3', name: 'Pixel Sunset', artist: 'Kitsu BGM', src: 'media/BGM/LOFI3.mp3' },
  { id: 'lofi4', name: 'Cosmic Chillout', artist: 'StudyCircle Sound', src: 'media/BGM/LOFI4.mp3' },
];

const avatarConfig = {
  scale: 0.85,
  bottom: '15%',
  left: '50%',
  offsetX: 0,
  offsetY: 0,
};

const memberPositionsByCount = {
  1: [{ bottom: '25%', left: '50%', scale: 0.85 }],
  2: [
    { bottom: '25%', left: '38%', scale: 0.85 },
    { bottom: '25%', left: '62%', scale: 0.85 }
  ],
  3: [
    { bottom: '28%', left: '32%', scale: 0.85 },
    { bottom: '25%', left: '50%', scale: 0.85 },
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
    { bottom: '25%', left: '50%', scale: 0.85 },
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

const mockRoomData = {
  roomName: "Algorithms & Data Structures Study Group",
  course: "CS 201 - Data Structures",
  privacy: "public",
  maxMembers: 6,
  hostId: "m1",
  members: [],
  auditLogs: [],
  chatMessages: []
};

const REPORT_REASONS = [
  { id: 'explicit', title: 'Explicit Room Name', desc: 'The room name contains sexually explicit or inappropriate content.' },
  { id: 'cyberbullying', title: 'Cyberbullying Space', desc: 'The room is being used to bully, harass, or target others.' },
  { id: 'offtopic', title: 'Off-topic', desc: 'The room contains unrelated activity.' },
  { id: 'promotions', title: 'Promotions', desc: 'The room promotes or facilitates illegal activities.' },
  { id: 'other', title: 'Other', desc: 'Please specify.' },
];

const REPORT_USER_REASONS = [
  { id: 'inappropriate', title: 'Inappropriate Content', desc: 'Hate speech, harassment, sexual content, etc.' },
  { id: 'spam', title: 'Spam', desc: 'Repeated messages, promotions, scams, etc.' },
  { id: 'misinformation', title: 'Misinformation', desc: 'False information, misleading claims, etc.' },
  { id: 'other', title: 'Other', desc: 'Please specify.' },
];

const REPORT_MESSAGE_REASONS = [
  { id: 'inappropriate', title: 'Inappropriate Content', desc: 'Hate speech, harassment, sexual content, etc.' },
  { id: 'spam', title: 'Spam', desc: 'Repeated messages, promotions, scams, etc.' },
  { id: 'misinformation', title: 'Misinformation', desc: 'False information, misleading claims, etc.' },
  { id: 'other', title: 'Other', desc: 'Please specify.' },
];

const PRODUCTIVITY_LEVELS = [
  { id: 1, title: '1 - Not Productive' },
  { id: 2, title: '2 - Slightly Productive' },
  { id: 3, title: '3 - Neutral' },
  { id: 4, title: '4 - Productive' },
  { id: 5, title: '5 - Very Productive' },
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

export default function UserHomepage({ isMultiplayer: propIsMultiplayer = false }) {
  const { playerData } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();

  const player = {
    username: playerData?.username || 'ACORN_HERO',
    email: playerData?.email || '',
    streakDays: playerData?.streakDays ?? 0,
    level: playerData?.level ?? 1,
    coins: playerData?.coins ?? 0,
    currentXP: playerData?.currentXP ?? 0,
    maxXP: playerData?.maxXP ?? 10000,
  };

  const [recentActivities, setRecentActivities] = useState([]);
  const [userActivities, setUserActivities] = useState({});

  const timer = useTimer();
  const activeCardRef = useRef(null);

  const [greetingText, setGreetingText] = useState('Good Afternoon');
  const [currentDateStr, setCurrentDateStr] = useState('');

  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showRoomActivityModal, setShowRoomActivityModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Feedback Modal States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [taskStatus, setTaskStatus] = useState('Completed');
  const [productivityLevel, setProductivityLevel] = useState(3);
  const [accomplishedText, setAccomplishedText] = useState('');
  const [showFeedbackSuccessModal, setShowFeedbackSuccessModal] = useState(false);

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Explicit Room Name');
  const [reportNotes, setReportNotes] = useState('');
  const [showReportSuccessModal, setShowReportSuccessModal] = useState(false);

  // Report User Modal States
  const [showReportUserModal, setShowReportUserModal] = useState(false);
  const [reportedUser, setReportedUser] = useState(null);
  const [reportUserReason, setReportUserReason] = useState('Inappropriate Content');
  const [reportUserNotes, setReportUserNotes] = useState('');
  const [showReportUserSuccessModal, setShowReportUserSuccessModal] = useState(false);

  // Report Message Modal States
  const [showReportMessageModal, setShowReportMessageModal] = useState(false);
  const [reportedMessage, setReportedMessage] = useState(null);
  const [reportMessageReason, setReportMessageReason] = useState('Inappropriate Content');
  const [reportMessageNotes, setReportMessageNotes] = useState('');
  const [showReportMessageSuccessModal, setShowReportMessageSuccessModal] = useState(false);

  const [activeProfileId, setActiveProfileId] = useState(null);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [incomingRequest, setIncomingRequest] = useState(null);

  const [activeTab, setActiveTab] = useState('all-time');
  const [leaderboardData, setLeaderboardData] = useState({
    'all-time': [],
    'this-month': [],
    streaks: [],
  });

  const [currentCalDate, setCurrentCalDate] = useState(new Date());
  const [activePopoverDate, setActivePopoverDate] = useState(null);

  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomData, setRoomData] = useState(mockRoomData);
  const [roomChat, setRoomChat] = useState(mockRoomData.chatMessages);
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatContainerRef = useRef(null);

  // Kick Modal State
  const [showKickModal, setShowKickModal] = useState(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const audioRef = useRef(null);
  const currentTrack = LOFI_TRACKS[currentTrackIndex];

  // Voice Chat States & Ref para maiwasan ang lag/stale closure
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Kunin ang audio stream at i-setup ang Audio Analyser para sa Speaking Detection
  useEffect(() => {
    if (isMultiplayer) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          localStreamRef.current = stream;

          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 512;

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const detectVolume = () => {
              const audioTrack = localStreamRef.current?.getAudioTracks()[0];
              
              if (analyserRef.current && !isMuted && audioTrack && audioTrack.enabled) {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const average = sum / dataArray.length;

                // Itinaas sa 55 para maiwasan ang pagka-trigger sa ambient/static noise
                const speakingNow = average > 55; 
                
                if (speakingNow !== isSpeakingRef.current) {
                  isSpeakingRef.current = speakingNow;
                  setIsSpeaking(speakingNow);

                  if (socketRef.current) {
                    socketRef.current.emit('update_speaking_status', {
                      room: roomData.roomName,
                      username: player.username,
                      isSpeaking: speakingNow
                    });
                  }
                }
              } else {
                if (isSpeakingRef.current) {
                  isSpeakingRef.current = false;
                  setIsSpeaking(false);
                  if (socketRef.current) {
                    socketRef.current.emit('update_speaking_status', {
                      room: roomData.roomName,
                      username: player.username,
                      isSpeaking: false
                    });
                  }
                }
              }
              animationFrameRef.current = requestAnimationFrame(detectVolume);
            };

            detectVolume();
          } catch (e) {
            console.error("Audio Context initialization failed:", e);
          }
        })
        .catch((err) => {
          console.error("Hindi ma-access ang mikropono:", err);
        });

      return () => {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      };
    }
  }, [isMultiplayer, isMuted, roomData.roomName, player.username]);

  // Function para sa pag-mute o pag-unmute ng sariling mic
  const toggleMuteVoice = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        if (!audioTrack.enabled) {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          if (socketRef.current) {
            socketRef.current.emit('update_speaking_status', {
              room: roomData.roomName,
              username: player.username,
              isSpeaking: false
            });
          }
        }
      }
    }
  };

  const getUserEmail = () => {
    if (player.email) return player.email;
    if (playerData?.email) return playerData.email;
    if (localStorage.getItem('user_email')) return localStorage.getItem('user_email');
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.email) return storedUser.email;
    } catch (e) {}
    return '';
  };

  // 1. Kunin ang session data mula sa activeSession o mula sa completedSessionData cache
  const savedSession = 
    timer.activeSession || 
    JSON.parse(localStorage.getItem('completedSessionData') || localStorage.getItem('activeSession') || '{}')
  const durationMins = savedSession.focusTime || savedSession.durationMinutes || savedSession.duration || 25;
  const rawTech = (savedSession.techniqueName || savedSession.technique || 'Pomodoro').toUpperCase();
  const techKey = rawTech.includes('52') ? '52-17' : rawTech.includes('90') ? 'ULTRADIAN' : 'POMODORO';

  const getSessionTasks = () => {
    if (timer.tasksList && timer.tasksList.length > 0) {
      return timer.tasksList;
    }
    if (timer.activeSession?.tasks && timer.activeSession.tasks.length > 0) {
      return timer.activeSession.tasks.map(t => typeof t === 'string' ? { text: t, completed: true } : t);
    }
    if (savedSession.tasks && savedSession.tasks.length > 0) {
      return savedSession.tasks.map(t => typeof t === 'string' ? { text: t, completed: true } : t);
    }
    return [];
  };

  const currentTasks = getSessionTasks();
  const totalTasks = currentTasks.length;
  const completedTasks = currentTasks.filter((t) => t.completed || t.status === 'completed').length;

  const techMultipliers = { 'POMODORO': 1.0, '52-17': 1.1, 'ULTRADIAN': 1.2 };
  const techMult = techMultipliers[techKey] || 1.0;
  const checklistMult = 1.0 + Math.min(completedTasks * 0.05, 0.25);
  const baseRate = 0.4;
  const calculatedExp = Math.round((durationMins * baseRate * techMult * checklistMult) * 10) / 10;
  const calculatedCoins = Math.max(1, Math.floor(durationMins * 0.2));

  // Tumpak na Host Checking
  const currentHostMember = roomData.members.find(m => m.isHost);
  const isCurrentUserHost = (currentHostMember && currentHostMember.username === player.username) || 
                          (roomData.hostId === player.username);

  const handleClaimAndSaveToDB = async () => {
    const userEmail = getUserEmail();

    if (!userEmail) {
      alert("Error: User email not found. Please log in again.");
      return;
    }

    // Basahin mula sa aktibong timer o sa completedSessionData cache
    const currentActiveSession = 
      timer.activeSession || 
      JSON.parse(localStorage.getItem('completedSessionData') || localStorage.getItem('activeSession') || '{}');
    
    // Tiyaking napipili ang totoong piniling workType, technique, at duration
    const finalActivity = 
      currentActiveSession.workType || 
      currentActiveSession.activity || 
      'Focus Session';

    const finalTechnique = 
      currentActiveSession.techniqueName || 
      currentActiveSession.technique || 
      'Pomodoro';

    const finalDuration = 
      Number(currentActiveSession.focusTime || 
      currentActiveSession.durationMinutes || 
      currentActiveSession.duration || 
      durationMins);

    const tasksToSend = getSessionTasks();
    const completedTasksCount = tasksToSend.filter(t => t.completed || t.status === 'completed').length;

    try {
      const response = await fetch('http://localhost:5000/api/v1/sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          durationMinutes: finalDuration,
          technique: finalTechnique,
          tasksCompleted: completedTasksCount,
          totalTasks: tasksToSend.length,
          tasksList: tasksToSend,
          activity: finalActivity,
          isMultiplayer: isMultiplayer,
          isHost: isCurrentUserHost,
          roomSize: roomData.members.length || 1,
          taskStatus: taskStatus,
          productivityLevel: productivityLevel,
          accomplishedText: accomplishedText
        })
      });

      const data = await response.json();
      if (data.success) {
        const storedUser = JSON.parse(localStorage.getItem(`user_${userEmail}`) || '{}');
        storedUser.coins = data.coins;
        storedUser.current_xp = data.currentXP;
        storedUser.level = data.level;
        storedUser.max_xp = data.maxXP;
        storedUser.streak = data.streak;
        localStorage.setItem(`user_${userEmail}`, JSON.stringify(storedUser));

        window.dispatchEvent(new Event('player-data-updated'));

        // Linisin ang completedSessionData cache pagkatapos ma-save nang maayos
        localStorage.removeItem('activeSession');
        localStorage.removeItem('completedSessionData');

        setShowFeedbackModal(false);
        setTaskStatus('Completed');
        setProductivityLevel(3);
        setAccomplishedText('');
        setShowFeedbackSuccessModal(true);
      } else {
        alert("Failed to save session: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Network error while saving session.");
    }
  };

  const handleHostStartSession = () => {
    if (socketRef.current && isMultiplayer) {
      socketRef.current.emit('start_shared_room', { room: roomData.roomName });
    }
  };

  const getLeaderboardAvatarConfig = (item) => {
    if (!item) return null;
    const rawConfig = item.avatar_config || item.avatarConfig || item.config;
    if (!rawConfig) return null;
    if (typeof rawConfig === 'string') {
      try { return JSON.parse(rawConfig); } catch (e) { return null; }
    }
    if (typeof rawConfig === 'object' && Object.keys(rawConfig).length > 0) {
      return rawConfig;
    }
    return null;
  };

  const handleHostDecision = (approved) => {
    if (socketRef.current && incomingRequest) {
      socketRef.current.emit('host_room_response', {
        room: roomData.roomName,
        username: incomingRequest.username,
        approved: approved
      });
    }
    setIncomingRequest(null);
  };

  useEffect(() => {
    const fetchUserSessions = async () => {
      const emailToUse = getUserEmail();
      if (!emailToUse) return;
      try {
        const response = await fetch(`http://localhost:5000/api/get-all-sessions?email=${emailToUse}`);
        const data = await response.json();
        if (data.success && data.sessions) {
          const rawSessions = data.sessions;

          const formattedRecent = rawSessions.map((s) => {
            const sessionDate = new Date(s.created_at);
            const today = new Date();
            let dateStr = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            if (sessionDate.toDateString() === today.toDateString()) {
              dateStr = 'Today';
            } else {
              const yesterday = new Date();
              yesterday.setDate(today.getDate() - 1);
              if (sessionDate.toDateString() === yesterday.toDateString()) {
                dateStr = 'Yesterday';
              }
            }

            return {
              activity: s.activity_name || 'Focus Session',
              technique: s.technique || 'Pomodoro',
              duration: `${s.duration_minutes || 0}m`,
              date: dateStr,
            };
          });
          setRecentActivities(formattedRecent);

          const groupedByDate = {};
          rawSessions.forEach((s) => {
            if (!s.created_at) return;
            const sessionDate = new Date(s.created_at);
            const yyyy = sessionDate.getFullYear();
            const mm = String(sessionDate.getMonth() + 1).padStart(2, '0');
            const dd = String(sessionDate.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}-${mm}-${dd}`;

            if (!groupedByDate[dateKey]) {
              groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push({
              name: s.activity_name || 'Focus Session',
              duration: `${s.duration_minutes || 0} mins`,
              technique: s.technique || 'Pomodoro',
            });
          });
          setUserActivities(groupedByDate);
        }
      } catch (err) {
        console.error("Failed to fetch user sessions for homepage:", err);
      }
    };

    fetchUserSessions();
  }, [player.email]);

  const socketRef = useRef(null);

  const [todayFocusFormatted, setTodayFocusFormatted] = useState('0h 0m');
  const [dbStreak, setDbStreak] = useState(playerData?.streakDays ?? 0);

  useEffect(() => {
    const fetchTodayStatsAndStreak = async () => {
      const emailToUse = getUserEmail();
      if (!emailToUse) return;

      try {
        const userRes = supabase.table('users').select('streak').eq('email', emailToUse).execute();
        if (userRes.data && userRes.data.length > 0) {
          setDbStreak(userRes.data[0].streak || 0);
        }

        const response = await fetch(`http://localhost:5000/api/get-all-sessions?email=${emailToUse}`);
        const data = await response.json();

        if (data.success && data.sessions) {
          const todayStr = new Date().toISOString().split('T')[0];
          const todaySessions = data.sessions.filter(s => s.created_at && s.created_at.split('T')[0] === todayStr);
          const totalTodayMins = todaySessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

          const hrs = Math.floor(totalTodayMins / 60);
          const mins = totalTodayMins % 60;
          setTodayFocusFormatted(`${hrs}h ${mins}m`);
        }
      } catch (err) {
        console.error("Failed to fetch homepage live stats:", err);
      }
    };
    fetchTodayStatsAndStreak();
  }, [player.email, playerData]);

  useEffect(() => {
    if (isMultiplayer) {
      socketRef.current = io('http://localhost:5000');
      
      const currentStatus = timer.activeSession ? "IN SESSION" : "ONLINE";

      socketRef.current.emit('join_room', { 
        room: roomData.roomName, 
        username: player.username,
        level: player.level,
        status: currentStatus,
        avatar_config: playerData?.avatar_config || playerData?.config || playerData?.avatarConfig || null
      });

      socketRef.current.on('room_update', (data) => {
        setRoomData((prev) => {
          const updated = { ...prev };
          if (data.members) {
            // I-preserve ang isSpeaking status ng bawat miyembro tuwing may room_update
            updated.members = data.members.map(newM => {
              const existing = prev.members.find(oldM => oldM.username === newM.username);
              return {
                ...newM,
                isSpeaking: existing ? existing.isSpeaking : false
              };
            });
          }
          
          if (data.logs && data.logs.length > 0) {
            const existingLogKeys = new Set(prev.auditLogs.map(l => `${l.user}-${l.action}`));
            const uniqueNewLogs = data.logs.filter(l => !existingLogKeys.has(`${l.user}-${l.action}`));
            
            if (uniqueNewLogs.length > 0) {
              updated.auditLogs = [...uniqueNewLogs, ...prev.auditLogs];
            }
          }
          
          if (data.room_config) {
            try {
              updated.roomConfig = typeof data.room_config === 'string' 
                ? JSON.parse(data.room_config) 
                : data.room_config;
            } catch (e) {
              console.error("Failed to parse room config", e);
            }
          }
          return updated;
        });
      });

      // Listener para sa pag-start ng shared room session (para mag-update ang state sa members)
      socketRef.current.on('shared_room_started', () => {
        setRoomData((prev) => ({ ...prev, isStarted: true }));
      });

      // Makinig kung ikaw ay na-kick ng host
      socketRef.current.on('kicked_from_room', (data) => {
        // Kung ang username na natanggap mula sa server ay ikaw, saka lang lalabas ang modal
        if (!data || data.username === player.username) {
          localStorage.removeItem('activeRoomSession');
          setShowKickModal(true);
        }
      });

      socketRef.current.on('receive_room_message', (msg) => {
        setRoomChat((prev) => [...prev, msg]);
      });

      socketRef.current.on('incoming_join_request', (data) => {
        setIncomingRequest(data);
      });

      socketRef.current.on('member_speaking_update', (data) => {
        setRoomData((prev) => ({
          ...prev,
          members: prev.members.map((m) => 
            m.username === data.username ? { ...m, isSpeaking: data.isSpeaking } : m
          )
        }));
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leave_room', { 
            room: roomData.roomName, 
            username: player.username 
          });
          socketRef.current.disconnect();
        }
      };
    }
  }, [isMultiplayer, roomData.roomName, player.username, isCurrentUserHost]);

  const handleSendRoomMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msgPayload = {
      room: roomData.roomName,
      sender: player.username,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (socketRef.current && isMultiplayer) {
      socketRef.current.emit('send_room_message', msgPayload);
    }

    setChatInput('');
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex, volume]);

  const togglePlay = () => setIsPlaying((prev) => !prev);

  const handleNextTrack = () => {
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * LOFI_TRACKS.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % LOFI_TRACKS.length);
    }
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + LOFI_TRACKS.length) % LOFI_TRACKS.length);
  };

  const handleTrackEnd = () => {
    if (isLoop) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      handleNextTrack();
    }
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/leaderboard');
        const data = await response.json();
        if (data.success) {
          setLeaderboardData(data.leaderboard);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard data:", err);
      }
    };
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const storedSession = localStorage.getItem('activeRoomSession');
    const stateIsMultiplayer = location.state?.isMultiplayer;

    if (storedSession || stateIsMultiplayer || propIsMultiplayer) {
      setIsMultiplayer(true);
      let parsed = null;
      if (storedSession) {
        try { parsed = JSON.parse(storedSession); } catch (e) {}
      } else if (location.state?.room) {
        parsed = location.state.room;
      }

      const roomName = parsed?.name || parsed?.roomName || "Study Room";
      
      let finalRoomConfig = parsed?.room_config || parsed?.roomConfig || null;
      if (typeof finalRoomConfig === 'string') {
        try { finalRoomConfig = JSON.parse(finalRoomConfig); } catch (e) {}
      }

      setRoomData((prev) => ({
        ...prev,
        roomName: roomName,
        course: parsed?.course || 'General Studies',
        privacy: parsed?.privacy || 'public',
        code: parsed?.code || null,
        maxMembers: parsed?.maxMembers || 6,
        taskType: parsed?.task_type || parsed?.taskType || 'individual', // <--- IDINAGDAG
        isStarted: parsed?.is_started || parsed?.isStarted || false,     // <--- IDINAGDAG
        roomConfig: finalRoomConfig,
        auditLogs: [{ id: Date.now(), user: player.username, action: "joined the room", time: "Just now" }]
      }));
    } else {
      setIsMultiplayer(false);
    }
  }, [location, propIsMultiplayer, player.username]);

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

  useEffect(() => {
    const handleDocumentClick = () => {
      setActivePopoverDate(null);
      setActiveProfileId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

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

  const handleEmojiSelect = (emojiData) => {
    setChatInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleKickMember = (memberId, memberUsername) => {
    // I-broadcast sa Socket.io server na na-kick ang user na ito
    if (socketRef.current && isMultiplayer) {
      socketRef.current.emit('kick_room_member', {
        room: roomData.roomName,
        username: memberUsername
      });
    }

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

  const handleAddFriend = async (member) => {
    const identifier = member.email || member.username;
    const memberKey = member.id || member.username;
    
    if (!identifier || sentFriendRequests.includes(memberKey)) return;

    try {
      const response = await fetch('http://localhost:5000/api/send-friend-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: getUserEmail(),
          receiverEmail: identifier
        })
      });
      const data = await response.json();
      if (data.success) {
        setSentFriendRequests((prev) => [...prev, memberKey]);
      } else {
        alert(data.message || "Failed to send friend request.");
      }
    } catch (error) {
      console.error('Error sending friend request from room modal:', error);
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
              } flex-col gap-1.5 w-48 sm:w-56 bg-theme-muted rounded-[8px] p-2.5 shadow-xl z-50 pointer-events-none transition-all dark:bg-zinc-800`}
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
                    <span className="font-pressstart text-[9px] sm:text-[10px] text-theme-primary truncate">
                      {act.name}
                    </span>
                    <div className="flex items-center justify-between w-full font-pressstart text-[7px] sm:text-[8px] text-theme-dark/80">
                      <span className="text-theme-dark">{act.duration}</span>
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

  const memberCountKey = Math.min(Math.max(roomData.members.length, 1), 6);
  const activePositionMap = memberPositionsByCount[memberCountKey] || memberPositionsByCount[1];

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
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
                  <span className="text-theme-safe uppercase">{roomData.privacy || 'PUBLIC'}</span>
                  <span>|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{roomData.course}</span>
                    <span>|</span>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="p-1 text-theme-primary hover:text-theme-danger hover:scale-110 transition-all cursor-pointer"
                      title="Report Room"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
                      </svg>
                    </button>
                  </div>
                  {roomData.code && (
                    <>
                      <span>|</span>
                      <span className="text-theme-primary font-pressstart text-[9px] uppercase">
                        CODE: {roomData.code}
                      </span>
                    </>
                  )}
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

                  const isMe = member.username === player.username;
                  const memberAvatarConfig = getLeaderboardAvatarConfig(member) || member.avatar_config || member.config;

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
                      {/* NAMETAG & MIC STATUS SA ITAAS NG AVATAR */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#000000]/70 px-2 sm:px-3 py-1 rounded-[6px] whitespace-nowrap shadow-md pointer-events-none flex items-center justify-center gap-1.5 z-30 border border-theme-dark/40">
                        {member.isHost && (
                          <svg className="w-2.5 h-2.5 text-[#FFD700] shrink-0" viewBox="0 0 24 24" fill="currentColor" title="Host">
                            <path d="M6 20q-.425 0-.712-.288T5 19t.288-.712T6 18h12q.425 0 .713.288T19 19t-.288.713T18 20zm.7-3.5q-.725 0-1.287-.475t-.688-1.2l-1-6.35q-.05 0-.112.013T3.5 8.5q-.625 0-1.062-.437T2 7t.438-1.062T3.5 5.5t1.063.438T5 7q0 .175-.038.325t-.087.275L8 9l3.125-4.275q-.275-.2-.45-.525t-.175-.7q0-.625.438-1.063T12 2t1.063.438T13.5 3.5q0 .375-.175.7t-.45.525L16 9l3.125-1.4q-.05-.125-.088-.275T19 7q0-.625.438-1.063T20.5 5.5t1.063.438T22 7t-.437 1.063T20.5 8.5q-.05 0-.112-.012t-.113-.013l-1 6.35q-.125.725-.687 1.2T17.3 16.5z" />
                          </svg>
                        )}
                        
                        <span className="flex items-center text-[10px]">
                          {isMe ? (
                            isMuted ? (
                              <span className="text-red-400" title="Mic Off">🔇</span>
                            ) : isSpeaking ? (
                              <span className="animate-bounce text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,1)] font-bold scale-125 transition-transform" title="Speaking...">🎙️</span>
                            ) : (
                              <span className="text-green-500 opacity-70" title="Mic On">🎙️</span>
                            )
                          ) : (
                            member.isSpeaking ? (
                              <span className="animate-bounce text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,1)] font-bold scale-125 transition-transform" title="Speaking...">🎙️</span>
                            ) : (
                              <span className="text-green-500 opacity-70" title="Active Mic">🎙️</span>
                            )
                          )}
                        </span>

                        <span className="font-pressstart text-[6px] sm:text-[7px] text-theme-white">
                          {member.username} {isMe && "(YOU)"}
                        </span>
                      </div>

                      {isProfileOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-[105%] left-1/2 -translate-x-1/2 w-56 sm:w-64 bg-theme-surface border-[2px] border-theme-dark rounded-[10px] p-2.5 shadow-2xl z-50 flex items-center gap-3 cursor-default animate-fade-in dark:bg-zinc-900"
                        >
                          <div className="relative shrink-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full border-[2px] border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                              {memberAvatarConfig ? (
                                <div 
                                  className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                                  style={{ transform: 'scale(0.38) translateY(12px)' }}
                                >
                                  <CustomAvatar config={memberAvatarConfig} state="idle" />
                                </div>
                              ) : (
                                <img
                                  src={member.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.username}`}
                                  alt="Player Avatar"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-theme-primary border-[2px] border-theme-dark px-1 py-0.5 text-center flex items-center justify-center min-w-[18px] rounded-[4px] leading-none z-10">
                              <span className="font-pressstart text-[8px] text-theme-dark">
                                {member.level || 1}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
                            <div className="flex items-center gap-1 min-w-0">
                              <h2 className="font-pressstart text-[11px] text-theme-dark tracking-tight truncate leading-none">
                                {member.username}
                              </h2>
                              {member.isHost && (
                                <span className="bg-theme-primary text-theme-white font-pressstart text-[5px] px-1 py-0.5 rounded shrink-0">
                                  HOST
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-theme-dark/70">
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m4.2 14.2L11 13V7h1.5v5.2l4.5 2.7z" />
                              </svg>
                              <span className="font-pressstart text-[8px] text-theme-dark">
                                {member.totalFocusTime || '0h 00m'}
                              </span>
                            </div>

                            {!isMe && (
                              <button
                                onClick={() => handleAddFriend(member)}
                                disabled={isFriendRequestSent}
                                className={`mt-0.5 font-pressstart text-[6px] px-2 py-1 border rounded transition-all cursor-pointer w-fit ${
                                  isFriendRequestSent
                                    ? 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed opacity-80'
                                    : 'bg-theme-primary text-theme-white border-theme-dark hover:bg-[#d0622c]'
                                }`}
                              >
                                {isFriendRequestSent ? 'SENT' : '+ ADD'}
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0 self-start">
                            <div className="flex items-center gap-1">
                              {!isMe && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReportedUser(member);
                                    setActiveProfileId(null);
                                    setShowReportUserModal(true);
                                  }}
                                  className="p-1 text-theme-dark/60 hover:text-theme-danger hover:scale-110 transition-all cursor-pointer"
                                  title="Report User"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveProfileId(null);
                                }}
                                className="font-pressstart text-[8px] text-theme-dark hover:text-theme-primary cursor-pointer p-0.5 leading-none"
                                title="Close profile"
                              >
                                ✕
                              </button>
                            </div>

                            {/* HOST-ONLY KICK BUTTON */}
                            {isCurrentUserHost && !isMe && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleKickMember(member.id, member.username);
                                }}
                                className="bg-theme-danger text-theme-white font-pressstart text-[6px] px-2 py-1 rounded border border-theme-dark hover:bg-red-800 transition-colors cursor-pointer"
                                title="Kick player from room"
                              >
                                KICK
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <CustomAvatar
                        config={memberAvatarConfig}
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
                    <span id="avatar-nametag" className="font-pressstart text-[6px] sm:text-[8px] text-theme-white leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {player.username}
                    </span>
                  </div>
                  <CustomAvatar state="idle" />
                </div>
              )}
            </div>
          </div>
        </section>

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
            isMultiplayer={isMultiplayer}               
            isCurrentUserHost={isCurrentUserHost}       
            roomData={roomData}                       
            onHostStartSession={handleHostStartSession}
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
                    <button
                      onClick={() => setShowRoomActivityModal(true)}
                      className="p-1 text-theme-dark hover:text-theme-primary transition-colors cursor-pointer"
                      title="View All Logs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H4v-5m0 5l6.5-6.5M15 4h5v5m0-5l-6.5 6.5" />
                      </svg>
                    </button>
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
                        <span className="font-pressstart text-[9px] text-theme-primary">{log.user}</span>
                        <span className="font-pixel text-[14px] text-theme-dark truncate">{log.action}</span>
                      </div>
                      <span className="font-pressstart text-[8px] text-theme-dark/50 shrink-0">{log.time}</span>
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
              recentActivities={recentActivities}
              onViewAll={() => setShowRecentModal(true)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full">
        <section className="md:col-span-3 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-5 shadow-md flex flex-col gap-3 justify-between">
          <audio
            ref={audioRef}
            src={currentTrack.src}
            onEnded={handleTrackEnd}
          />

          <div className="flex items-center justify-between pb-2 border-b-2 border-theme-dark/20">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-theme-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <g fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 18V5.716a2 2 0 0 1 1.696-1.977l9-1.385A2 2 0 0 1 21 4.331V16" />
                  <path d="m8 9l13-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 18a3 3 0 1 1-6 0c0-1.657 1.343-2 3-2s3 .343 3 2m13-2a3 3 0 1 1-6 0c0-1.657 1.343-2 3-2s3 .343 3 2" />
                </g>
              </svg>
              <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">FOCUS MUSIC</h3>
            </div>
          </div>

          <div className="flex items-center justify-center my-1">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <div className={`w-full h-full rounded-full bg-[#121212] border-4 border-theme-dark shadow-md flex items-center justify-center relative overflow-hidden ${
                isPlaying ? 'animate-spin [animation-duration:4s]' : ''
              }`}>
                <div className="absolute w-[85%] h-[85%] rounded-full border border-white/10" />
                <div className="absolute w-[70%] h-[70%] rounded-full border border-white/10" />
                <div className="absolute w-[55%] h-[55%] rounded-full border border-white/10" />
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.2)_45deg,transparent_90deg,transparent_180deg,rgba(255,255,255,0.2)_225deg,transparent_270deg)] pointer-events-none" />
                <div className="w-[40%] h-[40%] rounded-full bg-theme-primary border-2 border-theme-dark flex items-center justify-center relative">
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
                  <div className="w-2.5 h-2.5 rounded-full bg-theme-surface border border-theme-dark z-10" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-pressstart text-[7px] text-theme-dark/60 uppercase">CHOOSE TRACK</label>
            <select
              value={currentTrackIndex}
              onChange={(e) => setCurrentTrackIndex(Number(e.target.value))}
              className="w-full bg-theme-muted border-2 border-theme-dark rounded-[6px] px-2 py-1 font-pressstart text-[8px] sm:text-[9px] text-theme-dark focus:outline-none cursor-pointer"
            >
              {LOFI_TRACKS.map((track, idx) => (
                <option key={track.id} value={idx}>
                  {track.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col text-center">
            <span className="font-pressstart text-[9px] sm:text-[10px] text-theme-dark truncate">
              {currentTrack.name}
            </span>
            <span className="font-pixel text-[13px] text-theme-dark/70 truncate">
              {currentTrack.artist}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => setIsShuffle((prev) => !prev)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isShuffle ? 'text-theme-primary' : 'text-theme-dark/40 hover:text-theme-dark'
                }`}
                title="Shuffle"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10.59 9.17L5.41 4L4 5.41l5.17 5.17l1.42-1.41zM14.5 4l2.04 2.04L4 18.59L5.41 20L17.96 7.45L20 9.5V4h-5.5zm.33 9.41l-1.41 1.41l3.13 3.13L14.5 20H20v-5.5l-2.04 2.04l-3.13-3.13z" />
                </svg>
              </button>

              <button
                onClick={handlePrevTrack}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Previous"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-theme-primary border-2 border-theme-dark text-theme-surface flex items-center justify-center hover:bg-[#d0622c] cursor-pointer shadow-xs transition-transform active:scale-95"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleNextTrack}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Next"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              <button
                onClick={() => setIsLoop((prev) => !prev)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isLoop ? 'text-theme-primary' : 'text-theme-dark/40 hover:text-theme-dark'
                }`}
                title="Loop"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6c0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6c0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4l-4-4v3z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 px-1 pt-1">
              <svg className="w-3.5 h-3.5 text-theme-dark/60 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-theme-primary h-1.5 bg-theme-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </section>

        {isMultiplayer ? (
          <section className="md:col-span-4 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">
                ROOM MEMBERS ({roomData.members.length})
              </h3>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[250px] pr-1">
              {roomData.members.map((member, idx) => {
                const memberAvatarConfig = getLeaderboardAvatarConfig(member);
                const isMe = member.username === player.username;

                return (
                  <div
                    key={member.id || idx}
                    className={`flex items-center justify-between p-2.5 rounded-[8px] border-[1.5px] ${
                      member.isHost 
                        ? 'bg-theme-surface border-theme-primary shadow-sm' 
                        : 'bg-theme-muted/40 border-theme-dark/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0 w-7 h-7 rounded-[4px] border border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                        {memberAvatarConfig ? (
                          <div 
                            className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                            style={{ transform: 'scale(0.38) translateY(12px)' }}
                          >
                            <CustomAvatar config={memberAvatarConfig} state="idle" />
                          </div>
                        ) : (
                          <img
                            src={member.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.username}`}
                            alt={member.username}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-pressstart text-[9px] text-theme-dark truncate">{member.username}</span>
                          {member.isHost && (
                            <span className="bg-theme-primary text-theme-white font-pressstart text-[6px] px-1 py-0.2 rounded">HOST</span>
                          )}
                          {isMe && (
                            <>
                              <span className="font-pressstart text-[7px] text-theme-primary">(YOU)</span>
                              <button
                                type="button"
                                onClick={toggleMuteVoice}
                                className={`ml-1 px-1.5 py-0.5 rounded font-pressstart text-[6px] cursor-pointer border border-theme-dark ${
                                  isMuted ? 'bg-theme-danger text-white' : 'bg-theme-safe text-theme-dark'
                                }`}
                              >
                                {isMuted ? 'MIC OFF' : 'MIC ON'}
                              </button>
                            </>
                          )}
                        </div>
                        <span className="font-pressstart text-[7px] text-theme-dark/60">LVL {member.level || 1}</span>
                      </div>
                    </div>

                    <span className={`font-pressstart text-[7px] px-2 py-1 rounded border ${
                      member.status === 'IN SESSION'
                        ? 'bg-theme-safe/20 text-theme-safe border-theme-safe'
                        : 'bg-theme-dark/10 text-theme-dark/70 border-theme-dark/30'
                    }`}>
                      {member.status || 'ONLINE'}
                    </span>
                  </div>
                );
              })}
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
                      ? 'bg-theme-primary text-theme-white'
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
                const lbAvatarConfig = getLeaderboardAvatarConfig(item);
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
                          item.rank <= 3 ? 'text-theme-primary' : 'text-theme-dark/60'
                        }`}
                      >
                        #{item.rank}
                      </span>
                      <div className="relative shrink-0 w-7 h-7 rounded-[4px] border border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                        {lbAvatarConfig ? (
                          <div 
                            className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                            style={{ transform: 'scale(0.38) translateY(12px)' }}
                          >
                            <CustomAvatar config={lbAvatarConfig} state="idle" />
                          </div>
                        ) : (
                          <img
                            src={item.pfp || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${item.username}`}
                            alt={item.username}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
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

        {isMultiplayer ? (
          <section className="md:col-span-5 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-3 sm:p-4 shadow-md flex flex-col gap-2.5 relative">
            <div className="flex items-center justify-between pb-2 border-b border-theme-dark/20">
              <h3 className="font-pressstart text-[10px] sm:text-[12px] text-theme-dark">ROOM CHAT</h3>
            </div>

            <div ref={chatContainerRef} className="flex-1 min-h-[180px] max-h-[220px] overflow-y-auto flex flex-col gap-2 p-2 bg-theme-muted/30 border border-theme-dark/20 rounded-[8px]">
              {roomChat.map((msg, idx) => {
                const isMe = msg.sender === player.username;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${
                      isMe ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <span className="font-pressstart text-[7px] text-theme-dark/60 mb-0.5">{msg.sender}</span>
                    <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`px-2.5 py-1.5 font-pixel text-[14px] rounded-[6px] border ${
                        isMe 
                          ? 'bg-theme-primary text-theme-white border-theme-dark' 
                          : 'bg-theme-surface text-theme-dark border-theme-dark/30'
                      }`}>
                        {msg.text}
                      </div>
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            setReportedMessage(msg);
                            setShowReportMessageModal(true);
                          }}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          title="Report Message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-4 h-4 text-theme-dark/60 hover:text-theme-danger cursor-pointer transition-colors">
                            <path d="M0 0h24v24H0z" fill="none" />
                            <g fill="currentColor">
                              <path d="M12 6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1m0 10a1 1 0 1 0 0 2a1 1 0 0 0 0-2" />
                              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2M4 12a8 8 0 1 0 16 0a8 8 0 0 0-16 0" clipRule="evenodd" />
                            </g>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
                className="bg-theme-primary text-theme-white border-2 border-theme-dark px-3 py-1.5 rounded-[8px] font-pressstart text-[9px] hover:bg-[#d0622c] cursor-pointer"
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

      {/* FEEDBACK MODAL ('HOW WAS YOUR SESSION?') */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b-2 border-theme-dark/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-theme-muted flex items-center justify-center overflow-hidden shrink-0">
                  <img src="/public/media/kitsu_logo.png" alt="Logo" className="w-full h-full object-cover" onError={(e)=>{e.target.style.display='none';}} />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-pressstart text-[12px] sm:text-[14px] text-theme-dark uppercase">
                    HOW WAS YOUR SESSION?
                  </h3>
                  <span className="font-pixel text-[12px] sm:text-[16px] text-theme-dark/70">
                    Your feedback helps us make StudyCircle better!
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="font-pressstart text-[9px] sm:text-[11px] text-theme-dark uppercase">1. TASK STATUS</span>
                <span className="font-pixel text-[12px] sm:text-[16px] text-theme-dark/70">Did you complete your task?</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {['Completed', 'Partially Completed', 'Not Completed'].map((status) => {
                  const isSelected = taskStatus === status;
                  return (
                    <div
                      key={status}
                      onClick={() => setTaskStatus(status)}
                      className={`flex items-center gap-2.5 p-3 rounded-[8px] border-[1.5px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-theme-primary/10 border-theme-primary text-theme-primary'
                          : 'bg-theme-surface border-theme-dark hover:bg-theme-muted text-theme-dark'
                      }`}
                    >
                      <input
                        type="radio"
                        name="taskStatus"
                        checked={isSelected}
                        onChange={() => setTaskStatus(status)}
                        className="accent-theme-primary cursor-pointer shrink-0"
                      />
                      <span className="font-pixel text-[13px] sm:text-[16px] leading-tight">{status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="font-pressstart text-[9px] sm:text-[11px] text-theme-dark uppercase">2. HOW PRODUCTIVE WAS YOUR SESSION?</span>
                <span className="font-pixel text-[12px] sm:text-[16px] text-theme-dark/70">Rate your productivity level.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {PRODUCTIVITY_LEVELS.map((lvl) => {
                  const isSelected = productivityLevel === lvl.id;
                  return (
                    <div
                      key={lvl.id}
                      onClick={() => setProductivityLevel(lvl.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-[8px] border-[1.5px] cursor-pointer transition-all text-center ${
                        isSelected
                          ? 'bg-theme-primary/10 border-theme-primary text-theme-primary'
                          : 'bg-theme-surface border-theme-dark hover:bg-theme-muted text-theme-dark'
                      }`}
                    >
                      <span className="font-pressstart text-[12px] sm:text-[14px] mb-1">{lvl.id}</span>
                      <span className="font-pixel text-[10px] sm:text-[12px] leading-tight">{lvl.title.split(' - ')[1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col">
                <span className="font-pressstart text-[9px] sm:text-[11px] text-theme-dark uppercase">3. WHAT DID YOU ACCOMPLISH?</span>
                <span className="font-pixel text-[12px] sm:text-[16px] text-theme-dark/70">You can briefly describe what you did, learned, or achieved.</span>
              </div>
              <div className="relative">
                <textarea
                  value={accomplishedText}
                  maxLength={200}
                  onChange={(e) => setAccomplishedText(e.target.value)}
                  placeholder="e.g. finished 2 chapters, completed practice problems, etc..."
                  className="w-full h-20 bg-theme-surface border-[2px] border-theme-dark rounded-[8px] p-2.5 font-pixel text-[12px] sm:text-[16px] text-theme-dark placeholder-theme-dark/40 focus:outline-none resize-none pb-5"
                />
                <span className="absolute bottom-2 right-3 font-pixel text-[11px] text-theme-dark/60">
                  {accomplishedText.length}/200
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center pt-2 border-t border-theme-dark/20">
              <button
                onClick={handleClaimAndSaveToDB}
                className="font-pressstart text-[10px] text-theme-white bg-theme-primary border-[2px] border-theme-dark px-6 py-3 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90 uppercase"
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK SUCCESS MODAL */}
      {showFeedbackSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col items-center text-center gap-4 dark:bg-zinc-900">
            <div className="w-12 h-12 rounded-full bg-theme-safe text-white flex items-center justify-center">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">
              FEEDBACK SUBMITTED
            </h3>
            <p className="font-pixel text-[16px] sm:text-[20px] text-theme-dark/80">
              Thank you for your feedback! Your rewards have been successfully claimed and saved.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowFeedbackSuccessModal(false);
                window.location.reload();
              }}
              className="w-full bg-theme-primary text-white border-2 border-theme-dark py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow mt-2 uppercase"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* REPORT ROOM MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b-2 border-theme-dark/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-theme-danger text-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark uppercase">
                  REPORT ROOM
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">
              Help us keep StudyCircle safe and respectful. Please provide a reason for reporting this room.
            </p>

            <div className="flex items-center gap-3 p-3 bg-theme-muted/50 border-[1.5px] border-theme-dark/30 rounded-[8px]">
              <div className="w-10 h-10 rounded-full border border-theme-dark bg-theme-muted flex items-center justify-center font-pressstart text-[12px] text-theme-dark shrink-0">
                {roomData.roomName ? roomData.roomName.charAt(0) : 'R'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark truncate">{roomData.roomName}</span>
                <span className="font-pixel text-[10px] sm:text-[15px] text-theme-dark truncate">
                  Host: {roomData.hostId || (roomData.members.find(m => m.isHost)?.username) || 'Host'} | {currentDateStr || 'Today'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-pressstart text-[9px] sm:text-[12px] text-theme-dark uppercase">REASON FOR REPORT</label>
              <div className="flex flex-col gap-2">
                {REPORT_REASONS.map((reason, index) => {
                  const reportIcons = [
                    <svg key="1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <g fill="currentColor">
                        <path d="M12 6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1m0 10a1 1 0 1 0 0 2a1 1 0 0 0 0-2" />
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2M4 12a8 8 0 1 0 16 0a8 8 0 0 0-16 0" clipRule="evenodd" />
                      </g>
                    </svg>,
                    <svg key="2" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m10 13l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-6.876 5.701L5.6 19.921c-.833.665-1.249.998-1.599.999a1 1 0 0 1-.783-.377C3 20.27 3 19.737 3 18.671V7.201c0-1.12 0-1.681.218-2.11c.192-.376.497-.681.874-.873C4.52 4 5.08 4 6.2 4h11.6c1.12 0 1.68 0 2.107.218c.377.192.683.497.875.874c.218.427.218.987.218 2.105v7.607c0 1.117 0 1.676-.218 2.104a2 2 0 0 1-.874.874c-.427.218-.987.218-2.105.218h-8.68c-.417 0-.624 0-.823.04a2 2 0 0 0-.508.179c-.18.091-.34.22-.657.474z" />
                    </svg>,
                    <svg key="3" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2H5a2 2 0 0 1 -2 -2Z" />
                        <path d="M7 18v3l3 -3" />
                        <path d="M7.5 10a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0 -7 0" />
                        <path d="m13.5 12.5 2 2" />
                      </g>
                    </svg>,
                    <svg key="4" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="currentColor" d="M12 2.07a9.93 9.93 0 1 0 7.03 16.95a.4.4 0 0 0 .06-.07A9.84 9.84 0 0 0 21.935 12A9.944 9.944 0 0 0 12 2.07m0 18.86A8.945 8.945 0 0 1 3.065 12a8.84 8.84 0 0 1 2.28-5.95l12.61 12.61A8.93 8.93 0 0 1 12 20.93m6.67-2.98L6.045 5.34a8.934 8.934 0 0 1 12.62 12.61Z" />
                    </svg>,
                    <svg key="5" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" className="w-5 h-5">
                      <path d="M0 0h16v16H0z" fill="none" />
                      <g fill="currentColor">
                        <path d="M5.338 1.59a61 61 0 0 0-2.837.856a.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025a1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453a7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625a11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43A63 63 0 0 1 5.072.56" />
                        <path d="M7.001 11a1 1 0 1 1 2 0a1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0z" />
                      </g>
                    </svg>
                  ];

                  const isSelected = reportReason === reason.title;

                  return (
                    <div
                      key={reason.id}
                      onClick={() => setReportReason(reason.title)}
                      className={`flex items-center gap-3.5 p-3 rounded-[8px] border-[1.5px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-theme-primary/10 border-theme-primary text-theme-primary'
                          : 'bg-theme-surface border-theme-dark hover:bg-theme-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        checked={isSelected}
                        onChange={() => setReportReason(reason.title)}
                        className="accent-theme-primary cursor-pointer shrink-0 self-center"
                      />
                      
                      <div className="w-9 h-9 rounded-full bg-theme-muted text-theme-primary flex items-center justify-center shrink-0 self-center">
                        {reportIcons[index % reportIcons.length]}
                      </div>

                      <div className="flex flex-col justify-center min-w-0">
                        <span className={`font-pixel text-[15px] sm:text-[20px] ${isSelected ? 'text-theme-primary' : 'text-theme-dark'}`}>
                          {reason.title}
                        </span>
                        <span className="font-pixel text-[10px] sm:text-[18px] text-theme-dark/70 leading-4">
                          {reason.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-pressstart text-[9px] sm:text-[12px] text-theme-dark uppercase">ADDITIONAL NOTES (OPTIONAL)</label>
                <span className="font-pixel text-[10px] sm:text-[18px] text-theme-dark/60">{reportNotes.length}/500</span>
              </div>
              <textarea
                value={reportNotes}
                maxLength={500}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Add any extra information that might help..."
                className="w-full h-20 bg-theme-surface border-[2px] border-theme-dark rounded-[8px] p-2.5 font-pixel text-[10px] sm:text-[18px] text-theme-dark placeholder-theme-dark/40 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 border-t border-theme-dark/20">
              <button
                onClick={() => setShowReportModal(false)}
                className="font-pressstart text-[9px] text-theme-dark bg-theme-surface border-[2px] border-theme-dark px-4 py-2.5 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportNotes('');
                  setShowReportSuccessModal(true);
                }}
                className="font-pressstart text-[9px] text-theme-white bg-theme-primary border-[2px] border-theme-dark px-5 py-2.5 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90"
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT USER MODAL */}
      {showReportUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b-2 border-theme-dark/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-theme-danger text-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark uppercase">
                  REPORT USER
                </h3>
              </div>
              <button
                onClick={() => setShowReportUserModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">
              Help us keep StudyCircle safe and respectful. Please provide a reason for reporting this user.
            </p>

            <div className="flex items-center gap-3 p-3 bg-theme-muted/50 border-[1.5px] border-theme-dark/30 rounded-[8px]">
              <div className="w-10 h-10 rounded-full border border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={reportedUser?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${reportedUser?.username || 'user'}`}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark truncate">{reportedUser?.username || 'User'}</span>
                <span className="font-pixel text-[10px] sm:text-[15px] text-theme-dark truncate">
                  LVL {reportedUser?.level || 1} | {currentDateStr || 'Today'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-pressstart text-[9px] sm:text-[12px] text-theme-dark uppercase">REASON FOR REPORT</label>
              <div className="flex flex-col gap-2">
                {REPORT_USER_REASONS.map((reason, index) => {
                  const reportUserIcons = [
                    <svg key="1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <g fill="currentColor">
                        <path d="M12 6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1m0 10a1 1 0 1 0 0 2a1 1 0 0 0 0-2" />
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2M4 12a8 8 0 1 0 16 0a8 8 0 0 0-16 0" clipRule="evenodd" />
                      </g>
                    </svg>,
                    <svg key="2" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m10 13l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-6.876 5.701L5.6 19.921c-.833.665-1.249.998-1.599.999a1 1 0 0 1-.783-.377C3 20.27 3 19.737 3 18.671V7.201c0-1.12 0-1.681.218-2.11c.192-.376.497-.681.874-.873C4.52 4 5.08 4 6.2 4h11.6c1.12 0 1.68 0 2.107.218c.377.192.683.497.875.874c.218.427.218.987.218 2.105v7.607c0 1.117 0 1.676-.218 2.104a2 2 0 0 1-.874.874c-.427.218-.987.218-2.105.218h-8.68c-.417 0-.624 0-.823.04a2 2 0 0 0-.508.179c-.18.091-.34.22-.657.474z" />
                    </svg>,
                    <svg key="3" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2H5a2 2 0 0 1 -2 -2Z" />
                        <path d="M7 18v3l3 -3" />
                        <path d="M7.5 10a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0 -7 0" />
                        <path d="m13.5 12.5 2 2" />
                      </g>
                    </svg>,
                    <svg key="4" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" className="w-5 h-5">
                      <path d="M0 0h16v16H0z" fill="none" />
                      <g fill="currentColor">
                        <path d="M5.338 1.59a61 61 0 0 0-2.837.856a.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025a1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453a7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625a11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43A63 63 0 0 1 5.072.56" />
                        <path d="M7.001 11a1 1 0 1 1 2 0a1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0z" />
                      </g>
                    </svg>
                  ];

                  const isSelected = reportUserReason === reason.title;

                  return (
                    <div
                      key={reason.id}
                      onClick={() => setReportUserReason(reason.title)}
                      className={`flex items-center gap-3.5 p-3 rounded-[8px] border-[1.5px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-theme-primary/10 border-theme-primary text-theme-primary'
                          : 'bg-theme-surface border-theme-dark hover:bg-theme-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportUserReason"
                        checked={isSelected}
                        onChange={() => setReportUserReason(reason.title)}
                        className="accent-theme-primary cursor-pointer shrink-0 self-center"
                      />
                      
                      <div className="w-9 h-9 rounded-full bg-theme-muted text-theme-primary flex items-center justify-center shrink-0 self-center">
                        {reportUserIcons[index % reportUserIcons.length]}
                      </div>

                      <div className="flex flex-col justify-center min-w-0">
                        <span className={`font-pixel text-[15px] sm:text-[20px] ${isSelected ? 'text-theme-primary' : 'text-theme-dark'}`}>
                          {reason.title}
                        </span>
                        <span className="font-pixel text-[10px] sm:text-[18px] text-theme-dark/70 leading-4">
                          {reason.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-pressstart text-[9px] sm:text-[12px] text-theme-dark uppercase">ADDITIONAL NOTES (OPTIONAL)</label>
                <span className="font-pixel text-[10px] sm:text-[18px] text-theme-dark/60">{reportUserNotes.length}/500</span>
              </div>
              <textarea
                value={reportUserNotes}
                maxLength={500}
                onChange={(e) => setReportUserNotes(e.target.value)}
                placeholder="Add any extra information that might help..."
                className="w-full h-20 bg-theme-surface border-[2px] border-theme-dark rounded-[8px] p-2.5 font-pixel text-[10px] sm:text-[18px] text-theme-dark placeholder-theme-dark/40 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 border-t border-theme-dark/20">
              <button
                onClick={() => setShowReportUserModal(false)}
                className="font-pressstart text-[9px] text-theme-dark bg-theme-surface border-[2px] border-theme-dark px-4 py-2.5 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowReportUserModal(false);
                  setReportUserNotes('');
                  setShowReportUserSuccessModal(true);
                }}
                className="font-pressstart text-[9px] text-theme-white bg-theme-primary border-[2px] border-theme-dark px-5 py-2.5 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90"
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MESSAGE MODAL */}
      {showReportMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b-2 border-theme-dark/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-theme-danger text-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark uppercase">
                  REPORT MESSAGE
                </h3>
              </div>
              <button
                onClick={() => setShowReportMessageModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">
              Help us keep StudyCircle safe and respectful. Please provide a reason for reporting this message.
            </p>

            <div className="flex items-center gap-3 p-3 bg-theme-muted/50 border-[1.5px] border-theme-dark/30 rounded-[8px]">
              <div className="w-10 h-10 rounded-full border border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${reportedMessage?.sender || 'user'}`}
                  alt="Sender Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark truncate">
                  {reportedMessage?.sender || 'User'} | {reportedMessage?.time || currentDateStr || 'Today'}
                </span>
                <span className="font-pixel text-[10px] sm:text-[15px] text-theme-dark/80 truncate mt-0.5">
                  "{reportedMessage?.text}"
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-pressstart text-[9px] sm:text-[12px] text-theme-dark uppercase">REASON FOR REPORT</label>
              <div className="flex flex-col gap-2">
                {REPORT_MESSAGE_REASONS.map((reason, index) => {
                  const reportMessageIcons = [
                    <svg key="1" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <g fill="currentColor">
                        <path d="M12 6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1m0 10a1 1 0 1 0 0 2a1 1 0 0 0 0-2" />
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2M4 12a8 8 0 1 0 16 0a8 8 0 0 0-16 0" clipRule="evenodd" />
                      </g>
                    </svg>,
                    <svg key="2" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m10 13l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-6.876 5.701L5.6 19.921c-.833.665-1.249.998-1.599.999a1 1 0 0 1-.783-.377C3 20.27 3 19.737 3 18.671V7.201c0-1.12 0-1.681.218-2.11c.192-.376.497-.681.874-.873C4.52 4 5.08 4 6.2 4h11.6c1.12 0 1.68 0 2.107.218c.377.192.683.497.875.874c.218.427.218.987.218 2.105v7.607c0 1.117 0 1.676-.218 2.104a2 2 0 0 1-.874.874c-.427.218-.987.218-2.105.218h-8.68c-.417 0-.624 0-.823.04a2 2 0 0 0-.508.179c-.18.091-.34.22-.657.474z" />
                    </svg>,
                    <svg key="3" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2H5a2 2 0 0 1 -2 -2Z" />
                        <path d="M7 18v3l3 -3" />
                        <path d="M7.5 10a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0 -7 0" />
                        <path d="m13.5 12.5 2 2" />
                      </g>
                    </svg>,
                    <svg key="4" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" className="w-5 h-5">
                      <path d="M0 0h16v16H0z" fill="none" />
                      <g fill="currentColor">
                        <path d="M5.338 1.59a61 61 0 0 0-2.837.856a.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025a1 1 0 0 0 .1-.025q.114-.034.294-.118q.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453a7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625a11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43A63 63 0 0 1 5.072.56" />
                        <path d="M7.001 11a1 1 0 1 1 2 0a1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0z" />
                      </g>
                    </svg>
                  ];

                  const isSelected = reportMessageReason === reason.title;

                  return (
                    <div
                      key={reason.id}
                      onClick={() => setReportMessageReason(reason.title)}
                      className={`flex items-center gap-3.5 p-3 rounded-[8px] border-[1.5px] cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-theme-primary/10 border-theme-primary text-theme-primary'
                          : 'bg-theme-surface border-theme-dark hover:bg-theme-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportMessageReason"
                        checked={isSelected}
                        onChange={() => setReportMessageReason(reason.title)}
                        className="accent-theme-primary cursor-pointer shrink-0 self-center"
                      />
                      
                      <div className="w-9 h-9 rounded-full bg-theme-muted text-theme-primary flex items-center justify-center shrink-0 self-center">
                        {reportMessageIcons[index % reportMessageIcons.length]}
                      </div>

                      <div className="flex flex-col justify-center min-w-0">
                        <span className={`font-pixel text-[15px] sm:text-[20px] ${isSelected ? 'text-theme-primary' : 'text-theme-dark'}`}>
                          {reason.title}
                        </span>
                        <span className="font-pixel text-[10px] sm:text-[18px] text-theme-dark/70 leading-4">
                          {reason.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-pressstart text-[9px] sm:text-[12px] text-theme-dark uppercase">ADDITIONAL NOTES (OPTIONAL)</label>
                <span className="font-pixel text-[10px] sm:text-[18px] text-theme-dark/60">{reportMessageNotes.length}/500</span>
              </div>
              <textarea
                value={reportMessageNotes}
                maxLength={500}
                onChange={(e) => setReportMessageNotes(e.target.value)}
                placeholder="Add any extra information that might help..."
                className="w-full h-20 bg-theme-surface border-[2px] border-theme-dark rounded-[8px] p-2.5 font-pixel text-[10px] sm:text-[18px] text-theme-dark placeholder-theme-dark/40 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 border-t border-theme-dark/20">
              <button
                onClick={() => setShowReportMessageModal(false)}
                className="font-pressstart text-[9px] text-theme-dark bg-theme-surface border-[2px] border-theme-dark px-4 py-2.5 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowReportMessageModal(false);
                  setReportMessageNotes('');
                  setShowReportMessageSuccessModal(true);
                }}
                className="font-pressstart text-[9px] text-theme-white bg-theme-primary border-[2px] border-theme-dark px-5 py-2.5 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90"
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MESSAGE SUCCESS CONFIRMATION MODAL */}
      {showReportMessageSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-theme-safe text-white flex items-center justify-center">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">
              REPORT SUBMITTED
            </h3>
            <p className="font-pixel text-[16px] sm:text-[20px] text-theme-dark/80">
              Thank you for helping keep StudyCircle safe and respectful. Our moderation team will review this message shortly.
            </p>
            <button
              type="button"
              onClick={() => setShowReportMessageSuccessModal(false)}
              className="w-full bg-theme-primary text-white border-2 border-theme-dark py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow mt-2"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* REPORT USER SUCCESS CONFIRMATION MODAL */}
      {showReportUserSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-theme-safe text-white flex items-center justify-center">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">
              REPORT SUBMITTED
            </h3>
            <p className="font-pixel text-[16px] sm:text-[20px] text-theme-dark/80">
              Thank you for helping keep StudyCircle safe and respectful. Our moderation team will review this user shortly.
            </p>
            <button
              type="button"
              onClick={() => setShowReportUserSuccessModal(false)}
              className="w-full bg-theme-primary text-white border-2 border-theme-dark py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow mt-2"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {showReportSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-theme-safe text-white flex items-center justify-center">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">
              REPORT SUBMITTED
            </h3>
            <p className="font-pixel text-[16px] sm:text-[20px] text-theme-dark/80">
              Thank you for helping keep StudyCircle safe and respectful. Our moderation team will review this room shortly.
            </p>
            <button
              type="button"
              onClick={() => setShowReportSuccessModal(false)}
              className="w-full bg-theme-primary text-white border-2 border-theme-dark py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow mt-2"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {showRecentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] dark:bg-zinc-900">
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
              {recentActivities.length === 0 ? (
                <p className="font-pressstart text-[9px] text-theme-dark/60 text-center py-6">No recorded sessions yet.</p>
              ) : (
                recentActivities.map((item, idx) => renderActivityItem(item, idx))
              )}
            </div>
          </div>
        </div>
      )}

      {showRoomActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] dark:bg-zinc-900">
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
                    <span className="font-pressstart text-[9px] text-theme-primary">{log.user}</span>
                    <span className="font-pixel text-[15px] text-theme-dark truncate">{log.action}</span>
                  </div>
                  <span className="font-pressstart text-[8px] text-theme-dark/50 shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] flex flex-col gap-4 shadow-2xl dark:bg-zinc-900">
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

            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] pr-1">
              {(leaderboardData[activeTab] || []).map((item) => {
                const isCurrentUser = item.username === player.username;
                const lbAvatarConfig = getLeaderboardAvatarConfig(item);
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
                          item.rank <= 3 ? 'text-theme-primary' : 'text-theme-dark/60'
                        }`}
                      >
                        #{item.rank}
                      </span>
                      <div className="relative shrink-0 w-7 h-7 rounded-[4px] border border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                        {lbAvatarConfig ? (
                          <div 
                            className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                            style={{ transform: 'scale(0.38) translateY(12px)' }}
                          >
                            <CustomAvatar config={lbAvatarConfig} state="idle" />
                          </div>
                        ) : (
                          <img
                            src={item.pfp || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${item.username}`}
                            alt={item.username}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
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

      {showCalendarModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
          <div className="w-full max-w-2xl h-[75vh] bg-theme-surface border-2 border-theme-dark rounded-[12px] shadow-2xl flex flex-col p-3 sm:p-4 gap-2 dark:bg-zinc-900">
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
                    className="p-1 sm:p-1.5 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer"
                    aria-label="Previous Month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path fill="currentColor" d="M12.727 3.687a1 1 0 1 0-1.454-1.374l-8.5 9a1 1 0 0 0 0 1.374l8.5 9.001a1 1 0 1 0 1.454-1.373L4.875 12z" />
                    </svg>
                  </button>
                  <button 
                    onClick={handleNextMonth} 
                    className="p-1 sm:p-1.5 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer"
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

      {incomingRequest && isCurrentUserHost && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-[16px] w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <h3 className="font-pressstart text-[14px] text-theme-primary uppercase">
              JOIN REQUEST
            </h3>
            <p className="font-pixel text-[18px] text-theme-dark leading-snug">
              <span className="text-theme-primary">{incomingRequest.username}</span> wants to join your private study room.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => handleHostDecision(false)}
                className="flex-1 font-pressstart text-[9px] text-theme-white bg-red-600 border-2 border-theme-dark py-2.5 hover:bg-red-700 cursor-pointer uppercase"
              >
                DECLINE
              </button>
              <button
                onClick={() => handleHostDecision(true)}
                className="flex-1 font-pressstart text-[9px] text-theme-white bg-green-600 border-2 border-theme-dark py-2.5 hover:bg-green-700 cursor-pointer uppercase"
              >
                ACCEPT
              </button>
            </div>
          </div>
        </div>
      )}

      {timer.showNudgeModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-[16px] w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center gap-4 dark:bg-zinc-900">
            <div className="text-4xl animate-bounce">👀</div>
            
            <h3 className="font-pressstart text-[14px] text-theme-primary uppercase">
              STUDY CHECK!
            </h3>

            <p className="font-pixel text-[18px] text-theme-dark leading-snug">
              Are you still studying? Confirm your presence to keep the focus timer running!
            </p>

            <div className="bg-theme-muted border-2 border-theme-dark px-4 py-2 rounded-[8px] w-full flex items-center justify-center gap-2 dark:bg-zinc-800">
              <span className="font-pressstart text-[10px] text-theme-dark/70">Pausing in:</span>
              <span className="font-pressstart text-[14px] text-theme-danger">{timer.nudgeCountdown}s</span>
            </div>

            <button
              onClick={timer.handleConfirmNudge}
              className="mt-2 font-pressstart text-[10px] text-theme-white bg-theme-primary border-2 border-theme-dark px-6 py-3 w-full retro-shadow hover:bg-[#d0622c] cursor-pointer uppercase"
            >
              YES, I'M HERE!
            </button>
          </div>
        </div>
      )}

      {timer.toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] bg-theme-surface border-2 border-theme-dark px-4 py-3 rounded-[8px] shadow-2xl flex items-center gap-3 animate-bounce-short dark:bg-zinc-900">
          <span className="text-xl">⚠️</span>
          <span className="font-pressstart text-[9px] text-theme-dark">
            {timer.toastMessage}
          </span>
        </div>
      )}

      {/* KICKED OUT MODAL */}
      {showKickModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-theme-dark/70 backdrop-blur-xs">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-[16px] w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center gap-4 dark:bg-zinc-900">
            <div className="text-4xl">🚪</div>
            
            <h3 className="font-pressstart text-[14px] text-theme-danger uppercase">
              KICKED OUT
            </h3>

            <p className="font-pixel text-[18px] text-theme-dark leading-snug">
              You have been kicked out of the room by the host.
            </p>

            <button
              onClick={() => {
                setShowKickModal(false);
                setIsMultiplayer(false);
                navigate('/dashboard');
              }}
              className="mt-2 font-pressstart text-[10px] text-theme-white bg-theme-primary border-2 border-theme-dark px-6 py-3 w-full retro-shadow hover:bg-[#d0622c] cursor-pointer uppercase"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {timer.showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-[16px] w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-bounce-short dark:bg-zinc-900">
            <div className="text-5xl">🎉</div>
            
            <h3 className="font-pressstart text-[16px] text-theme-primary uppercase">
              SESSION COMPLETE!
            </h3>

            <p className="font-pixel text-[18px] text-theme-dark leading-snug">
              Awesome job! You finished all your planned study sessions.
            </p>

            <div className="bg-theme-muted border-2 border-theme-dark p-3 rounded-[8px] w-full flex items-center justify-around dark:bg-zinc-800">
              <div className="flex flex-col">
                <span className="font-pressstart text-[12px] text-theme-primary">+{calculatedExp} XP</span>
                <span className="font-pixel text-[14px] text-theme-dark/70">REWARD</span>
              </div>
              <div className="w-[1px] h-8 bg-theme-dark/20" />
              <div className="flex flex-col">
                <span className="font-pressstart text-[12px] text-theme-primary">+{calculatedCoins} COINS</span>
                <span className="font-pixel text-[14px] text-theme-dark/70">BONOS</span>
              </div>
            </div>

            <button
              onClick={() => {
                timer.closeRewardModal();
                setShowFeedbackModal(true);
              }}
              className="mt-2 font-pressstart text-[10px] text-theme-white bg-theme-primary border-2 border-theme-dark px-6 py-3 retro-shadow hover:bg-[#d0622c] cursor-pointer"
            >
              CLAIM REWARD
            </button>
          </div>
        </div>
      )}

      {timer.activeSession && (
        <div className="fixed bottom-6 right-6 z-[99999]">
          <button
            onClick={() => {
              timer.triggerInstantComplete();
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-pressstart text-[10px] px-4 py-3 rounded-lg border-3 border-theme-dark shadow-2xl cursor-pointer uppercase animate-pulse"
          >
            ⚡ INSTANT COMPLETE
          </button>
        </div>
      )}
    </main>
  );
}