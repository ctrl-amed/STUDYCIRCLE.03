import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

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

// --- INITIAL MOCK DATA ---
const initialRoomsData = {
  all: [
    {
      id: 1,
      code: null,
      name: 'Cozy Coding Cave',
      course: 'Computer Science',
      host: 'CodeWizard',
      privacy: 'public',
      currentMembers: 5,
      maxMembers: 6,
      technique: 'Pomodoro',
      focus: '2h 00m',
      breakTime: '0h 30m',
      sessions: 4,
      tasks: [
        { text: 'Setup repo', completed: true },
        { text: 'Write component API', completed: true },
        { text: 'Test routing', completed: false },
        { text: 'Deploy build', completed: false },
      ],
      xp: 350,
      coins: 90,
    },
    {
      id: 2,
      code: 'QCA291',
      name: 'Quiet Calculus',
      course: 'Mathematics & Calculus',
      host: 'MathWhiz',
      privacy: 'private',
      currentMembers: 2,
      maxMembers: 4,
      technique: '52-17',
      focus: '1h 45m',
      breakTime: '0h 17m',
      sessions: 3,
      tasks: [
        { text: 'Derivatives homework', completed: true },
        { text: 'Integration practice', completed: true },
      ],
      xp: 300,
      coins: 75,
    },
    {
      id: 3,
      code: null,
      name: 'Late Night Grind',
      course: 'General Studies',
      host: 'ACORN_HERO',
      privacy: 'public',
      currentMembers: 5,
      maxMembers: 6,
      technique: 'Pomodoro',
      focus: '3h 10m',
      breakTime: '0h 50m',
      sessions: 6,
      tasks: [
        { text: 'Finish essay draft', completed: true },
        { text: 'Read chapter 4', completed: true },
        { text: 'Review notes', completed: true },
      ],
      xp: 550,
      coins: 140,
    },
    {
      id: 4,
      code: null,
      name: 'Design & Chill',
      course: 'Graphic Design & Art',
      host: 'PixelArtist',
      privacy: 'public',
      currentMembers: 3,
      maxMembers: 5,
      technique: '90m',
      focus: '3h 00m',
      breakTime: '1h 00m',
      sessions: 2,
      tasks: [
        { text: 'Wireframe UI', completed: true },
        { text: 'Select color palette', completed: false },
      ],
      xp: 400,
      coins: 100,
    },
    {
      id: 5,
      code: 'LMC714',
      name: 'Language Masterclass',
      course: 'Literature & Language',
      host: 'LinguaFranc',
      privacy: 'private',
      currentMembers: 1,
      maxMembers: 3,
      technique: 'Pomodoro',
      focus: '1h 15m',
      breakTime: '0h 15m',
      sessions: 2,
      tasks: [
        { text: 'Kanji practice', completed: true },
        { text: 'Vocabulary review', completed: false },
      ],
      xp: 200,
      coins: 50,
    },
  ],
  history: [
    {
      id: 101,
      code: null,
      name: 'Morning Focus Hub',
      course: 'Business & Administration',
      host: 'ACORN_HERO',
      privacy: 'public',
      currentMembers: 3,
      maxMembers: 6,
      technique: 'Pomodoro',
      focus: '2h 14m',
      breakTime: '0h 45m',
      sessions: 4,
      tasks: [
        { text: 'Morning emails', completed: true },
        { text: 'Task planning', completed: true },
        { text: 'Bug fixing', completed: true },
        { text: 'Code review', completed: true },
        { text: 'Sprint retrospective', completed: true },
      ],
      xp: 450,
      coins: 120,
    },
  ],
};

