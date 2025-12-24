import React from 'react';
import { Html } from '@react-three/drei';
import './ScrollText.css';

const ScrollText = ({ position = [0, -2, 50] }) => {
  return (
    <Html
      position={position}
      center
      distanceFactor={20}
      zIndexRange={[0, 0]}
      transform
      sprite
    >
      <div className="scroll-text-container">
        <div className="scroll-text">scroll</div>
      </div>
    </Html>
  );
};

export default ScrollText;
