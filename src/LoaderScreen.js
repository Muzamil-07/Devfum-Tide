import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { useProgress } from "@react-three/drei";

import logoAnimation from "./LOADER SCREEN LOGO BLINK.json";
import noiseAnimation from "./Noise.json";

export default function LoaderScreen() {
  const { active, progress } = useProgress();

  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!active && progress >= 100) {
      const fade = setTimeout(() => setVisible(false), 200);
      const unmount = setTimeout(() => setMounted(false), 900);
      return () => {
        clearTimeout(fade);
        clearTimeout(unmount);
      };
    }
  }, [active, progress]);

  if (!mounted) return null;

  return (
    <div className={`loaderOverlay ${visible ? "show" : "hide"}`}>
      {/* ✅ NOISE (force size + zIndex) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <Lottie
          animationData={noiseAnimation}
          loop
          autoplay
          renderer="canvas"
          style={{
            width: "100%",
            height: "100%",
            opacity: 1,            // 🔥 set to 1 for debugging
          }}
        />
      </div>

      {/* ✅ LOGO */}
      <div className="loaderInner offset" style={{ position: "relative", zIndex: 2 }}>
        <Lottie
          animationData={logoAnimation}
          loop
          autoplay
          style={{ width: 430, height: 430 }}
        />
      </div>
    </div>
  );
}
