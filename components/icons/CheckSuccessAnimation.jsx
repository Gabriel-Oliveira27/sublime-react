export default function CheckSuccessAnimation({ size = 100 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sucesso"
    >
      <style>{`
        @keyframes scaleIn {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes strokeDraw {
          0%   { stroke-dashoffset: 120; opacity: 0; }
          30%  { opacity: 1; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulseRing {
          0%   { r: 44; opacity: .6; }
          100% { r: 50; opacity: 0; }
        }
        .check-bg    { animation: scaleIn .5s cubic-bezier(.34,1.56,.64,1) .1s both; transform-origin: 50% 50%; }
        .check-mark  { stroke-dasharray: 120; animation: strokeDraw .5s ease .45s both; }
        .check-ring  { animation: pulseRing .8s ease-out .6s infinite; transform-origin: 50% 50%; fill: none; }
      `}</style>

      {/* Pulse ring */}
      <circle className="check-ring" cx="50" cy="50" r="44" stroke="#2D9E6B" strokeWidth="2" opacity=".6"/>

      {/* Green circle background */}
      <circle className="check-bg" cx="50" cy="50" r="42" fill="#2D9E6B"/>

      {/* Inner lighter circle */}
      <circle cx="50" cy="50" r="42" fill="url(#g)"/>
      <defs>
        <radialGradient id="g" cx="40%" cy="35%">
          <stop offset="0%" stopColor="rgba(255,255,255,.25)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>

      {/* Checkmark */}
      <polyline
        className="check-mark"
        points="28,52 42,66 72,36"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
