import * as THREE from "three"
import React, { useMemo, useRef, useCallback } from "react"
import { extend, useThree, useLoader, useFrame } from "@react-three/fiber"
import { Water } from "three-stdlib"

extend({ Water })

// -------------------- TUNING --------------------
const MAX_RIPPLES = 12

// How often we emit a new ripple while moving (seconds)
const SPAWN_INTERVAL = 0.035

// Minimum mouse movement required before spawning another ripple (world units)
const MIN_SPAWN_DISTANCE = 1.2

// Ripple expands outward at this speed (world units / second)
const RIPPLE_SPEED = 10.5

// Controls spacing between wave lines (smaller => wider spacing)
// ringSpacing ≈ (2π / RING_FREQ)
const RING_FREQ = 0.65

// Thickness of each bright wave line (0..1)
const RING_THICKNESS = 0.10

// How quickly the trailing rings fade behind the wavefront
const TRAIL_DECAY = 0.22

// Extra fade by distance from center (smaller => reaches farther)
const DIST_FALLOFF = 0.012

// How long a ripple lives (seconds)
const MAX_LIFE = 1.25

// Vertex displacement amount for subtle physical wave feel
const DISPLACE = 0.18

// Brightness boost for bloom pickup (higher => easier to bloom)
const BLOOM_BOOST = 2.2
// ------------------------------------------------

