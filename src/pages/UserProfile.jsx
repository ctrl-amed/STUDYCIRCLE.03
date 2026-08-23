import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import CustomAvatar from '../components/CustomAvatar';
import CustomRoom from '../components/CustomRoom';

// =========================================================================
// SVG CATEGORY ICONS LOOKUP
// =========================================================================
const CATEGORY_ICONS = {
  'skin & face': (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M8.113 13.888Q7.75 13.525 7.75 13t.363-.888T9 11.75t.888.363t.362.887t-.363.888T9 14.25t-.888-.363m6 0q-.362-.362-.362-.887t.363-.888t.887-.362t.888.363t.362.887t-.363.888t-.887.362t-.888-.363M12 20q3.35 0 5.675-2.325T20 12q0-.6-.075-1.162T19.65 9.75q-.525.125-1.05.188T17.5 10q-2.275 0-4.3-.975T9.75 6.3q-.8 1.95-2.287 3.388T4 11.85V12q0 3.35 2.325 5.675T12 20m0 2q-2.075 0-3.9-.787t-3.175-2.138T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22" />
    </svg>
  ),
  hair: (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M12 3a9 9 0 0 1 9 9v6a3 3 0 0 1-3 3h-1.382a2 2 0 0 1-1.789-1.105l-.176-.351c.315-.22.62-.473.905-.76C16.656 17.678 17.5 16.054 17.5 14c0-.735-.124-1.466-.349-2.157c-.1-.307-.377-.343-.651-.343a5 5 0 0 1-4.09-2.125a.5.5 0 0 0-.82 0A5 5 0 0 1 7.5 11.5c-.274 0-.552.036-.651.343A7 7 0 0 0 6.5 14c0 2.055.844 3.678 1.942 4.784c.285.287.59.54.904.76l-.175.35A2 2 0 0 1 7.38 21H6a3 3 0 0 1-3-3v-6a9 9 0 0 1 9-9" />
    </svg>
  ),
  clothe: (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M14.883 3.007L14.978 3l.112.004l.113.017l.113.03l6 2a1 1 0 0 1 .677.833L22 6v5a1 1 0 0 1-.883.993L21 12h-2v7a2 2 0 0 1-1.85 1.995L17 21H7a2 2 0 0 1-1.995-1.85L5 19v-7H3a1 1 0 0 1-.993-.883L2 11V6a1 1 0 0 1 .576-.906l.108-.043l6-2A1 1 0 0 1 10 4a2 2 0 0 0 3.995.15l.009-.24l.017-.113l.037-.134l.044-.103l.05-.092l.068-.093l.069-.08q.083-.08.175-.14l.096-.053l.103-.044l.108-.032l.112-.02z" />
    </svg>
  ),
  short: (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M21.986 17.836A1 1 0 0 1 21 19h-6.465a2 2 0 0 1-1.664-.89L12 16.802l-.871 1.306A2 2 0 0 1 9.465 19H3a1 1 0 0 1-.986-1.164L3.319 10H20.68zM18.153 5a2 2 0 0 1 1.973 1.67L20.347 8H3.653l.222-1.33A2 2 0 0 1 5.847 5z" />
    </svg>
  ),
  accessory: (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 48 48" fill="currentColor">
      <path d="M0 0h48v48H0z" fill="none" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
        <path fill="currentColor" d="M17 32.41L24 29l7 3.41v7.5L24 44l-7-4.09z" />
        <path d="M8 4c.455 8.333 6 25 16 25S40 12.784 40 4" />
      </g>
    </svg>
  ),
  shoe: (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 15 15" fill="currentColor">
      <path d="M0 0h15v15H0z" fill="none" />
      <path fill="currentColor" d="M9.5 7a10 10 0 0 1-1.31-.95L6.01 3.22a.56.56 0 0 0-1 .28H5V5H3.21a.5.5 0 0 1-.36-.15S2.5 4 2 4h-.5a.5.5 0 0 0-.5.5V9h5.5c1.5 0 2 1 3.5 1h4v-.5C14 8 10.55 7.59 9.5 7m0 4a3.13 3.13 0 0 1-1.53-.45A4.1 4.1 0 0 0 6 10H1v1.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5V11a3.13 3.13 0 0 1 1.53.45A4.1 4.1 0 0 0 9.5 12h4a.5.5 0 0 0 .5-.5V11Z" />
    </svg>
  ),
  room: (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" />
      <path fill="currentColor" d="M12.5 7c0-1.11.89-2 2-2H18c1.1 0 2 .9 2 2v2.16c-1.16.41-2 1.51-2 2.81V14h-5.5zM6 11.96V14h5.5V7c0-1.11-.89-2-2-2H6c-1.1 0-2 .9-2 2v2.15c1.16.41 2 1.52 2 2.81m14.66-1.93c-.98.16-1.66 1.09-1.66 2.09V15H5v-3a2 2 0 1 0-4 0v5c0 1.1.9 2 2 2v2h2v-2h14v2h2v-2c1.1 0 2-.9 2-2v-5c0-1.21-1.09-2.18-2.34-1.97" />
    </svg>
  ),
};

