interface DexarisIconProps {
  size?: number;
}

export default function DexarisIcon({ size = 32 }: DexarisIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="20" width="9" height="14" fill="rgba(20,184,184,0.35)" rx="2" />
      <rect x="12" y="10" width="9" height="24" fill="rgba(20,184,184,0.65)" rx="2" />
      <rect x="24" y="1" width="9" height="33" fill="#14B8B8" rx="2" />
    </svg>
  );
}