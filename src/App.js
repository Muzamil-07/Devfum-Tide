import * as THREE from 'three'
import React, { Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, extend, useThree, useLoader, useFrame } from '@react-three/fiber'
import { Effects, Environment, Loader, OrbitControls, Sky, useHelper } from '@react-three/drei'
import { WobbleBubble } from './WobbleBubble'
import { Rock } from './Rock'
import { OneShotBubbles } from './OneShotBubble'
import { DevfumLogo } from './DevfumLogo'
import { Bloom, ToneMapping, EffectComposer, Noise } from '@react-three/postprocessing'
import { useControls } from 'leva'
import Ocean from './Ocean'
import { degToRad } from 'three/src/math/MathUtils.js'
import { MouseFollowCamera } from './utils'
import gsap from "gsap"
import './App.css'
import LoaderScreen from './LoaderScreen'
import CameraAnimation from './CameraAnimation'
import Navbar from './Navbar'
import ScrollText from './ScrollText'
import CaseStudyDetail from "./CaseStudyDetail"
import PostFX from './PostFx'
import { BlendFunction } from 'postprocessing'
import BackgroundAudio from "./BackgroundAudio"
import SoundControls from "./SoundControls"
import { setBubbleSfxVolume } from "./utils/sfx"


// Component for the PointLight with its helper
const PointLightWithHelper = () => {
  // 1. Create a ref for the light
  const pointLightRef = useRef(null);

  // 2. Use the useHelper hook
  // Arguments are: ref, HelperConstructor, sphereSize, color (optional)
  // The helper will take the light's color if the color argument is not set.
  useHelper(pointLightRef, THREE.PointLightHelper, 2, 'blue');

  return (
    // 3. Attach the ref to the pointLight component
    <pointLight
      ref={pointLightRef}
      position={[0, 20, 55]}
      intensity={55.5}
      castShadow
      color={0x0000ff}
      // color={0x0000ff}
      decay={0.9}
    />
  );
};

// Component for the PointLight with its helper
const DirectionalLightWithHelper = () => {
  // 1. Create a ref for the light
  const pointLightRef = useRef(null);

  // 2. Use the useHelper hook
  // Arguments are: ref, HelperConstructor, sphereSize, color (optional)
  // The helper will take the light's color if the color argument is not set.
  useHelper(pointLightRef, THREE.DirectionalLightHelper, 4, 'red');

  return (
    // 3. Attach the ref to the pointLight component
    <directionalLight
      ref={pointLightRef}
      position={[0, 16, 95]}
      intensity={65.5}
      castShadow
      color={0xff0000}
      // color={0x0000ff}
      decay={4}
    />
  );
};


