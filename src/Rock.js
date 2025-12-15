import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export function Rock(props) {
  const { nodes, materials } = useGLTF('/rock model.glb')
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.moon_rock_03_LOD3.geometry}
        material={materials['moon_rock_03.001']}
        position={[2.981, -28.048, 5.676]}
        rotation={[-1.136, 0.625, 0.81]}
        scale={[390.445, 440.826, 436.457]}
      />
    </group>
  )
}

useGLTF.preload('/rock model.glb')
