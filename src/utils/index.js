import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

// Function to convert degrees to radians
export const degToRad = (degrees) => {
  return degrees * (Math.PI / 180)
}


// Mouse-following camera component
export const MouseFollowCamera = ({ intensity = 0.02, smoothness = 0.1 }) => {
    const { camera, size } = useThree();
    const mousePosition = useRef({ x: 0, y: 0 });
    const targetPosition = useRef({ x: 0, y: 0, z: 0 });
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
      // Calculate target offset based on mouse position
      const targetX = mousePosition.current.x * intensity * 50;
      const targetY = mousePosition.current.y * intensity * 30;
      const targetZ = mousePosition.current.x * intensity * 20; // Subtle forward/backward movement
  
      // Smooth interpolation to target position
      currentOffset.current.x += (targetX - currentOffset.current.x) * smoothness;
      currentOffset.current.y += (targetY - currentOffset.current.y) * smoothness;
      currentOffset.current.z += (targetZ - currentOffset.current.z) * smoothness;
  
      // Apply offset to camera position (relative to base position)
      const basePosition = [0, 5, 150]; // Your original camera position
      camera.position.set(
        basePosition[0] + currentOffset.current.x,
        basePosition[1] + currentOffset.current.y,
        basePosition[2] + currentOffset.current.z
      );
  
      // Optional: Add subtle rotation based on mouse position for more dynamic feel
      camera.rotation.z = mousePosition.current.x * intensity * 0.1;
    });
  
    return null;
  };