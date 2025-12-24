import * as THREE from "three"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { WobbleBubbleWithoutLight } from "./WobbleBubbleWithOutLight"

const rand = (a, b) => a + Math.random() * (b - a)
const randi = (a, bInclusive) => Math.floor(rand(a, bInclusive + 1))
const clamp01 = (v) => Math.max(0, Math.min(1, v))

function Bubble({
  id,
  waterY,
  topY,
  x,
  z,
  onDone,
  onProgress,
  riseSpeedRange,
  radiusRange,
  driftRange,
  startDelayRange,
  bobAmount,
}) {
  const g = useRef()
  const age = useRef(0)
  const vel = useRef(new THREE.Vector3())      // current velocity (x,y,z)
const riseBoost = useRef(0)                  // extra rise multiplier
const tmp = useRef(new THREE.Vector3())
const tmp2 = useRef(new THREE.Vector3())


const handleHoverMove = (e) => {
  if (!g.current) return

  // push away from hit point in XZ plane (changes direction)
  const center = g.current.getWorldPosition(tmp.current)
  const hit = e.point

  const away = tmp2.current.copy(center).sub(hit)
  away.y = 0
  const len = away.length()
  if (len > 1e-4) away.multiplyScalar(1 / len)

  // impulse sideways + slight upward kick
  vel.current.addScaledVector(away, 2.8)   // 👈 increase for stronger direction change
  vel.current.y += 0.8                      // small upward kick

  // also increase rise speed temporarily
  riseBoost.current = Math.min(1.2, riseBoost.current + 0.35) // up to +120%
}

const handleHoverOut = () => {
  // optional: let it naturally damp out (no need to zero)
}

  // ✅ cfg must NEVER change after bubble is created (prevents glitches)
  const cfgRef = useRef(null)
  if (!cfgRef.current) {
    const radius = rand(radiusRange[0], radiusRange[1])
    const speed = rand(riseSpeedRange[0], riseSpeedRange[1])
    const drift = new THREE.Vector3(
      rand(-driftRange[0], driftRange[0]),
      0,
      rand(-driftRange[1], driftRange[1])
    )
    const startDelay = rand(startDelayRange[0], startDelayRange[1])
    const phase = Math.random() * Math.PI * 2
    cfgRef.current = { radius, speed, drift, startDelay, phase }
  }

  // ✅ set initial position once
  useEffect(() => {
    if (!g.current) return
    g.current.position.set(x, waterY, z)
  }, [x, waterY, z])

  useFrame((state, dt) => {
    if (!g.current) return
    const cfg = cfgRef.current

    age.current += dt
    if (age.current < cfg.startDelay) {
      onProgress?.(id, 0)
      return
    }

    // rise
    g.current.position.y += cfg.speed * dt

    // drift
    g.current.position.x += cfg.drift.x * dt
    g.current.position.z += cfg.drift.z * dt

    // base upward speed (+ boost)
const boost = 1 + riseBoost.current
g.current.position.y += cfg.speed * boost * dt

// apply side velocity
g.current.position.addScaledVector(vel.current, dt)

// damping (smooth settle)
vel.current.multiplyScalar(Math.exp(-dt * 4.5))
riseBoost.current *= Math.exp(-dt * 3.0)

    // subtle bob
    if (bobAmount > 0) {
      const t = state.clock.elapsedTime
      g.current.position.x += Math.sin(t * 1.2 + cfg.phase) * bobAmount
      g.current.position.z += Math.cos(t * 1.1 + cfg.phase) * bobAmount
    }

    const p = clamp01((g.current.position.y - waterY) / (topY - waterY))
    onProgress?.(id, p)

    if (g.current.position.y >= topY) onDone(id)
  })

  return (
    <group ref={g}>
      <WobbleBubbleWithoutLight
        position={[0, 0, 0]}
        radius={cfgRef.current.radius}
        onHoverMove={handleHoverMove}
        onHoverOut={handleHoverOut}
      />
    </group>
  )
}

