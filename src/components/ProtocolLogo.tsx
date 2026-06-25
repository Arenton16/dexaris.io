import { useState } from 'react';

interface Props {
  project: string;
  size?: number;
}

export function ProtocolLogo({ project, size = 20 }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="protocol-logo-placeholder">{project[0]}</span>;
  }

  return (
    <img
      src={`https://icons.llama.fi/${project}.png`}
      alt={project}
      width={size}
      height={size}
      className="protocol-logo"
      onError={() => setFailed(true)}
    />
  );
}
