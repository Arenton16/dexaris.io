import { motion } from "framer-motion"

export function BackgroundPaths() {
  const paths = Array.from({ length: 24 }, (_, i) => {
    const y = 70 + i * 26;
    return {
      id: i,
      // Resting shape — gentle horizontal wave
      d1: `M-100 ${y}C200 ${y - 22} 450 ${y + 28} 750 ${y - 12}S1150 ${y + 18} 1600 ${y}`,
      // Shifted shape — undulates up/down slightly for the twist
      d2: `M-100 ${y + 14}C200 ${y + 6} 450 ${y - 18} 750 ${y + 22}S1150 ${y - 8} 1600 ${y + 10}`,
      width: 0.7 + i * 0.04,
      strokeOpacity: 0.35 + i * 0.02,
    }
  })

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <svg
        style={{ width: '100%', height: '100%' }}
        viewBox="0 0 1440 700"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            stroke="#6B4FFF"
            strokeWidth={path.width}
            fill="none"
            initial={{ d: path.d1, pathLength: 0.35, pathOffset: 0, opacity: 0 }}
            animate={{
              d: [path.d1, path.d2, path.d1],
              pathOffset: [0, 1],
              opacity: [0, path.strokeOpacity, path.strokeOpacity, 0],
            }}
            transition={{
              d: {
                duration: 9 + path.id * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatType: 'mirror',
              },
              pathOffset: {
                duration: 13 + path.id * 0.45,
                repeat: Infinity,
                ease: 'linear',
                delay: path.id * 0.35,
              },
              opacity: {
                duration: 13 + path.id * 0.45,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: path.id * 0.35,
              },
            }}
          />
        ))}
      </svg>
    </div>
  )
}
