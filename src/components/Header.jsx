import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { usePlayer } from '../context/PlayerContext';
import CustomAvatar from '../components/CustomAvatar';

// 12 Streak Rewards Definition
const STREAK_REWARDS_DATA = [
  { days: 1, text: "1 day", type: "coins", valueText: "+5 coins", img: "media/streak_coins.png", coins: 5, xp: 0 },
  { days: 3, text: "3 days", type: "coins", valueText: "+10 coins", img: "media/streak_coins.png", coins: 10, xp: 0 },
  { days: 7, text: "7 days", type: "coins", valueText: "+20 coins", img: "media/streak_coins.png", coins: 20, xp: 0 },
  { days: 14, text: "14 days", type: "xp", valueText: "+75 xp", img: "media/streak_xp.png", coins: 0, xp: 75 },
  { days: 21, text: "21 days", type: "xp", valueText: "+100 xp", img: "media/streak_xp.png", coins: 0, xp: 100 },
  { days: 30, text: "30 days", type: "xp", valueText: "+200 xp", img: "media/streak_xp.png", coins: 0, xp: 200 },
  { days: 45, text: "45 days", type: "coins", valueText: "+100 coins", img: "media/streak_coins.png", coins: 100, xp: 0 },
  { days: 60, text: "60 days", type: "coins", valueText: "+120 coins", img: "media/streak_coins.png", coins: 120, xp: 0 },
  { days: 90, text: "90 days", type: "coins", valueText: "+150 coins", img: "media/streak_coins.png", coins: 150, xp: 0 },
  { days: 120, text: "120 days", type: "xp", valueText: "+1.75x xp", img: "media/streak_xp.png", coins: 0, xp: 300 },
  { days: 180, text: "180 days", type: "xp", valueText: "+500 xp", img: "media/streak_xp.png", coins: 0, xp: 500 },
  { days: 365, text: "365 days", type: "xp", valueText: "+750 xp", img: "media/streak_xp.png", coins: 0, xp: 750 },
];

const PAGES_TIERS = [
  [1, 3, 7, 14, 21],
  [30, 45, 60, 90, 120],
  [180, 365]
];