export default function Ocean() {
  const waterRef = useRef()
  const overlayRef = useRef()

  const { gl } = useThree()

  const waterNormals = useLoader(THREE.TextureLoader, "/Water 0341normal.jpg")
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

  const geom = useMemo(() => new THREE.PlaneGeometry(10000, 10000, 1, 1), [])

  const waterConfig = useMemo(
    () => ({
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 2.0,
      fog: false,
    }),
    [waterNormals]
  )

  // Ripple “particles” stored in a ref (no React state per-frame)
  // each: { x, z, t, i, dx, dz }
  const ripplesRef = useRef([])

  const lastSpawnT = useRef(0)
  const lastPos = useRef(new THREE.Vector2(99999, 99999))

  // uniforms (arrays are fixed-size for WebGL)
  const uniforms = useMemo(() => {
    const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 9999, 0))
    const dirs = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector2(0, 0))
    return {
      uTime: { value: 0 },
      uRipples: { value: ripples },
      uDirs: { value: dirs },
      uSpeed: { value: RIPPLE_SPEED },
      uFreq: { value: RING_FREQ },
      uThickness: { value: RING_THICKNESS },
      uTrail: { value: TRAIL_DECAY },
      uFalloff: { value: DIST_FALLOFF },
      uDisplace: { value: DISPLACE },
      uBloomBoost: { value: BLOOM_BOOST },
    }
  }, [])

  const effectsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false, // IMPORTANT: keep ripples "HDR-bright" so Bloom can pick them up
      uniforms,
      vertexShader: `
        #define MAX_RIPPLES ${MAX_RIPPLES}

        uniform float uTime;
        uniform vec4  uRipples[MAX_RIPPLES]; // x,z,time,intensity
        uniform float uSpeed;
        uniform float uFreq;
        uniform float uTrail;
        uniform float uFalloff;
        uniform float uDisplace;

        varying vec3 vWorldPosition;
        varying float vRippleHeight;

        float sat(float x){ return clamp(x, 0.0, 1.0); }

        void main() {
          vec3 pos = position;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;

          float heightSum = 0.0;

          // small physical displacement for "water wave" feel
          for (int i = 0; i < MAX_RIPPLES; i++) {
            float t = uRipples[i].z;
            float intensity = uRipples[i].w;
            if (intensity <= 0.0) continue;

            vec2 c = uRipples[i].xy;
            float dist = distance(worldPos.xz, c);

            float front = t * uSpeed;
            float behind = front - dist;  // >0 means inside the expanding circle
            if (behind <= 0.0) continue;

            // smooth oscillation behind the front
            float osc = sin(behind * uFreq);
            float trail = exp(-behind * uTrail);
            float fall = exp(-dist * uFalloff);

            heightSum += osc * trail * fall * intensity;
          }

          vRippleHeight = heightSum;

          // displace along normal (plane normal points up after rotation in mesh)
          // since this is a plane, normal is fine; displacement is tiny anyway
          pos.y += heightSum * uDisplace;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        #define MAX_RIPPLES ${MAX_RIPPLES}

        uniform float uTime;
        uniform vec4  uRipples[MAX_RIPPLES]; // x,z,time,intensity
        uniform vec2  uDirs[MAX_RIPPLES];    // dx,dz (movement dir)
        uniform float uSpeed;
        uniform float uFreq;
        uniform float uThickness;
        uniform float uTrail;
        uniform float uFalloff;
        uniform float uBloomBoost;

        varying vec3 vWorldPosition;
        varying float vRippleHeight;

        float sat(float x){ return clamp(x, 0.0, 1.0); }

        void main() {
          vec3 col = vec3(0.0);
          float a = 0.0;

          vec2 p = vWorldPosition.xz;

          for (int i = 0; i < MAX_RIPPLES; i++) {
            float t = uRipples[i].z;
            float intensity = uRipples[i].w;
            if (intensity <= 0.0) continue;

            vec2 c = uRipples[i].xy;
            vec2 d = p - c;
            float dist = length(d);

            float front = t * uSpeed;
            float behind = front - dist;
            if (behind <= 0.0) continue;

            // --- Semi-directional (hand-sweep style) ---
            vec2 dir = normalize(uDirs[i] + vec2(1e-5)); // safe normalize
            vec2 toP = normalize(d + vec2(1e-5));
            float hemi = dot(toP, dir); // [-1..1]
            hemi = smoothstep(-0.15, 0.65, hemi); // keep it subtle, not half-cut

            // --- Multiple smooth rings behind the front ---
            // Cos gives smooth periodic bands. We extract thin bright lines from it.
            float osc = 0.5 + 0.5 * cos(behind * uFreq);

            // Anti-aliased line extraction
            float w = fwidth(osc) * 1.25;
            float line = smoothstep(1.0 - uThickness - w, 1.0 - w, osc);

            // Fade with distance behind the front, and with radius
            float trail = exp(-behind * uTrail);
            float fall = exp(-dist * uFalloff);

            float strength = line * trail * fall * intensity * hemi;

            // White ripples with HDR-ish boost for bloom
            col += vec3(1.0) * strength * uBloomBoost;

            // Alpha (still additive, but helps build presence)
            a = max(a, strength * 0.65);
          }

          // If nothing contributes, keep fully transparent
          if (a <= 0.001) discard;

          gl_FragColor = vec4(col, a);
        }
      `,
    })
  }, [uniforms])

  const spawnRipple = useCallback((x, z, dx, dz) => {
    const r = {
      x,
      z,
      t: 0,
      i: 1.0,
      dx,
      dz,
    }
    const list = ripplesRef.current
    list.push(r)
    if (list.length > MAX_RIPPLES) list.shift()
  }, [])

  const onPointerMove = useCallback(
    (e) => {
      e.stopPropagation()
      const now = uniforms.uTime.value

      const x = e.point.x
      const z = e.point.z

      const cur = new THREE.Vector2(x, z)
      const prev = lastPos.current

      const distMoved = cur.distanceTo(prev)

      // direction from movement
      const dir = cur.clone().sub(prev)
      if (dir.lengthSq() < 1e-6) return
      dir.normalize()

      // throttle + distance gate => consistent spawning, less "miss"
      if (distMoved >= MIN_SPAWN_DISTANCE && now - lastSpawnT.current >= SPAWN_INTERVAL) {
        spawnRipple(x, z, dir.x, dir.y)
        lastSpawnT.current = now
        lastPos.current.copy(cur)
      } else {
        // still update lastPos so direction remains accurate as you move
        // but don't spam ripples
        if (distMoved > 0.25) lastPos.current.lerp(cur, 0.35)
      }
    },
    [spawnRipple, uniforms]
  )

  const onPointerOut = useCallback(() => {
    // reset last pos so next hover starts clean
    lastPos.current.set(99999, 99999)
  }, [])

  useFrame((_, dt) => {
    // animate base water
    if (waterRef.current) {
      waterRef.current.material.uniforms.time.value += dt * 0.5
    }

    // time uniform
    uniforms.uTime.value += dt

    // update ripples
    const list = ripplesRef.current
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i]
      r.t += dt

      // smooth ease-out fade (not linear)
      const life = r.t / MAX_LIFE
      const fade = 1.0 - Math.min(1.0, life)
      r.i = fade * fade // quadratic ease-out

      if (r.t > MAX_LIFE || r.i < 0.02) list.splice(i, 1)
    }

    // fill fixed arrays for shader
    const rippleArr = uniforms.uRipples.value
    const dirArr = uniforms.uDirs.value

    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (i < list.length) {
        const r = list[i]
        rippleArr[i].set(r.x, r.z, r.t, r.i)
        dirArr[i].set(r.dx, r.dz)
      } else {
        // “inactive”
        rippleArr[i].set(0, 0, 9999, 0)
        dirArr[i].set(0, 0)
      }
    }
  })

  return (
    <group>
      {/* Water surface */}
      <water ref={waterRef} args={[geom, waterConfig]} rotation-x={-Math.PI / 2} />

      {/* Ripple overlay (also used for pointer events) */}
      <mesh
        ref={overlayRef}
        geometry={geom}
        material={effectsMaterial}
        rotation-x={-Math.PI / 2}
        position-y={0.08}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
      />
    </group>
  )
}
