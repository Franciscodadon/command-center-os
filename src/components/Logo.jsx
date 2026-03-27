export default function Logo({ size = 28 }) {
  const s = size / 2 - 1
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top-left — filled gold (Q1) */}
      <rect x="1" y="1" width="12" height="12" rx="2" fill="#C9A84C" />
      {/* Top-right */}
      <rect x="15" y="1" width="12" height="12" rx="2" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.5" />
      {/* Bottom-left */}
      <rect x="1" y="15" width="12" height="12" rx="2" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.5" />
      {/* Bottom-right */}
      <rect x="15" y="15" width="12" height="12" rx="2" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.3" />
    </svg>
  )
}
