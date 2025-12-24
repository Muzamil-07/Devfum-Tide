import * as THREE from "three"
import React, { useMemo, useRef, useCallback } from "react"
import { useFrame } from "@react-three/fiber"

export function WobbleBubble({
  position = [0, 20, 0],
  radius = 10,
  segments = 128,
  materialRef,
}) {
  const meshRef = useRef()
  const shaderRef = useRef(null)

  // local hit position
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
  
      // ✅ color controls
      uColorRadius: { value: radius * 0.45 },   // try 0.8..2.5 * radius
      uColorSoftness: { value: radius * 0.75 } // try 0.15..0.8 * radius
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
    // helps avoid "stuck" hover tint on fast moves
    hitLocal.current.set(9999, 9999, 9999)
  }, [])

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

      shaderRef.current.uniforms.uColorRadius.value = uniforms.uColorRadius.value
      shaderRef.current.uniforms.uColorSoftness.value = uniforms.uColorSoftness.value
    }
  })

  const onBeforeCompile = useCallback((shader) => {
    // uniforms
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uHit = uniforms.uHit
    shader.uniforms.uStrength = uniforms.uStrength
    shader.uniforms.uRadius = uniforms.uRadius
    shader.uniforms.uAmp = uniforms.uAmp
    shader.uniforms.uFreq = uniforms.uFreq
  
    // ---------- VERTEX: provide vHover (mask) ----------
    shader.uniforms.uColorRadius = uniforms.uColorRadius
    shader.uniforms.uColorSoftness = uniforms.uColorSoftness

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

    uniform float uColorRadius;
    uniform float uColorSoftness;

    varying float vHover;
    varying float vColorMask;
    `
  )
  .replace(
    "#include <begin_vertex>",
    `
    #include <begin_vertex>

    float d = distance(transformed, uHit);

    // deformation mask
    float falloff = smoothstep(uRadius, 0.0, d);
    vHover = clamp(falloff * uStrength, 0.0, 1.0);

    // ✅ color mask (independent)
    float colorFalloff = 1.0 - smoothstep(uColorRadius, uColorRadius + uColorSoftness, d);
    vColorMask = clamp(colorFalloff * uStrength, 0.0, 1.0);

    float wave = sin((d * 0.4) - (uTime * (uFreq * 0.3))) * exp(-d * 0.20);
    transformed += normal * (falloff * wave * (uAmp * 3.0) * uStrength);
    `
  )

    // ---------- FRAGMENT: add HSL helpers + emissive tint ----------
    shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `
      #include <common>
      varying float vColorMask;
  
      vec3 hsl2rgb(vec3 hsl) {
        vec3 rgb = clamp(abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        rgb = rgb * rgb * (3.0 - 2.0 * rgb);
        float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;
        return (rgb - 0.5) * c + hsl.z;
      }
      `
    )
    .replace(
      "#include <emissivemap_fragment>",
      `
      #include <emissivemap_fragment>
  
      // ✅ clean, smooth mask (no noise)
      float m = clamp(vColorMask, 0.0, 1.0);
  
      // shape it like "light spreading": bright center, soft falloff
      float glow = pow(m, 1.6);
  
      // Fresnel = brighter on edges (crystal feel)
      vec3 N = normalize(normal);
      vec3 V = normalize(vViewPosition);
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  
      // 189°, 97%, 67%
      // 231°, 96%, 78%
      // ------
      // 187°, 97%, 70%
      // 287°, 100%, 71%
      vec3 c2 = hsl2rgb(vec3(187.0/360.0, 0.98, 0.70));
      vec3 c1 = hsl2rgb(vec3(287.0/360.0, 1.0, 0.71));
      vec3 hoverCol = mix(c1, c2, glow);
  
      // ✅ clean "spread" + edge boost
      totalEmissiveRadiance += hoverCol * glow * (0.35 + 1.8 * fresnel);
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
         ref={materialRef}
         transmission={1}
         thickness={radius * 0.12}
         ior={1.25}
       
         roughness={0.01}              // ✅ very clean
         metalness={0.0}
       
         clearcoat={1}
         clearcoatRoughness={0.02}     // ✅ crisp highlight
       
         // ❌ these often add “grainy” shimmer with HDRs
         iridescence={0}
         sheen={0}
       
         transparent
         opacity={1}
         envMapIntensity={1.2}
         onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