export default function UserRooms() {
  const { playerData } = usePlayer();
  const navigate = useNavigate();
  const myUsername = playerData?.username || 'ACORN_HERO';

  // --- STATE MANAGEMENT ---
  const [roomsData, setRoomsData] = useState(initialRoomsData);
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

  // Request Countdown State
  const [requestState, setRequestState] = useState('WAITING');
  const [requestTimer, setRequestTimer] = useState(REQUEST_TIMEOUT_SEC);
  const timerRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);

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
    return roomsData.all.filter((r) => r.host === myUsername).length;
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

  const handleConfirmCreate = () => {
    if (!newRoomName.trim() || newRoomName.length > MAX_ROOM_NAME_LENGTH || !newRoomMaxMembers) return;

    if (getHostedRoomsCount() >= MAX_ROOM_LIMIT) {
      setShowCreateModal(false);
      setShowLimitModal(true);
      return;
    }

    const createdRoom = {
      id: Date.now(),
      code: newRoomPrivacy === 'private' ? generateRoomCode() : null,
      name: newRoomName.trim(),
      course: newRoomCourse.trim() || 'General Studies',
      host: myUsername,
      privacy: newRoomPrivacy,
      currentMembers: 1,
      maxMembers: parseInt(newRoomMaxMembers, 10),
      technique: 'Pomodoro',
      focus: '1h 00m',
      breakTime: '0h 15m',
      sessions: 1,
      tasks: [{ text: 'Initial goal setup', completed: false }],
      xp: 100,
      coins: 25,
    };

    setRoomsData((prev) => ({
      ...prev,
      all: [createdRoom, ...prev.all],
    }));

    setNewRoomName('');
    setNewRoomCourse('');
    setNewRoomPrivacy('public');
    setNewRoomMaxMembers('');
    setShowCreateModal(false);

    enterRoomSession(createdRoom);
  };

  const handleConfirmPrivateJoin = () => {
    const code = privateCodeInput.trim().toUpperCase();
    if (!code) {
      setPrivateCodeErr('Please enter a room code.');
      return;
    }

    const matchedRoom = roomsData.all.find(
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

  const filteredAllRooms = filterRooms(roomsData.all);
  const filteredMyRooms = filterRooms(roomsData.all.filter((r) => r.host === myUsername));
  const filteredHistory = filterRooms(roomsData.history);

  const filteredCourseOptions = COURSE_OPTIONS.filter((c) =>
    c.toLowerCase().includes(newRoomCourse.toLowerCase())
  );

  const renderRoomCard = (room, isHistoryTab = false) => {
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
                  {isPublic ? (
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10s10-4.49 10-10S17.51 2 12 2M4 12c0-.9.16-1.76.43-2.57L6 11l2 2v2l2 2l1 1v1.93c-3.94-.49-7-3.86-7-7.93m14.33 4.87c-.65-.53-1.64-.87-2.33-.87v-1c0-1.1-.9-2-2-2h-4v-3c1.1 0 2-.9 2-2V7h1c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41c0 1.83-.63 3.52-1.67 4.87" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22zm0-2h12V10H6zm7.413-3.588Q14 15.826 14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17t1.413-.587M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6zM6 20V10z" />
                    </svg>
                  )}
                  <span>{room.privacy}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 font-pressstart text-[8px] text-theme-dark">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.4 3.4 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.4 3.4 0 0 0 15 11a3.5 3.5 0 0 0 0-7" />
                </svg>
                <span>
                  {room.currentMembers}/{room.maxMembers}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isHistoryTab ? (
          <button
            onClick={() => {
              setSelectedStatsRoom(room);
              setShowStatsModal(true);
            }}
            className="font-pressstart text-[9px] sm:text-[10px] text-[#FFFFF6] bg-theme-primary rounded-none border-[2px] border-theme-dark px-8 py-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530] w-full"
          >
            STATISTICS
          </button>
        ) : (
          <button
            onClick={() => {
              const activeSessionRoom = {
                ...room,
                currentMembers: Math.min(room.currentMembers + 1, room.maxMembers),
              };
              enterRoomSession(activeSessionRoom);
            }}
            className="font-pressstart text-[9px] sm:text-[10px] text-[#FFFFF6] bg-theme-primary rounded-none border-[2px] border-theme-dark px-8 py-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530] w-full"
          >
            JOIN ROOM
          </button>
        )}
      </div>
    );
  };

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-pressstart text-3xl sm:text-4xl md:text-5xl inline-block bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent w-fit">
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
          className="font-pressstart text-[9px] sm:text-[10px] bg-theme-primary text-[#FFFFF6] rounded-none border-[2px] border-theme-dark px-3.5 py-2.5 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530]"
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
                  ? 'border-[#E16F37] text-[#E16F37]'
                  : 'border-transparent text-theme-dark hover:text-[#E16F37]'
              }`}
            >
              ALL ROOMS
            </button>
            <button
              onClick={() => setActiveTab('my-rooms')}
              className={`font-pressstart text-[10px] pb-1 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'my-rooms'
                  ? 'border-[#E16F37] text-[#E16F37]'
                  : 'border-transparent text-theme-dark hover:text-[#E16F37]'
              }`}
            >
              MY ROOMS
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`font-pressstart text-[10px] pb-1 border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'history'
                  ? 'border-[#E16F37] text-[#E16F37]'
                  : 'border-transparent text-theme-dark hover:text-[#E16F37]'
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
                className="w-full bg-theme-surface border-[2px] border-theme-dark rounded-[8px] pl-9 pr-8 py-2 font-pressstart text-[9px] text-theme-dark placeholder-[#3D2013]/50 focus:outline-none focus:ring-1 focus:ring-[#FD923E]"
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
                        ? 'bg-theme-primary text-[#FFFFF6]'
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
                          ? 'bg-theme-primary text-[#FFFFF6]'
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
                  No rooms found.
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
            <div className="text-[20px] text-theme-primary mb-[-8px]">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22zm0-2h12V10H6zm7.413-3.588Q14 15.826 14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17t1.413-.587M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6zM6 20V10z" />
              </svg>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark tracking-wider">
                JOIN PRIVATE
              </h3>
              <p className="font-pressstart text-[7px] sm:text-[8px] text-theme-dark/70">
                Enter the room code to join.
              </p>
            </div>

            <div className="w-full flex flex-col gap-1.5">
              <input
                type="text"
                value={privateCodeInput}
                onChange={(e) => {
                  setPrivateCodeInput(e.target.value);
                  setPrivateCodeErr('');
                }}
                placeholder="ABCD123"
                className={`w-full bg-theme-muted border-[2px] rounded-[8px] p-3 font-pressstart text-[10px] text-center text-theme-dark placeholder-[#3D2013]/40 focus:outline-none tracking-widest uppercase transition-colors duration-150 ${
                  privateCodeErr ? 'border-theme-danger' : 'border-theme-dark'
                }`}
              />
              {privateCodeErr && (
                <p className="font-pixel text-[18px] sm:text-[20px] text-theme-danger text-center mt-0.5">
                  ✘ {privateCodeErr}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <button
                onClick={() => {
                  setPrivateCodeErr('');
                  setShowJoinModal(false);
                }}
                className="font-pressstart text-[8px] sm:text-[9px] text-theme-dark bg-theme-surface border-[2px] border-theme-dark py-2.5 transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmPrivateJoin}
                className="font-pressstart text-[8px] sm:text-[9px] text-[#FFFFF6] bg-theme-primary border-[2px] border-theme-dark py-2.5 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530]"
              >
                JOIN
              </button>
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
                className={`font-pressstart text-[8px] sm:text-[9px] text-[#FFFFF6] bg-theme-primary border-[2px] border-theme-dark py-2.5 transition-all duration-150 retro-shadow ${
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
            <div className="flex items-center justify-between border-b border-theme-dark/20 pb-3">
              <span className="font-pressstart text-[11px] text-theme-danger uppercase">LIMIT REACHED</span>
              <button
                onClick={() => setShowLimitModal(false)}
                className="font-pressstart text-[12px] text-theme-dark hover:text-theme-primary cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-2 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-theme-danger/10 border-[2px] border-theme-danger flex items-center justify-center text-theme-danger font-pressstart text-[18px]">
                !
              </div>
              <p className="font-pressstart text-[9px] text-theme-dark leading-relaxed">
                Room limit reached! You can only host a maximum of {MAX_ROOM_LIMIT} rooms at a time.
              </p>
            </div>

            <button
              onClick={() => setShowLimitModal(false)}
              className="font-pressstart text-[10px] text-[#FFFFF6] bg-theme-primary border-[2px] border-theme-dark py-2.5 hover:bg-[#d66530] transition-colors retro-shadow cursor-pointer uppercase w-full"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* STATISTICS MODAL */}
      {showStatsModal && selectedStatsRoom && (
        <div className="fixed inset-0 bg-theme-dark/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-6 sm:p-8 w-full max-w-lg shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center relative pb-2">
              <h3 className="font-pressstart text-[14px] text-theme-primary tracking-wide">
                STATISTICS: {selectedStatsRoom.name}
              </h3>
            </div>

            <div className="flex flex-col gap-4 font-pressstart text-[9px] text-theme-dark">
              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark">COURSE</span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-primary">
                  {selectedStatsRoom.course || 'General Studies'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pixel text-[20px] text-theme-dark">STUDY TECHNIQUE</span>
                <span className="font-pixel text-[20px] text-theme-dark">
                  {selectedStatsRoom.technique}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pixel text-[20px] text-theme-dark">FOCUS TIME</span>
                <span className="font-pixel text-[20px] text-theme-dark">
                  {selectedStatsRoom.focus}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pixel text-[20px] text-theme-dark">BREAK TIME</span>
                <span className="font-pixel text-[20px] text-theme-dark">
                  {selectedStatsRoom.breakTime}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-solid border-theme-dark/40">
                <span className="font-pixel text-[20px] text-theme-dark">NUMBER OF SESSIONS</span>
                <span className="font-pixel text-[20px] text-theme-dark">
                  {selectedStatsRoom.sessions} Sessions
                </span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-pixel text-[20px] text-theme-dark">TASKS COMPLETED</span>
                <span className="font-pixel text-[20px] text-theme-dark">
                  {selectedStatsRoom.tasks.filter((t) => t.completed).length} /{' '}
                  {selectedStatsRoom.tasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2 pb-3 border-b-[2px] border-solid border-theme-dark">
                <ul className="flex flex-col text-[8px] list-none pl-2 m-0 gap-1">
                  {selectedStatsRoom.tasks.map((t, idx) => (
                    <li key={idx} className="flex justify-between items-center">
                      <span className={t.completed ? 'line-through text-theme-dark/60' : ''}>
                        {t.text}
                      </span>
                      {t.completed && (
                        <span className="text-theme-primary font-pixel text-[20px]">✓</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center pb-3 border-b-[1.5px] border-dashed border-theme-dark/30">
                <span className="font-pixel text-[20px] text-theme-dark">XP EARNED</span>
                <span className="font-pixel text-[20px] text-[#7E57C2]">
                  {selectedStatsRoom.xp} XP
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-pixel text-[20px] text-theme-dark">COINS EARNED</span>
                <span className="font-pixel text-[20px] text-theme-primary">
                  {selectedStatsRoom.coins} coins
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => setShowStatsModal(false)}
                className="font-pressstart text-[9px] sm:text-[10px] text-[#FFFFF6] bg-theme-primary border-[2px] border-theme-dark px-8 py-3 transition-all duration-150 retro-shadow cursor-pointer hover:bg-[#d66530] w-full"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST TO JOIN MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[12px] p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl text-center">
            <div className="flex items-center justify-between border-b border-theme-dark/20 pb-3">
              <span className="font-pressstart text-[11px] text-theme-primary uppercase">
                {requestState === 'WAITING' && 'REQUEST SENT'}
                {requestState === 'EXPIRED' && 'REQUEST EXPIRED'}
                {requestState === 'ACCEPTED' && 'ACCEPTED!'}
                {requestState === 'REJECTED' && 'REJECTED'}
              </span>
              <button
                onClick={() => setShowRequestModal(false)}
                className="font-pressstart text-[12px] text-theme-dark hover:text-theme-primary cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-2 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-theme-primary/10 border-[2px] border-theme-primary flex items-center justify-center text-theme-primary font-pressstart text-[16px]">
                {requestState === 'WAITING' && '⏳'}
                {requestState === 'EXPIRED' && '⏰'}
                {requestState === 'ACCEPTED' && '✓'}
                {requestState === 'REJECTED' && '✕'}
              </div>

              <p className="font-pressstart text-[10px] text-theme-dark leading-relaxed">
                {requestState === 'WAITING' &&
                  `Waiting for approval from host (${pendingJoinRoom?.host || 'Host'})...`}
                {requestState === 'EXPIRED' && 'Request to join expired.'}
                {requestState === 'ACCEPTED' && 'Host accepted your request!\nJoining room...'}
                {requestState === 'REJECTED' && 'Host rejected your request.'}
              </p>

              {requestState === 'WAITING' && (
                <span className="font-pressstart text-[9px] text-theme-dark/60">
                  Expires in {requestTimer}s
                </span>
              )}
            </div>

            {requestState === 'WAITING' && (
              <button
                onClick={() => setShowRequestModal(false)}
                className="font-pressstart text-[10px] text-theme-dark bg-theme-muted hover:bg-theme-dark hover:text-theme-surface border-[2px] border-theme-dark py-2.5 transition-colors retro-shadow cursor-pointer uppercase w-full"
              >
                CANCEL REQUEST
              </button>
            )}

            {requestState === 'ACCEPTED' && (
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  if (pendingJoinRoom) {
                    const activeSessionRoom = {
                      ...pendingJoinRoom,
                      currentMembers: Math.min(
                        pendingJoinRoom.currentMembers + 1,
                        pendingJoinRoom.maxMembers
                      ),
                    };
                    enterRoomSession(activeSessionRoom);
                  }
                }}
                className="font-pressstart text-[10px] text-[#FFFFF6] bg-green-600 border-[2px] border-theme-dark py-2.5 transition-colors retro-shadow cursor-pointer uppercase w-full"
              >
                JOIN ROOM
              </button>
            )}

            {(requestState === 'EXPIRED' || requestState === 'REJECTED') && (
              <button
                onClick={() => setShowRequestModal(false)}
                className="font-pressstart text-[10px] text-[#FFFFF6] bg-theme-primary border-[2px] border-theme-dark py-2.5 hover:bg-[#d66530] transition-colors retro-shadow cursor-pointer uppercase w-full"
              >
                CLOSE
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}