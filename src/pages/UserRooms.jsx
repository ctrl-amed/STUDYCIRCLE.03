// src/pages/UserRooms.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { io } from 'socket.io-client';

// --- CONFIGURATIONS ---
const MAX_ROOM_LIMIT = 3;
const REQUEST_TIMEOUT_SEC = 15;
const MAX_ROOM_NAME_LENGTH = 50;

// Standard course list suggestions
const COURSE_OPTIONS = [
  'Bachelor of Science in Information Technology (Information and Network Security Elective Track)',
  'Bachelor of Science in Computer Science (Computational and Data Sciences Elective Track)',
  'Bachelor of Science in Computer Science (Application Development Elective Track)',
  'Diploma in Application Development',
  'Diploma in Computer Network Administration',
];

// Minutes (integer from the backend) -> "2h 05m"
const formatMinutes = (mins) => {
  const total = Math.max(0, Math.round(Number(mins) || 0));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
};

export default function UserRooms() {
  const { playerData } = usePlayer();
  const navigate = useNavigate();
  const myUsername = playerData?.username || 'ACORN_HERO';

  // --- STATE MANAGEMENT ---
  const [roomsList, setRoomsList] = useState([]);
  const [roomHistory, setRoomHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('all-rooms');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Modals Visibility State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // NEW: message shown inside the LIMIT modal (comes from the backend) and a generic notice modal
  const [limitMessage, setLimitMessage] = useState('');
  const [notice, setNotice] = useState(null); // { title, message }

  // Modal Form Inputs & Selected Items
  const [privateCodeInput, setPrivateCodeInput] = useState('');
  const [privateCodeErr, setPrivateCodeErr] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCourse, setNewRoomCourse] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [newRoomPrivacy, setNewRoomPrivacy] = useState('public');
  const [newRoomMaxMembers, setNewRoomMaxMembers] = useState('');
  const [newRoomTaskType, setNewRoomTaskType] = useState('individual'); // 'individual' or 'shared'

  // Active Pending or Selected Room
  const [selectedStatsRoom, setSelectedStatsRoom] = useState(null);
  const [pendingJoinRoom, setPendingJoinRoom] = useState(null);

  // Request Countdown State & Host Approval State
  const [requestState, setRequestState] = useState('WAITING');
  const [requestTimer, setRequestTimer] = useState(REQUEST_TIMEOUT_SEC);
  const [incomingJoinRequest, setIncomingJoinRequest] = useState(null);

  const timerRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const socketRef = useRef(null);

  // Keep the latest pending room in a ref so socket listeners never read a stale value
  const pendingJoinRoomRef = useRef(null);
  useEffect(() => {
    pendingJoinRoomRef.current = pendingJoinRoom;
  }, [pendingJoinRoom]);

  // --- FETCH ROOMS (member counts are LIVE from the backend) ---
  const fetchRealRooms = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms');
      const data = await response.json();
      if (data.success && data.rooms) {
        const formattedRooms = data.rooms.map((r) => ({
          ...r,
          privacy: (r.privacy || 'public').toLowerCase(),
          breakTime: r.break_time || '0h 15m',
          currentMembers: r.current_members ?? 0,
          maxMembers: r.max_members || 4,
          tasks: r.tasks || [],
          taskType: r.task_type || 'individual',
          isClosed: Boolean(r.is_closed) || ['suspended', 'closed'].includes(r.status),
          isActive: r.is_active !== false,
        }));
        setRoomsList(formattedRooms);
      }
    } catch (err) {
      console.error('Failed to fetch rooms from database:', err);
    }
  };

  // Runs ONCE per user: loads rooms, opens a single socket connection, polls for the 5-min inactive rule
  useEffect(() => {
    fetchRealRooms();

    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    // REALTIME: server tells us how many people are inside each room
    socket.on('rooms_counts', (counts) => {
      setRoomsList((prev) =>
        prev.map((r) => {
          const n = counts[r.name] ?? 0;
          return { ...r, currentMembers: n, isActive: n > 0 ? true : r.isActive };
        })
      );
    });

    // A room was created / changed / suspended, so refresh the list
    socket.on('rooms_changed', fetchRealRooms);

    // Listen for incoming join requests if current user is the host
    socket.on('incoming_join_request', (data) => {
      if (data.host === myUsername) {
        setIncomingJoinRequest(data);
      }
    });

    socket.on('join_request_decision', (data) => {
      if (data.username !== myUsername) return;

      if (data.approved) {
        setRequestState('ACCEPTED');
        setTimeout(() => {
          setShowRequestModal(false);
          if (pendingJoinRoomRef.current) {
            enterRoomSession(pendingJoinRoomRef.current);
          }
        }, 1000);
      } else {
        setRequestState('REJECTED');
      }
    });

    // "Inactive" is time-based, so re-check with the server every minute
    const poll = setInterval(fetchRealRooms, 60000);

    return () => {
      clearInterval(poll);
      socket.disconnect();
    };
  }, [myUsername]);

  // History: ONLY the rooms THIS account has studied in (from the database).
  // Reloaded whenever the History tab is opened so it is always fresh.
  useEffect(() => {
    const email = playerData?.email;
    setRoomHistory([]);
    if (!email) return undefined;

    let cancelled = false;
    fetch(`http://localhost:5000/api/get-room-history?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setRoomHistory(
          (d.history || []).map((h) => ({
            id: h.id,
            name: h.name,
            course: h.course || 'General Studies',
            host: h.host,
            privacy: (h.privacy || 'public').toLowerCase(),
            maxMembers: h.maxMembers || 4,
            technique: h.technique || 'Pomodoro',
            focus: formatMinutes(h.focusMinutes),
            breakTime: formatMinutes(h.breakMinutes),
            sessions: h.sessions || 0,
            tasks: Array.isArray(h.tasks) ? h.tasks : [],
            xp: h.xp || 0,
            coins: h.coins || 0,
            lastAt: h.lastAt,
          }))
        );
      })
      .catch((err) => console.error('Failed to load room history:', err));

    return () => { cancelled = true; };
  }, [playerData?.email, activeTab === 'history']);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target)
      ) {
        setIsCourseDropdownOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateRoomCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let code = '';
    for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    return code;
  };

  const getHostedRoomsCount = () => {
    const manilaDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const today = manilaDay(new Date());
    return roomsList.filter(
      (r) => r.host === myUsername && r.max_members > 1 && r.created_at && manilaDay(r.created_at) === today
    ).length;
  };

  const enterRoomSession = (room) => {
    localStorage.setItem('activeRoomSession', JSON.stringify(room));
    navigate('/dashboard', { state: { isMultiplayer: true, room } });
  };

  useEffect(() => {
    if (showRequestModal && requestState === 'WAITING') {
      setRequestTimer(REQUEST_TIMEOUT_SEC);
      timerRef.current = setInterval(() => {
        setRequestTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setRequestState('EXPIRED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showRequestModal, requestState]);

  const openLimitModal = (message = '') => {
    setShowCreateModal(false);
    setLimitMessage(message);
    setShowLimitModal(true);
  };

  const handleConfirmCreate = async () => {
    if (!newRoomName.trim() || !newRoomMaxMembers) {
      setNotice({
        title: 'MISSING INFO',
        message: 'Please fill in the room name and select maximum members.',
      });
      return;
    }

    if (getHostedRoomsCount() >= MAX_ROOM_LIMIT) {
      openLimitModal();
      return;
    }

    const effectiveTaskType = newRoomPrivacy === 'public' ? 'individual' : newRoomTaskType;
    const activeSession = JSON.parse(localStorage.getItem('activeSession') || '{}');

    const payload = {
      name: newRoomName.trim(),
      course: newRoomCourse.trim() || 'General Studies',
      host: myUsername,
      privacy: newRoomPrivacy,
      code: newRoomPrivacy === 'private' ? generateRoomCode() : null,
      current_members: 0,
      max_members: parseInt(newRoomMaxMembers, 10),
      task_type: effectiveTaskType,
      technique: activeSession.techniqueName || 'Pomodoro',
      focus_time: activeSession.focusTime || 25,
      break_time: activeSession.breakTime || 5,
      is_started: false,
      tasks: activeSession.tasks || [],
    };

    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success && data.room) {
        const createdRoom = {
          ...data.room,
          privacy: (data.room.privacy || 'public').toLowerCase(),
          currentMembers: 0,
          maxMembers: data.room.max_members || 4,
          taskType: data.room.task_type || effectiveTaskType,
          technique: data.room.technique || 'Pomodoro',
          focusTime: data.room.focus_time || 25,
          breakTime: data.room.break_time || 5,
          isStarted: data.room.is_started || false,
          isClosed: false,
          isActive: true,
        };

        setRoomsList((prev) => [createdRoom, ...prev]);

        setNewRoomName('');
        setNewRoomCourse('');
        setNewRoomPrivacy('public');
        setNewRoomMaxMembers('');
        setNewRoomTaskType('individual');
        setShowCreateModal(false);

        enterRoomSession(createdRoom);
      } else {
        const msg = data.error || data.message || 'Failed to create room.';
        if (/limit reached/i.test(msg)) {
          openLimitModal(msg);
        } else {
          setNotice({ title: 'ERROR', message: msg });
        }
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setNotice({
        title: 'NETWORK ERROR',
        message: 'Cannot reach the server. Make sure your Python backend is running.',
      });
    }
  };

  const handleConfirmPrivateJoin = () => {
    const code = privateCodeInput.trim().toUpperCase();
    if (!code) {
      setPrivateCodeErr('Please enter a room code.');
      return;
    }

    const matchedRoom = roomsList.find(
      (r) => r.privacy === 'private' && !r.isClosed && r.code && r.code.toUpperCase() === code
    );

    if (!matchedRoom) {
      setPrivateCodeErr('Invalid room code. Please check and try again.');
      return;
    }

    if (matchedRoom.currentMembers >= matchedRoom.maxMembers) {
      setPrivateCodeErr('This room is already full.');
      return;
    }

    setPrivateCodeErr('');
    setPrivateCodeInput('');
    setShowJoinModal(false);

    setPendingJoinRoom(matchedRoom);
    setRequestState('WAITING');
    setShowRequestModal(true);

    if (socketRef.current) {
      socketRef.current.emit('request_join_room', {
        room: matchedRoom.name,
        host: matchedRoom.host,
        username: myUsername,
      });
    }
  };

  const respondToHostRequest = (approved) => {
    if (socketRef.current && incomingJoinRequest) {
      socketRef.current.emit('host_room_response', {
        room: incomingJoinRequest.room,
        username: incomingJoinRequest.username,
        approved: approved,
      });
    }
    setIncomingJoinRequest(null);
  };

  const filterRooms = (list) => {
    const query = searchQuery.toLowerCase();
    return list.filter((r) => {
      const matchesQuery =
        r.name.toLowerCase().includes(query) ||
        r.host.toLowerCase().includes(query) ||
        (r.course && r.course.toLowerCase().includes(query));

      const matchesCourse = selectedCourseFilter
        ? (r.course || 'General Studies').toLowerCase() === selectedCourseFilter.toLowerCase()
        : true;

      return matchesQuery && matchesCourse;
    });
  };

  const visibleRooms = roomsList.filter((r) => !r.isClosed);
  const filteredAllRooms = filterRooms(visibleRooms.filter((r) => r.privacy === 'public'));
  const filteredMyRooms = filterRooms(visibleRooms.filter((r) => r.host === myUsername));
  const filteredHistory = filterRooms(roomHistory);

  const filteredCourseOptions = COURSE_OPTIONS.filter((c) =>
    c.toLowerCase().includes(newRoomCourse.toLowerCase())
  );

  const renderRoomCard = (room, isHistoryTab = false) => {
    const isPublic = room.privacy.toLowerCase() === 'public';
    const privacyStyles = isPublic
      ? 'border-[#315B8C] bg-[#EAF3FF] text-[#315B8C]'
      : 'border-[#6846A5] bg-[#F1EDFF] text-[#6846A5]';

    if (isHistoryTab) {
      return (
        <div
          key={room.id}
          className="bg-theme-surface border-[2px] border-theme-dark rounded-[10px] p-4 flex flex-col gap-3 shadow-sm justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full border-[2px] border-theme-dark bg-theme-muted shrink-0 flex items-center justify-center font-pressstart text-[10px] text-theme-dark">
              {room.name.charAt(0)}
            </div>
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
              <span className="font-pressstart text-[11px] text-theme-dark truncate">{room.name}</span>
              <span className="font-pressstart text-[8px] text-theme-primary truncate">
                📚 {room.course || 'General Studies'}
              </span>
              <span className="font-pressstart text-[8px] text-theme-dark truncate">
                Hosted by: <span className="text-theme-primary">{room.host}</span>
              </span>
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1 font-pressstart text-[7px] border-[1.5px] px-2 py-0.5 rounded uppercase ${privacyStyles}`}>
                    <span>{room.privacy}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 font-pressstart text-[8px] text-theme-dark">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.4 3.4 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.4 3.4 0 0 0 15 11a3.5 3.5 0 0 0 0-7" />
                  </svg>
                  <span>Max {room.maxMembers}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedStatsRoom(room);
              setShowStatsModal(true);
            }}
            className="font-pressstart text-[9px] sm:text-[10px] text-theme-white bg-theme-primary rounded-none border-[2px] border-theme-dark px-8 py-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530] w-full"
          >
            STATISTICS
          </button>
        </div>
      );
    }

    const roomTaskType = room.taskType || 'individual';
    const isFull = room.currentMembers >= room.maxMembers;

    return (
      <div
        key={room.id}
        className="bg-theme-surface border-[2px] border-theme-dark rounded-[10px] p-4 flex flex-col gap-3 shadow-sm justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full border-[2px] border-theme-dark bg-theme-muted shrink-0 flex items-center justify-center font-pressstart text-[10px] text-theme-dark">
            {room.name.charAt(0)}
          </div>
          <div className="flex-1 flex flex-col gap-1 overflow-hidden">
            <span className="font-pressstart text-[11px] text-theme-dark truncate">{room.name}</span>
            <span className="font-pressstart text-[8px] text-theme-primary truncate">
              📚 {room.course || 'General Studies'}
            </span>
            <span className="font-pressstart text-[8px] text-theme-dark truncate">
              Hosted by: <span className="text-theme-primary">{room.host}</span>
            </span>
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 font-pressstart text-[7px] border-[1.5px] px-2 py-0.5 rounded uppercase ${privacyStyles}`}>
                  <span>{room.privacy}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-pressstart text-[7px] border-[1.5px] border-theme-dark/40 bg-theme-muted px-2 py-0.5 rounded uppercase text-theme-dark">
                  <span>Tasks: {roomTaskType}</span>
                </span>
              </div>
              <div className={`flex items-center gap-1 font-pressstart text-[8px] ${isFull ? 'text-theme-danger' : 'text-theme-dark'}`}>
                <span>
                  {room.currentMembers}/{room.maxMembers}
                </span>
                {isFull && <span>FULL</span>}
              </div>
            </div>
          </div>
        </div>

        <button
          disabled={isFull}
          onClick={() => enterRoomSession(room)}
          className={`font-pressstart text-[9px] sm:text-[10px] text-theme-white rounded-none border-[2px] border-theme-dark px-8 py-3 transition-all duration-150 retro-shadow w-full ${
            isFull
              ? 'bg-gray-400 opacity-60 cursor-not-allowed'
              : 'bg-theme-primary cursor-pointer hover:bg-[#d66530]'
          }`}
        >
          {isFull ? 'ROOM FULL' : 'JOIN ROOM'}
        </button>
      </div>
    );
  };

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-pressstart text-3xl sm:text-4xl md:text-5xl inline-block level-up-gradient bg-clip-text text-transparent w-fit">
          ROOMS
        </h1>
        <p className="font-pressstart text-[10px] sm:text-xs text-theme-dark/80">
          Find a study space that motivates you.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        <button
          onClick={() => setShowJoinModal(true)}
          className="font-pressstart text-[9px] sm:text-[10px] bg-theme-surface text-theme-dark rounded-none border-[2px] border-theme-dark px-3.5 py-2.5 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#FDE4D0]"
        >
          Join Private Room
        </button>
        <button
          onClick={() => {
            if (getHostedRoomsCount() >= MAX_ROOM_LIMIT) {
              openLimitModal();
            } else {
              setShowCreateModal(true);
            }
          }}
          className="font-pressstart text-[9px] sm:text-[10px] bg-theme-primary text-theme-white rounded-none border-[2px] border-theme-dark px-3.5 py-2.5 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530]"
        >
          Create Room
        </button>
      </div>

      <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b-2 border-theme-dark/20 pb-3 md:pb-4 relative">
          <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('all-rooms')}
              className={`font-pressstart text-[10px] pb-1 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'all-rooms'
                  ? 'border-[#E16F37] text-theme-primary'
                  : 'border-transparent text-theme-dark hover:text-theme-primary'
              }`}
            >
              ALL ROOMS
            </button>
            <button
              onClick={() => setActiveTab('my-rooms')}
              className={`font-pressstart text-[10px] pb-1 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'my-rooms'
                  ? 'border-[#E16F37] text-theme-primary'
                  : 'border-transparent text-theme-dark hover:text-theme-primary'
              }`}
            >
              MY ROOMS
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`font-pressstart text-[10px] pb-1 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'history'
                  ? 'border-[#E16F37] text-theme-primary'
                  : 'border-transparent text-theme-dark hover:text-theme-primary'
              }`}
            >
              HISTORY
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 flex items-center">
              <svg
                className="absolute left-3 w-4 h-4 text-theme-dark/70 pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21l-4.343-4.343m0 0A8 8 0 1 0 5.343 5.343a8 8 0 0 0 11.314 11.314" />
              </svg>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                className="w-full bg-theme-surface border-[2px] border-theme-dark rounded-[8px] pl-9 pr-8 py-2 font-pressstart text-[9px] text-theme-dark placeholder-[#3D2013]/50 focus:outline-none"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-theme-dark/70 hover:text-theme-danger font-pressstart text-[10px] p-0.5 cursor-pointer leading-none transition-colors"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="relative shrink-0" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                className={`h-9 px-3 bg-theme-surface border-[2px] border-theme-dark rounded-[8px] flex items-center justify-center gap-1.5 font-pressstart text-[8px] sm:text-[9px] cursor-pointer transition-colors ${
                  selectedCourseFilter
                    ? 'bg-[#FDE4D0] border-theme-primary text-theme-primary'
                    : 'text-theme-dark hover:bg-[#FDE4D0]'
                }`}
                title="Filter by Course"
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                </svg>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {selectedCourseFilter || 'FILTER'}
                </span>
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9l6 6l6-6" />
                </svg>
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-theme-surface border-[2px] border-theme-dark rounded-[8px] shadow-2xl max-h-60 overflow-y-auto p-1">
                  <div
                    onClick={() => {
                      setSelectedCourseFilter('');
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`px-3 py-2 font-pressstart text-[8px] rounded-[4px] cursor-pointer transition-colors ${
                      !selectedCourseFilter
                        ? 'bg-theme-primary text-theme-white'
                        : 'text-theme-dark hover:bg-theme-muted'
                    }`}
                  >
                    ALL COURSES
                  </div>
                  <div className="my-1 border-t border-theme-dark/20" />
                  {COURSE_OPTIONS.map((courseOption, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedCourseFilter(courseOption);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`px-3 py-2 font-pressstart text-[8px] rounded-[4px] cursor-pointer transition-colors ${
                        selectedCourseFilter === courseOption
                          ? 'bg-theme-primary text-theme-white'
                          : 'text-theme-dark hover:bg-theme-muted'
                      }`}
                    >
                      {courseOption}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 h-[420px] sm:h-[480px] md:h-[450px] overflow-y-auto pr-1">
          {activeTab === 'all-rooms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAllRooms.length > 0 ? (
                filteredAllRooms.map((r) => renderRoomCard(r, false))
              ) : (
                <p className="font-pressstart text-[9px] text-theme-dark/70 col-span-full py-4">
                  No public rooms found.
                </p>
              )}
            </div>
          )}

          {activeTab === 'my-rooms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyRooms.length > 0 ? (
                filteredMyRooms.map((r) => renderRoomCard(r, false))
              ) : (
                <p className="font-pressstart text-[9px] text-theme-dark/70 col-span-full py-4">
                  You have not created any rooms yet.
                </p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((r) => renderRoomCard(r, true))
              ) : (
                <p className="font-pressstart text-[9px] text-theme-dark/70 col-span-full py-4">
                  No room history found.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* JOIN PRIVATE ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-theme-dark/50 z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-md shadow-2xl flex flex-col items-center text-center gap-5 relative">
            <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark">JOIN PRIVATE</h3>
            <input
              type="text"
              value={privateCodeInput}
              onChange={(e) => {
                setPrivateCodeInput(e.target.value);
                setPrivateCodeErr('');
              }}
              placeholder="ABCD123"
              className="w-full bg-theme-muted border-[2px] rounded-[8px] p-3 font-pressstart text-[10px] text-center uppercase"
            />
            {privateCodeErr && <p className="text-theme-danger text-xs">{privateCodeErr}</p>}
            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <button onClick={() => setShowJoinModal(false)} className="font-pressstart text-[8px] bg-theme-surface border-[2px] border-theme-dark py-2.5">CANCEL</button>
              <button onClick={handleConfirmPrivateJoin} className="font-pressstart text-[8px] text-theme-white bg-theme-primary border-[2px] border-theme-dark py-2.5">JOIN</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-theme-dark/50 z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-md shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center relative pb-1">
              <h3 className="font-pressstart text-[14px] text-theme-primary tracking-wide">
                CREATE A ROOM
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-pressstart text-[9px] text-theme-dark">ROOM NAME</label>
                  <span className="font-pressstart text-[8px] text-theme-dark/60">
                    {newRoomName.length}/{MAX_ROOM_NAME_LENGTH}
                  </span>
                </div>
                <input
                  type="text"
                  value={newRoomName}
                  maxLength={MAX_ROOM_NAME_LENGTH}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full bg-theme-muted border-[2px] border-theme-dark rounded-[8px] px-3 py-2.5 font-pressstart text-[9px] text-theme-dark placeholder-[#3D2013]/50 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5 relative" ref={courseDropdownRef}>
                <label className="font-pressstart text-[9px] text-theme-dark">COURSE</label>
                <div className="relative w-full">
                  <input
                    type="text"
                    value={newRoomCourse}
                    onFocus={() => setIsCourseDropdownOpen(true)}
                    onChange={(e) => {
                      setNewRoomCourse(e.target.value);
                      setIsCourseDropdownOpen(true);
                    }}
                    placeholder="Type or select a course..."
                    className="w-full bg-theme-muted border-[2px] border-theme-dark rounded-[8px] pl-3 pr-8 py-2.5 font-pressstart text-[9px] text-theme-dark placeholder-[#3D2013]/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCourseDropdownOpen((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-dark hover:text-theme-primary cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9l6 6l6-6" />
                    </svg>
                  </button>
                </div>

                {isCourseDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-theme-surface border-[2px] border-theme-dark rounded-[8px] shadow-xl max-h-40 overflow-y-auto">
                    {filteredCourseOptions.length > 0 ? (
                      filteredCourseOptions.map((courseOption, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setNewRoomCourse(courseOption);
                            setIsCourseDropdownOpen(false);
                          }}
                          className="px-3 py-2 font-pressstart text-[8px] text-theme-dark hover:bg-theme-muted hover:text-theme-primary cursor-pointer border-b border-theme-dark/10 last:border-none"
                        >
                          {courseOption}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 font-pressstart text-[8px] text-theme-dark/60">
                        Use custom: "{newRoomCourse}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-pressstart text-[9px] text-theme-dark">PRIVACY</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewRoomPrivacy('public');
                      setNewRoomTaskType('individual');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 font-pressstart text-[9px] py-2.5 rounded-[8px] cursor-pointer transition-all ${
                      newRoomPrivacy === 'public'
                        ? 'bg-[#EAF3FF] border-[1.5px] border-[#315B8C] text-[#315B8C] opacity-100'
                        : 'bg-theme-surface border-[1.5px] border-theme-dark/30 text-theme-dark/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    Public
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRoomPrivacy('private')}
                    className={`flex-1 flex items-center justify-center gap-2 font-pressstart text-[9px] py-2.5 rounded-[8px] cursor-pointer transition-all ${
                      newRoomPrivacy === 'private'
                        ? 'bg-[#F1EDFF] border-[1.5px] border-[#6846A5] text-[#6846A5] opacity-100'
                        : 'bg-theme-surface border-[1.5px] border-theme-dark/30 text-theme-dark/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>

              {newRoomPrivacy === 'private' && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-pressstart text-[9px] text-theme-dark">TASKS BEHAVIOR</label>
                  <div className="relative flex items-center">
                    <select
                      value={newRoomTaskType}
                      onChange={(e) => setNewRoomTaskType(e.target.value)}
                      className="w-full bg-theme-muted border-[2px] border-theme-dark rounded-[8px] px-3 py-2.5 font-pressstart text-[9px] text-theme-dark focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="individual">Individual Tasks</option>
                      <option value="shared">Shared Tasks</option>
                    </select>
                    <svg
                      className="absolute right-3 w-4 h-4 text-theme-dark pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9l6 6l6-6" />
                    </svg>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-pressstart text-[9px] text-theme-dark">MAXIMUM MEMBERS</label>
                <div className="relative flex items-center">
                  <select
                    value={newRoomMaxMembers}
                    onChange={(e) => setNewRoomMaxMembers(e.target.value)}
                    className="w-full bg-theme-muted border-[2px] border-theme-dark rounded-[8px] px-3 py-2.5 font-pressstart text-[9px] text-theme-dark focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="" disabled>
                      Select maximum members
                    </option>
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Member' : 'Members'}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 w-4 h-4 text-theme-dark pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9l6 6l6-6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="font-pressstart text-[8px] sm:text-[9px] text-theme-dark bg-theme-surface border-[2px] border-theme-dark py-2.5 transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={!newRoomName.trim() || newRoomName.length > MAX_ROOM_NAME_LENGTH || !newRoomMaxMembers}
                className={`font-pressstart text-[8px] sm:text-[9px] text-theme-white bg-theme-primary border-[2px] border-theme-dark py-2.5 transition-all duration-150 retro-shadow ${
                  newRoomName.trim() && newRoomName.length <= MAX_ROOM_NAME_LENGTH && newRoomMaxMembers
                    ? 'cursor-pointer hover:bg-[#d66530]'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM LIMIT MODAL */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl text-center">
            <h3 className="font-pressstart text-[11px] text-theme-danger uppercase">LIMIT REACHED</h3>
            <p className="font-pressstart text-[9px] text-theme-dark leading-relaxed">
              {limitMessage ||
                `Room limit reached! You can only host a maximum of ${MAX_ROOM_LIMIT} group rooms per day.`}
            </p>
            <button
              onClick={() => setShowLimitModal(false)}
              className="font-pressstart text-[10px] text-theme-white bg-theme-primary border-[2px] border-theme-dark py-2.5 w-full"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* GENERIC NOTICE MODAL */}
      {notice && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl text-center">
            <h3 className="font-pressstart text-[11px] text-theme-danger uppercase">{notice.title}</h3>
            <p className="font-pressstart text-[9px] text-theme-dark leading-relaxed">{notice.message}</p>
            <button
              onClick={() => setNotice(null)}
              className="font-pressstart text-[10px] text-theme-white bg-theme-primary border-[2px] border-theme-dark py-2.5 w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* REQUEST TO JOIN MODAL (FOR GUEST) */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl text-center">
            <h3 className="font-pressstart text-[11px] text-theme-primary uppercase">
              {requestState === 'WAITING' && 'REQUEST SENT'}
              {requestState === 'ACCEPTED' && 'ACCEPTED!'}
              {requestState === 'REJECTED' && 'REJECTED'}
              {requestState === 'EXPIRED' && 'REQUEST EXPIRED'}
            </h3>
            <p className="font-pressstart text-[10px] text-theme-dark leading-relaxed">
              {requestState === 'WAITING' && `Waiting for approval from host (${pendingJoinRoom?.host || 'Host'})... ${requestTimer}s`}
              {requestState === 'ACCEPTED' && 'Host accepted your request! Joining room...'}
              {requestState === 'REJECTED' && 'Host rejected your request.'}
              {requestState === 'EXPIRED' && 'The host did not respond in time.'}
            </p>
            {requestState === 'ACCEPTED' && (
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  if (pendingJoinRoom) enterRoomSession(pendingJoinRoom);
                }}
                className="font-pressstart text-[10px] text-theme-white bg-green-600 border-[2px] border-theme-dark py-2.5 w-full"
              >
                JOIN ROOM
              </button>
            )}
            {requestState !== 'ACCEPTED' && (
              <button
                onClick={() => setShowRequestModal(false)}
                className="font-pressstart text-[10px] text-theme-white bg-theme-primary border-[2px] border-theme-dark py-2.5 w-full"
              >
                CLOSE
              </button>
            )}
          </div>
        </div>
      )}

      {/* HOST APPROVAL MODAL (FOR HOST) */}
      {incomingJoinRequest && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-4 border-theme-dark rounded-[16px] w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <h3 className="font-pressstart text-[14px] text-theme-primary uppercase">
              JOIN REQUEST
            </h3>
            <p className="font-pixel text-[18px] text-theme-dark leading-snug">
              <span className="font-bold text-theme-primary">{incomingJoinRequest.username}</span> wants to join your private study room.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => respondToHostRequest(false)}
                className="flex-1 font-pressstart text-[9px] text-theme-white bg-red-600 border-2 border-theme-dark py-2.5 hover:bg-red-700 cursor-pointer uppercase"
              >
                DECLINE
              </button>
              <button
                onClick={() => respondToHostRequest(true)}
                className="flex-1 font-pressstart text-[9px] text-theme-white bg-green-600 border-2 border-theme-dark py-2.5 hover:bg-green-700 cursor-pointer uppercase"
              >
                ACCEPT
              </button>
            </div>
          </div>
        </div>
      )}

{/* STATISTICS MODAL (REVISED TO OLD STYLE) */}
      {showStatsModal && selectedStatsRoom && (
        <div className="fixed inset-0 bg-theme-dark/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-lg shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center relative pb-2">
              <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-primary tracking-wide uppercase">
                STATISTICS: {selectedStatsRoom.name}
              </h3>
            </div>

            <div className="flex flex-col gap-4 font-pressstart text-[9px] text-theme-dark">
              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark flex items-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                      <path d="M20 15c0 1.864 0 2.796-.304 3.53a4 4 0 0 1-2.165 2.165C16.796 21 15.864 21 14 21h-3c-3.772 0-5.658 0-6.83-1.172C3 18.657 3 16.771 3 13V7a4 4 0 0 1 4-4" />
                      <path d="m10 8.5l.434 3.969a.94.94 0 0 0 .552.753c.686.295 1.971.778 3.014.778s2.328-.483 3.014-.778a.94.94 0 0 0 .553-.753L18 8.5m2.5-1v3.77M14 4L7 7l7 3l7-3z" />
                    </g>
                  </svg>
                  COURSE
                </span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-primary">
                  {selectedStatsRoom.course || 'General Studies'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark flex items-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2">
                      <path strokeLinejoin="round" d="M15.5 4H18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2.5" />
                      <path strokeLinejoin="round" d="M8.621 3.515A2 2 0 0 1 10.561 2h2.877a2 2 0 0 1 1.94 1.515L16 6H8z" />
                      <path d="M9 12h6m-6 4h6" />
                    </g>
                  </svg>
                  STUDY TECHNIQUE
                </span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark">
                  {selectedStatsRoom.technique}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark flex items-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path d="M0 0h512v512H0z" fill="none" />
                    <path fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" d="M256 64C150 64 64 150 64 256s86 192 192 192s192-86 192-192S362 64 256 64Z" />
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M256 128v144h96" />
                  </svg>
                  FOCUS TIME
                </span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark">
                  {selectedStatsRoom.focus}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark flex items-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 20h6.943m0 0h.114m-.114 0h.114m-.114 0A7 7 0 0 1 4 13V8.923c0-.51.413-.923.923-.923h12.154c.51 0 .923.413.923.923V9m-6.943 11H18m-6.943 0A7 7 0 0 0 18 13m0-4h1.5a2.5 2.5 0 0 1 0 5H18v-1m0-4v4M15 3l-1 2m-2-2l-1 2M9 3L8 5" />
                  </svg>
                  BREAK TIME
                </span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark">
                  {selectedStatsRoom.breakTime}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-solid border-theme-dark/40">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark flex items-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                    <path d="M0 0h32v32H0z" fill="none" />
                    <path fill="currentColor" d="m27 25.586l-2-2V21h-2v3.414L25.586 27z" />
                    <path fill="currentColor" d="M24 31c-3.86 0-7-3.14-7-7s3.14-7 7-7s7 3.14 7 7s-3.14 7-7 7m0-12c-2.757 0-5 2.243-5 5s2.243 5 5 5s5-2.243 5-5s-2.243-5-5-5m4-4h2V5c0-1.103-.897-2-2-2h-3v2h3z" />
                    <circle cx="9" cy="13" r="2" fill="currentColor" />
                    <circle cx="16" cy="13" r="2" fill="currentColor" />
                    <circle cx="23" cy="13" r="2" fill="currentColor" />
                    <path fill="currentColor" d="M7 23H4c-1.103 0-2-.897-2-2V5c0-1.103.897-2 2-2h3v2H4v16h3z" />
                  </svg>
                  NUMBER OF SESSIONS
                </span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark">
                  {selectedStatsRoom.sessions} Sessions
                </span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark flex items-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-3 5h3m-6 0h.01M12 16h3m-6 0h.01M10 3v4h4V3z" />
                  </svg>
                  TASKS COMPLETED
                </span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark">
                  {selectedStatsRoom.tasks.filter((t) => t.completed).length} /{' '}
                  {selectedStatsRoom.tasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2 pb-3 border-b-[2px] border-solid border-theme-dark">
                <ul className="flex flex-col font-pixel text-[18px] sm:text-[20px] list-none pl-2 m-0 gap-1">
                  {selectedStatsRoom.tasks.map((t, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      <span className={t.completed ? 'line-through text-theme-dark/60' : ''}>
                        {t.text}
                      </span>
                      {t.completed && (
                        <span className="text-theme-primary font-pixel text-[18px] sm:text-[20px]">✓</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark">XP EARNED</span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-[#7E57C2]">
                  {selectedStatsRoom.xp} XP
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark">COINS EARNED</span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-primary">
                  {selectedStatsRoom.coins} coins
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => setShowStatsModal(false)}
                className="font-pressstart text-[9px] sm:text-[10px] text-theme-white bg-theme-primary border-[2px] border-theme-dark px-8 py-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530] w-full"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}