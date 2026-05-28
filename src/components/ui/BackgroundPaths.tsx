import { motion } from "framer-motion"

export function BackgroundPaths() {
  const paths = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    d: `M-100 ${80 + i * 28}C100 ${60 + i * 28} 300 ${100 + i * 24} 500 ${75 + i * 28}S900 ${55 + i * 28} 1500 ${80 + i * 28}`,
    width: 0.4 + i * 0.02,
    opacity: 0.2 + i * 0.013,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 1440 600" fill="none" preserveAspectRatio="xMidYMid slice">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="#6B4FFF"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0, path.opacity, path.opacity * 0.6, 0],
              pathOffset: [0, 1],
            }}
            transition={{
              duration: 14 + path.id * 0.5,
              repeat: Infinity,
              ease: "linear",
              delay: path.id * 0.4,
            }}
          />
        ))}
      </svg>
    </div>
  )
}
