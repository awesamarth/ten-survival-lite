interface StickFigureProps {
  color?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function StickFigure({ 
  color = '#000000', 
  size = 'medium',
  className = '' 
}: StickFigureProps) {
  const sizeMap = {
    small: { width: 85, height: 120 },
    medium: { width: 100, height: 140 },
    large: { width: 170, height: 240 }
  };

  const dimensions = sizeMap[size];

  return (
    <svg 
      width={dimensions.width} 
      height={dimensions.height} 
      viewBox="0 0 170 240"
      className={className}
    >
      <g>
        <path 
          d="m 31.32353,106.79411 55.88236,16.47059 51.47058,-17.35294" 
          style={{
            fill: 'none',
            stroke: color,
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
        />
        <path 
          d="M 46.61765,216.49999 87.5,156.20587 l 31.76471,59.70589" 
          style={{
            fill: 'none',
            stroke: color,
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
        />
        <path 
          d="M 87.52805,156.31517 V 91.94766" 
          style={{
            fill: 'none',
            stroke: color,
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
        />
        <ellipse 
          cx="88.186562" 
          cy="57.841484" 
          rx="37.282658" 
          ry="34.34148"
          style={{
            fill: 'none',
            stroke: color,
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
        />
      </g>
    </svg>
  );
}