import DexarisIcon from './DexarisIcon';

interface DexarisLogoProps {
  iconSize?: number;
  fontSize?: number;
}

export default function DexarisLogo({ iconSize = 28, fontSize = 18 }: DexarisLogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <DexarisIcon size={iconSize} />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500,
          fontSize: `${fontSize}px`,
          letterSpacing: '0.12em',
          color: '#E8E6FF',
          lineHeight: 1,
        }}
      >
        DEXARIS
      </span>
    </div>
  );
}