// =========================================================================
// THUMBNAIL OFFSET CONFIGURATION FOR GRID PREVIEWS
// =========================================================================
const THUMBNAIL_OFFSETS = {
  body: { translateX: '0px', translateY: '0px', scale: 1 },
  face: { translateX: '0px', translateY: '40px', scale: 3 },
  hair: { translateX: '0px', translateY: '20px', scale: 1.5 },
  clothe: { translateX: '0px', translateY: '-20px', scale: 2 },
  short: { translateX: '0px', translateY: '-60px', scale: 3 },
  accessory: { translateX: '0px', translateY: '10px', scale: 1.2 },
  shoe: { translateX: '0px', translateY: '-80px', scale: 3 },
  room: { translateX: '0px', translateY: '0px', scale: 1.0 },
};

// Asset Catalog Configurations
const AVATAR_CATALOG = {
  'skin & face': {
    body: [
      { id: 'BODY1', type: 'body', price: 0 },
      { id: 'BODY2', type: 'body', price: 0 },
      { id: 'BODY3', type: 'body', price: 0 },
    ],
    face: [
      { id: 'FACE1', type: 'face', price: 0 },
      { id: 'FACE2', type: 'face', price: 100 },
      { id: 'FACE3', type: 'face', price: 150 },
      { id: 'FACE4', type: 'face', price: 200 },
      { id: 'FACE5', type: 'face', price: 250 },
    ],
  },
  hair: [
    { id: 'NONE', price: 0 },
    { id: 'HAIR1', price: 100 },
    { id: 'HAIR2', price: 120 },
    { id: 'HAIR3', price: 150 },
    { id: 'HAIR4', price: 200 },
    { id: 'HAIR5', price: 280 },
    { id: 'HAIR6', price: 350 },
  ],
  clothe: [
    { id: 'NONE', price: 0 },
    { id: 'TOP1', price: 100 },
    { id: 'TOP2', price: 150 },
    { id: 'TOP3', price: 200 },
    { id: 'TOP4', price: 250 },
    { id: 'TOP5', price: 300 },
    { id: 'TOP6', price: 350 },
  ],
  short: [
    { id: 'NONE', price: 0 },
    { id: 'BOTTOM1', price: 100 },
    { id: 'BOTTOM2', price: 120 },
    { id: 'BOTTOM3', price: 150 },
    { id: 'BOTTOM4', price: 200 },
    { id: 'BOTTOM5', price: 250 },
  ],
  accessory: [
    { id: 'NONE', price: 0 },
    { id: 'ACCESSORY1', price: 100 },
    { id: 'ACCESSORY2', price: 120 },
    { id: 'ACCESSORY3', price: 180 },
    { id: 'ACCESSORY4', price: 220 },
    { id: 'ACCESSORY5', price: 280 },
  ],
  shoe: [
    { id: 'NONE', price: 0 },
    { id: 'SHOE1', price: 50 },
    { id: 'SHOE2', price: 80 },
    { id: 'SHOE3', price: 140 },
    { id: 'SHOE4', price: 180 },
    { id: 'SHOE5', price: 220 },
    { id: 'SHOE6', price: 200 },
  ],
};

const ROOM_CATALOG = {
  room: [
    { id: 'ROOM1', price: 0 },
    { id: 'ROOM2', price: 100 },
    { id: 'ROOM3', price: 200 },
    { id: 'ROOM4', price: 300 },
    { id: 'ROOM5', price: 500 },
  ],
};

const categoryToConfigKey = {
  hair: 'hair',
  clothe: 'tops',
  short: 'bottoms',
  accessory: 'accessories',
  shoe: 'shoes',
};