export default function App() {
  // hide/unhide leva control
  const { levels, intensity, middleGrey, maxLuminance } = useControls({
    intensity: { value: 0.7, min: 0, max: 100, step: 0.1 },
    levels: { value: 9, min: 1, max: 20, step: 1 },
    middleGrey: {
      min: 0,
      max: 1,
      value: 0.6,
      step: 0.1
    },
    maxLuminance: {
      min: 0,
      max: 64,
      value: 16,
      step: 1
    }
  })

  const riseSpeedRange = useMemo(() => [0.7, 1.2], [])
  const bubbleRockLogoGroupRef = useRef()
  const bubbleMaterialRef = useRef()
  const logoGroupRef = useRef()
  const basePositionRef = useRef({ x: 0, y: 5, z: 150 })
  const baseRotationRef = useRef({ x: 0, y: 0, z: 0 })
  const baseLookAtRef = useRef({ x: 0, y: 18.0, z: 50 })
  const [contentVisible, setContentVisible] = useState(false)
  const [exploreMode, setExploreMode] = useState(false)
  const [caseStudyVisible, setCaseStudyVisible] = useState(false)
  const postScrollStateRef = useRef(null)

  const [seaVolume, setSeaVolume] = useState(() => {
    const raw = localStorage.getItem("seaVolume")
    const n = raw == null ? 0.35 : Number(raw)
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.35
  })
  const [bubbleVolume, setBubbleVolume] = useState(() => {
    const raw = localStorage.getItem("bubbleVolume")
    const n = raw == null ? 0.55 : Number(raw)
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.55
  })

  useEffect(() => {
    localStorage.setItem("seaVolume", String(seaVolume))
  }, [seaVolume])

  useEffect(() => {
    localStorage.setItem("bubbleVolume", String(bubbleVolume))
    setBubbleSfxVolume(bubbleVolume)
  }, [bubbleVolume])

  // Bloom values are animatable; when not exploring, keep them in sync with Leva controls.
  const bloomLevelsAnimRef = useRef({ value: levels })
  const [bloomLevelsValue, setBloomLevelsValue] = useState(levels)
  const bloomIntensityAnimRef = useRef({ value: intensity })
  const [bloomIntensityValue, setBloomIntensityValue] = useState(intensity)

  useEffect(() => {
    if (exploreMode) return
    bloomLevelsAnimRef.current.value = levels
    setBloomLevelsValue(levels)
    bloomIntensityAnimRef.current.value = intensity
    setBloomIntensityValue(intensity)
  }, [levels, intensity, exploreMode])

  // Capture the exact "post-scroll content revealed" composition (the moment `CameraAnimation` reveals the DOM).
  // Important: `CameraAnimation` continues moving after reveal, so we snapshot at reveal time to restore later.
  const capturePostScrollState = useCallback(() => {
    const basePos = basePositionRef?.current
    const baseLookAt = baseLookAtRef?.current
    const heroGroup = bubbleRockLogoGroupRef?.current
    const logoGroup = logoGroupRef?.current

    postScrollStateRef.current = {
      basePos: basePos ? { x: basePos.x, y: basePos.y, z: basePos.z } : null,
      baseLookAt: baseLookAt ? { x: baseLookAt.x, y: baseLookAt.y, z: baseLookAt.z } : null,
      heroPos: heroGroup
        ? { x: heroGroup.position.x, y: heroGroup.position.y, z: heroGroup.position.z }
        : null,
      logoPos: logoGroup
        ? { x: logoGroup.position.x, y: logoGroup.position.y, z: logoGroup.position.z }
        : null,
      logoRot: logoGroup
        ? { x: logoGroup.rotation.x, y: logoGroup.rotation.y, z: logoGroup.rotation.z }
        : null,
    }
  }, [])

  const handleExploreMore = useCallback(() => {
    setExploreMode(true)
    setContentVisible(false)

    const logoGroup = logoGroupRef?.current
    const basePos = basePositionRef?.current
    const baseLookAt = baseLookAtRef?.current

    // Re-center camera (camera animation drifts to the right to make room for the text)
    if (basePos) {
      gsap.killTweensOf(basePos)
      gsap.to(basePos, { x: 0, duration: 1.2, ease: "power3.inOut", overwrite: true })
    }
    if (baseLookAt) {
      gsap.killTweensOf(baseLookAt)
      gsap.to(baseLookAt, { x: 0, duration: 1.2, ease: "power3.inOut", overwrite: true })
    }

    const startBloom = () => {
      // Animate Bloom after logo is forward-facing:
      // intensity: 0.7 -> 100, levels: 9 -> 10
      const bloomLevelsObj = bloomLevelsAnimRef.current
      const bloomIntensityObj = bloomIntensityAnimRef.current
      gsap.killTweensOf(bloomLevelsObj)
      gsap.killTweensOf(bloomIntensityObj)

      gsap.to(bloomLevelsObj, {
        value: 10,
        duration: 1.2,
        ease: "power3.inOut",
        overwrite: true,
        onUpdate: () => setBloomLevelsValue(Math.round(bloomLevelsObj.value)),
      })

      gsap.to(bloomIntensityObj, {
        value: 100,
        duration: 1.4,
        ease: "power3.inOut",
        overwrite: true,
        onUpdate: () => setBloomIntensityValue(bloomIntensityObj.value),
        onComplete: () => setCaseStudyVisible(true),
      })
    }

    if (!logoGroup) {
      startBloom()
      return
    }

    // Stop the infinite spin/sway tweens started in `CameraAnimation`
    gsap.killTweensOf(logoGroup.rotation)
    gsap.killTweensOf(logoGroup.position)

    // Normalize angles so tween-to-zero doesn't do extra full spins
    const twoPi = Math.PI * 2
    const normalizeAngle = (a) => {
      let v = ((a % twoPi) + twoPi) % twoPi
      if (v > Math.PI) v -= twoPi
      return v
    }
    logoGroup.rotation.set(
      normalizeAngle(logoGroup.rotation.x),
      normalizeAngle(logoGroup.rotation.y),
      normalizeAngle(logoGroup.rotation.z)
    )

    gsap.to(logoGroup.position, {
      x: 0,
      y: 28,
      z: 0,
      duration: 1.1,
      ease: "power3.inOut",
      overwrite: true,
    })

    gsap.to(logoGroup.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.1,
      ease: "power3.out",
      overwrite: true,
      onComplete: startBloom,
    })
  }, [])

  const handleCaseStudyBack = useCallback(() => {
    setCaseStudyVisible(false)
    setExploreMode(false)
    // Restore bloom back to current Leva values
    bloomLevelsAnimRef.current.value = levels
    setBloomLevelsValue(levels)
    bloomIntensityAnimRef.current.value = intensity
    setBloomIntensityValue(intensity)
    // Show the right overlay content again
    setContentVisible(true)

    // Restore the exact "post-scroll" composition as it was when the DOM content first appeared.
    const snapshot = postScrollStateRef.current
    const logoGroup = logoGroupRef?.current
    const heroGroup = bubbleRockLogoGroupRef?.current
    const basePos = basePositionRef?.current
    const baseLookAt = baseLookAtRef?.current

    if (snapshot?.basePos && basePos) {
      gsap.killTweensOf(basePos)
      gsap.to(basePos, {
        ...snapshot.basePos,
        duration: 1.0,
        ease: "power3.inOut",
        overwrite: true,
      })
    }

    if (snapshot?.baseLookAt && baseLookAt) {
      gsap.killTweensOf(baseLookAt)
      gsap.to(baseLookAt, {
        ...snapshot.baseLookAt,
        duration: 1.0,
        ease: "power3.inOut",
        overwrite: true,
      })
    }

    if (snapshot?.heroPos && heroGroup) {
      gsap.killTweensOf(heroGroup.position)
      gsap.to(heroGroup.position, {
        ...snapshot.heroPos,
        duration: 1.0,
        ease: "power3.inOut",
        overwrite: true,
      })
    }

    // Logo resumes its continuous rotation + sway with the same offsets
    if (logoGroup) {
      gsap.killTweensOf(logoGroup.rotation)
      gsap.killTweensOf(logoGroup.position)

      if (snapshot?.logoPos) {
        gsap.to(logoGroup.position, {
          ...snapshot.logoPos,
          duration: 0.9,
          ease: "power3.inOut",
          overwrite: true,
        })
      }

      if (snapshot?.logoRot) {
        gsap.set(logoGroup.rotation, { ...snapshot.logoRot })
      }

      // Continuous Y spin + tiny X sway (matches `CameraAnimation.js`)
      gsap.to(logoGroup.rotation, {
        y: `+=${Math.PI * 2}`,
        duration: 6,
        ease: "none",
        repeat: -1,
      })
      gsap.to(logoGroup.rotation, {
        x: degToRad(8),
        duration: 1.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      })
    }
  }, [levels, intensity])

  return (
    <>
      <BackgroundAudio volume={seaVolume} />
      <SoundControls
        seaVolume={seaVolume}
        bubbleVolume={bubbleVolume}
        onSeaVolumeChange={setSeaVolume}
        onBubbleVolumeChange={setBubbleVolume}
      />
      <Navbar />
      <Canvas camera={{ position: [0, 5, 150], fov: 45, near: 1, far: 20000 }}
      >
        <CameraAnimation
          bubbleMaterialRef={bubbleMaterialRef}
          logoGroupRef={logoGroupRef}
          rockLogoGroupRef={bubbleRockLogoGroupRef}
          basePositionRef={basePositionRef}
          baseRotationRef={baseRotationRef}
          baseLookAtRef={baseLookAtRef}
          enabled={!exploreMode && !caseStudyVisible}
          onRevealContent={() => {
            capturePostScrollState()
            setContentVisible(true)
          }}
          onResetContent={() => {
            setContentVisible(false)
          }}
        />
        {/* Mouse-following camera effect */}
        <MouseFollowCamera
          intensity={0.02 * 2}
          smoothness={0.1}
          basePositionRef={basePositionRef}
          baseRotationRef={baseRotationRef}
          baseLookAtRef={baseLookAtRef}
        />
        {/* <pointLight decay={0} position={[100, 100, 100]} />
    <pointLight decay={0.5} position={[-100, -100, -100]} /> */}
        {/* Add the light component with helper */}
        {/* <PointLightWithHelper /> */}
        {/* <DirectionalLightWithHelper/> */}
        {/* <PostFX/> */}
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={10.0} levels={bloomLevelsValue} intensity={bloomIntensityValue} />
          <ToneMapping middleGrey={middleGrey} maxLuminance={maxLuminance} />
          <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.42} />

        </EffectComposer>
        <Suspense fallback={null}>
          <Environment background path='/' files={"rock color.hdr"} backgroundRotation={[0, degToRad(112), 0]} environmentIntensity={1} />
          <Ocean />
          {/* <Box /> */}


          <group ref={bubbleRockLogoGroupRef}>
            <group position={[0, -11, 55]} scale={0.9}>
              <WobbleBubble position={[0, 28, 0]} radius={11.5} materialRef={bubbleMaterialRef} />
              <group ref={logoGroupRef} position={[0, 28, 0]} scale={0.23}>
                <DevfumLogo />
              </group>
            </group>
            {/* Center Rock */}
            <Rock position={[0, 15, 40]} scale={0.7} rotation={[0, degToRad(10), 0]} />
          </group>
       
          {/* LEft close rock */}
          <Rock position={[-5.5, -1.3, 150]} rotation={[degToRad(90), 0, 0]} scale={0.2} />
          <OneShotBubbles
            count={100}
            maxSpawnPerWave={6}         // ✅ never spawn more than 6 in one wave
            spawnAtProgress={0.3}       // next wave when current wave is halfway up
            minWaveGap={0.45}           // slows down wave firing
            pairChance={0.7}            // more pairs
            pairSeparationRange={[20.5, 22.5]} // pairs not too close
            radiusRange={[0.6, 1.2]}    // smaller bubbles
            spawnCenter={[0, 120]}
            spacing={25}
            waterY={-2}
            topY={80}
          />
          
          {/* Scroll text on water surface */}
          <ScrollText position={[0, -2, 90]} />
        </Suspense>
        {/* <Sky scale={1000} sunPosition={[500, 150, -1000]} turbidity={0.1} /> */}
        <OrbitControls enabled={false} />
        {/* <OrbitControls /> */}
      </Canvas>
      {/* <Loader /> */}
      <LoaderScreen />
      <div className={`sideContent ${contentVisible && !exploreMode ? "show" : ""}`}>
        <div className="sideContentInner">
          <div className="sideContentEyebrow">Devfum</div>
          <h2 className="sideContentTitle">TideLab</h2>
          <p className="sideContentBody">
          An interactive 3D ocean scene where the water responds naturally to cursor movement, generating smooth ripple waves with controlled spacing, bloom, easing, and reliable spawning behavior across camera distances. 
          </p>
          <button type="button" className="glassButton" onClick={handleExploreMore}>
            Explore More
          </button>
        </div>
      </div>

      <CaseStudyDetail
        visible={caseStudyVisible}
        onBack={handleCaseStudyBack}
        title="The Right Web Experience"
        eyebrow="DEVFUM"
        heading="TideLab"
        paragraphs={[
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
        ]}
        buttonLabel="next"
        media={[
          { src: "/full render.gif", alt: "Full render" },
          { src: "/code.gif", alt: "Code" },
          { src: "/WIREFRAME.gif", alt: "Wireframe" },
        ]}
      />
    </>

  )
}
