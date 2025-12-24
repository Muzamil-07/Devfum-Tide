import * as THREE from "three"
import React, { useMemo, useRef, useCallback } from "react"
import { useFrame } from "@react-three/fiber"
import { playBubbleSfx } from "./utils/sfx"

export function WobbleBubbleWithoutLight({
  position = [0, 20, 0],
  radius = 10,
  segments = 128,

  // ✅ NEW: callbacks for parent Bubble
  onHoverMove,
  onHoverOut,
}) {
  const meshRef = useRef()
  const shaderRef = useRef(null)
  const hoveredRef = useRef(false)

  const hitLocal = useRef(new THREE.Vector3(9999, 9999, 9999))
  const targetStrength = useRef(0)
  const strength = useRef(0)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHit: { value: new THREE.Vector3(9999, 9999, 9999) },
      uStrength: { value: 0 },
      uRadius: { value: radius * 2 },
      uAmp: { value: radius * 0.1 },
      uFreq: { value: 10.0 * 4.0 },
    }),
    [radius]
  )

  const handleOver = useCallback((e) => {
    if (hoveredRef.current) return
    hoveredRef.current = true
    playBubbleSfx()
  }, [])

  const handleMove = useCallback(
    (e) => {
      // ❗️DON’T stopPropagation here (or parent won’t get events)
      // e.stopPropagation()

      if (!meshRef.current) return

      // existing wobble hit
      const p = e.point.clone()
      meshRef.current.worldToLocal(p)
      hitLocal.current.copy(p)
      targetStrength.current = 1

      // ✅ tell parent Bubble where the hit happened (WORLD coords)
      onHoverMove?.(e)
    },
    [onHoverMove]
  )

  const handleOut = useCallback(
    (e) => {
      // e.stopPropagation()
      hoveredRef.current = false
      targetStrength.current = 0
      onHoverOut?.(e)
    },
    [onHoverOut]
  )

  useFrame((_, dt) => {
    const damp = 1 - Math.exp(-dt * 10)
    strength.current = THREE.MathUtils.lerp(strength.current, targetStrength.current, damp)

    uniforms.uTime.value += dt
    uniforms.uStrength.value = strength.current
    uniforms.uHit.value.copy(hitLocal.current)

    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = uniforms.uTime.value
      shaderRef.current.uniforms.uStrength.value = uniforms.uStrength.value
      shaderRef.current.uniforms.uHit.value.copy(uniforms.uHit.value)
    }
  })

  const onBeforeCompile = useCallback(
    (shader) => {
      shader.uniforms.uTime = uniforms.uTime
      shader.uniforms.uHit = uniforms.uHit
      shader.uniforms.uStrength = uniforms.uStrength
      shader.uniforms.uRadius = uniforms.uRadius
      shader.uniforms.uAmp = uniforms.uAmp
      shader.uniforms.uFreq = uniforms.uFreq

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `
          #include <common>
          uniform float uTime;
          uniform vec3  uHit;
          uniform float uStrength;
          uniform float uRadius;
          uniform float uAmp;
          uniform float uFreq;
          `
        )
        .replace(
          "#include <begin_vertex>",
          `
          #include <begin_vertex>

          float d = distance(transformed, uHit);
          float falloff = smoothstep(uRadius, 0.0, d);
          float wave = sin((d * 0.4) - (uTime * (uFreq * 0.3))) * exp(-d * 0.20);
          transformed += normal * (falloff * wave * (uAmp * 3.0) * uStrength);
          `
        )

      shaderRef.current = shader
    },
    [uniforms]
  )

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={handleOver}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      castShadow={false}
      receiveShadow={false}
    >
      <sphereGeometry args={[radius, segments, segments]} />
      <meshPhysicalMaterial
        transmission={1}
        thickness={radius * 0.12}
        ior={1.25}
        roughness={0.05}
        metalness={0.0}
        clearcoat={1}
        clearcoatRoughness={0.6}
        transparent
        opacity={1}
        envMapIntensity={1.2}
        onBeforeCompile={onBeforeCompile}
        iridescence={1}
        iridescenceIOR={1}
        sheen={1}
        sheenRoughness={1}
      />
    </mesh>
  )
}
