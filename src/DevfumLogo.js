import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
// import { Bloom } from '@react-three/postprocessing'

export function DevfumLogo(props) {
  const { nodes, materials } = useGLTF('/Devfum-Logo.glb')
  // console.log('=======', materials['Material.005'])
  // console.log('------', materials.Marble)
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Fill_Layer_.geometry}
        material={materials.Marble}
        position={[0, 0, -0.028]}
        rotation={[Math.PI / 2, 0, -0.07]}
        scale={0.019}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Stroke_Layer_.geometry}
        material={nodes.Stroke_Layer_.material}
        position={[0, 0, -0.028]}
        rotation={[Math.PI / 2, 0, -0.07]}
        scale={0.019}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Bloom_Layer_.geometry}
        material={materials['Material.005']}
        position={[0, 0, 0.093]}
        rotation={[Math.PI / 2, 0, -0.07]}
        scale={0.019}
      >
{/* <meshStandardMaterial color={[1,1,1]} emissive={[1,1,1]} emissiveIntensity={4} toneMapped={true} /> */}
      </mesh>
    </group>
  )
}

useGLTF.preload('/Devfum-Logo.glb')
