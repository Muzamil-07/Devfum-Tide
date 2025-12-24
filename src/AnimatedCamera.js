import React, { useRef } from 'react'
import { useGLTF, PerspectiveCamera, useAnimations } from '@react-three/drei'

export function AnimatedCamera(props) {
  const group = useRef()
  const { nodes, materials, animations } = useGLTF('/CAMERA MOVEMENT.glb')
  const { actions } = useAnimations(animations, group)
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <PerspectiveCamera
          name="Camera"
          makeDefault={false}
          far={1000}
          near={0.1}
          fov={22.895}
          position={[0.707, -1.758, 244.947]}
          rotation={[0, 0.007, 0]}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/CAMERA MOVEMENT.glb')
