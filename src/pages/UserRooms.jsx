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
  'Computer Science',
  'Software Engineering',
  'Mathematics & Calculus',
  'Physics',
  'Chemistry',
  'Biology',
  'Business & Administration',
  'Economics',
  'Psychology',
  'Literature & Language',
  'History & Social Sciences',
  'Graphic Design & Art',
  'Philosophy',
  'Engineering',
  'General Studies',
];

export default function UserRooms() {
  const { playerData } = usePlayer();
  const navigate = useNavigate();
  const myUsername = playerData?.username || 'ACORN_HERO';

  // --- STATE MANAGEMENT ---
  const [roomsList, setRoomsList] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
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

  // Modal Form Inputs & Selected Items
  const [privateCodeInput, setPrivateCodeInput] = useState('');
  const [privateCodeErr, setPrivateCodeErr] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCourse, setNewRoomCourse] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [newRoomPrivacy, setNewRoomPrivacy] = useState('public');
  const [newRoomMaxMembers, setNewRoomMaxMembers] = useState('');

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

  // Fetch real rooms from Supabase database and session history from local storage with deduplication
  useEffect(() => {
    const fetchRealRooms = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/rooms');
        const data = await response.json();
        if (data.success && data.rooms) {
          const formattedRooms = data.rooms.map(r => ({
            ...r,
            breakTime: r.break_time || '0h 15m',
            currentMembers: r.current_members || 1,
            maxMembers: r.max_members || 4,
            tasks: r.tasks || []
          }));
          setRoomsList(formattedRooms);
        }
      } catch (err) {
        console.error("Failed to fetch rooms from database:", err);
      }
    };

    fetchRealRooms();

    // Load session history and remove duplicates using a Map based on 'finishedAt' or unique signature
    try {
      const savedHistory = JSON.parse(localStorage.getItem('completed_sessions_history') || '[]');
      const uniqueHistory = Array.from(
        new Map(savedHistory.map(item => [item.finishedAt || `${item.workType}-${item.focusTime}-${item.techniqueName}`, item])).values()
      );
      setSessionHistory(uniqueHistory);
    } catch (err) {
      console.error("Failed to parse session history:", err);
    }

    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('join_request_decision', (data) => {
      if (data.username === myUsername) {
        if (data.approved) {
          setRequestState('ACCEPTED');
        } else {
          setRequestState('REJECTED');
        }
      }
    });

    // Listen for incoming join requests if current user is the host
    socketRef.current.on('incoming_join_request', (data) => {
      // Check if the current user is hosting the room being requested
      const hostedRoom = roomsList.find(r => r.name === data.room && r.host === myUsername);
      if (hostedRoom) {
        setIncomingJoinRequest(data);
      }
    });

    socketRef.current.on('join_request_decision', (data) => {
      if (data.username === myUsername) {
        if (data.approved) {
          setRequestState('ACCEPTED');
        } else {
          setRequestState('REJECTED');
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomsList, myUsername]);

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
    return roomsList.filter((r) => r.host === myUsername).length;
  };

  const enterRoomSession = (room) => {
    if (socketRef.current) {
      socketRef.current.emit('join_room', {
        room: room.name,
        username: myUsername,
      });
    }
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

  const handleConfirmCreate = async () => {
    if (!newRoomName.trim() || newRoomName.length > MAX_ROOM_NAME_LENGTH || !newRoomMaxMembers) return;

    if (getHostedRoomsCount() >= MAX_ROOM_LIMIT) {
      setShowCreateModal(false);
      setShowLimitModal(true);
      return;
    }

    const payload = {
      name: newRoomName.trim(),
      course: newRoomCourse.trim() || 'General Studies',
      host: myUsername,
      privacy: newRoomPrivacy,
      code: newRoomPrivacy === 'private' ? generateRoomCode() : null,
      current_members: 1,
      max_members: parseInt(newRoomMaxMembers, 10),
      technique: 'Pomodoro',
      focus: '1h 00m',
      breakTime: '0h 15m',
      sessions: 1,
      tasks: [{ text: 'Initial goal setup', completed: false }],
      xp: 100,
      coins: 25,
    };

    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success && data.room) {
        const createdRoom = {
          ...data.room,
          breakTime: data.room.break_time || '0h 15m',
          currentMembers: data.room.current_members || 1,
          maxMembers: data.room.max_members || 4,
          tasks: data.room.tasks || []
        };

        setRoomsList((prev) => [createdRoom, ...prev]);

        setNewRoomName('');
        setNewRoomCourse('');
        setNewRoomPrivacy('public');
        setNewRoomMaxMembers('');
        setShowCreateModal(false);

        enterRoomSession(createdRoom);
      }
    } catch (err) {
      console.error("Error creating real room in database:", err);
    }
  };

  const handleConfirmPrivateJoin = () => {
    const code = privateCodeInput.trim().toUpperCase();
    if (!code) {
      setPrivateCodeErr('Please enter a room code.');
      return;
    }

    const matchedRoom = roomsList.find(
      (r) => r.privacy === 'private' && r.code && r.code.toUpperCase() === code
    );

    if (!matchedRoom) {
      setPrivateCodeErr('Invalid room code. Please check and try again.');
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
        approved: approved
      });
    }
    setIncomingJoinRequest(null);
  };

  // Filter helper matching search query AND course dropdown filter
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

  // Requirement 1: All Rooms tab displays ONLY public rooms
  const filteredAllRooms = filterRooms(roomsList.filter((r) => r.privacy.toLowerCase() === 'public'));

  // Requirement 2: My Rooms tab displays rooms created/hosted by the current user
  const filteredMyRooms = filterRooms(roomsList.filter((r) => r.host === myUsername));

  // Requirement 3: History tab displays summary of previous session history
  const filteredHistory = sessionHistory.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      (item.workType && item.workType.toLowerCase().includes(query)) ||
      (item.techniqueName && item.techniqueName.toLowerCase().includes(query))
    );
  });

  const filteredCourseOptions = COURSE_OPTIONS.filter((c) =>
    c.toLowerCase().includes(newRoomCourse.toLowerCase())
  );

  const renderRoomCard = (room, isHistoryTab = false) => {
    if (isHistoryTab) {
      // Render history summary card for past sessions
      return (
        <div
          key={room.id || Math.random()}
          className="bg-theme-surface border-[2px] border-theme-dark rounded-[10px] p-4 flex flex-col gap-3 shadow-sm justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full border-[2px] border-theme-dark bg-theme-muted shrink-0 flex items-center justify-center font-pressstart text-[10px] text-theme-dark">
              ⏳
            </div>
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
              <span className="font-pressstart text-[11px] text-theme-dark truncate">{room.workType || 'Focus Session'}</span>
              <span className="font-pressstart text-[8px] text-theme-primary truncate">
                🛠️ {room.techniqueName || 'Pomodoro'}
              </span>
              <span className="font-pressstart text-[8px] text-theme-dark truncate">
                Duration: <span className="text-theme-primary">{room.focusTime || 25} mins</span>
              </span>
              <span className="font-pressstart text-[7px] text-theme-dark/60 truncate pt-1">
                Completed: {room.finishedAt ? new Date(room.finishedAt).toLocaleDateString() : 'Recent'}
              </span>
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

    const isPublic = room.privacy.toLowerCase() === 'public';
    const privacyStyles = isPublic
      ? 'border-[#315B8C] bg-[#EAF3FF] text-[#315B8C]'
      : 'border-[#6846A5] bg-[#F1EDFF] text-[#6846A5]';

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
                <span>
                  {room.currentMembers}/{room.maxMembers}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            const activeSessionRoom = {
              ...room,
              currentMembers: Math.min(room.currentMembers + 1, room.maxMembers),
            };
            enterRoomSession(activeSessionRoom);
          }}
          className="font-pressstart text-[9px] sm:text-[10px] text-theme-white bg-theme-primary rounded-none border-[2px] border-theme-dark px-8 py-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530] w-full"
        >
          JOIN ROOM
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
              setShowLimitModal(true);
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

          {/* SEARCH BAR & COURSE FILTER GROUP */}
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

              {/* SEARCH CLEAR (X) BUTTON */}
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

            {/* COURSE FILTER BUTTON WITH DROPDOWN */}
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

              {/* COURSE FILTER DROPDOWN */}
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
                  No session history found.
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
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-center relative pb-1">
              <h3 className="font-pressstart text-[14px] text-theme-primary tracking-wide">
                CREATE A ROOM
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {/* 1. ROOM NAME */}
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

              {/* 2. COURSE (SEARCHABLE DROPDOWN & TYPABLE) */}
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

                {/* DROPDOWN MENU */}
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

              {/* 3. PRIVACY */}
              <div className="flex flex-col gap-1.5">
                <label className="font-pressstart text-[9px] text-theme-dark">PRIVACY</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRoomPrivacy('public')}
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

              {/* 4. MAXIMUM MEMBERS */}
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
              Room limit reached! You can only host a maximum of {MAX_ROOM_LIMIT} rooms at a time.
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

      {/* REQUEST TO JOIN MODAL (FOR GUEST) */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl text-center">
            <h3 className="font-pressstart text-[11px] text-theme-primary uppercase">
              {requestState === 'WAITING' && 'REQUEST SENT'}
              {requestState === 'ACCEPTED' && 'ACCEPTED!'}
              {requestState === 'REJECTED' && 'REJECTED'}
            </h3>
            <p className="font-pressstart text-[10px] text-theme-dark leading-relaxed">
              {requestState === 'WAITING' && `Waiting for approval from host (${pendingJoinRoom?.host || 'Host'})...`}
              {requestState === 'ACCEPTED' && 'Host accepted your request! Joining room...'}
              {requestState === 'REJECTED' && 'Host rejected your request.'}
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

      {/* STATISTICS MODAL FOR HISTORY */}
      {showStatsModal && selectedStatsRoom && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[12px] p-6 max-w-md w-full flex flex-col gap-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-pressstart text-[12px] text-theme-primary uppercase text-center">SESSION STATISTICS</h3>
            
            <div className="flex flex-col gap-2 font-pressstart text-[9px] text-theme-dark border-b border-theme-dark/20 pb-3">
              <p>Activity: <span className="text-theme-primary">{selectedStatsRoom.workType || 'Focus Session'}</span></p>
              <p>Technique: <span className="text-theme-primary">{selectedStatsRoom.techniqueName || 'Pomodoro'}</span></p>
              <p>Focus Time: <span className="text-theme-primary">{selectedStatsRoom.focusTime || 25} mins</span></p>
            </div>

            {/* Render checklist tasks */}
            <div className="flex flex-col gap-2">
              <span className="font-pressstart text-[9px] text-theme-dark uppercase">Checklist Tasks:</span>
              {selectedStatsRoom.tasks && selectedStatsRoom.tasks.length > 0 ? (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {selectedStatsRoom.tasks.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-theme-muted/50 rounded-[6px] border border-theme-dark/20 font-pressstart text-[8px]">
                      <span className={task.completed ? "text-green-600" : "text-amber-600"}>
                        {task.completed ? "✔" : "⏳"}
                      </span>
                      <span className={task.completed ? "line-through opacity-60 text-theme-dark" : "text-theme-dark"}>
                        {typeof task === 'string' ? task : task.text}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-pressstart text-[8px] text-theme-dark/60 italic">No checklist items recorded for this session.</p>
              )}
            </div>

            <button
              onClick={() => {
                setShowStatsModal(false);
                setSelectedStatsRoom(null);
              }}
              className="font-pressstart text-[10px] text-theme-white bg-theme-primary border-[2px] border-theme-dark py-2.5 w-full mt-2 cursor-pointer hover:bg-[#d66530]"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </main>
  );
}