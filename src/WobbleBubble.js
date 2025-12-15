import * as THREE from "three"
import React, { useMemo, useRef, useCallback } from "react"
import { useFrame } from "@react-three/fiber"

export function WobbleBubble({
  position = [0, 20, 0],
  radius = 10,
  segments = 128,
}) {
  const meshRef = useRef()
  const shaderRef = useRef(null)

  // We keep hit point in LOCAL space because vertex positions are local in the shader.
  const hitLocal = useRef(new THREE.Vector3(9999, 9999, 9999))
  const targetStrength = useRef(0)
  const strength = useRef(0)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHit: { value: new THREE.Vector3(9999, 9999, 9999) }, // local-space
      uStrength: { value: 0 },
    //   uRadius: { value: radius * 0.8 }, // influence radius
    //   uAmp: { value: radius * 0.02 },   // deformation amplitude
    //   uFreq: { value: 10.0 * 2.0 },           // wobble frequency
      uRadius: { value: radius * 2 }, // influence radius
      uAmp: { value: radius * 0.1 },   // deformation amplitude
      uFreq: { value: 10.0 * 4.0 },           // wobble frequency
    }),
    [radius]
  )

  const handleMove = useCallback((e) => {
    e.stopPropagation()
    if (!meshRef.current) return
    const p = e.point.clone()
    meshRef.current.worldToLocal(p)
    hitLocal.current.copy(p)
    targetStrength.current = 1
  }, [])

  const handleOut = useCallback((e) => {
    e.stopPropagation()
    targetStrength.current = 0
  }, [])

  useFrame((_, dt) => {
    // Smooth strength
    const damp = 1 - Math.exp(-dt * 10)
    strength.current = THREE.MathUtils.lerp(strength.current, targetStrength.current, damp)

    uniforms.uTime.value += dt
    uniforms.uStrength.value = strength.current
    uniforms.uHit.value.copy(hitLocal.current)

    // Keep shader uniforms in sync (onBeforeCompile gives us the shader once)
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = uniforms.uTime.value
      shaderRef.current.uniforms.uStrength.value = uniforms.uStrength.value
      shaderRef.current.uniforms.uHit.value.copy(uniforms.uHit.value)
    }
  })

  const onBeforeCompile = useCallback((shader) => {
    // Attach our uniforms
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uHit = uniforms.uHit
    shader.uniforms.uStrength = uniforms.uStrength
    shader.uniforms.uRadius = uniforms.uRadius
    shader.uniforms.uAmp = uniforms.uAmp
    shader.uniforms.uFreq = uniforms.uFreq

    // Inject deformation after `begin_vertex` where `transformed` is defined
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

        // Local-space distance from hover hit
        float d = distance(transformed, uHit);

        // Smooth falloff (1 near hit, 0 outside radius)
        float falloff = smoothstep(uRadius, 0.0, d);

        // Wobble: a traveling wave that decays with distance
        float wave = sin((d * 0.4) - (uTime * (uFreq * 0.3))) * exp(-d * 0.20);

        // Push inward/outward along normal
        transformed += normal * (falloff * (wave * 1.0) * (uAmp * 3.0) * uStrength);
        `
      )

    shaderRef.current = shader
  }, [uniforms])

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      castShadow={false}
      receiveShadow={false}
    >
      <sphereGeometry args={[radius, segments, segments]} />
      <meshPhysicalMaterial
        // Glass look using physically-based transmission/thickness
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
        // sheenColor={new THREE.Color(0xff00ff)}

        // attenuationColor={new THREE.Color(0xf4f5e4)}
        // attenuationDistance={100}
      />
    </mesh>
  )
}
