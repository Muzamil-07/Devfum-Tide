import * as THREE from "three"
import React, { useCallback, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { WobbleBubble } from "./WobbleBubble"

const rand = (a, b) => a + Math.random() * (b - a)

function Bubble({
  id,
  waterY,
  topY,
  area,
  onDone,
  // bubble tuning
  radiusRange = [2.5, 6],
  riseSpeedRange = [4, 10],
  driftRange = [0.2, 0.8],
}) {
  const g = useRef()

  const cfg = useMemo(() => {
    const radius = rand(radiusRange[0], radiusRange[1])
    const startX = rand(-area[0] / 2, area[0] / 2)
    const startZ = rand(-area[1] / 2, area[1] / 2)

    // small horizontal drift
    const drift = new THREE.Vector3(
      rand(-driftRange[1], driftRange[1]),
      0,
      rand(-driftRange[1], driftRange[1])
    )
    drift.multiplyScalar(rand(driftRange[0], driftRange[1]))

    const speed = rand(riseSpeedRange[0], riseSpeedRange[1])
    const wobblePhase = Math.random() * Math.PI * 2

    // lifetime fallback (in case topY is huge)
    const maxAge = rand(6, 12)

    return { radius, startX, startZ, drift, speed, wobblePhase, maxAge }
  }, [area, radiusRange, riseSpeedRange, driftRange])

  const age = useRef(0)

  useFrame((state, dt) => {
    if (!g.current) return

    age.current += dt

    // Rise
    g.current.position.y += cfg.speed * dt

    // Drift (slow)
    g.current.position.x += cfg.drift.x * dt
    g.current.position.z += cfg.drift.z * dt

    // Tiny bob so it feels alive
    const t = state.clock.elapsedTime
    g.current.position.x += Math.sin(t * 1.2 + cfg.wobblePhase) * 0.02
    g.current.position.z += Math.cos(t * 1.1 + cfg.wobblePhase) * 0.02

    // Gentle scale-in at birth
    const sIn = THREE.MathUtils.smoothstep(age.current, 0, 0.6)
    g.current.scale.setScalar(sIn)

    // Kill when reaches top or too old
    if (g.current.position.y >= topY || age.current >= cfg.maxAge) {
      onDone(id)
    }
  })

  return (
    <group ref={g} position={[cfg.startX, waterY, cfg.startZ]}>
      {/* WobbleBubble should be centered at [0,0,0] inside this group */}
      <WobbleBubble position={[0, 0, 0]} radius={cfg.radius} />
    </group>
  )
}

export function BubbleEmitter({
  waterY = 0,
  topY = 70,
  area = [120, 120], // XZ spawn area size
  maxBubbles = 3,
  spawnIntervalRange = [0.8, 2.2], // seconds
  bubbleRadiusRange = [2.5, 6],
  riseSpeedRange = [4, 10],
}) {
  const [bubbles, setBubbles] = useState([])
  const nextSpawnAt = useRef(0)

  const spawn = useCallback(() => {
    setBubbles((prev) => {
      if (prev.length >= maxBubbles) return prev
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      return [...prev, { id }]
    })
  }, [maxBubbles])

  const remove = useCallback((id) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id))
  }, [])

  useFrame((state) => {
    // schedule spawns
    if (state.clock.elapsedTime >= nextSpawnAt.current) {
      if (bubbles.length < maxBubbles) spawn()
      nextSpawnAt.current =
        state.clock.elapsedTime + rand(spawnIntervalRange[0], spawnIntervalRange[1])
    }
  })

  return (
    <group>
      {bubbles.map((b) => (
        <Bubble
          key={b.id}
          id={b.id}
          waterY={waterY}
          topY={topY}
          area={area}
          onDone={remove}
          radiusRange={bubbleRadiusRange}
          riseSpeedRange={riseSpeedRange}
        />
      ))}
    </group>
  )
}