export function OneShotBubbles({
  waterY = 0,
  topY = 80,

  count = 20,

  // ✅ IMPORTANT: "max 6 bubbles at a time"
  maxSpawnPerWave = 6,

  // when the current wave reaches this % height, spawn next wave
  spawnAtProgress = 0.5,

  // timing between waves
  minWaveGap = 0.35,

  // pair behavior
  pairChance = 0.6, // sometimes single, sometimes pairs
  pairSeparationRange = [1.2, 2.8], // distance between the two bubbles in a pair

  // spawn region controls
  spawnCenter = [10, 30], // [x,z]
  spacing = 10,
  direction = "x",
  jitter = 0.15,
  perpendicularSpread = 0.35,

  // motion / size
  riseSpeedRange = [0.9, 1.6],
  radiusRange = [0.8, 2.0],
  driftRange = [0.06, 0.08],
  startDelayRange = [0.0, 0.3],
  bobAmount = 0.004,

  // cycle restart delay
  cycleDelay = 0.35,
}) {
  const [bubbles, setBubbles] = useState([])

  const cycleRunning = useRef(false)
  const spawnedThisCycle = useRef(0)

  // track progress of currently “gating wave”
  const progressMap = useRef(new Map()) // id -> progress
  const gateIds = useRef([]) // ids we wait on for next wave

  const waveTimer = useRef(0)
  const restartTimer = useRef(0)

  // track actual bubble count to restart reliably
  const bubblesCountRef = useRef(0)
  useEffect(() => {
    bubblesCountRef.current = bubbles.length
  }, [bubbles.length])

  const makeSpawnPoint = useCallback(() => {
    const [cx, cz] = spawnCenter
    const along = rand(-spacing, spacing)
    const perp = rand(-spacing * perpendicularSpread, spacing * perpendicularSpread)

    let x = cx
    let z = cz
    if (direction === "x") {
      x += along
      z += perp
    } else {
      z += along
      x += perp
    }

    x += rand(-jitter, jitter)
    z += rand(-jitter, jitter)
    return { x, z }
  }, [spawnCenter, spacing, perpendicularSpread, direction, jitter])

  const spawnOne = useCallback(() => {
    const p = makeSpawnPoint()
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x: p.x,
      z: p.z,
    }
  }, [makeSpawnPoint])

  const spawnPairNear = useCallback(() => {
    const a = spawnOne()
    const d = rand(pairSeparationRange[0], pairSeparationRange[1])
    const ang = Math.random() * Math.PI * 2
    const b = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x: a.x + Math.cos(ang) * d,
      z: a.z + Math.sin(ang) * d,
    }
    return [a, b]
  }, [spawnOne, pairSeparationRange])

  const onProgress = useCallback((id, p) => {
    progressMap.current.set(id, p)
  }, [])

  const remove = useCallback((id) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id))
    progressMap.current.delete(id)
  }, [])

  const spawnWave = useCallback(
    (limit) => {
      const created = []

      let remaining = limit

      // random pairs first
      while (remaining >= 2 && Math.random() < pairChance) {
        const [a, b] = spawnPairNear()
        created.push(a, b)
        remaining -= 2

        // stop randomly (so it's not always pairs)
        if (Math.random() < 0.35) break
      }

      // fill the rest with singles
      for (let i = 0; i < remaining; i++) created.push(spawnOne())

      return created
    },
    [pairChance, spawnPairNear, spawnOne]
  )

  const startCycle = useCallback(() => {
    cycleRunning.current = true
    spawnedThisCycle.current = 0
    progressMap.current.clear()
    gateIds.current = []
    waveTimer.current = 0
    restartTimer.current = 0

    setBubbles(() => {
      const firstLimit = Math.min(maxSpawnPerWave, count)
      const firstWave = spawnWave(firstLimit)

      spawnedThisCycle.current = firstWave.length
      gateIds.current = firstWave.map((b) => b.id) // ✅ gate on first wave

      return firstWave
    })
  }, [count, maxSpawnPerWave, spawnWave])

  useEffect(() => {
    startCycle()
  }, [startCycle])

  useFrame((_, dt) => {
    // restart logic
    if (!cycleRunning.current) {
      if (restartTimer.current > 0) {
        restartTimer.current -= dt
        if (restartTimer.current <= 0) startCycle()
      }
      return
    }

    // if we spawned all and all are gone -> restart
    if (spawnedThisCycle.current >= count && bubblesCountRef.current === 0) {
      cycleRunning.current = false
      restartTimer.current = cycleDelay
      return
    }

    // if already spawned all, nothing else to do (wait for them to disappear)
    if (spawnedThisCycle.current >= count) return

    waveTimer.current += dt
    if (waveTimer.current < minWaveGap) return

    // check gating wave progress (average)
    const ids = gateIds.current
    if (!ids.length) return

    let sum = 0
    let n = 0
    for (const id of ids) {
      const p = progressMap.current.get(id)
      if (p !== undefined) {
        sum += p
        n++
      }
    }
    const avgP = n > 0 ? sum / n : 0
    if (avgP < spawnAtProgress) return

    // ✅ spawn next wave
    waveTimer.current = 0

    setBubbles((prev) => {
      const remainingTotal = count - spawnedThisCycle.current
      const waveLimit = Math.min(maxSpawnPerWave, remainingTotal)

      const newWave = spawnWave(waveLimit)
      spawnedThisCycle.current += newWave.length

      // ✅ IMPORTANT: gate the NEXT spawn off THIS new wave
      gateIds.current = newWave.map((b) => b.id)

      return [...prev, ...newWave]
    })
  })

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
          onProgress={onProgress}
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
