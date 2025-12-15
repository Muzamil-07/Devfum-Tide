import * as THREE from 'three'
import React, { Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, extend, useThree, useLoader, useFrame } from '@react-three/fiber'
import { Effects, Environment, OrbitControls, Sky, useHelper } from '@react-three/drei'
import { WobbleBubble } from './WobbleBubble'
import { Rock } from './Rock'
// import { BubbleEmitter } from './BubbleEmitter'
import { OneShotBubbles } from './OneShotBubble'
import { DevfumLogo } from './DevfumLogo'
import { Bloom, ToneMapping, EffectComposer } from '@react-three/postprocessing'
import { useControls } from 'leva'
import Ocean from './Ocean'
import { degToRad } from 'three/src/math/MathUtils.js'
import { MouseFollowCamera } from './utils'



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
  const { levels, intensity, middleGrey, maxLuminance } = useControls({
    intensity: { value: 0.07, min: 0, max: 1.5, step: 0.01 },
    levels: { value: 9, min: 1, max: 9, step: 1 },
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
  return (
    <Canvas camera={{ position: [0, 5, 150], fov: 55, near: 1, far: 20000 }}
    >
      {/* Mouse-following camera effect */}
      <MouseFollowCamera intensity={0.02} smoothness={0.1} />
      
      {/* <pointLight decay={0} position={[100, 100, 100]} />
      <pointLight decay={0.5} position={[-100, -100, -100]} /> */}
      {/* Add the light component with helper */}
      {/* <PointLightWithHelper /> */}
      {/* <DirectionalLightWithHelper/> */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={10.0} levels={levels} intensity={intensity * 4} />
        <ToneMapping middleGrey={middleGrey} maxLuminance={maxLuminance} />
      </EffectComposer>
      <Suspense fallback={null}>
        <Environment background path='/' files={"rock color.hdr"} backgroundRotation={[0, degToRad(112), 0]} environmentIntensity={1} />
          <Ocean />
          {/* <Box /> */}

          <group position={[-1.3, -11, 55]} scale={0.9}>
          <WobbleBubble position={[0, 28, 0]} radius={11.5} />
          <DevfumLogo position={[0, 28, 0]} scale={0.23} />
          </group>
          {/* Center Rock */}
          <Rock position={[0, 15, 40]} scale={0.7} />
          {/* LEft close rock */}
          <Rock position={[-5.5, -1.3, 150]} rotation={[degToRad(90), 0, 0]} scale={0.2} />
          {/* <BubbleEmitter waterY={0} topY={80} area={[160, 160]} maxBubbles={3} /> */}
          <OneShotBubbles
            waterY={-2}
            topY={80}
            spawnCenter={[1, 85]}
            spacing={20}     // distance between bubbles
            direction="x"    // spread along X (use "z" to spread along Z)
            jitter={0.1}
            riseSpeedRange={[0.7, 1.2]}  // slower
          />
          {/* <Effects>
      </Effects> */}

      </Suspense>
      {/* <Sky scale={1000} sunPosition={[500, 150, -1000]} turbidity={0.1} /> */}
      <OrbitControls enableZoom={false} minPolarAngle={degToRad(88)} maxPolarAngle={degToRad(10)} minAzimuthAngle={degToRad(0)} maxAzimuthAngle={degToRad(360)} />
      {/* <OrbitControls  /> */}
    </Canvas>
  )
}
