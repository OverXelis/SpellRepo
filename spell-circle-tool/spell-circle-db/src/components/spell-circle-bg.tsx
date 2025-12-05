'use client';

export function SpellCircleBg() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Main spell circle behind title */}
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[800px] h-[800px] opacity-[0.04] animate-spin-slow"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle */}
        <circle cx="200" cy="200" r="195" stroke="url(#gradient1)" strokeWidth="2" />
        <circle cx="200" cy="200" r="185" stroke="url(#gradient1)" strokeWidth="1" />
        <circle cx="200" cy="200" r="175" stroke="url(#gradient1)" strokeWidth="0.5" />
        
        {/* Middle decorative ring */}
        <circle cx="200" cy="200" r="150" stroke="url(#gradient2)" strokeWidth="1.5" strokeDasharray="8 4" />
        
        {/* Inner circles */}
        <circle cx="200" cy="200" r="120" stroke="url(#gradient1)" strokeWidth="1" />
        <circle cx="200" cy="200" r="80" stroke="url(#gradient2)" strokeWidth="0.75" />
        <circle cx="200" cy="200" r="40" stroke="url(#gradient1)" strokeWidth="0.5" />
        
        {/* Hexagram */}
        <polygon 
          points="200,50 280,150 280,250 200,350 120,250 120,150" 
          stroke="url(#gradient2)" 
          strokeWidth="1" 
          fill="none" 
        />
        <polygon 
          points="200,350 280,250 280,150 200,50 120,150 120,250" 
          stroke="url(#gradient1)" 
          strokeWidth="1" 
          fill="none" 
          transform="rotate(60 200 200)"
        />
        
        {/* Cross lines */}
        <line x1="200" y1="5" x2="200" y2="395" stroke="url(#gradient1)" strokeWidth="0.5" />
        <line x1="5" y1="200" x2="395" y2="200" stroke="url(#gradient1)" strokeWidth="0.5" />
        <line x1="55" y1="55" x2="345" y2="345" stroke="url(#gradient2)" strokeWidth="0.5" />
        <line x1="345" y1="55" x2="55" y2="345" stroke="url(#gradient2)" strokeWidth="0.5" />
        
        {/* Rune symbols around the circle */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <g key={i} transform={`rotate(${angle} 200 200)`}>
            <text
              x="200"
              y="25"
              textAnchor="middle"
              fill="url(#gradient1)"
              fontSize="12"
              fontFamily="serif"
            >
              {['✦', '◇', '✧', '◈', '✦', '◇', '✧', '◈'][i]}
            </text>
          </g>
        ))}
        
        {/* Small circles at cardinal points */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 200 + 160 * Math.cos(rad - Math.PI/2);
          const y = 200 + 160 * Math.sin(rad - Math.PI/2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="6"
              stroke="url(#gradient2)"
              strokeWidth="1"
              fill="none"
            />
          );
        })}
        
        {/* Gradients */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0095ff" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#0095ff" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#0095ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Smaller decorative circle - bottom right */}
      <svg
        className="absolute bottom-10 right-10 w-[300px] h-[300px] opacity-[0.03] animate-spin-slow"
        style={{ animationDirection: 'reverse', animationDuration: '90s' }}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="95" stroke="#0095ff" strokeWidth="1" />
        <circle cx="100" cy="100" r="75" stroke="#8b5cf6" strokeWidth="0.75" strokeDasharray="4 2" />
        <circle cx="100" cy="100" r="55" stroke="#0095ff" strokeWidth="0.5" />
        <polygon 
          points="100,15 150,75 150,125 100,185 50,125 50,75" 
          stroke="#8b5cf6" 
          strokeWidth="0.75" 
          fill="none" 
        />
      </svg>

      {/* Floating particles */}
      <div className="particle" style={{ top: '20%', left: '10%', animationDelay: '0s' }} />
      <div className="particle" style={{ top: '30%', left: '85%', animationDelay: '1s' }} />
      <div className="particle" style={{ top: '60%', left: '5%', animationDelay: '2s' }} />
      <div className="particle" style={{ top: '70%', left: '90%', animationDelay: '3s' }} />
      <div className="particle" style={{ top: '40%', left: '15%', animationDelay: '4s' }} />
      <div className="particle" style={{ top: '80%', left: '20%', animationDelay: '5s' }} />
      <div className="particle" style={{ top: '15%', left: '75%', animationDelay: '6s' }} />
      <div className="particle" style={{ top: '50%', left: '95%', animationDelay: '7s' }} />

      {/* Candle flicker light effects */}
      <div className="candle-light candle-light-left" />
      <div className="candle-light candle-light-right" />
      
      {/* Additional ambient light - top corners */}
      <div 
        className="fixed top-0 left-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.03) 0%, transparent 60%)',
        }}
      />
      <div 
        className="fixed top-0 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(0, 149, 255, 0.03) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}

