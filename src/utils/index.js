import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

// Function to convert degrees to radians
export const degToRad = (degrees) => {
  return degrees * (Math.PI / 180)
}


// Mouse-following camera component
export const MouseFollowCamera = ({
  intensity = 0.02,
  smoothness = 0.1,
  basePosition = [0, 5, 150],
  basePositionRef,
  baseRotationRef,
  baseLookAtRef,
}) => {
    const { camera, size } = useThree();
    const mousePosition = useRef({ x: 0, y: 0 });
    const currentOffset = useRef({ x: 0, y: 0, z: 0 });
  
    // Track mouse movement
    useEffect(() => {
      const handleMouseMove = (event) => {
        // Normalize mouse position to -1 to 1 range
        mousePosition.current.x = (event.clientX / size.width) * 2 - 1;
        mousePosition.current.y = -(event.clientY / size.height) * 2 + 1;
      };
  
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [size]);
  
    useFrame(() => {
      const basePos = basePositionRef?.current ?? { x: basePosition[0], y: basePosition[1], z: basePosition[2] }
      const baseRot = baseRotationRef?.current ?? { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z }
      const baseLookAt = baseLookAtRef?.current

      // Calculate target offset based on mouse position
      const targetX = mousePosition.current.x * intensity * 50;
      const targetY = mousePosition.current.y * intensity * 30;
      const targetZ = mousePosition.current.x * intensity * 20; // Subtle forward/backward movement
  
      // Smooth interpolation to target position
      currentOffset.current.x += (targetX - currentOffset.current.x) * smoothness;
      currentOffset.current.y += (targetY - currentOffset.current.y) * smoothness;
      currentOffset.current.z += (targetZ - currentOffset.current.z) * smoothness;
  
      // Apply offset to camera position (relative to animated base position)
      camera.position.set(
        basePos.x + currentOffset.current.x,
        basePos.y + currentOffset.current.y,
        basePos.z + currentOffset.current.z
      );
  
      // Safety: never let mouse shake push us underwater
      if (camera.position.y < 0.55) camera.position.y = 0.55
  
      // Orientation:
      // - If baseLookAtRef is provided, always look at it (cinematic + stable)
      // - Otherwise, use baseRotationRef
      if (baseLookAt) {
        camera.lookAt(baseLookAt.x, baseLookAt.y, baseLookAt.z)
      } else {
        camera.rotation.set(baseRot.x, baseRot.y, baseRot.z);
      }

      // Subtle roll based on mouse position (shake feel)
      camera.rotation.z += mousePosition.current.x * intensity * 0.1;
    });
  
    return null;
  };