export default function Header({ onMobileToggle, onOpenKitsu, isRoomState: propIsRoomState = false }) {
  const { playerData, updateCoins, setPlayerData } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic state checking for active room session
  const [isRoomState, setIsRoomState] = useState(false);

  useEffect(() => {
    const hasActiveSession = Boolean(localStorage.getItem('activeRoomSession'));
    const isStateMultiplayer = Boolean(location.state?.isMultiplayer);
    setIsRoomState(hasActiveSession || isStateMultiplayer || propIsRoomState);
  }, [location, propIsRoomState]);

  // Modals visibility state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLeaveRoomModal, setShowLeaveRoomModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // Pagination & Claimed Streak Rewards State galing sa database inventory
  const [streakPageIndex, setStreakPageIndex] = useState(0);

  const parseClaimedStreaks = (inventory) => {
    if (!inventory || !Array.isArray(inventory)) return [1];
    const days = inventory
      .filter(item => typeof item === 'string' && item.startsWith('streak_') && item.endsWith('_reward'))
      .map(item => {
        const parts = item.split('_');
        return parseInt(parts[1], 10);
      });
    return [...new Set([1, ...days])];
  };

  const [claimedStreakDays, setClaimedStreakDays] = useState(() => parseClaimedStreaks(playerData?.inventory));

  useEffect(() => {
    if (playerData?.inventory) {
      setClaimedStreakDays(parseClaimedStreaks(playerData.inventory));
    }
  }, [playerData?.inventory]);

  // Emoji picker & Scroll state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Real Database Data States
  const [myFriends, setMyFriends] = useState([]);
  const [addFriends, setAddFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatHistory, setChatHistory] = useState({});

  // Active selections & tab state
  const [activeFriendsTab, setActiveFriendsTab] = useState('my-friends');
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [currentChatFriend, setCurrentChatFriend] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [pendingRemoveFriend, setPendingRemoveFriend] = useState(null);
  const [removingFriendId, setRemovingFriendId] = useState(null);

  // DOM Refs
  const chatMessagesContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  // Helper function to safely parse and get friend's avatar config or URL
  const getFriendAvatarConfig = (friend) => {
    if (!friend) return null;
    const rawConfig = friend.avatar_config || friend.avatarConfig;
    if (!rawConfig) return null;
    if (typeof rawConfig === 'string') {
      try { return JSON.parse(rawConfig); } catch (e) { return null; }
    }
    if (typeof rawConfig === 'object' && Object.keys(rawConfig).length > 0) {
      return rawConfig;
    }
    return null;
  };

  const getAvatarUrl = (friend) => {
    return friend?.avatar_url || friend?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${friend?.username}`;
  };

  // Fetch real friends data when component mounts or modal opens
  useEffect(() => {
    if (playerData?.email) {
      fetchFriendsData();
    }
  }, [showFriendsModal, showNotifModal, playerData]);

  const fetchFriendsData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/get-friends-data?email=${playerData.email}`);
      const data = await response.json();
      if (data.success) {
        const friendsList = data.friends || [];
        setMyFriends(friendsList);
        setRequests(data.requests || []);

        setNotifications((prevNotifs) => {
          return friendsList.map((f) => {
            const existing = prevNotifs.find((n) => n.email === f.email);
            const isOnline = f.status ? f.status !== "OFFLINE" : true; 
            return {
              id: f.email,
              email: f.email,
              username: f.username,
              level: f.level || 1,
              status: isOnline ? "ONLINE" : "OFFLINE",
              avatarConfig: getFriendAvatarConfig(f),
              avatarUrl: getAvatarUrl(f),
              lastMessage: "Say hello to your study buddy! 👋",
              timeAgo: isOnline ? "Active" : "Offline",
              isUnread: existing ? existing.isUnread : false
            };
          });
        });
      }
    } catch (error) {
      console.error('Error fetching friends data:', error);
    }
  };

  // Search users in database for Add Friends tab
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (activeFriendsTab === 'add-friends') {
        try {
          const response = await fetch(`http://localhost:5000/api/search-users?query=${addSearchQuery}&email=${playerData?.email || ''}`);
          const data = await response.json();
          if (data.success) {
            setAddFriends(data.users || []);
          }
        } catch (error) {
          console.error('Error searching users:', error);
        }
      }
    }, 300);
    return () => clearTimeout(searchTimeout);
  }, [addSearchQuery, activeFriendsTab, playerData]);

  // Handle Friend Requests
  const handleRequestAddFriend = async (receiverEmail) => {
    try {
      const response = await fetch('http://localhost:5000/api/send-friend-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: playerData?.email,
          receiverEmail: receiverEmail
        })
      });
      const data = await response.json();
      if (data.success) {
        setAddFriends((prev) =>
          prev.map((p) => (p.email === receiverEmail ? { ...p, requested: true } : p))
        );
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleFriendRequestAction = async (requestId, action) => {
    try {
      const response = await fetch('http://localhost:5000/api/handle-friend-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: action.toLowerCase() })
      });
      const data = await response.json();
      if (data.success) {
        fetchFriendsData();
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  };

  // --- REAL-TIME MESSAGING LOGIC ---
  const fetchMessages = async (friendEmail) => {
    if (!playerData?.email || !friendEmail) return;
    try {
      const response = await fetch(`http://localhost:5000/api/messages?user1=${playerData.email}&user2=${friendEmail}`);
      const data = await response.json();
      
      if (data.success) {
        const formattedMessages = data.messages.map(m => ({
          sender: m.sender_email === playerData.email ? 'me' : 'them',
          text: m.message
        }));
        
        if (formattedMessages.length > (chatHistory[friendEmail]?.length || 0)) {
          const lastMsg = formattedMessages[formattedMessages.length - 1];
          if (lastMsg.sender === 'them' && !showChatModal) {
            setNotifications(prev => prev.map(n => n.email === friendEmail ? { ...n, isUnread: true } : n));
          }
        }

        setChatHistory(prev => ({
          ...prev,
          [friendEmail]: formattedMessages
        }));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (playerData?.email) {
      fetchFriendsData();
      interval = setInterval(() => {
        fetchFriendsData();
        if (currentChatFriend) {
          fetchMessages(currentChatFriend.email);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [playerData, currentChatFriend]);

  useEffect(() => {
    if (showChatModal && chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatHistory, showChatModal, currentChatFriend]);

  const handleLeaveRoom = () => {
    localStorage.removeItem('activeRoomSession');
    setShowLeaveRoomModal(false);
    setIsRoomState(false);
    navigate('/dashboard', { replace: true, state: { isMultiplayer: false } });
  };

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

  const unreadNotifCount = notifications.filter((n) => n.isUnread).length;

  const handleOpenChat = (friend) => {
    if (!friend || !friend.email) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === friend.email ? { ...n, isUnread: false } : n))
    );

    setCurrentChatFriend(friend);
    setShowNotifModal(false);
    setShowFriendsModal(false);
    setShowEmojiPicker(false);
    setShowChatModal(true);
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInputText.trim() || !currentChatFriend) return;

    const messageText = chatInputText.trim();
    const friendEmail = currentChatFriend.email;

    setChatHistory((prev) => ({
      ...prev,
      [friendEmail]: [...(prev[friendEmail] || []), { sender: 'me', text: messageText }],
    }));

    setChatInputText('');
    setShowEmojiPicker(false);

    try {
      await fetch('http://localhost:5000/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_email: playerData.email,
          receiver_email: friendEmail,
          message: messageText
        })
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

 const handleConfirmRemoveFriend = () => {
    if (!pendingRemoveFriend) return;
    const targetEmail = pendingRemoveFriend.email;

    setShowRemoveModal(false);
    setRemovingFriendId(targetEmail);

    setTimeout(async () => {
      try {
        await fetch('http://localhost:5000/api/remove-friend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userEmail: playerData.email, 
            friendEmail: targetEmail 
          })
        });
        fetchFriendsData();
      } catch (err) {
        console.error("Error removing friend:", err);
      }
      setRemovingFriendId(null);
      setPendingRemoveFriend(null);
    }, 300);
  };

  // Functional API call para i-save sa database inventory ang claimed streak reward at i-update ang coins / XP
  const handleClaimStreakReward = async (item) => {
    if (claimedStreakDays.includes(item.days)) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/claim-streak-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: playerData.email, days: item.days }),
      });
      const data = await response.json();

      if (data.success) {
        setClaimedStreakDays(parseClaimedStreaks(data.inventory));
        
        // I-update ang global playerData state sa frontend para mag-reflect kaagad ang coins/XP
        if (setPlayerData) {
          setPlayerData(prev => ({
            ...prev,
            inventory: data.inventory,
            coins: data.coins !== undefined ? data.coins : prev.coins,
            currentXP: data.currentXP !== undefined ? data.currentXP : prev.currentXP,
            level: data.level !== undefined ? data.level : prev.level,
            maxXP: data.maxXP !== undefined ? data.maxXP : prev.maxXP
          }));
        } else if (item.coins > 0 && updateCoins) {
          updateCoins(data.coins);
        }
      }
    } catch (err) {
      console.error("Failed to claim streak reward:", err);
    }
  };

  return (
    <>
      <header className="relative z-10 pt-4 sm:pt-6 flex items-center justify-between md:justify-end w-full px-3 sm:px-6 shrink-0 transition-colors duration-200">
        <button
          onClick={onMobileToggle}
          aria-label="Open Mobile Navigation"
          className="md:hidden bg-theme-surface border-2 border-theme-dark text-theme-dark h-8 sm:h-11 w-8 sm:w-11 flex items-center justify-center rounded-[8px] sm:rounded-[10px] shadow-sm hover:bg-theme-muted transition-colors focus:outline-none cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-1 sm:gap-3 flex-nowrap justify-end max-w-full py-2 px-1">
          <div className="h-8 sm:h-11 bg-theme-surface border-2 border-theme-dark px-1.5 sm:px-3 rounded-[30px] flex items-center justify-center gap-1 sm:gap-2 shrink-0 shadow-sm transition-colors duration-200">
            <img src={`${baseUrl}media/coin_logo.png`} alt="Coin" className="w-3.5 h-3.5 sm:w-6 sm:h-6 object-contain shrink-0" />
            <span className="font-pressstart text-[8px] sm:text-[12px] text-theme-dark">
              {(playerData?.coins || 0).toLocaleString()}
            </span>
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowNotifModal(!showNotifModal)}
              title="Notifications"
              className="h-8 sm:h-11 bg-theme-surface border-2 border-theme-dark px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted"
            >
              <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-theme-primary" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" fillRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155M3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19z" clipRule="evenodd" />
              </svg>
            </button>

            {unreadNotifCount > 0 && (
              <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-theme-primary border-[1.5px] sm:border-2 border-theme-dark text-white font-pressstart text-[6px] sm:text-[9px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-20 pointer-events-none">
                {unreadNotifCount}
              </div>
            )}

            {showNotifModal && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 z-50">
                <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-3 sm:p-4 w-full sm:w-[360px] h-[70vh] sm:h-[420px] max-h-[500px] shadow-2xl flex flex-col gap-3 text-left transition-colors duration-200">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-theme-dark/20 shrink-0">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-theme-primary" viewBox="0 0 24 24">
                        <path d="M0 0h24v24H0z" fill="none" />
                        <path fill="currentColor" fillRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155M3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19z" clipRule="evenodd" />
                      </svg>
                      <h3 className="font-pressstart text-[10px] sm:text-[12px] text-theme-dark">MESSAGES</h3>
                    </div>
                    <button onClick={() => setShowNotifModal(false)} className="text-theme-dark hover:text-theme-danger font-pressstart text-[12px] p-1 cursor-pointer">✕</button>
                  </div>

                  <div className="relative w-full shrink-0">
                    <input
                      type="text"
                      value={notifSearchQuery}
                      onChange={(e) => setNotifSearchQuery(e.target.value)}
                      placeholder="Search friends..."
                      className="w-full bg-theme-surface border-2 border-theme-dark rounded-[8px] px-2.5 py-1.5 font-pressstart text-[8px] sm:text-[9px] text-theme-dark focus:outline-none placeholder-theme-dark/50 transition-colors"
                    />
                  </div>

                  <div className="overflow-y-auto pr-1 flex-1 min-h-0 flex flex-col gap-2">
                    {notifications.length === 0 ? (
                      <p className="font-pressstart text-[8px] text-theme-dark/60 text-center py-6">No messages yet.</p>
                    ) : (
                      notifications
                        .filter((n) => n.username.toLowerCase().includes(notifSearchQuery.toLowerCase()))
                        .map((friend) => {
                          const isOnline = friend.status === "ONLINE";

                          return (
                            <div
                              key={friend.email}
                              onClick={() => {
                                const found = myFriends.find(f => f.email === friend.email);
                                if (found) handleOpenChat(found);
                              }}
                              className={`flex items-center justify-between gap-3 p-2.5 rounded-[8px] cursor-pointer hover:bg-theme-muted transition-all duration-200 ${
                                friend.isUnread ? 'bg-theme-muted border-2 border-theme-primary shadow-sm' : 'bg-theme-surface border-2 border-theme-dark'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative shrink-0 w-9 h-9 rounded-full border-2 border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                                  {friend.avatarConfig ? (
                                    <div 
                                      className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                                      style={{ transform: 'scale(0.35) translateY(18px)' }}
                                    >
                                      <CustomAvatar config={friend.avatarConfig} state="idle" />
                                    </div>
                                  ) : (
                                    <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                  )}
                                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-theme-dark z-10 ${isOnline ? 'bg-theme-safe' : 'bg-zinc-500'}`} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-pressstart text-[9px] text-theme-dark truncate">{friend.username}</span>
                                  <span className="font-pixel text-[13px] text-theme-dark/70 truncate leading-tight">{friend.lastMessage}</span>
                                </div>
                              </div>
                              <span className="font-pressstart text-[7px] text-theme-dark/60 shrink-0">{friend.timeAgo}</span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFriendsModal(true)}
            title="Friends"
            className="h-8 sm:h-11 bg-theme-surface border-2 border-theme-dark px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted"
          >
            <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-theme-primary" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="currentColor" d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.69 6.69 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.19 5.19 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8" />
            </svg>
            <span className="font-pressstart text-[8px] sm:text-[12px] text-theme-dark">{myFriends.length}</span>
          </button>

          {/* CLICKABLE STREAK BUTTON */}
          <button
            onClick={() => setShowStreakModal(true)}
            title="Streak Rewards"
            className="h-8 sm:h-11 bg-theme-surface border-2 border-theme-dark px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-0.5 sm:gap-1.5 shrink-0 transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted"
          >
            <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-theme-primary" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.8 9.4Q11 7 12 3q2.5 5 0 10q3 0 5-2.9a7 7 0 1 1-9.2-.7" />
            </svg>
            <span className="font-pressstart text-[8px] sm:text-[12px] text-theme-dark">
              {playerData?.streakDays ?? 0}D
            </span>
          </button>

          {/* DYNAMIC ROOM STATE ACTION BUTTONS */}
          {isRoomState ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (onOpenKitsu) onOpenKitsu();
                }}
                className="h-8 sm:h-11 bg-theme-surface border-2 border-theme-dark transition-all duration-150 retro-shadow px-2 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-theme-dark shrink-0 hover:bg-theme-muted"
              >
                <img src={`${baseUrl}media/kitsu_logo.png`} alt="Kitsu AI Logo" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                <span className="nav-label font-pressstart text-[8px] sm:text-[10px]">KitsuAI</span>
              </button>

              <button
                onClick={() => setShowLeaveRoomModal(true)}
                title="Leave Room"
                className="h-8 sm:h-11 bg-theme-danger border-2 border-theme-dark px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-150 shrink-0 cursor-pointer retro-shadow hover:opacity-90"
              >
                <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-pressstart text-[8px] sm:text-[11px] text-white hidden sm:inline">LEAVE ROOM</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Logout"
              className="h-8 sm:h-11 bg-theme-danger border-2 border-theme-dark px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-150 retro-shadow cursor-pointer hover:opacity-90"
            >
              <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M9 20.75H6a2.64 2.64 0 0 1-2.75-2.53V5.78A2.64 2.64 0 0 1 6 3.25h3a.75.75 0 0 1 0 1.5H6a1.16 1.16 0 0 0-1.25 1v12.47a1.16 1.16 0 0 0 1.25 1h3a.75.75 0 0 1 0 1.5Zm7-4a.74.74 0 0 1-.53-.22a.75.75 0 1 1 0-1.06L18.94 12l-3.47-3.47a.75.75 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.74.74 0 0 1-.53.22" />
                <path fill="currentColor" d="M20 12.75H9a.75.75 0 0 1 0-1.5h11a.75.75 0 0 1 0 1.5" />
              </svg>
              <span className="font-pressstart text-[8px] sm:text-[11px] text-white hidden sm:inline">SIGN OUT</span>
            </button>
          )}
        </div>
      </header>

      {/* STREAK REWARDS MODAL */}
      {showStreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[16px] p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-3 sm:gap-4 relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-colors duration-200">
            
            <button
              onClick={() => setShowStreakModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-theme-dark hover:text-theme-danger font-pressstart text-[12px] sm:text-[14px] p-1 cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="flex flex-col items-center justify-center text-center gap-1 pt-1">
              <h3 className="font-pressstart text-sm sm:text-[36px] text-theme-dark tracking-wide">
                STREAK REWARDS
              </h3>
              <p className="font-pixel text-[7px] sm:text-[24px] text-theme-dark/70 px-4">
                Stay consistent and earn awesome rewards!
              </p>
            </div>

            <div className="relative flex items-center justify-between w-full my-1 min-h-[190px] sm:min-h-[220px]">
              <button
                disabled={streakPageIndex === 0}
                onClick={() => setStreakPageIndex((prev) => Math.max(0, prev - 1))}
                className={`p-1 sm:px-2 sm:py-4 font-pressstart text-sm sm:text-lg text-theme-dark hover:text-theme-primary hover:scale-110 active:scale-95 shrink-0 z-10 transition-all ${
                  streakPageIndex === 0 ? 'opacity-20 cursor-not-allowed hover:scale-100 hover:text-theme-dark' : 'cursor-pointer'
                }`}
              >
                ◀
              </button>

              <div className="flex items-stretch justify-start sm:justify-center gap-2 sm:gap-3 flex-1 px-1 sm:px-2 overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {PAGES_TIERS[streakPageIndex].map((dayValue) => {
                  const item = STREAK_REWARDS_DATA.find((r) => r.days === dayValue);
                  if (!item) return null;

                  const isClaimed = claimedStreakDays.includes(item.days);
                  const canClaim = (playerData?.streakDays ?? 0) >= item.days && !isClaimed;
                  const isLocked = !canClaim && !isClaimed;

                  return (
                    <div
                      key={item.days}
                      className={`w-28 sm:w-36 rounded-[12px] flex flex-col justify-between overflow-hidden shrink-0 border-[2px] sm:border-[2.5px] transition-all shadow-sm ${
                        canClaim ? 'border-theme-primary bg-gradient-to-b from-theme-surface to-theme-muted' : 'border-theme-dark bg-theme-surface'
                      }`}
                    >
                      <div className="p-1.5 sm:p-2 text-center pt-2">
                        <span className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark uppercase block truncate">
                          {item.text}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 my-auto">
                        <img
                          src={`${baseUrl}${item.img}`}
                          alt={item.valueText}
                          className="w-20 h-20 sm:w-30 sm:h-30 object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span className="font-pixel text-[13px] sm:text-[15px] text-theme-dark text-center leading-tight">
                          {item.valueText}
                        </span>
                      </div>

                      <div className="w-full h-[2px] bg-theme-dark" />

                      {isClaimed && (
                        <div className="bg-[#C8DDB0] text-theme-safe p-3.5 sm:p-4 flex items-center justify-center gap-1 font-pressstart text-[6px] sm:text-[8px] font-bold">
                          <span>CLAIMED</span>
                        </div>
                      )}

                      {canClaim && (
                        <div className="p-2 sm:p-2.5 bg-transparent flex justify-center">
                          <button
                            onClick={() => handleClaimStreakReward(item)}
                            className="w-full bg-theme-primary text-white border-[1.5px] sm:border-[2px] border-theme-dark py-1 font-pressstart text-[7px] sm:text-[8px] rounded-[6px] hover:opacity-90 cursor-pointer transition-opacity uppercase"
                          >
                            CLAIM
                          </button>
                        </div>
                      )}

                      {isLocked && (
                        <div className="bg-[#D8D0C4] text-[#8A786C] p-3.5 sm:p-4 flex items-center justify-center gap-1 font-pressstart text-[6px] sm:text-[8px] font-bold">
                          <span>LOCKED</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                disabled={streakPageIndex === PAGES_TIERS.length - 1}
                onClick={() => setStreakPageIndex((prev) => Math.min(PAGES_TIERS.length - 1, prev + 1))}
                className={`p-1 sm:px-2 sm:py-4 font-pressstart text-sm sm:text-lg text-theme-dark hover:text-theme-primary hover:scale-110 active:scale-95 shrink-0 z-10 transition-all ${
                  streakPageIndex === PAGES_TIERS.length - 1 ? 'opacity-20 cursor-not-allowed hover:scale-100 hover:text-theme-dark' : 'cursor-pointer'
                }`}
              >
                ▶
              </button>
            </div>

            <div className="flex flex-col items-center gap-1.5 pb-1">
              <span className="font-pressstart text-[7px] sm:text-[9px] text-theme-dark/70 text-center">
                Start a study session to claim the streak
              </span>
              <div className="flex items-center gap-2">
                {PAGES_TIERS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setStreakPageIndex(idx)}
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-[1.5px] border-theme-dark transition-colors cursor-pointer ${
                      streakPageIndex === idx ? 'bg-theme-primary' : 'bg-theme-surface'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col gap-4 text-center">
            <h3 className="font-pressstart text-[14px] text-theme-dark">Sign Out</h3>
            <p className="font-pressstart text-[10px] text-theme-dark/80 leading-normal">Are you sure you want to sign out?</p>
            <div className="flex gap-3 justify-center mt-2">
              <button 
                onClick={() => {
                  localStorage.removeItem('active_user_email');
                  navigate('/auth#login');
                }} 
                className="bg-theme-danger text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:opacity-90"
              >
                Yes
              </button>
              <button onClick={() => setShowLogoutModal(false)} className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:opacity-80">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* FRIENDS MODAL */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 w-[720px] max-w-[95vw] h-[580px] max-h-[90vh] shadow-xl flex flex-col gap-4 text-left transition-colors duration-200">
            <div className="flex items-center justify-between pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-theme-primary" viewBox="0 0 24 24">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="currentColor" d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.69 6.69 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.19 5.19 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8" />
                </svg>
                <h3 className="font-pressstart text-[14px] text-theme-dark">Friends</h3>
              </div>
              <button onClick={() => setShowFriendsModal(false)} className="text-theme-dark hover:text-theme-danger font-pressstart text-[14px] cursor-pointer">✕</button>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-[8px] shrink-0">
              {['my-friends', 'add-friends', 'requests'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFriendsTab(tab)}
                  className={`flex-1 min-w-0 h-11 min-h-[44px] px-1 flex items-center justify-center text-center font-pressstart text-[8px] sm:text-[10px] leading-tight rounded-[6px] transition-all cursor-pointer ${
                    activeFriendsTab === tab
                      ? 'bg-theme-muted text-theme-primary border-2 border-transparent'
                      : 'bg-theme-muted text-theme-dark border-2 border-theme-dark'
                  }`}
                >
                  {tab.replace('-', ' ').toUpperCase()}
                  {tab === 'requests' && requests.length > 0 && ` (${requests.length})`}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto pr-1 flex-1 min-h-0">
              {activeFriendsTab === 'my-friends' && (
                <div className="flex flex-col gap-2.5">
                  {myFriends.length === 0 ? (
                    <div className="text-center font-pressstart text-[10px] text-theme-dark/60 py-6">No friends added yet.</div>
                  ) : (
                    myFriends.map((friend) => {
                      const isRemoving = removingFriendId === friend.email;
                      const avatarCfg = getFriendAvatarConfig(friend);
                      const isOnline = friend.status ? friend.status !== "OFFLINE" : true;

                      return (
                        <div 
                          key={friend.email} 
                          className={`flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-0 items-center bg-theme-surface border-2 border-theme-dark p-2.5 transition-all duration-300 ${
                            isRemoving ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 w-full">
                            <div className="relative shrink-0 w-9 h-9 rounded-full border-2 border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                              {avatarCfg ? (
                                <div 
                                  className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                                  style={{ transform: 'scale(0.35) translateY(18px)' }}
                                >
                                  <CustomAvatar config={avatarCfg} state="idle" />
                                </div>
                              ) : (
                                <img src={getAvatarUrl(friend)} alt={friend.username} className="w-full h-full object-cover" />
                              )}
                              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-theme-dark z-10 ${isOnline ? 'bg-theme-safe' : 'bg-zinc-500'}`} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-pressstart text-[10px] text-theme-dark truncate">{friend.username}</span>
                              <span className="font-pressstart text-[8px] text-theme-dark/70">LVL {friend.level || 1}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between w-full sm:contents">
                            <span className={`font-pressstart text-[8px] ${isOnline ? 'text-theme-safe' : 'text-zinc-500'}`}>
                              {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => { setShowFriendsModal(false); handleOpenChat(friend); }} title="Message" className="p-1.5 text-theme-dark hover:text-theme-primary cursor-pointer">💬</button>
                              <button onClick={() => { setPendingRemoveFriend(friend); setShowRemoveModal(true); }} title="Remove" className="p-1.5 text-theme-dark hover:text-theme-danger cursor-pointer">🗑️</button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeFriendsTab === 'add-friends' && (
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="w-full bg-theme-surface border-2 border-theme-dark rounded-[8px] px-3 py-2 font-pressstart text-[10px] text-theme-dark focus:outline-none placeholder-theme-dark/50"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {addFriends.map((player) => {
                      const avatarCfg = getFriendAvatarConfig(player);
                      return (
                        <div key={player.email} className="bg-theme-surface border-[2px] border-theme-dark p-2.5 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <div className="relative shrink-0 w-8 h-8 rounded-full border-[1.5px] border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                                {avatarCfg ? (
                                  <div 
                                    className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                                    style={{ transform: 'scale(0.3) translateY(18px)' }}
                                  >
                                    <CustomAvatar config={avatarCfg} state="idle" />
                                  </div>
                                ) : (
                                  <img src={getAvatarUrl(player)} alt={player.username} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-pressstart text-[9px] text-theme-dark break-words whitespace-normal leading-tight">{player.username}</span>
                                <span className="font-pressstart text-[7px] text-theme-dark/70">LVL {player.level || 1}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRequestAddFriend(player.email)}
                              disabled={player.requested}
                              className={`px-2 py-1.5 rounded-[6px] font-pressstart text-[7px] border-[1.5px] border-theme-dark cursor-pointer transition-colors shrink-0 ${
                                player.requested ? 'bg-theme-muted text-theme-dark/50 cursor-not-allowed opacity-80' : 'bg-theme-primary text-white hover:opacity-90'
                              }`}
                            >
                              {player.requested ? 'REQUESTED' : 'REQUEST'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeFriendsTab === 'requests' && (
                <div className="flex flex-col gap-2.5">
                  {requests.length === 0 ? (
                    <div className="text-center font-pressstart text-[10px] text-theme-dark/60 py-6">No friend requests.</div>
                  ) : (
                    requests.map((req) => {
                      const avatarCfg = getFriendAvatarConfig(req.sender);
                      return (
                        <div key={req.id} className="flex items-center justify-between bg-theme-surface border-2 border-theme-dark p-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0 w-8 h-8 rounded-full border-2 border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                              {avatarCfg ? (
                                <div 
                                  className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                                  style={{ transform: 'scale(0.3) translateY(18px)' }}
                                >
                                  <CustomAvatar config={avatarCfg} state="idle" />
                                </div>
                              ) : (
                                <img src={getAvatarUrl(req.sender)} alt={req.sender.username} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-pressstart text-[10px] text-theme-dark truncate">{req.sender.username}</span>
                              <span className="font-pressstart text-[8px] text-theme-dark/70">LVL {req.sender.level || 1}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => handleFriendRequestAction(req.id, 'ACCEPT')} className="px-2.5 py-1 bg-theme-safe text-white font-pressstart text-[8px] rounded border border-theme-dark cursor-pointer">ACCEPT</button>
                            <button onClick={() => handleFriendRequestAction(req.id, 'REJECT')} className="px-2.5 py-1 bg-theme-danger text-white font-pressstart text-[8px] rounded border border-theme-dark cursor-pointer">REJECT</button>
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

      {/* CHAT MODAL */}
      {showChatModal && currentChatFriend && (
        <div className="fixed bottom-4 right-4 z-50 p-0">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[10px] max-w-md w-80 sm:w-96 shadow-xl flex flex-col overflow-hidden relative transition-colors duration-200">
            <div className="flex items-center justify-between p-3 bg-theme-muted border-b-2 border-theme-dark">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0 w-8 h-8 rounded-full border-2 border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center">
                  {getFriendAvatarConfig(currentChatFriend) ? (
                    <div 
                      className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                      style={{ transform: 'scale(0.3) translateY(18px)' }}
                    >
                      <CustomAvatar config={getFriendAvatarConfig(currentChatFriend)} state="idle" />
                    </div>
                  ) : (
                    <img src={getAvatarUrl(currentChatFriend)} alt="PFP" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="font-pressstart text-[11px] text-theme-dark truncate">{currentChatFriend.username}</span>
              </div>
              <button onClick={() => setShowChatModal(false)} className="text-theme-dark font-pressstart text-[12px] cursor-pointer">✕</button>
            </div>

            <div className="p-3 flex flex-col gap-3 relative">
              <div className="relative">
                <div
                  ref={chatMessagesContainerRef}
                  onScroll={handleChatScroll}
                  className="h-48 overflow-y-auto p-3 flex flex-col gap-2"
                >
                  <div className="text-center font-pressstart text-[8px] text-theme-dark/60 py-2">
                    Start of conversation with {currentChatFriend.username}
                  </div>
                  {(chatHistory[currentChatFriend.email] || []).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`px-2.5 py-1.5 font-pixel text-[15px] max-w-[80%] break-words rounded-[6px] border-[1.5px] border-theme-dark ${
                        msg.sender === 'me' ? 'self-end bg-theme-muted text-theme-dark' : 'self-start bg-theme-primary text-white'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {showScrollBottomBtn && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute bottom-2 right-2 bg-theme-primary text-white border-2 border-theme-dark p-1.5 rounded-full shadow-md hover:opacity-90 cursor-pointer transition-opacity duration-200 z-10"
                    title="Scroll to bottom"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {showEmojiPicker && (
                <div className="absolute bottom-16 left-3 z-50 shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    width={320}
                    height={380}
                  />
                </div>
              )}

              <form onSubmit={handleSendChatMessage} className="flex gap-2 items-center">
                <div className="flex-1 flex items-center bg-theme-surface border-2 border-theme-dark rounded-[8px] px-2 py-1">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent font-pixel text-[15px] text-theme-dark focus:outline-none min-w-0"
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
                  className="bg-theme-primary text-white border-2 border-theme-dark px-3 py-2 rounded-[8px] font-pressstart hover:opacity-90 cursor-pointer shrink-0 flex items-center justify-center"
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

      {/* REMOVE FRIEND MODAL */}
      {showRemoveModal && pendingRemoveFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col gap-3 text-center items-center">
            <h3 className="font-pressstart text-[12px] text-theme-dark">Remove Friend?</h3>
            <p className="font-pressstart text-[9px] text-theme-dark/80 leading-relaxed">
              Are you sure you want to remove <span className="text-theme-primary">{pendingRemoveFriend.username}</span> from your friends list?
            </p>
            <div className="flex gap-3 justify-center mt-2 w-full">
              <button onClick={() => setShowRemoveModal(false)} className="flex-1 bg-theme-muted text-theme-dark border-2 border-theme-dark py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:opacity-80">Cancel</button>
              <button onClick={handleConfirmRemoveFriend} className="flex-1 bg-theme-danger text-white border-2 border-theme-dark py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:opacity-90">Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}