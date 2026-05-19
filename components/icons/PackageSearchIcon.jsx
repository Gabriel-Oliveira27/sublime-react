export default function PackageSearchIcon({ size = 80, color = 'white' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Package body */}
      <rect x="10" y="28" width="44" height="36" rx="3" stroke={color} strokeWidth="3" fill="none"/>
      {/* Package lid top line */}
      <line x1="10" y1="38" x2="54" y2="38" stroke={color} strokeWidth="3"/>
      {/* Ribbon vertical */}
      <line x1="32" y1="28" x2="32" y2="64" stroke={color} strokeWidth="3"/>
      {/* Ribbon bow */}
      <path d="M32 38 Q24 30 20 34 Q16 38 32 38 Q48 38 44 34 Q40 30 32 38Z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round"/>

      {/* Location pin */}
      <circle cx="53" cy="20" r="9" fill="#E84D82" stroke="white" strokeWidth="2"/>
      <path d="M53 24.5 Q47.5 19.5 47.5 17.5a5.5 5.5 0 0 1 11 0Q58.5 19.5 53 24.5Z" fill="white" stroke="none"/>
      <circle cx="53" cy="17.5" r="2" fill="#E84D82"/>

      {/* Magnifier */}
      <circle cx="63" cy="55" r="10" stroke={color} strokeWidth="3" fill="none"/>
      <circle cx="63" cy="55" r="6" stroke={color} strokeWidth="2" fill="rgba(255,255,255,0.15)"/>
      <line x1="70" y1="62" x2="77" y2="69" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
