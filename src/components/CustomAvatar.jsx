import React from 'react';

// =========================================================================
// ASSET LAYER POSITIONING & ALIGNMENT CONFIGURATION
// Edit translateX, translateY, or scale to center individual layer categories.
// =========================================================================
const LAYER_OFFSETS = {
  body: { translateX: '0px', translateY: '0px', scale: 1.0, z: 10 },
  bottoms: { translateX: '0px', translateY: '0px', scale: 1.0, z: 20 },
  shoes: { translateX: '0px', translateY: '0px', scale: 1.0, z: 25 },
  tops: { translateX: '0px', translateY: '0px', scale: 1.0, z: 30 },
  face: { translateX: '0px', translateY: '0px', scale: 1.0, z: 40 },
  hair: { translateX: '0px', translateY: '0px', scale: 1.0, z: 50 },
  accessories: { translateX: '0px', translateY: '0px', scale: 1.0, z: 60 },
};

const DEFAULT_AVATAR_CONFIG = {
  body: 'BODY1',
  face: 'FACE1',
  tops: 'TOP7',
  bottoms: 'BOTTOM6',
  shoes: '',
  hair: '',
  accessories: '',
};

export default function CustomAvatar({ config, state = 'idle' }) {
  const activeConfig = React.useMemo(() => {
    if (config) return config;
    try {
      const saved = localStorage.getItem('user_avatar_config');
      return saved ? { ...DEFAULT_AVATAR_CONFIG, ...JSON.parse(saved) } : DEFAULT_AVATAR_CONFIG;
    } catch {
      return DEFAULT_AVATAR_CONFIG;
    }
  }, [config]);

  const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
    ? import.meta.env.BASE_URL 
    : `${import.meta.env.BASE_URL}/`;

  const getAssetPath = (folder, assetName) => {
    if (!assetName || assetName.toUpperCase() === 'NONE') return null;
    return `${baseUrl}ASSETS/${folder}/${assetName}.png`;
  };

  const layers = [
    { id: 'body', folder: 'BODY', name: activeConfig.body },
    { id: 'bottoms', folder: 'BOTTOMS', name: activeConfig.bottoms },
    { id: 'shoes', folder: 'SHOES', name: activeConfig.shoes },
    { id: 'tops', folder: 'TOPS', name: activeConfig.tops },
    { id: 'face', folder: 'FACE', name: activeConfig.face },
    { id: 'hair', folder: 'HAIR', name: activeConfig.hair },
    { id: 'accessories', folder: 'ACCESSORIES', name: activeConfig.accessories },
  ];

  return (
    <div className={`avatar-container relative w-full h-full flex items-center justify-center state-${state}`}>
      {layers.map((layer) => {
        const src = getAssetPath(layer.folder, layer.name);
        if (!src) return null;

        const offset = LAYER_OFFSETS[layer.id] || { translateX: '0px', translateY: '0px', scale: 1.0, z: 10 };

        return (
          <img
            key={layer.id}
            src={src}
            alt={layer.id}
            className={`avatar-layer layer-${layer.id} absolute inset-0 w-full h-full object-contain pointer-events-none`}
            style={{
              zIndex: offset.z,
              transform: `translate(${offset.translateX}, ${offset.translateY}) scale(${offset.scale})`,
            }}
            onError={(e) => console.error(`Failed to load ${layer.id}:`, e.target.src)}
          />
        );
      })}
    </div>
  );
}