import React from 'react';

export interface AvatarEquipped {
  cap?: string;
  sunglasses?: string;
  jacket?: string;
  pants?: string;
  shoes?: string;
}

export interface AvatarDisplayProps {
  gender?: 'man' | 'woman';
  equipped?: AvatarEquipped;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  gender = 'man',
  equipped = {},
  size = 'md',
  className = ''
}) => {
  const cap = equipped?.cap || 'none';
  const sunglasses = equipped?.sunglasses || 'none';
  const jacket = equipped?.jacket || 'default_tee';
  const pants = equipped?.pants || 'default_jeans';
  const shoes = equipped?.shoes || 'default_sneakers';

  // Dimensions based on size
  const sizeMap = {
    sm: { width: 44, height: 60 },
    md: { width: 110, height: 150 },
    lg: { width: 180, height: 250 },
    xl: { width: 260, height: 360 }
  };

  const { width, height } = sizeMap[size] || sizeMap.md;

  // Colors based on equipped items
  const getJacketColor = () => {
    switch (jacket) {
      case 'top_hoodie': return '#2563eb'; // Royal Blue
      case 'top_varsity': return '#1e3a8a'; // Navy Blue
      case 'top_leather': return '#18181b'; // Black Leather
      case 'top_formal': return '#f8fafc'; // Crisp White
      case 'default_tee':
      default: return '#64748b'; // Slate Grey
    }
  };

  const getPantsColor = () => {
    switch (pants) {
      case 'pants_cargo': return '#3f6212'; // Olive Green
      case 'pants_joggers': return '#09090b'; // Midnight Black
      case 'pants_formal': return '#334155'; // Charcoal Slate
      case 'default_jeans':
      default: return '#1e40af'; // Indigo Denim
    }
  };

  const getShoesColor = () => {
    switch (shoes) {
      case 'shoes_running': return '#84cc16'; // Lime Neon
      case 'shoes_boots': return '#78350f'; // Brown Leather
      case 'default_sneakers':
      default: return '#f1f5f9'; // Crisp White
    }
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 200 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm transition-all duration-300"
      >
        {/* Soft Background Glow for Studio */}
        <circle cx="100" cy="140" r="90" fill="#f8fafc" />

        {/* ================= 1. SHADOW ================= */}
        <ellipse cx="100" cy="265" rx="55" ry="9" fill="#e2e8f0" />

        {/* ================= 2. LEGS & PANTS ================= */}
        {/* Left Leg */}
        <rect
          x="72"
          y="155"
          width="24"
          height="80"
          rx="10"
          fill={getPantsColor()}
        />
        {/* Right Leg */}
        <rect
          x="104"
          y="155"
          width="24"
          height="80"
          rx="10"
          fill={getPantsColor()}
        />
        {/* Pants details */}
        {pants === 'pants_cargo' && (
          <>
            <rect x="68" y="185" width="8" height="20" rx="3" fill="#365314" />
            <rect x="124" y="185" width="8" height="20" rx="3" fill="#365314" />
          </>
        )}
        {pants === 'default_jeans' && (
          <>
            <path d="M 84 165 L 84 225" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
            <path d="M 116 165 L 116 225" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
          </>
        )}

        {/* ================= 3. SHOES ================= */}
        {/* Left Shoe */}
        <path
          d="M 64 235 C 64 230 76 230 84 230 L 96 230 C 96 242 90 252 86 254 L 62 254 C 60 250 64 240 64 235 Z"
          fill={getShoesColor()}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        {/* Right Shoe */}
        <path
          d="M 136 235 C 136 230 124 230 116 230 L 104 230 C 104 242 110 252 114 254 L 138 254 C 140 250 136 240 136 235 Z"
          fill={getShoesColor()}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* ================= 4. BODY & TORSO ================= */}
        {/* Neck */}
        <rect x="91" y="78" width="18" height="22" rx="6" fill="#fcd34d" />

        {/* Torso Base / Jacket */}
        <path
          d="M 62 96 C 62 90 76 86 100 86 C 124 86 138 90 138 96 L 134 162 C 134 166 128 170 120 170 L 80 170 C 72 170 66 166 66 162 Z"
          fill={getJacketColor()}
        />

        {/* Arms */}
        {/* Left Arm */}
        <rect
          x="48"
          y="98"
          width="18"
          height="62"
          rx="9"
          transform="rotate(10 48 98)"
          fill={jacket === 'top_varsity' ? '#f8fafc' : getJacketColor()}
        />
        {/* Left Hand */}
        <circle cx="48" cy="168" r="9" fill="#fcd34d" />

        {/* Right Arm */}
        <rect
          x="134"
          y="102"
          width="18"
          height="62"
          rx="9"
          transform="rotate(-10 134 102)"
          fill={jacket === 'top_varsity' ? '#f8fafc' : getJacketColor()}
        />
        {/* Right Hand */}
        <circle cx="152" cy="168" r="9" fill="#fcd34d" />

        {/* Jacket Style Overlays */}
        {jacket === 'top_varsity' && (
          <>
            <path d="M 85 94 L 100 125 L 115 94" fill="#f8fafc" />
            <circle cx="82" cy="118" r="6" fill="#e11d48" />
            <text x="79" y="122" fontSize="9" fontWeight="bold" fill="#ffffff">S</text>
            <path d="M 100 125 L 100 170" stroke="#f8fafc" strokeWidth="2" strokeDasharray="4 4" />
          </>
        )}

        {jacket === 'top_hoodie' && (
          <>
            <path d="M 88 100 C 88 114 112 114 112 100" stroke="#1d4ed8" strokeWidth="3" fill="none" />
            <rect x="80" y="135" width="40" height="22" rx="6" fill="#1e40af" />
          </>
        )}

        {jacket === 'top_leather' && (
          <>
            <path d="M 100 95 L 85 165" stroke="#a1a1aa" strokeWidth="2" />
            <path d="M 75 102 L 92 114" stroke="#71717a" strokeWidth="2.5" />
            <path d="M 125 102 L 108 114" stroke="#71717a" strokeWidth="2.5" />
          </>
        )}

        {jacket === 'top_formal' && (
          <>
            {/* White Collar & Burgundy Tie */}
            <path d="M 88 88 L 100 102 L 112 88" fill="#e2e8f0" />
            <path d="M 98 98 L 102 98 L 104 140 L 100 148 L 96 140 Z" fill="#991b1b" />
          </>
        )}

        {/* ================= 5. HEAD & HAIR ================= */}
        {/* Head Skin */}
        <circle cx="100" cy="54" r="28" fill="#fcd34d" />

        {/* Woman Hair Flow (Behind shoulders) */}
        {gender === 'woman' && (
          <path
            d="M 68 50 C 64 75 62 105 70 120 C 74 95 76 80 82 72 Z"
            fill="#7c2d12"
          />
        )}
        {gender === 'woman' && (
          <path
            d="M 132 50 C 136 75 138 105 130 120 C 126 95 124 80 118 72 Z"
            fill="#7c2d12"
          />
        )}

        {/* Base Hair (if no full cap) */}
        {cap === 'none' && (
          <>
            {gender === 'man' ? (
              // Stylish modern fade haircut
              <path
                d="M 72 50 C 72 32 84 24 100 24 C 116 24 128 32 128 50 C 128 46 122 36 100 36 C 78 36 72 46 72 50 Z"
                fill="#1e293b"
              />
            ) : (
              // Chic woman ponytail / volume
              <>
                <path
                  d="M 70 52 C 70 30 84 22 100 22 C 116 22 130 30 130 52 C 122 36 112 32 100 32 C 86 32 76 38 70 52 Z"
                  fill="#7c2d12"
                />
                <circle cx="128" cy="40" r="12" fill="#7c2d12" />
              </>
            )}
          </>
        )}

        {/* Face Details: Eyes & Friendly Smile */}
        <circle cx="91" cy="52" r="3" fill="#1e293b" />
        <circle cx="109" cy="52" r="3" fill="#1e293b" />
        {/* Smile */}
        <path d="M 94 62 C 94 67 106 67 106 62" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        {/* Rosy Cheeks */}
        <circle cx="85" cy="58" r="4" fill="#fca5a5" opacity="0.6" />
        <circle cx="115" cy="58" r="4" fill="#fca5a5" opacity="0.6" />

        {/* ================= 6. SUNGLASSES ================= */}
        {sunglasses === 'shades_aviator' && (
          <g>
            <path d="M 83 48 L 117 48" stroke="#d97706" strokeWidth="2" />
            <path d="M 83 50 C 83 46 97 46 97 50 C 97 59 83 59 83 50 Z" fill="#b45309" stroke="#d97706" strokeWidth="1.5" />
            <path d="M 103 50 C 103 46 117 46 117 50 C 117 59 103 59 103 50 Z" fill="#b45309" stroke="#d97706" strokeWidth="1.5" />
          </g>
        )}

        {sunglasses === 'shades_retro' && (
          <g>
            <rect x="80" y="47" width="18" height="13" rx="3" fill="#09090b" stroke="#27272a" strokeWidth="2" />
            <rect x="102" y="47" width="18" height="13" rx="3" fill="#09090b" stroke="#27272a" strokeWidth="2" />
            <rect x="97" y="49" width="6" height="3" fill="#27272a" />
          </g>
        )}

        {sunglasses === 'shades_cyber' && (
          <g>
            <path
              d="M 78 46 L 122 46 L 118 60 L 82 60 Z"
              fill="#06b6d4"
              opacity="0.85"
              stroke="#22d3ee"
              strokeWidth="2"
            />
            <path d="M 84 52 L 116 52" stroke="#ecfeff" strokeWidth="1.5" strokeDasharray="4 2" />
          </g>
        )}

        {/* ================= 7. CAPS & HATS ================= */}
        {cap === 'cap_baseball' && (
          <g>
            {/* Crown */}
            <path d="M 72 48 C 72 26 84 20 100 20 C 116 20 128 26 128 48 Z" fill="#e11d48" />
            {/* Front Badge */}
            <circle cx="100" cy="34" r="5" fill="#ffffff" />
            <text x="97.5" y="38" fontSize="8" fontWeight="bold" fill="#e11d48">S</text>
            {/* Visor */}
            <path d="M 66 46 C 66 44 80 44 100 44 C 120 44 140 46 142 50 C 132 54 100 52 66 46 Z" fill="#be123c" />
          </g>
        )}

        {cap === 'cap_beanie' && (
          <g>
            <path d="M 70 50 C 70 20 84 14 100 14 C 116 14 130 20 130 50 Z" fill="#059669" />
            {/* Folded rim */}
            <rect x="68" y="42" width="64" height="12" rx="4" fill="#047857" />
            <path d="M 74 42 L 74 54 M 82 42 L 82 54 M 90 42 L 90 54 M 100 42 L 100 54 M 110 42 L 110 54 M 120 42 L 120 54 M 126 42 L 126 54" stroke="#065f46" strokeWidth="1" />
          </g>
        )}

        {cap === 'cap_bucket' && (
          <g>
            <path d="M 78 44 C 78 28 86 24 100 24 C 114 24 122 28 122 44 Z" fill="#d97706" />
            <ellipse cx="100" cy="44" rx="36" ry="10" fill="#b45309" />
            <ellipse cx="100" cy="43" rx="34" ry="8" fill="#d97706" />
          </g>
        )}

        {cap === 'cap_grad' && (
          <g>
            {/* Cap Base */}
            <path d="M 85 44 C 85 36 100 36 115 44 Z" fill="#1e1b4b" />
            {/* Mortarboard Diamond */}
            <polygon points="100,16 144,30 100,42 56,30" fill="#0f172a" stroke="#312e81" strokeWidth="1.5" />
            {/* Golden Button & Tassel */}
            <circle cx="100" cy="29" r="3" fill="#fbbf24" />
            <path d="M 100 29 C 115 32 128 38 128 50" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
            <circle cx="128" cy="52" r="3" fill="#f59e0b" />
          </g>
        )}

      </svg>
    </div>
  );
};
