import { motion } from "framer-motion"

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M${-380 - i * 5 * position} ${-189 + i * 33}C${-380 - i * 5 * position} ${-189 + i * 33} ${-312 - i * 5 * position} ${216 - i * 28} ${152 - i * 5 * position} ${343 - i * 22}C${616 - i * 5 * position} ${470 - i * 15} ${684 - i * 5 * position} ${875 - i * 8} ${684 - i * 5 * position} ${875 - i * 8}`,
    width: 0.5 + i * 0.03,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="#6B4FFF"
            strokeWidth={path.width}
            strokeOpacity={0.12 + path.id * 0.005}
            initial={{ pathLength: 0.3, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0, 0.4 + path.id * 0.01, 0],
              pathOffset: [0, 1],
            }}
            transition={{
              duration: 18 + Math.random() * 8,
              repeat: Infinity,
              ease: "linear",
              delay: path.id * 0.3,
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export function BackgroundPaths() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  )
}