// Helper: Flat list of all assets with their folder location for image lookup
const ALL_ASSETS = [
  ...AVATAR_CATALOG['skin & face'].body.map((a) => ({ ...a, folder: 'BODY', catKey: 'body' })),
  ...AVATAR_CATALOG['skin & face'].face.map((a) => ({ ...a, folder: 'FACE', catKey: 'face' })),
  ...AVATAR_CATALOG.hair.map((a) => ({ ...a, folder: 'HAIR', catKey: 'hair' })),
  ...AVATAR_CATALOG.clothe.map((a) => ({ ...a, folder: 'TOPS', catKey: 'clothe' })),
  ...AVATAR_CATALOG.short.map((a) => ({ ...a, folder: 'BOTTOMS', catKey: 'short' })),
  ...AVATAR_CATALOG.accessory.map((a) => ({ ...a, folder: 'ACCESSORIES', catKey: 'accessory' })),
  ...AVATAR_CATALOG.shoe.map((a) => ({ ...a, folder: 'SHOES', catKey: 'shoe' })),
  ...ROOM_CATALOG.room.map((a) => ({ ...a, folder: 'ROOMS', catKey: 'room' })),
];

export default function UserProfile() {
  const { playerData, updateCoins } = usePlayer();

  const [activeMode, setActiveMode] = useState('avatar');
  const [avatarCategory, setAvatarCategory] = useState('skin & face');
  const [roomCategory, setRoomCategory] = useState('room');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [avatarConfig, setAvatarConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('user_avatar_config');
      return saved
        ? JSON.parse(saved)
        : { body: 'BODY1', face: 'FACE1', tops: 'TOP7', bottoms: 'BOTTOM6', shoes: '', hair: '', accessories: '' };
    } catch {
      return { body: 'BODY1', face: 'FACE1', tops: 'TOP7', bottoms: 'BOTTOM6', shoes: '', hair: '', accessories: '' };
    }
  });

  const [roomConfig, setRoomConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('user_furniture_config');
      return saved ? JSON.parse(saved) : { room: 'ROOM1' };
    } catch {
      return { room: 'ROOM1' };
    }
  });

  const [unlockedItems, setUnlockedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('user_unlocked_assets');
      return saved
        ? JSON.parse(saved)
        : ['BODY1', 'BODY2', 'BODY3', 'FACE1', 'TOP7', 'BOTTOM6', 'ROOM1'];
    } catch {
      return ['BODY1', 'BODY2', 'BODY3', 'FACE1', 'TOP7', 'BOTTOM6', 'ROOM1'];
    }
  });

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const coinIconUrl = `${baseUrl}media/coin_logo.png`;
  const platformIconUrl = `${baseUrl}media/platform.png`;

  // Determine unowned items currently equipped in preview
  const getUnownedEquippedItems = () => {
    const unowned = [];

    if (activeMode === 'avatar') {
      Object.values(avatarConfig).forEach((assetId) => {
        if (assetId && assetId !== 'NONE' && !unlockedItems.includes(assetId)) {
          const item = ALL_ASSETS.find((a) => a.id === assetId);
          if (item && item.price > 0) unowned.push(item);
        }
      });
    } else {
      const roomId = roomConfig.room;
      if (roomId && !unlockedItems.includes(roomId)) {
        const item = ALL_ASSETS.find((a) => a.id === roomId);
        if (item && item.price > 0) unowned.push(item);
      }
    }

    return unowned;
  };

  const pendingUnownedItems = getUnownedEquippedItems();
  const totalCost = pendingUnownedItems.reduce((acc, curr) => acc + curr.price, 0);
  const userCoins = playerData?.coins ?? 0;
  const hasEnoughCoins = userCoins >= totalCost;

  const handleItemClick = (item, category) => {
    if (activeMode === 'avatar') {
      if (category === 'skin & face') {
        const key = item.type;
        setAvatarConfig((prev) => ({ ...prev, [key]: item.id }));
      } else if (category === 'clothe') {
        const targetId = item.id === 'NONE' ? 'TOP7' : item.id;
        setAvatarConfig((prev) => ({
          ...prev,
          tops: prev.tops === targetId ? 'TOP7' : targetId,
        }));
      } else if (category === 'short') {
        const targetId = item.id === 'NONE' ? 'BOTTOM6' : item.id;
        setAvatarConfig((prev) => ({
          ...prev,
          bottoms: prev.bottoms === targetId ? 'BOTTOM6' : targetId,
        }));
      } else {
        const configKey = categoryToConfigKey[category];
        const targetId = item.id === 'NONE' ? '' : item.id;
        setAvatarConfig((prev) => ({
          ...prev,
          [configKey]: prev[configKey] === targetId ? '' : targetId,
        }));
      }
    } else {
      setRoomConfig({ room: item.id });
    }
  };

  const handleSaveOrBuyClick = () => {
    if (pendingUnownedItems.length > 0) {
      setShowCheckoutModal(true);
    } else {
      saveCustomization();
    }
  };

  const saveCustomization = () => {
    if (activeMode === 'avatar') {
      localStorage.setItem('user_avatar_config', JSON.stringify(avatarConfig));
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: avatarConfig }));
    } else {
      localStorage.setItem('user_furniture_config', JSON.stringify(roomConfig));
      window.dispatchEvent(new CustomEvent('furniture-updated', { detail: roomConfig }));
    }
    alert('Customization Saved!');
  };

  const handleConfirmPurchase = () => {
    if (!hasEnoughCoins) return;

    updateCoins(userCoins - totalCost);

    const newlyUnlockedIds = pendingUnownedItems.map((item) => item.id);
    const updatedUnlockedList = [...unlockedItems, ...newlyUnlockedIds];

    setUnlockedItems(updatedUnlockedList);
    localStorage.setItem('user_unlocked_assets', JSON.stringify(updatedUnlockedList));

    saveCustomization();
    setShowCheckoutModal(false);
  };

  const renderAssetButton = (item, type = null) => {
    const isUnlocked = unlockedItems.includes(item.id) || item.price === 0;

    let isEquipped = false;
    if (activeMode === 'avatar') {
      if (avatarCategory === 'skin & face') {
        isEquipped = avatarConfig[type] === item.id;
      } else if (avatarCategory === 'clothe') {
        isEquipped = avatarConfig.tops === (item.id === 'NONE' ? 'TOP7' : item.id);
      } else if (avatarCategory === 'short') {
        isEquipped = avatarConfig.bottoms === (item.id === 'NONE' ? 'BOTTOM6' : item.id);
      } else {
        const configKey = categoryToConfigKey[avatarCategory];
        isEquipped = (avatarConfig[configKey] || '') === (item.id === 'NONE' ? '' : item.id);
      }
    } else {
      isEquipped = roomConfig.room === item.id;
    }

    const catKey = type || (activeMode === 'avatar' ? avatarCategory : 'room');
    const thumbOffset = THUMBNAIL_OFFSETS[catKey] || { translateX: '0px', translateY: '0px', scale: 1.2 };

    const folder =
      activeMode === 'avatar'
        ? avatarCategory === 'skin & face'
          ? type.toUpperCase()
          : avatarCategory === 'clothe'
          ? 'TOPS'
          : avatarCategory === 'short'
          ? 'BOTTOMS'
          : avatarCategory === 'accessory'
          ? 'ACCESSORIES'
          : avatarCategory === 'shoe'
          ? 'SHOES'
          : avatarCategory.toUpperCase()
        : 'ROOMS';

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick({ ...item, type }, activeMode === 'avatar' ? avatarCategory : roomCategory)}
        className={`relative flex flex-col items-center justify-between p-2 rounded-[8px] border-2 transition-all cursor-pointer min-h-[110px] ${
          isEquipped
            ? 'border-[#E87339] bg-[#FDE4D0] ring-2 ring-[#E87339]'
            : 'border-[#3D2013] bg-[#FAE9CE] hover:bg-[#FDE4D0]'
        }`}
      >
        <div className="w-full flex-1 flex items-center justify-center overflow-hidden relative">
          {item.id === 'NONE' ? (
            <span className="font-pressstart text-[9px] text-[#3D2013]/60">NONE</span>
          ) : (
            <img
              src={`${baseUrl}ASSETS/${folder}/${item.id}.png`}
              alt={item.id}
              className="w-full h-20 object-contain pointer-events-none transition-transform"
              style={{
                transform: `translate(${thumbOffset.translateX}, ${thumbOffset.translateY}) scale(${thumbOffset.scale})`,
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
        </div>

        <div className="w-full flex items-center justify-between mt-1 pt-1 border-t border-[#3D2013]/10">
          <span className="font-pressstart text-[7px] text-[#3D2013] truncate">{item.id}</span>
          {isUnlocked ? (
            <span className="font-pressstart text-[7px] text-[#E87339]">
              {isEquipped ? 'EQUIPPED' : 'OWNED'}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <img src={coinIconUrl} alt="coin" className="w-3 h-3 object-contain" />
              <span className="font-pressstart text-[7px] text-[#E87339]">{item.price}</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5 pb-10">
      {/* ROW 1: TITLE & SUBTEXT */}
      <div className="flex flex-col gap-1">
        <h1 className="font-pressstart text-3xl sm:text-4xl md:text-5xl inline-block bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent w-fit">
          PROFILE
        </h1>
        <p className="font-pressstart text-[10px] sm:text-xs text-[#3D2013]/80">
          Customize your avatar and room to make it yours.
        </p>
      </div>

      {/* ROW 2: NAVIGATION TABS CONTAINER */}
      <div className="flex items-center bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[10px] p-1.5 w-full lg:w-[700px] gap-2">
        <button
          onClick={() => setActiveMode('avatar')}
          className={`flex-1 font-pressstart text-[10px] sm:text-[12px] py-2.5 text-center cursor-pointer transition-all ${
            activeMode === 'avatar'
              ? 'text-[#E16F37] border-b-2 border-[#E16F37]'
              : 'text-[#3D2013] border-b-2 border-transparent hover:text-[#E16F37]'
          }`}
        >
          AVATAR
        </button>
        <button
          onClick={() => setActiveMode('room')}
          className={`flex-1 font-pressstart text-[10px] sm:text-[12px] py-2.5 text-center cursor-pointer transition-all ${
            activeMode === 'room'
              ? 'text-[#E16F37] border-b-2 border-transparent hover:text-[#E16F37]'
              : 'text-[#3D2013] border-b-2 border-transparent hover:text-[#E16F37]'
          }`}
        >
          ROOM
        </button>
      </div>

      {/* ROW 3: MAIN CUSTOMIZATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PREVIEW CONTAINER */}
        <div className="order-1 lg:order-2 lg:col-span-5 p-4 sm:p-6 flex flex-col items-center justify-between gap-4 min-h-[300px] sm:min-h-[380px]">
          <div className="w-full flex flex-col items-center">

            <div className="relative w-full h-[250px] sm:h-[320px] flex items-center justify-center p-2 sm:p-4">
              {activeMode === 'avatar' ? (
                <div className="relative w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] flex items-center justify-center">
                  {/* PLATFORM BASE BEHIND AVATAR */}
                  <img
                    src={platformIconUrl}
                    alt="Platform Base"
                    className="absolute top-40 sm:top-45 left-1/2 -translate-x-1/2 w-[180px] sm:w-[210px] object-contain pointer-events-none z-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />

{/* NAME TAG ABOVE AVATAR */}
<div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#000000]/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-[4px] whitespace-nowrap shadow-md pointer-events-none flex items-center justify-center z-30">
  <span className="font-pressstart text-[6px] sm:text-[8px] text-[#FFFFFF] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
    {playerData?.username || 'ACORN_HERO'}
  </span>
</div>

                  {/* AVATAR CHARACTER */}
                  <CustomAvatar config={avatarConfig} state="idle" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <CustomRoom config={roomConfig} />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSaveOrBuyClick}
            className="w-full font-pressstart text-xs py-3 border-2 border-[#3D2013] rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer bg-[#E87339] text-[#FFFFF6] hover:bg-[#d6652d] flex items-center justify-center gap-2 mt-5"
          >
            {pendingUnownedItems.length > 0 ? (
              <>
                <span>Buy & Save (</span>
                <img src={coinIconUrl} alt="coin" className="w-4 h-4 object-contain inline-block" />
                <span>{totalCost})</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        {/* CUSTOMIZATION SELECTOR */}
        <div className="order-2 lg:order-1 lg:col-span-7 bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[12px] p-4 sm:p-6 flex flex-col gap-4 shadow-md">
          {activeMode === 'avatar' ? (
            <div className="flex items-center gap-0 border-b border-[#3D2013]/20 overflow-x-auto">
              {Object.keys(AVATAR_CATALOG).map((cat) => {
                const isActive = avatarCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setAvatarCategory(cat)}
                    title={cat.toUpperCase()}
                    className={`flex-1 min-w-[50px] py-3 px-3 transition-all cursor-pointer flex items-center justify-center border-b-[3px] ${
                      isActive
                        ? 'bg-[#F9D2B5] text-[#23170F] border-[#E87339]'
                        : 'bg-transparent text-[#A39286] border-transparent hover:text-[#3D2013] hover:bg-[#F9D2B5]/40'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-0 border-b border-[#3D2013]/20 overflow-x-auto">
              {Object.keys(ROOM_CATALOG).map((cat) => {
                const isActive = roomCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setRoomCategory(cat)}
                    title={cat.toUpperCase()}
                    className={`flex-1 min-w-[50px] py-3 px-3 transition-all cursor-pointer flex items-center justify-center border-b-[3px] ${
                      isActive
                        ? 'bg-[#F9D2B5] text-[#23170F] border-[#E87339]'
                        : 'bg-transparent text-[#A39286] border-transparent hover:text-[#3D2013] hover:bg-[#F9D2B5]/40'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]}
                  </button>
                );
              })}
            </div>
          )}

          <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto pr-1 flex flex-col gap-4">
            {activeMode === 'avatar' && avatarCategory === 'skin & face' ? (
              <>
                <div className="flex flex-col gap-2">
                  <div className="border-b border-[#3D2013]/20 pb-1">
                    <span className="font-pressstart text-[9px] sm:text-[10px] text-[#E87339]">
                      SKIN TONE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {AVATAR_CATALOG['skin & face'].body.map((item) => renderAssetButton(item, 'body'))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <div className="border-b border-[#3D2013]/20 pb-1">
                    <span className="font-pressstart text-[9px] sm:text-[10px] text-[#E87339]">
                      FACE EXPRESSION
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {AVATAR_CATALOG['skin & face'].face.map((item) => renderAssetButton(item, 'face'))}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {(activeMode === 'avatar'
                  ? AVATAR_CATALOG[avatarCategory]
                  : ROOM_CATALOG[roomCategory]
                ).map((item) => renderAssetButton(item))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CHECKOUT / BUY MODAL ==================== */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#3D2013]/70 backdrop-blur-xs">
          <div className="bg-[#FEF4E0] border-2 border-[#3D2013] rounded-[16px] w-full max-w-md p-5 shadow-2xl flex flex-col gap-4">
            <div className="border-b-2 border-[#3D2013]/20 pb-2">
              <h3 className="font-pressstart text-xs sm:text-sm text-[#3D2013]">Buy these items?</h3>
            </div>

            {/* CHECKOUT CARDS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[260px] overflow-y-auto p-1">
              {pendingUnownedItems.map((item) => {
                const offset = THUMBNAIL_OFFSETS[item.catKey] || { translateX: '0px', translateY: '0px', scale: 1.2 };

                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center justify-between p-2.5 rounded-[12px] bg-[#FAF3E0] border-2 border-[#3D2013] aspect-square relative overflow-hidden"
                  >
                    {/* ASSET IMAGE PREVIEW CARD */}
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={`${baseUrl}ASSETS/${item.folder}/${item.id}.png`}
                        alt={item.id}
                        className="w-full h-16 object-contain pointer-events-none transition-transform"
                        style={{
                          transform: `translate(${offset.translateX}, ${offset.translateY}) scale(${offset.scale})`,
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>

                    {/* CARD PRICE BADGE */}
                    <div className="w-full bg-[#FEF4E0] border border-[#3D2013] rounded-full py-1 px-2 flex items-center justify-center gap-1 mt-1">
                      <img src={coinIconUrl} alt="coin" className="w-3.5 h-3.5 object-contain" />
                      <span className="font-pressstart text-[8px] text-[#3D2013]">{item.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TOTAL & INSUFFICIENT FUNDS ERROR */}
            <div className="border-t-2 border-[#3D2013]/20 pt-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-pressstart text-[10px] text-[#3D2013]">Total:</span>
                <div className="flex items-center gap-1">
                  <img src={coinIconUrl} alt="coin" className="w-3.5 h-3.5 object-contain" />
                  <span className="font-pressstart text-[10px] text-[#E87339]">{totalCost}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-pressstart text-[8px] text-[#3D2013]/70">Your Balance:</span>
                <div className="flex items-center gap-1">
                  <img src={coinIconUrl} alt="coin" className="w-3 h-3 object-contain" />
                  <span className="font-pressstart text-[8px] text-[#3D2013]">{userCoins}</span>
                </div>
              </div>

              {!hasEnoughCoins && (
                <p className="font-pressstart text-[8px] text-red-600 mt-2 text-center">
                  Error: You do not have enough coins!
                </p>
              )}
            </div>

            {/* FOOTER BUTTONS */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 font-pressstart text-[10px] py-2.5 bg-[#FAE9CE] text-[#3D2013] border border-[#3D2013] rounded-[6px] hover:bg-[#FDE4D0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={!hasEnoughCoins}
                className={`flex-1 font-pressstart text-[10px] py-2.5 border border-[#3D2013] rounded-[6px] transition-all ${
                  hasEnoughCoins
                    ? 'bg-[#E87339] text-[#FFFFF6] hover:bg-[#d6652d] cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}