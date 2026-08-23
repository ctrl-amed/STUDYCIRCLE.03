import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { usePlayer } from '../context/PlayerContext';

// Initial Mock Data Sets
const initialFriendsData = [
  { id: "f1", username: "StudyOwl", level: 12, status: "GROUPED", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Owl" },
  { id: "f2", username: "PixelPanda", level: 8, status: "ONLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Panda" },
  { id: "f3", username: "FocusCat", level: 15, status: "OFFLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Cat" },
  { id: "f4", username: "ByteBear", level: 20, status: "ONLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ByteBear" },
  { id: "f5", username: "CozyFox", level: 11, status: "GROUPED", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=CozyFox" },
  { id: "f6", username: "RetroBunny", level: 5, status: "OFFLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=RetroBunny" },
  { id: "f7", username: "ChaiShiba", level: 18, status: "ONLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ChaiShiba" },
  { id: "f8", username: "LoFiFrog", level: 9, status: "OFFLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=LoFiFrog" },
  { id: "f9", username: "PixelPenguin", level: 14, status: "GROUPED", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelPenguin" },
  { id: "f10", username: "ZenKoala", level: 22, status: "ONLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ZenKoala" }
];

const initialAddFriendsData = [
  { id: "p1", username: "ChaiMaster", level: 4, streak: 3, focusTime: "12h", sessions: 18, requested: false, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Chai" },
  { id: "p2", username: "ByteNinja", level: 9, streak: 14, focusTime: "45h", sessions: 52, requested: false, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Ninja" },
  { id: "p3", username: "ZenCoder", level: 21, streak: 30, focusTime: "120h", sessions: 110, requested: false, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Zen" },
  { id: "p4", username: "RetroFox", level: 6, streak: 5, focusTime: "18h", sessions: 22, requested: false, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Fox" }
];

const initialRequestsData = [
  { id: "r1", username: "CozyBear", level: 11, timeAgo: "TODAY", status: null, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Bear" },
  { id: "r2", username: "LoFiBunny", level: 7, timeAgo: "YESTERDAY", status: null, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Bunny" },
  { id: "r3", username: "NekoGamer", level: 19, timeAgo: "3 DAYS AGO", status: null, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Neko" }
];

const initialNotificationData = [
  { id: "f1", username: "StudyOwl", level: 12, status: "GROUPED", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Owl", lastMessage: "Awesome! Let's focus for 45 mins. 🚀", timeAgo: "1m", isUnread: true },
  { id: "f2", username: "PixelPanda", level: 8, status: "ONLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Panda", lastMessage: "Almost done, just working on question 3.", timeAgo: "15m", isUnread: true },
  { id: "f3", username: "FocusCat", level: 15, status: "OFFLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Cat", lastMessage: "Sounds good! Catch you later.", timeAgo: "2h", isUnread: false },
  { id: "f4", username: "ByteBear", level: 20, status: "ONLINE", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ByteBear", lastMessage: "Let me know when you start the timer.", timeAgo: "1d", isUnread: false },
  { id: "f5", username: "CozyFox", level: 11, status: "GROUPED", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=CozyFox", lastMessage: "Hey! Joining the group room now.", timeAgo: "2d", isUnread: false }
];

const initialChatHistory = {
  f1: [
    { sender: "them", text: "Hey! Ready for our study session?" },
    { sender: "me", text: "Yep, joining the room now!" },
    { sender: "them", text: "Awesome! Let's focus for 45 mins. 🚀" }
  ],
  f2: [
    { sender: "them", text: "Hey Acorn! Did you finish the stats assignment?" },
    { sender: "me", text: "Almost done, just working on question 3." }
  ],
  f3: [
    { sender: "them", text: "Catch you later for retro games!" },
    { sender: "me", text: "Sounds good! Catch you later." }
  ]
};

export default function Header({ onMobileToggle, isRoomState = false }) {
  const { playerData } = usePlayer();
  const navigate = useNavigate();

  // Modals visibility state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLeaveRoomModal, setShowLeaveRoomModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Emoji picker & Scroll state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Data states
  const [myFriends, setMyFriends] = useState(initialFriendsData);
  const [addFriends, setAddFriends] = useState(initialAddFriendsData);
  const [requests, setRequests] = useState(initialRequestsData);
  const [notifications, setNotifications] = useState(initialNotificationData);
  const [chatHistory, setChatHistory] = useState(initialChatHistory);

  // Active selections & tab state
  const [activeFriendsTab, setActiveFriendsTab] = useState('my-friends');
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [currentChatFriend, setCurrentChatFriend] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [pendingRemoveFriend, setPendingRemoveFriend] = useState(null);

  // DOM Refs
  const chatMessagesContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  // Auto Scroll Chat to Bottom on New Message
  useEffect(() => {
    if (showChatModal && chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatHistory, showChatModal, currentChatFriend]);

  // Handle Scroll Detection inside Chat Window
  const handleChatScroll = () => {
    const container = chatMessagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottomBtn(distanceFromBottom > 40);
  };

  const scrollToBottom = () => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTo({
        top: chatMessagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Insert Emoji from emoji-picker-react at Cursor Position
  const handleEmojiSelect = (emojiData) => {
    const emoji = emojiData.emoji;
    const input = chatInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const updatedText = chatInputText.substring(0, start) + emoji + chatInputText.substring(end);
      setChatInputText(updatedText);

      setTimeout(() => {
        input.focus();
        const newPos = start + emoji.length;
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setChatInputText((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // Unread badge count
  const unreadNotifCount = notifications.filter((n) => n.isUnread).length;

  // Actions
  const handleOpenChat = (friendId) => {
    const friend = myFriends.find((f) => f.id === friendId) || notifications.find((n) => n.id === friendId);
    if (!friend) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === friendId ? { ...n, isUnread: false } : n))
    );

    setCurrentChatFriend(friend);
    setShowNotifModal(false);
    setShowEmojiPicker(false);
    setShowChatModal(true);
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInputText.trim() || !currentChatFriend) return;

    const messageText = chatInputText.trim();
    const friendId = currentChatFriend.id;

    setChatHistory((prev) => ({
      ...prev,
      [friendId]: [...(prev[friendId] || []), { sender: 'me', text: messageText }],
    }));

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === friendId ? { ...n, lastMessage: messageText, timeAgo: 'Just now' } : n
      )
    );

    setChatInputText('');
    setShowEmojiPicker(false);
  };

  const handleRequestAddFriend = (playerId) => {
    setAddFriends((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, requested: true } : p))
    );
  };

  const handleFriendRequestAction = (reqId, action) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === reqId ? { ...r, status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' } : r
      )
    );

    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    }, 1000);
  };

  const [removingFriendId, setRemovingFriendId] = useState(null);
const handleConfirmRemoveFriend = () => {
  if (!pendingRemoveFriend) return;

  const targetId = pendingRemoveFriend.id;

  // 1. Close modal immediately
  setShowRemoveModal(false);

  // 2. Mark this friend as being removed to trigger the CSS fade animation
  setRemovingFriendId(targetId);

  // 3. Wait for the 300ms transition to complete before removing from state
  setTimeout(() => {
    setMyFriends((prev) => prev.filter((f) => f.id !== targetId));
    setRemovingFriendId(null);
    setPendingRemoveFriend(null);
  }, 300);
};

  return (
    <>
      <header className="relative z-10 pt-4 sm:pt-6 flex items-center justify-between md:justify-end w-full px-3 sm:px-6 shrink-0">
        {/* MOBILE TOP-LEFT TOGGLE BUTTON */}
        <button
          onClick={onMobileToggle}
          aria-label="Open Mobile Navigation"
          className="md:hidden bg-[#FEF4E0] border-2 border-[#3D2013] text-[#3D2013] h-8 sm:h-11 w-8 sm:w-11 flex items-center justify-center rounded-[8px] sm:rounded-[10px] shadow-sm hover:bg-[#FDE4D0] transition-colors focus:outline-none cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* UPPER RIGHT HEADER CONTROLS */}
        <div className="flex items-center gap-1 sm:gap-3 flex-nowrap justify-end max-w-full py-2 px-1">
          {/* COIN COUNTER */}
          <div className="h-8 sm:h-11 bg-[#FEF4E0] border-2 border-[#3D2013] px-1.5 sm:px-3 rounded-[30px] flex items-center justify-center gap-1 sm:gap-2 shrink-0 shadow-sm">
            <img src="media/coin_logo.png" alt="Coin" className="w-3.5 h-3.5 sm:w-6 sm:h-6 object-contain shrink-0" />
            <span className="font-pressstart text-[8px] sm:text-[12px] text-[#3D2013]">
              {playerData.coins.toLocaleString()}
            </span>
          </div>

          {/* NOTIFICATION BUTTON */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowNotifModal(!showNotifModal)}
              title="Notifications"
              className="h-8 sm:h-11 bg-[#FEF4E0] border-2 border-[#3D2013] px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center transition-all duration-150 retro-shadow cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-[#E87339]" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" fillRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155M3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19z" clipRule="evenodd" />
              </svg>
            </button>

            {/* NOTIFICATION BADGE */}
            {unreadNotifCount > 0 && (
              <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-[#E87339] border-[1.5px] sm:border-2 border-[#3D2013] text-[#FFFFF6] font-pressstart text-[6px] sm:text-[9px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-20 pointer-events-none">
                {unreadNotifCount}
              </div>
            )}

            {/* NOTIFICATION POPOVER */}
            {showNotifModal && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 z-50">
                <div className="bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[12px] p-3 sm:p-4 w-full sm:w-[360px] h-[70vh] sm:h-[420px] max-h-[500px] shadow-2xl flex flex-col gap-3 text-left">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-[#3D2013]/20 shrink-0">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#E87339]" viewBox="0 0 24 24">
                        <path d="M0 0h24v24H0z" fill="none" />
                        <path fill="currentColor" fillRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155M3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19z" clipRule="evenodd" />
                      </svg>
                      <h3 className="font-pressstart text-[10px] sm:text-[12px] text-[#3D2013]">MESSAGES</h3>
                    </div>
                    <button onClick={() => setShowNotifModal(false)} className="text-[#3D2013] hover:text-[#A53914] font-pressstart text-[12px] p-1 cursor-pointer">✕</button>
                  </div>

                  <div className="relative w-full shrink-0">
                    <input
                      type="text"
                      value={notifSearchQuery}
                      onChange={(e) => setNotifSearchQuery(e.target.value)}
                      placeholder="Search friends..."
                      className="w-full bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[8px] px-2.5 py-1.5 font-pressstart text-[8px] sm:text-[9px] text-[#3D2013] focus:outline-none placeholder-[#3D2013]/50"
                    />
                  </div>

                  <div className="overflow-y-auto pr-1 flex-1 min-h-0 flex flex-col gap-2">
                    {notifications
                      .filter((n) => n.username.toLowerCase().includes(notifSearchQuery.toLowerCase()))
                      .map((friend) => {
                        let statusBg = "bg-[#788D55]";
                        if (friend.status === "GROUPED") statusBg = "bg-[#E87339]";
                        if (friend.status === "OFFLINE") statusBg = "bg-[#6F655D]";

                        return (
                          <div
                            key={friend.id}
                            onClick={() => handleOpenChat(friend.id)}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-[8px] cursor-pointer hover:bg-[#F3D3A8] transition-all duration-200 ${
                              friend.isUnread ? 'bg-[#FDE4D0] border-2 border-[#E87339] shadow-sm' : 'bg-[#FEF4E0] border-2 border-[#3D2013]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="relative w-9 h-9 shrink-0">
                                <img src={friend.avatar} alt={friend.username} className="w-full h-full rounded-full border-2 border-[#3D2013] object-cover bg-[#FEF4E0]" />
                                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-[1.5px] border-[#3D2013] ${statusBg}`} />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-pressstart text-[9px] text-[#3D2013] truncate">{friend.username}</span>
                                <span className="font-pixel text-[13px] text-[#3D2013]/70 truncate leading-tight">{friend.lastMessage}</span>
                              </div>
                            </div>
                            <span className="font-pressstart text-[7px] text-[#3D2013]/60 shrink-0">{friend.timeAgo}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FRIENDS BUTTON */}
          <button
            onClick={() => setShowFriendsModal(true)}
            title="Friends"
            className="h-8 sm:h-11 bg-[#FEF4E0] border-2 border-[#3D2013] px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-150 retro-shadow cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-[#E87339]" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="currentColor" d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.69 6.69 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.19 5.19 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8" />
            </svg>
            <span className="font-pressstart text-[8px] sm:text-[12px] text-[#3D2013]">{myFriends.length}</span>
          </button>

          {/* STREAK COUNTER */}
          <div className="h-8 sm:h-11 bg-[#FEF4E0] border-2 border-[#3D2013] px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-0.5 sm:gap-1.5 shrink-0 shadow-sm">
            <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-[#ED8C00]" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.8 9.4Q11 7 12 3q2.5 5 0 10q3 0 5-2.9a7 7 0 1 1-9.2-.7" />
            </svg>
            <span className="font-pressstart text-[8px] sm:text-[12px] text-[#3D2013]">
              {playerData.streakDays}D
            </span>
          </div>

          {/* ACTION BUTTONS (ROOM vs SOLO) */}
          {isRoomState ? (
            <>
              <Link
                to="/kitsuai"
                className="h-8 sm:h-11 bg-[#FEF4E0] border-2 border-[#3D2013] transition-colors px-2 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer no-underline text-[#3D2013] shrink-0 hover:bg-[#FDE4D0]"
              >
                <img src="media/kitsu_logo.png" alt="Kitsu AI Logo" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                <span className="nav-label font-pressstart text-[8px] sm:text-[10px]">KitsuAI</span>
              </Link>

              <button
                onClick={() => setShowLeaveRoomModal(true)}
                title="Leave Room"
                className="h-8 sm:h-11 bg-[#A53914] border-2 border-[#3D2013] px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-150 shrink-0 cursor-pointer hover:bg-[#832c0f]"
              >
                <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-[#FEF4E0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-pressstart text-[8px] sm:text-[11px] text-[#FEF4E0] hidden sm:inline">LEAVE ROOM</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Logout"
              className="h-8 sm:h-11 bg-[#A53914] border-2 border-[#3D2013] px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-150 retro-shadow cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-[#FEF4E0]" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M9 20.75H6a2.64 2.64 0 0 1-2.75-2.53V5.78A2.64 2.64 0 0 1 6 3.25h3a.75.75 0 0 1 0 1.5H6a1.16 1.16 0 0 0-1.25 1v12.47a1.16 1.16 0 0 0 1.25 1h3a.75.75 0 0 1 0 1.5Zm7-4a.74.74 0 0 1-.53-.22a.75.75 0 1 1 0-1.06L18.94 12l-3.47-3.47a.75.75 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.74.74 0 0 1-.53.22" />
                <path fill="currentColor" d="M20 12.75H9a.75.75 0 0 1 0-1.5h11a.75.75 0 0 1 0 1.5" />
              </svg>
              <span className="font-pressstart text-[8px] sm:text-[11px] text-[#FEF4E0] hidden sm:inline">SIGN OUT</span>
            </button>
          )}
        </div>
      </header>

      {/* LEAVE ROOM MODAL */}
      {showLeaveRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2013]/50">
          <div className="bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col gap-4 text-center">
            <h3 className="font-pressstart text-[14px] text-[#3D2013]">Leave Room</h3>
            <p className="font-pressstart text-[10px] text-[#3D2013]/80 leading-normal">Are you sure you want to leave this study room?</p>
            <div className="flex gap-3 justify-center mt-2">
              <button onClick={() => navigate('/dashboard')} className="bg-[#A53914] text-[#FEF4E0] border-2 border-[#3D2013] px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:bg-[#832c0f]">Leave</button>
              <button onClick={() => setShowLeaveRoomModal(false)} className="bg-[#FAE9CE] text-[#3D2013] border-2 border-[#3D2013] px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:bg-[#f3d3a8]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2013]/50">
          <div className="bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col gap-4 text-center">
            <h3 className="font-pressstart text-[14px] text-[#3D2013]">Sign Out</h3>
            <p className="font-pressstart text-[10px] text-[#3D2013]/80 leading-normal">Are you sure you want to sign out?</p>
            <div className="flex gap-3 justify-center mt-2">
              <button onClick={() => navigate('/auth#login')} className="bg-[#A53914] text-[#FEF4E0] border-2 border-[#3D2013] px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:bg-[#832c0f]">Yes</button>
              <button onClick={() => setShowLogoutModal(false)} className="bg-[#FAE9CE] text-[#3D2013] border-2 border-[#3D2013] px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:bg-[#f3d3a8]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* FRIENDS MODAL */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2013]/50">
          <div className="bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[12px] p-4 sm:p-6 w-[720px] max-w-[95vw] h-[580px] max-h-[90vh] shadow-xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#E87339]" viewBox="0 0 24 24">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="currentColor" d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.69 6.69 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.19 5.19 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8" />
                </svg>
                <h3 className="font-pressstart text-[14px] text-[#3D2013]">Friends</h3>
              </div>
              <button onClick={() => setShowFriendsModal(false)} className="text-[#3D2013] hover:text-[#A53914] font-pressstart text-[14px] cursor-pointer">✕</button>
            </div>

            {/* TAB CONTROLS */}
            <div className="flex items-center gap-2 p-1.5 rounded-[8px] shrink-0">
              {['my-friends', 'add-friends', 'requests'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFriendsTab(tab)}
                  className={`flex-1 min-w-0 h-11 min-h-[44px] px-1 flex items-center justify-center text-center font-pressstart text-[8px] sm:text-[10px] leading-tight rounded-[6px] transition-all cursor-pointer ${
                    activeFriendsTab === tab
                      ? 'bg-[#FDE4D0] text-[#E87339] border-2 border-transparent'
                      : 'bg-[#FAE9CE] text-[#3D2013] border-2 border-[#3D2013]'
                  }`}
                >
                  {tab.replace('-', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            <div className="overflow-y-auto pr-1 flex-1 min-h-0">
              {/* TAB 1: MY FRIENDS */}
{/* TAB 1: MY FRIENDS */}
{activeFriendsTab === 'my-friends' && (
  <div className="flex flex-col gap-2.5">
    {myFriends.length === 0 ? (
      <div className="text-center font-pressstart text-[10px] text-[#3D2013]/60 py-6">No friends added yet.</div>
    ) : (
      myFriends.map((friend) => {
        let statusBg = "bg-[#788D55]";
        let statusTextColor = "text-[#788D55]";
        if (friend.status === "GROUPED") {
          statusBg = "bg-[#E87339]";
          statusTextColor = "text-[#E87339]";
        } else if (friend.status === "OFFLINE") {
          statusBg = "bg-[#6F655D]";
          statusTextColor = "text-[#6F655D]";
        }

        const isRemoving = removingFriendId === friend.id;

        return (
          <div 
            key={friend.id} 
            className={`flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-0 items-center bg-[#FEF4E0] border-2 border-[#3D2013] p-2.5 transition-all duration-300 ${
              isRemoving ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 w-full">
              <div className="relative w-9 h-9 shrink-0">
                <img src={friend.avatar} alt={friend.username} className="w-full h-full rounded-full border-2 border-[#3D2013] object-cover bg-[#FEF4E0]" />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-[1.5px] border-[#3D2013] ${statusBg}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-pressstart text-[10px] text-[#3D2013] truncate">{friend.username}</span>
                <span className="font-pressstart text-[8px] text-[#3D2013]/70">LVL {friend.level}</span>
              </div>
            </div>

            <div className="flex items-center justify-between w-full sm:contents">
              <div className="flex justify-start sm:justify-center">
                <span className={`font-pressstart text-[8px] ${statusTextColor}`}>{friend.status}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <button onClick={() => { setShowFriendsModal(false); handleOpenChat(friend.id); }} title="Message" className="p-1.5 text-[#3D2013] hover:text-[#FD923E] cursor-pointer">
                  💬
                </button>
                <button onClick={() => { setPendingRemoveFriend(friend); setShowRemoveModal(true); }} title="Remove" className="p-1.5 text-[#3D2013] hover:text-[#A53914] cursor-pointer">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
)}

              {/* TAB 2: ADD FRIENDS (FULL CARD DETAILS) */}
              {activeFriendsTab === 'add-friends' && (
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="w-full bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[8px] px-3 py-2 font-pressstart text-[10px] text-[#3D2013] focus:outline-none placeholder-[#3D2013]/50"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {addFriends
                      .filter((p) => p.username.toLowerCase().includes(addSearchQuery.toLowerCase()))
                      .map((player) => (
                        <div key={player.id} className="bg-[#FEF4E0] border-[2px] border-[#3D2013] p-2.5 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <img src={player.avatar} alt={player.username} className="w-7 h-7 rounded-full border-[1.5px] border-[#3D2013] bg-[#FEF4E0] object-cover shrink-0" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-pressstart text-[9px] text-[#3D2013] break-words whitespace-normal leading-tight">{player.username}</span>
                                <span className="font-pressstart text-[7px] text-[#3D2013]/70">LVL {player.level}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRequestAddFriend(player.id)}
                              disabled={player.requested}
                              className={`px-2 py-1.5 rounded-[6px] font-pressstart text-[7px] border-[1.5px] border-[#3D2013] cursor-pointer transition-colors shrink-0 ${
                                player.requested ? 'bg-[#6F655D] text-[#FEF4E0] cursor-not-allowed opacity-80' : 'bg-[#E87339] text-[#FEF4E0] hover:bg-[#d0622c]'
                              }`}
                            >
                              {player.requested ? 'REQUESTED' : 'REQUEST'}
                            </button>
                          </div>

                          <div className="border-t border-[#3D2013]/20"></div>

                          {/* STATS BADGES GRID */}
                          <div className="grid grid-cols-3 divide-x divide-[#3D2013]/20 font-pixel text-[#3D2013]">
                            <div className="flex items-center justify-center gap-1 px-1">
                              <svg className="w-3.5 h-3.5 text-[#ED8C00] shrink-0" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.8 9.4Q11 7 12 3q2.5 5 0 10q3 0 5-2.9a7 7 0 1 1-9.2-.7" />
                              </svg>
                              <div className="flex flex-col text-left">
                                <span className="text-[15px] leading-none">{player.streak}</span>
                                <span className="text-[10px] text-[#3D2013]/60 leading-tight mt-0.5">STREAK</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-center gap-1 px-1">
                              <svg className="w-3.5 h-3.5 text-[#E87339] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5l3 3m6-3a9 9 0 1 1-18 0a9 9 0 0 1 18 0" />
                              </svg>
                              <div className="flex flex-col text-left">
                                <span className="text-[15px] leading-none">{player.focusTime}</span>
                                <span className="text-[10px] text-[#3D2013]/60 leading-tight mt-0.5">FOCUS</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-center gap-1 px-1">
                              <svg className="w-3.5 h-3.5 text-[#E87339] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none" />
                                <g fill="currentColor">
                                  <path d="M12.75 2a.75.75 0 0 0-.75-.75C6.063 1.25 1.25 6.063 1.25 12S6.063 22.75 12 22.75S22.75 17.937 22.75 12a.75.75 0 0 0-1.5 0A9.25 9.25 0 1 1 12 2.75a.75.75 0 0 0 .75-.75" />
                                  <path d="M11.735 6.95a.75.75 0 0 0-.884-.585A5.752 5.752 0 0 0 12 17.75a5.75 5.75 0 0 0 5.635-4.601a.75.75 0 0 0-1.47-.299A4.252 4.252 0 0 1 7.75 12a4.25 4.25 0 0 1 3.4-4.165a.75.75 0 0 0 .585-.885" />
                                  <path d="M14.5 8.44V5.62a2 2 0 0 1 .586-1.414l2.134-2.134a.75.75 0 0 1 1.28.53V5.44l.059.059h2.837a.75.75 0 0 1 .53 1.28l-2.133 2.134a2 2 0 0 1-1.414.586H15.56l-3.03 3.03a.75.75 0 1 1-1.061-1.06z" />
                                </g>
                              </svg>
                              <div className="flex flex-col text-left">
                                <span className="text-[15px] leading-none">{player.sessions}</span>
                                <span className="text-[10px] text-[#3D2013]/60 leading-tight mt-0.5">SESSIONS</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 3: REQUESTS */}
{/* TAB 3: REQUESTS */}
{activeFriendsTab === 'requests' && (
  <div className="flex flex-col gap-2.5">
    {requests.length === 0 ? (
      <div className="text-center font-pressstart text-[10px] text-[#3D2013]/60 py-6">No friend requests.</div>
    ) : (
      requests.map((req) => {
        const isHandled = Boolean(req.status);

        return (
          <div
            key={req.id}
            className={`flex items-center justify-between bg-[#FEF4E0] border-2 border-[#3D2013] p-2.5 transition-all duration-500 ease-in-out ${
              isHandled
                ? 'opacity-0 scale-95 delay-500 pointer-events-none'
                : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={req.avatar} alt={req.username} className="w-8 h-8 rounded-full border-2 border-[#3D2013] bg-[#FEF4E0] object-cover shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-pressstart text-[10px] text-[#3D2013] truncate">{req.username}</span>
                <span className="font-pressstart text-[8px] text-[#3D2013]/70">LVL {req.level}</span>
              </div>
            </div>

            <span className="font-pressstart text-[8px] text-[#3D2013]/60 shrink-0 px-2">{req.timeAgo}</span>

            <div className="flex items-center gap-1.5 shrink-0">
              {req.status === 'ACCEPTED' ? (
                <span className="font-pressstart text-[9px] text-[#788D55] animate-pulse">ACCEPTED</span>
              ) : req.status === 'REJECTED' ? (
                <span className="font-pressstart text-[9px] text-[#A53914] animate-pulse">REJECTED</span>
              ) : (
                <>
                  <button onClick={() => handleFriendRequestAction(req.id, 'ACCEPT')} className="p-1 text-[#788D55] hover:text-[#637545] cursor-pointer font-bold">✓</button>
                  <button onClick={() => handleFriendRequestAction(req.id, 'REJECT')} className="p-1 text-[#A53914] hover:text-[#832c0f] cursor-pointer font-bold">✕</button>
                </>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>
)}
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL WITH REACT EMOJI PICKER & FLOATING SCROLL BUTTON */}
      {showChatModal && currentChatFriend && (
        <div className="fixed bottom-4 right-4 z-50 p-0">
          <div className="bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[10px] max-w-md w-80 sm:w-96 shadow-xl flex flex-col overflow-hidden relative">
            {/* CHAT HEADER */}
            <div className="flex items-center justify-between p-3 bg-[#FAE9CE] border-b-2 border-[#3D2013]">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={currentChatFriend.avatar} alt="PFP" className="w-8 h-8 rounded-full border-2 border-[#3D2013] object-cover bg-[#FEF4E0] shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-pressstart text-[11px] text-[#3D2013] truncate">{currentChatFriend.username}</span>
                  <span className="font-pressstart text-[8px] text-[#788D55]">{currentChatFriend.status}</span>
                </div>
              </div>
              <button onClick={() => setShowChatModal(false)} className="text-[#3D2013] hover:text-[#A53914] font-pressstart text-[12px] cursor-pointer shrink-0 ml-2">✕</button>
            </div>

            <div className="p-3 flex flex-col gap-3 relative">
              {/* MESSAGES CONTAINER WITH SCROLL LOGIC */}
              <div className="relative">
                <div
                  ref={chatMessagesContainerRef}
                  onScroll={handleChatScroll}
                  className="h-48 overflow-y-auto p-3 flex flex-col gap-2"
                >
                  <div className="text-center font-pressstart text-[8px] text-[#3D2013]/60 py-2">
                    Start of conversation with {currentChatFriend.username}
                  </div>
                  {(chatHistory[currentChatFriend.id] || []).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`px-2.5 py-1.5 font-pixel text-[15px] max-w-[80%] break-words rounded-[6px] border-[1.5px] border-[#3D2013] ${
                        msg.sender === 'me'
                          ? 'self-end bg-[#FAE9CE] text-[#3D2013]'
                          : 'self-start bg-[#E87339] text-[#FEF4E0]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* FLOATING SCROLL TO BOTTOM BUTTON */}
                {showScrollBottomBtn && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute bottom-2 right-2 bg-[#E87339] text-[#FEF4E0] border-2 border-[#3D2013] p-1.5 rounded-full shadow-md hover:bg-[#d0622c] cursor-pointer transition-opacity duration-200 z-10"
                    title="Scroll to bottom"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* REACT EMOJI PICKER POPUP */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-3 z-50 shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    width={320}
                    height={380}
                  />
                </div>
              )}

              {/* INPUT FORM WITH EMOJI TRIGGER */}
              <form onSubmit={handleSendChatMessage} className="flex gap-2 items-center">
                <div className="flex-1 flex items-center bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[8px] px-2 py-1">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent font-pixel text-[15px] text-[#3D2013] focus:outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-sm cursor-pointer hover:scale-110 transition active:scale-95 ml-1 select-none shrink-0"
                    title="Add Emoji"
                  >
                    😀
                  </button>
                </div>
                <button
                  type="submit"
                  className="bg-[#E87339] text-[#FEF4E0] border-2 border-[#3D2013] px-3 py-2 rounded-[8px] font-pressstart hover:bg-[#d0622c] cursor-pointer shrink-0 flex items-center justify-center"
                  aria-label="Send"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 20v-6l8-2l-8-2V4l19 8z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE FRIEND WARNING MODAL */}
      {showRemoveModal && pendingRemoveFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2013]/50">
          <div className="bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col gap-3 text-center items-center">
            <h3 className="font-pressstart text-[12px] text-[#3D2013]">Remove Friend?</h3>
            <p className="font-pressstart text-[9px] text-[#3D2013]/80 leading-relaxed">
              Are you sure you want to remove <span className="text-[#E87339]">{pendingRemoveFriend.username}</span> from your friends list?
            </p>
            <div className="flex gap-3 justify-center mt-2 w-full">
              <button onClick={() => setShowRemoveModal(false)} className="flex-1 bg-[#FAE9CE] text-[#3D2013] border-2 border-[#3D2013] py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:bg-[#f3d3a8]">Cancel</button>
              <button onClick={handleConfirmRemoveFriend} className="flex-1 bg-[#A53914] text-[#FEF4E0] border-2 border-[#3D2013] py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:bg-[#832c0f]">Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}