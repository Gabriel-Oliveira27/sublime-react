export default function BanknotesIcon({ size = 80, color = '#2D9E6B' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Back bill */}
      <rect x="8" y="20" width="62" height="36" rx="5" fill="#d4edda" stroke={color} strokeWidth="2"/>
      <rect x="12" y="24" width="54" height="28" rx="3" fill="#e8f5e9"/>

      {/* Front bill */}
      <rect x="4" y="26" width="62" height="36" rx="5" fill="#c8e6c9" stroke={color} strokeWidth="2"/>
      <rect x="8" y="30" width="54" height="28" rx="3" fill="#e8f5e9"/>

      {/* Dollar symbol */}
      <circle cx="35" cy="44" r="12" fill={color} opacity=".15" stroke={color} strokeWidth="1.5"/>
      <text x="35" y="50" textAnchor="middle" fontSize="16" fontWeight="700" fill={color} fontFamily="Arial, sans-serif">$</text>

      {/* Decorative lines (bill pattern) */}
      <line x1="10" y1="36" x2="22" y2="36" stroke={color} strokeWidth="1.5" opacity=".4" strokeLinecap="round"/>
      <line x1="10" y1="40" x2="18" y2="40" stroke={color} strokeWidth="1.5" opacity=".4" strokeLinecap="round"/>
      <line x1="50" y1="36" x2="62" y2="36" stroke={color} strokeWidth="1.5" opacity=".4" strokeLinecap="round"/>
      <line x1="54" y1="40" x2="62" y2="40" stroke={color} strokeWidth="1.5" opacity=".4" strokeLinecap="round"/>
      <line x1="10" y1="52" x2="22" y2="52" stroke={color} strokeWidth="1.5" opacity=".4" strokeLinecap="round"/>
      <line x1="50" y1="52" x2="62" y2="52" stroke={color} strokeWidth="1.5" opacity=".4" strokeLinecap="round"/>
    </svg>
  );
}
