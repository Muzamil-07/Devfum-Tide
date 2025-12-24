import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"

export default function PostFX() {
  return (
    <EffectComposer >
      {/* Film grain */}
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.92} />

      {/* Optional: subtle vignette (often used with grain) */}
      {/* <Vignette eskil={false} offset={0.18} darkness={0.85} /> */}
    </EffectComposer>
  )
}
