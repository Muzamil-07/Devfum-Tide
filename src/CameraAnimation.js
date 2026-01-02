import { useEffect, useRef } from "react"
import gsap from "gsap"
import { degToRad } from "three/src/math/MathUtils.js"

// Helper to detect mobile devices
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
}

/**
 * Plays a one-time cinematic sequence on the first scroll / swipe:
 * 1) Fade out the big bubble
 * 2) Start logo rotation
 * 3) Move camera along a slightly "stepped" path (forward, dip, then bottom-looking angle)
 * 4) Shift camera to the right so the hero sits left, then reveal DOM content on the right
 *    (Note: On mobile, camera goes straight to keep logo centered)
 */
export default function CameraAnimation({
  bubbleMaterialRef,
  logoGroupRef,
  rockLogoGroupRef,
  basePositionRef,
  baseRotationRef,
  baseLookAtRef,
  onRevealContent,
  onResetContent,
  enabled = true,
}) {
  const playedRef = useRef(false)
  const tlRef = useRef(null)
  const spinTweenRef = useRef(null)
  const swayTweenRef = useRef(null)
  // Robustly start the infinite spin even if the ref becomes available slightly after first scroll
  const spinWantedRef = useRef(false)
  const spinStartedRef = useRef(false)
  const spinDueAtRef = useRef(0)
  const rafRef = useRef(0)
  const initialRef = useRef(null)
  const stateRef = useRef("idle") // "idle" | "forward" | "revealed"

  useEffect(() => {
    if (!enabled) return

    const killContinuousLogoTweens = () => {
      spinTweenRef.current?.kill()
      swayTweenRef.current?.kill()
      spinTweenRef.current = null
      swayTweenRef.current = null
      spinStartedRef.current = false
    }

    const startLogoSpinIfPossible = () => {
      if (spinStartedRef.current) return
      const logoGroup = logoGroupRef?.current
      if (!logoGroup) return

      killContinuousLogoTweens()
      spinTweenRef.current = gsap.to(logoGroup.rotation, {
        y: `+=${Math.PI * 2}`,
        duration: 6,
        ease: "none",
        repeat: -1,
      })
      swayTweenRef.current = gsap.to(logoGroup.rotation, {
        x: degToRad(8),
        duration: 1.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      })
      spinStartedRef.current = true
    }

    const snapshotInitial = () => {
      if (initialRef.current) return

      const bubbleMat = bubbleMaterialRef?.current
      const logoGroup = logoGroupRef?.current
      const rockGroup = rockLogoGroupRef?.current
      const basePos = basePositionRef?.current
      const baseRot = baseRotationRef?.current
      const baseLookAt = baseLookAtRef?.current

      initialRef.current = {
        bubble: bubbleMat
          ? { opacity: bubbleMat.opacity ?? 1, transparent: !!bubbleMat.transparent }
          : null,
        logoPos: logoGroup
          ? { x: logoGroup.position.x, y: logoGroup.position.y, z: logoGroup.position.z }
          : null,
        logoRot: logoGroup
          ? { x: logoGroup.rotation.x, y: logoGroup.rotation.y, z: logoGroup.rotation.z }
          : null,
        rockPos: rockGroup
          ? { x: rockGroup.position.x, y: rockGroup.position.y, z: rockGroup.position.z }
          : null,
        basePos: basePos ? { x: basePos.x, y: basePos.y, z: basePos.z } : null,
        baseRot: baseRot ? { x: baseRot.x, y: baseRot.y, z: baseRot.z } : null,
        baseLookAt: baseLookAt ? { x: baseLookAt.x, y: baseLookAt.y, z: baseLookAt.z } : null,
      }
    }

    const triggerForward = () => {
      if (stateRef.current !== "idle") return
      snapshotInitial()
      playedRef.current = true
      stateRef.current = "forward"
      spinWantedRef.current = true
      spinStartedRef.current = false
      // Match the previous behavior: start spinning with a slight delay after the first scroll.
      spinDueAtRef.current = performance.now() + 1550

      const bubbleMat = bubbleMaterialRef?.current
      const logoGroup = logoGroupRef?.current
      const rockGroup = rockLogoGroupRef?.current
      const basePos = basePositionRef?.current
      const baseRot = baseRotationRef?.current
      const baseLookAt = baseLookAtRef?.current

      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
      tlRef.current = tl

      // ---- 1) Bubble fade-out ----
      if (bubbleMat) {
        bubbleMat.transparent = true
        // Ensure we fade from fully visible (in case of repeated toggles)
        if (typeof bubbleMat.opacity !== "number") bubbleMat.opacity = 1
        tl.to(
          bubbleMat,
          {
            opacity: 0,
            duration: 1.15,
            onUpdate: () => {
              bubbleMat.needsUpdate = true
            },
          },
          0
        )
      }

      // ---- 2) Start logo rotation (after fade begins) ----
      if (logoGroup) {
        tl.to(
          logoGroup.rotation,
          {
            x: degToRad(12),
            duration: 0.9,
            ease: "power3.out",
          },
          1.2
        )
        
        const isMobile = isMobileDevice()

        // Move logo: desktop nudges it right to make room for content,
        // mobile nudges it slightly left so it appears a bit left-of-center.
        tl.to(
          logoGroup.position,
          {
            x: isMobile ? -1.2 : 2.0,
            duration: 0.85 / 1.4,
            ease: "power3.out",
          },
          2.4
        )

// Move logo up a little (starts at the same time)
tl.to(
  logoGroup.position,
  {
    y: 31,
    duration: 1.5 / 1.4,
    ease: "power3.out",
  },
  2.4
)

        // Move rock group down a little (if provided)
        if (rockGroup) {
          tl.to(
            rockGroup.position,
            {
              y: -3,
              duration: 0.99/1.4,
              delay: 1,
              ease: "power3.inOut",
            },
            1.2
          )
        }

      }

      // Continuous Y spin + tiny X sway
      // NOTE: schedule this even if logoGroup is not yet available due to Suspense.
      tl.add(() => {
        spinWantedRef.current = true
        // If forward was triggered some other way, ensure we still honor the delay.
        if (!spinDueAtRef.current) spinDueAtRef.current = performance.now() + 1550
        startLogoSpinIfPossible()
      }, 1.55)

      // ---- 3) Camera movement (ONE continuous move; always above water) ----
      // Water plane is at y=0. Keep the camera above it.
      // We go mostly straight in Z, with a subtle dip in Y, and end lower (still above water)
      // so it feels like you're looking up at the rock/logo.
      if (basePos) {
        const startAt = 1.15
        const MIN_WATER_Y = 0.9
        const isMobile = isMobileDevice()

        tl.to(
          basePos,
          {
            keyframes: isMobile ? [
              // Mobile: keep camera centered (x stays at 0) so logo appears in center
              { x: 0.0, z: 132, y: 4.8, duration: 0.45/1.4, ease: "none" },
              { x: 0.0, z: 110, y: 4.4, duration: 0.55/1.4, ease: "none" },
              { x: 0.0, z: 92, y: 4.0, duration: 0.55/1.4, ease: "none" },
              { x: 0.0, z: 78, y: 3.6, duration: 0.50/1.4, ease: "none" },
            ] : [
              // Desktop: drift camera to the RIGHT for asymmetric composition
              // This makes the rock+logo appear more to the LEFT in frame (space for right-side content).
              { x: 0.0, z: 132, y: 4.8, duration: 0.45/1.4, ease: "none" },
              { x: 2.5, z: 110, y: 4.4, duration: 0.55/1.4, ease: "none" },
              { x: 6.0, z: 92, y: 4.0, duration: 0.55/1.4, ease: "none" },
              { x: 9.0, z: 78, y: 3.6, duration: 0.50/1.4, ease: "none" },
              // final: closer + slightly lower but still above water
              // { x: 12.0, z: 66, y: 1.75, duration: 0.65, ease: "power2.inOut" },
              // { x: 18.0, z: 62, y: 1.55, duration: 0.68, ease: "power2.inOut" },
            ],
            onUpdate: () => {
              if (basePos.y < MIN_WATER_Y) basePos.y = MIN_WATER_Y
            },
          },
          startAt
        )
      }

      // Camera aim: prefer lookAt target so it smoothly ends "looking up"
      if (baseLookAt) {
        const isMobile = isMobileDevice()
        tl.to(
          baseLookAt,
          {
            keyframes: isMobile ? [
              // Mobile: nudge lookAt slightly left so logo appears left-of-center
              { x: -1.2, y: 15.8, z: 48, duration: 0.8, ease: "none" },
              { x: -0.6, y: 16.3, z: 50, duration: 0.9, ease: "none" },
              { x: 0.0, y: 16.8, z: 52, duration: 0.75, ease: "power2.inOut" },
            ] : [
              // Desktop: aim slightly to the RIGHT of the hero so hero sits left-of-center in frame
              // Lower lookAt Y => camera pitches up more => logo sits higher in frame
              { x: 3.5, y: 15.8, z: 48, duration: 0.8, ease: "none" },
              { x: 7.5, y: 16.3, z: 50, duration: 0.9, ease: "none" },
              { x: 10.0, y: 16.8, z: 52, duration: 0.75, ease: "power2.inOut" },
            ],
          },
          1.35
        )
      } else if (baseRot) {
        // fallback rotation animation if you don't provide lookAt
        tl.to(
          baseRot,
          {
            keyframes: [
              { x: degToRad(0), y: 0, z: 0, duration: 0.6, ease: "none" },
              { x: degToRad(-6), y: degToRad(1.2), z: 0, duration: 0.9, ease: "none" },
              { x: degToRad(-12), y: degToRad(2.4), z: 0, duration: 0.9, ease: "power2.inOut" },
            ],
          },
          1.35
        )
      }

      tl.add(() => {
        stateRef.current = "revealed"
        onRevealContent?.()
      }, 3.1)
    }

    const triggerReverse = () => {
      // Only allow reversing once we've reached the "revealed" state.
      // This avoids trackpad momentum/sign-flips killing the forward timeline mid-flight.
      if (stateRef.current !== "revealed") return
      snapshotInitial()
      spinWantedRef.current = false
      spinStartedRef.current = false
      spinDueAtRef.current = 0

      const bubbleMat = bubbleMaterialRef?.current
      const logoGroup = logoGroupRef?.current
      const rockGroup = rockLogoGroupRef?.current
      const basePos = basePositionRef?.current
      const baseRot = baseRotationRef?.current
      const baseLookAt = baseLookAtRef?.current
      const init = initialRef.current

      // Stop any tweens that may be running from OTHER flows (e.g. Explore/CaseStudy back).
      // This prevents "glitchy" snapping and ensures we actually stop the external infinite logo rotation.
      if (bubbleMat) gsap.killTweensOf(bubbleMat)
      if (logoGroup) {
        gsap.killTweensOf(logoGroup.rotation)
        gsap.killTweensOf(logoGroup.position)
      }
      if (rockGroup) gsap.killTweensOf(rockGroup.position)
      if (basePos) gsap.killTweensOf(basePos)
      if (baseLookAt) gsap.killTweensOf(baseLookAt)
      if (baseRot) gsap.killTweensOf(baseRot)

      // Stop the forward timeline immediately and any infinite tweens created by this component.
      tlRef.current?.kill()
      tlRef.current = null
      killContinuousLogoTweens()

      // Hide the right-side DOM content immediately so the "original hero" is clean.
      onResetContent?.()

      const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } })
      tlRef.current = tl

      // Bubble back in
      if (bubbleMat) {
        // Temporarily force transparent so we can animate opacity back in
        bubbleMat.transparent = true
        bubbleMat.needsUpdate = true
        tl.to(
          bubbleMat,
          {
            opacity: init?.bubble?.opacity ?? 1,
            duration: 0.85,
            onUpdate: () => {
              bubbleMat.needsUpdate = true
            },
          },
          0
        )
        tl.add(() => {
          // Restore original material flags (if it was not meant to be transparent).
          if (init?.bubble && typeof init.bubble.transparent === "boolean") {
            bubbleMat.transparent = init.bubble.transparent
            bubbleMat.needsUpdate = true
          }
        }, 0.86)
      }

      // Restore hero group position (rock + bubble + logo)
      if (rockGroup && init?.rockPos) {
        tl.to(
          rockGroup.position,
          {
            ...init.rockPos,
            duration: 1.05,
          },
          0
        )
      }

      // Restore logo pos + rotation to initial (including "rotation zero")
      if (logoGroup) {
        if (init?.logoPos) {
          tl.to(
            logoGroup.position,
            {
              ...init.logoPos,
              duration: 1.05,
            },
            0
          )
        }
        if (init?.logoRot) {
          tl.to(
            logoGroup.rotation,
            {
              ...init.logoRot,
              duration: 1.0,
              ease: "power3.out",
            },
            0
          )
        } else {
          tl.to(
            logoGroup.rotation,
            { x: 0, y: 0, z: 0, duration: 1.0, ease: "power3.out" },
            0
          )
        }
      }

      // Restore camera base position / lookAt (MouseFollowCamera will apply these)
      if (basePos && init?.basePos) {
        tl.to(
          basePos,
          {
            ...init.basePos,
            duration: 1.2,
          },
          0
        )
      }

      if (baseLookAt && init?.baseLookAt) {
        tl.to(
          baseLookAt,
          {
            ...init.baseLookAt,
            duration: 1.2,
          },
          0
        )
      } else if (baseRot && init?.baseRot) {
        tl.to(
          baseRot,
          {
            ...init.baseRot,
            duration: 1.2,
          },
          0
        )
      }

      tl.add(() => {
        // allow playing forward again
        stateRef.current = "idle"
        playedRef.current = false
        spinWantedRef.current = false
        spinStartedRef.current = false
        spinDueAtRef.current = 0
      })
    }

    let touchStartY = 0
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) < 2) return
      if (e.deltaY > 0) triggerForward()
      else triggerReverse()
    }
    const onTouchStart = (e) => {
      touchStartY = e.touches?.[0]?.clientY ?? 0
    }
    const onTouchMove = (e) => {
      const y = e.touches?.[0]?.clientY ?? 0
      const dy = y - touchStartY
      if (Math.abs(dy) < 8) return
      // Finger moves UP (dy < 0) usually means scroll DOWN => forward.
      if (dy < 0) triggerForward()
      else triggerReverse()
    }

    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: true })

    // If the first scroll happens during Suspense mount, the logo ref can be null at trigger time.
    // This small rAF loop starts the spin as soon as the ref becomes available AND the delay has passed.
    const tick = () => {
      if (
        spinWantedRef.current &&
        !spinStartedRef.current &&
        (stateRef.current === "forward" || stateRef.current === "revealed") &&
        spinDueAtRef.current > 0 &&
        performance.now() >= spinDueAtRef.current
      ) {
        startLogoSpinIfPossible()
      }
      rafRef.current = window.requestAnimationFrame(tick)
    }
    rafRef.current = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      tlRef.current?.kill()
      tlRef.current = null
      killContinuousLogoTweens()
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [
    enabled,
    bubbleMaterialRef,
    logoGroupRef,
    rockLogoGroupRef,
    basePositionRef,
    baseRotationRef,
    baseLookAtRef,
    onRevealContent,
    onResetContent,
  ])

  return null
}


