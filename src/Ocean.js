import * as THREE from 'three'
import React, { Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { extend, useThree, useLoader, useFrame } from '@react-three/fiber'
import { Water } from 'three-stdlib'

extend({ Water })


export default function Ocean() {
    const ref = useRef()
    const effectsRef = useRef()
    const [ripples, setRipples] = useState([])
    const [mousePos, setMousePos] = useState(new THREE.Vector2(-1000, -1000))
    const [glitterIntensity, setGlitterIntensity] = useState(0)

    const { gl, camera, raycaster, pointer } = useThree()
    // const waterNormals = useLoader(THREE.TextureLoader, '/waternormals.jpeg')
    const waterNormals = useLoader(THREE.TextureLoader, '/Water 0341normal.jpg')
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

    const geom = useMemo(() => new THREE.PlaneGeometry(10000, 10000), [])
    const config = useMemo(
        () => ({
            textureWidth: 512 * 2,
            textureHeight: 512 * 2,
            waterNormals,
            sunDirection: new THREE.Vector3(),
            // sunColor: 0xffffff,
            // waterColor: 0x001e0f,
            waterColor: 0x001e0f,
            distortionScale: 2,
            fog: false,
            format: gl.encoding
        }),
        [waterNormals, gl.encoding]
    )

    // Interactive effects material (overlay)
    const effectsMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                ripples: { value: [] },
                mousePos: { value: new THREE.Vector2(-1000, -1000) },
                glitterIntensity: { value: 0.0 },
                glitterSize: { value: 50.0 },
            },
            vertexShader: `
          uniform vec4 ripples[10];
          varying vec2 vUv;
          varying vec3 vWorldPosition;
          
          void main() {
            vUv = uv;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            
            // Add subtle ripple displacement
            float totalDisplacement = 0.0;
            for(int i = 0; i < 10; i++) {
              if(ripples[i].w > 0.0) {
                vec2 rippleCenter = ripples[i].xy;
                float rippleTime = ripples[i].z;
                float rippleIntensity = ripples[i].w;
                
                float dist = distance(worldPosition.xz, rippleCenter);
                float wave = sin(dist * 0.1 - rippleTime * 8.0) * exp(-dist * 0.01) * exp(-rippleTime * 2.0);
                totalDisplacement += wave * rippleIntensity * 2.0; // Reduced intensity
              }
            }
            
            worldPosition.y += totalDisplacement;
            vWorldPosition = worldPosition.xyz;
            
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
            fragmentShader: `
          uniform float time;
          uniform vec2 mousePos;
          uniform float glitterIntensity;
          uniform float glitterSize;
          uniform vec4 ripples[10];
          
          varying vec2 vUv;
          varying vec3 vWorldPosition;
          
          float noise(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }
          
          float smoothNoise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(noise(i + vec2(0.0,0.0)), noise(i + vec2(1.0,0.0)), u.x),
                       mix(noise(i + vec2(0.0,1.0)), noise(i + vec2(1.0,1.0)), u.x), u.y);
          }
          
          void main() {
            vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
            
            // Subtle glitter effect
            float distToMouse = distance(vWorldPosition.xz, mousePos);
            if(distToMouse < glitterSize && glitterIntensity > 0.0) {
              vec2 sparkleUv = vWorldPosition.xz * 0.08 + time * 0.3;
              float sparkle = smoothNoise(sparkleUv * 20.0);
              sparkle = smoothstep(0.8, 1.0, sparkle);
              
              float glitterFade = 1.0 - smoothstep(0.0, glitterSize, distToMouse);
              sparkle *= glitterFade * glitterIntensity * 0.3; // Reduced intensity
              
              color.rgb += vec3(0.8, 0.9, 1.0) * sparkle;
              color.a = sparkle * 0.5;
            }
            
            // Subtle ripple highlights
            for(int i = 0; i < 10; i++) {
              if(ripples[i].w > 0.0) {
                vec2 rippleCenter = ripples[i].xy;
                float rippleTime = ripples[i].z;
                float rippleIntensity = ripples[i].w;
                
                float dist = distance(vWorldPosition.xz, rippleCenter);
                float rippleRing = abs(sin(dist * 0.1 - rippleTime * 8.0)) * exp(-dist * 0.01) * exp(-rippleTime * 2.0);
                
                color.rgb += vec3(0.6, 0.8, 1.0) * rippleRing * rippleIntensity * 0.2;
                color.a = max(color.a, rippleRing * rippleIntensity * 0.3);
              }
            }
            
            gl_FragColor = color;
          }
        `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    }, [])

    // Add ripple on click
    const addRipple = useCallback((x, z) => {
        const newRipple = { x, z, time: 0, intensity: 1.0, id: Date.now() }
        setRipples(prev => [...prev.slice(-9), newRipple])
    }, [])

    // Handle mouse events
    const handlePointerMove = useCallback((event) => {
        if (!ref.current) return

        raycaster.setFromCamera(pointer, camera)
        const intersects = raycaster.intersectObject(ref.current)

        if (intersects.length > 0) {
            const point = intersects[0].point
            setMousePos(new THREE.Vector2(point.x, point.z))
            setGlitterIntensity(1.0)
        } else {
            setGlitterIntensity(0.0)
        }
    }, [camera, raycaster, pointer])

    const handleClick = useCallback((event) => {
        if (!ref.current) return

        raycaster.setFromCamera(pointer, camera)
        const intersects = raycaster.intersectObject(ref.current)

        if (intersects.length > 0) {
            const point = intersects[0].point
            addRipple(point.x, point.z)
        }
    }, [camera, raycaster, pointer, addRipple])

    useFrame((state, delta) => {
        // Update original water
        if (ref.current) {
            ref.current.material.uniforms.time.value += delta * 0.5
        }

        // Update effects
        if (effectsRef.current && effectsMaterial) {
            effectsMaterial.uniforms.time.value += delta * 0.5

            // Update ripples
            setRipples(prev => prev.map(ripple => ({
                ...ripple,
                time: ripple.time + delta,
                intensity: Math.max(0, ripple.intensity - delta * 0.5)
            })).filter(ripple => ripple.intensity > 0.01))

            // Update uniforms
            const rippleArray = new Array(10).fill(new THREE.Vector4(0, 0, 0, 0))
            ripples.forEach((ripple, i) => {
                if (i < 10) {
                    rippleArray[i] = new THREE.Vector4(ripple.x, ripple.z, ripple.time, ripple.intensity)
                }
            })
            effectsMaterial.uniforms.ripples.value = rippleArray
            effectsMaterial.uniforms.mousePos.value = mousePos
            effectsMaterial.uniforms.glitterIntensity.value = glitterIntensity
        }
    })

    return (
        <group>
            {/* Original beautiful water */}
            <water
                ref={ref}
                args={[geom, config]}
                rotation-x={-Math.PI / 2}
                onPointerMove={handlePointerMove}
                onClick={handleClick}
            />
            {/* Interactive effects overlay */}
            <mesh
                ref={effectsRef}
                geometry={geom}
                material={effectsMaterial}
                rotation-x={-Math.PI / 2}
                position-y={0.1}
            />
        </group>
    )
}