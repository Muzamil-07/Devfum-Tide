import * as THREE from "three"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { WobbleBubble } from "./WobbleBubble"

const rand = (a, b) => a + Math.random() * (b - a)

function Bubble({
  id,
  waterY,
  topY,
  x,
  z,
  onDone,
  riseSpeedRange,
  radiusRange,
  driftRange,
  startDelayRange,
  bobAmount,
}) {
  const g = useRef()
  const age = useRef(0)

  const cfg = useMemo(() => {
    const radius = rand(radiusRange[0], radiusRange[1])
    const speed = rand(riseSpeedRange[0], riseSpeedRange[1])

    // slight horizontal drift while rising
    const drift = new THREE.Vector3(
      rand(-driftRange[0], driftRange[0]),
      0,
      rand(-driftRange[1], driftRange[1])
    )

    // small random delay so all 3 don't move identically
    const startDelay = rand(startDelayRange[0], startDelayRange[1])

    // random phase for bob
    const phase = Math.random() * Math.PI * 2

    return { radius, speed, drift, startDelay, phase }
  }, [riseSpeedRange, radiusRange, driftRange, startDelayRange])

  useFrame((state, dt) => {
    if (!g.current) return
    age.current += dt

    if (age.current < cfg.startDelay) return

    // rise
    g.current.position.y += cfg.speed * dt

    // drift
    g.current.position.x += cfg.drift.x * dt
    g.current.position.z += cfg.drift.z * dt

    // subtle bob (optional)
    if (bobAmount > 0) {
      const t = state.clock.elapsedTime
      g.current.position.x += Math.sin(t * 1.2 + cfg.phase) * bobAmount
      g.current.position.z += Math.cos(t * 1.1 + cfg.phase) * bobAmount
    }

    // remove when it reaches the top
    if (g.current.position.y >= topY) onDone(id)
  })

  return (
    <group ref={g} position={[x, waterY, z]}>
      {/* Your existing wobbly glass bubble */}
      <WobbleBubble position={[0, 0, 0]} radius={cfg.radius} />
    </group>
  )
}

export function OneShotBubbles({
  // Water and disappearance height
  waterY = 0,
  topY = 80,

  // Always keep 3 (or you can change, but max 3)
  count = 3,

  // ✅ Spawn location control: [x, z]
  spawnCenter = [10, 30],

  // ✅ Spacing between bubbles
  spacing = 10,

  // ✅ Layout direction: "x" spreads along x, "z" spreads along z
  direction = "x", // "x" | "z"

  // ✅ Small randomness to avoid perfect clone look (set 0 for exact positions)
  jitter = 0.15,

  // ✅ Rise speed control (slow by default)
  riseSpeedRange = [1.0, 2.0],

  // Optional tuning
  radiusRange = [2.8, 6.0],
  driftRange = [0.12, 0.12],       // [xDrift, zDrift] (per second-ish)
  startDelayRange = [0.0, 0.6],
  bobAmount = 0.01,                // set 0 to disable bob
}) {
  const [bubbles, setBubbles] = useState([])

  // Spawn ONCE on mount (if inside <Suspense>, mount happens after loading)
  useEffect(() => {
    const n = Math.min(3, count)
    const [cx, cz] = spawnCenter
    const mid = (n - 1) / 2 // for 3 => 1, offsets => [-1,0,1] * spacing

    const created = Array.from({ length: n }, (_, i) => {
      const offset = (i - mid) * spacing

      const baseX = direction === "x" ? cx + offset : cx
      const baseZ = direction === "z" ? cz + offset : cz

      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: baseX + rand(-jitter, jitter),
        z: baseZ + rand(-jitter, jitter),
      }
    })

    setBubbles(created)
  }, []) // run once

  const remove = (id) => setBubbles((prev) => prev.filter((b) => b.id !== id))

  if (bubbles.length === 0) return null

  return (
    <group>
      {bubbles.map((b) => (
        <Bubble
          key={b.id}
          id={b.id}
          waterY={waterY}
          topY={topY}
          x={b.x}
          z={b.z}
          onDone={remove}
          riseSpeedRange={riseSpeedRange}
          radiusRange={radiusRange}
          driftRange={driftRange}
          startDelayRange={startDelayRange}
          bobAmount={bobAmount}
        />
      ))}
    </group>
  )
}
