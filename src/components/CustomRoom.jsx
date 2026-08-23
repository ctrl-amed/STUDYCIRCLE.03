import React from 'react';

const DEFAULT_FURNITURE_CONFIG = { room: 'ROOM1' };

export default function CustomRoom({ config }) {
  const savedConfig = React.useMemo(() => {
    if (config) return config;
    try {
      const saved = localStorage.getItem('user_furniture_config');
      return saved ? JSON.parse(saved) : DEFAULT_FURNITURE_CONFIG;
    } catch {
      return DEFAULT_FURNITURE_CONFIG;
    }
  }, [config]);

  const roomName = savedConfig.room || 'ROOM1';
  // Prepends base path (e.g. /STUDYCIRCLE.03/ASSETS/ROOMS/ROOM1.png)
  const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
    ? import.meta.env.BASE_URL 
    : `${import.meta.env.BASE_URL}/`;
  const imagePath = `${baseUrl}ASSETS/ROOMS/${roomName}.png`;

  return (
    <div className="room-container relative w-full h-full flex items-center justify-center">
      <img
        src={imagePath}
        alt="Room Background"
        className="w-full h-full object-contain drop-shadow-md pointer-events-none"
        onError={(e) => console.error('Room image failed to load at path:', e.target.src)}
      />
    </div>
  );
}