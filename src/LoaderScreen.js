import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";

import logoAnimation from "./LOADER SCREEN LOGO BLINK.json";
import noiseAnimation from "./Noise.json";
import { triggerEnable, setMuted, setLoaderVisible } from "./utils/soundManager";

export default function LoaderScreen() {
  const { active, progress } = useProgress();

  // phases:
  // - loading: show progress
  // - ready: progress finished, show "Enter with sound"
  // - exiting: fade out overlay, then unmount
  const [phase, setPhase] = useState("loading");
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);

  const pct = Math.min(100, Math.max(0, Math.round(progress || 0)));

  const logoLottieRef = useRef(null);
  const progressWrapRef = useRef(null);
  const enterBtnRef = useRef(null);
  const readyTlRef = useRef(null);
  const scrollLockStateRef = useRef(null);

  // Keep loader logo + actions sized to the visible screen so the match-cut to the 3D logo lines up on all devices.
  const updateLoaderSizingVars = useCallback(() => {
    const docEl = document.documentElement;
    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    const shortSide = Math.max(1, Math.min(w, h));

    // On narrow/mobile widths we want the loader logo to be proportionally larger
    // so the match-cut aligns better with the 3D logo. Increase the top offset
    // as well so the actions sit further below the logo on mobile.
    const isMobile = w <= 500;
    let logoSize, actionsTop, actionsWidth;

    if (isMobile) {
      // Use viewport width (not shortest side) on narrow screens and bias upward
      logoSize = Math.min(520, Math.max(260, w * 0.82));
      actionsTop = Math.round(logoSize * 0.85);
      actionsWidth = Math.min(220, Math.max(140, w * 0.5));
    } else {
      logoSize = Math.min(560, Math.max(210, shortSide * 0.56));
      actionsTop = Math.round(logoSize * 0.78);
      actionsWidth = Math.min(240, Math.max(140, shortSide * 0.34));
    }

    docEl.style.setProperty("--loader-logo-size", `${logoSize}px`);
    docEl.style.setProperty("--loader-actions-top", `${actionsTop}px`);
    docEl.style.setProperty("--loader-actions-width", `${actionsWidth}px`);
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;
    if (!active && pct >= 100) {
      // Give the last frame a tiny bit of time to settle, then switch to "ready"
      // (this triggers the progress-bar-out + glass-blur-in animation).
      const t = setTimeout(() => setPhase("ready"), 200);
      return () => clearTimeout(t);
    }
  }, [active, pct, phase]);

  // Disable scroll / wheel / touch scrolling (and common scroll keys) until user enters.
  useEffect(() => {
    if (!mounted) return;

    const shouldLock = phase !== "exiting";
    if (!shouldLock) return;

    const docEl = document.documentElement;
    const body = document.body;

    // Snapshot previous inline styles so we can restore cleanly.
    const prev = {
      htmlOverflow: docEl.style.overflow,
      htmlOverscroll: docEl.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
    };
    scrollLockStateRef.current = prev;

    docEl.style.overflow = "hidden";
    docEl.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";

    // Keep page pinned at the top during load.
    try {
      window.scrollTo(0, 0);
    } catch (_) {
      // ignore
    }

    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const onWheel = (e) => prevent(e);
    const onTouchMove = (e) => prevent(e);
    const onScroll = () => {
      // Some browsers still scroll via momentum; pin it.
      window.scrollTo(0, 0);
    };
    const onKeyDown = (e) => {
      const k = e.key;
      const isScrollKey =
        k === "ArrowDown" ||
        k === "ArrowUp" ||
        k === "PageDown" ||
        k === "PageUp" ||
        k === "Home" ||
        k === "End" ||
        k === " " ||
        k === "Spacebar";
      if (isScrollKey) prevent(e);
    };

    // Capture phase so we block before app-level listeners.
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("keydown", onKeyDown, { capture: true });

      const p = scrollLockStateRef.current;
      if (p) {
        docEl.style.overflow = p.htmlOverflow;
        docEl.style.overscrollBehavior = p.htmlOverscroll;
        body.style.overflow = p.bodyOverflow;
        body.style.overscrollBehavior = p.bodyOverscroll;
        body.style.touchAction = p.bodyTouchAction;
      }
      scrollLockStateRef.current = null;
    };
  }, [mounted, phase]);

  // Ensure initial visual states are correct (no CSS-timed appearance).
  useLayoutEffect(() => {
    if (!mounted) return;
    const progressWrap = progressWrapRef.current;
    const enterBtn = enterBtnRef.current;
    if (!progressWrap || !enterBtn) return;

    // Kill any previous timeline (dev fast refresh, etc.)
    readyTlRef.current?.kill?.();
    readyTlRef.current = null;

    // Base state
    gsap.set(progressWrap, { clearProps: "all" });
    gsap.set(progressWrap, { autoAlpha: 1, display: "block" });
    gsap.set(enterBtn, { autoAlpha: 0, pointerEvents: "none" });
    updateLoaderSizingVars();
  }, [mounted, updateLoaderSizingVars]);

  // When we reach 100% (ready), animate progress bar out and fade button in (GSAP).
  useLayoutEffect(() => {
    if (phase !== "ready") return;
    // Freeze the logo animation on its last second / final pose once loading finishes.
    // (Prevents it from looping after 100%.)
    const lottie = logoLottieRef.current;
    if (lottie?.getDuration && lottie?.goToAndStop) {
      const totalFrames = Number(lottie.getDuration(true)) || 0;
      const fr = Number(lottie?.animationData?.fr) || 0;
      const targetFrameFrom4s = fr > 0 ? Math.round(fr * 4) : totalFrames;
      const targetFrame = Math.max(0, Math.min(totalFrames || targetFrameFrom4s, targetFrameFrom4s || totalFrames));
      lottie.goToAndStop(targetFrame || totalFrames || 0, true);
    }

    const progressWrap = progressWrapRef.current;
    const enterBtn = enterBtnRef.current;
    if (!progressWrap || !enterBtn) return;

    readyTlRef.current?.kill?.();

    const tl = gsap.timeline();
    tl.to(progressWrap, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.out",
    })
      .set(progressWrap, { display: "none" })
      .to(
        enterBtn,
        {
          autoAlpha: 1,
          duration: 0.45,
          ease: "power2.out",
          onStart: () => gsap.set(enterBtn, { pointerEvents: "auto" }),
        },
        "+=0.05"
      );

    readyTlRef.current = tl;
    return () => tl.kill();
  }, [phase]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const t = setTimeout(() => setMounted(false), 800);
    return () => clearTimeout(t);
  }, [phase]);

  useLayoutEffect(() => {
    updateLoaderSizingVars();
    window.addEventListener("resize", updateLoaderSizingVars);
    return () => window.removeEventListener("resize", updateLoaderSizingVars);
  }, [updateLoaderSizingVars]);

  const onEnter = () => {
    if (phase !== "ready") return;
    // Ensure progress never flashes back in during exit.
    if (progressWrapRef.current) gsap.set(progressWrapRef.current, { autoAlpha: 0, display: "none" });
    if (enterBtnRef.current) gsap.set(enterBtnRef.current, { pointerEvents: "none" });
    // user explicitly entered with sound -> unmute and try to enable audio
    try {
      setMuted(false)
      void triggerEnable()
    } catch (e) {}
    setPhase("exiting");
    setVisible(false);
  };

  // Announce loader mounted state so other components can hide/show controls.
  useEffect(() => {
    setLoaderVisible(mounted)
    return () => setLoaderVisible(false)
  }, [mounted])

  if (!mounted) return null;

  const overlayClasses = [
    "loaderOverlay",
    visible ? "show" : "hide",
    // Keep "ready" styles during exit so the progress bar doesn't flash back in.
    phase === "ready" || phase === "exiting" ? "ready" : "",
    phase === "exiting" ? "exiting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={overlayClasses} aria-label="Loading screen">
      {/* ✅ NOISE (force size + zIndex) */}
      {/* <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
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
      </div> */}

      {/* ✅ LOGO */}
      <div className="loaderInner offset" style={{ position: "relative", zIndex: 2 }}>
        <div className="loaderLogo" aria-hidden="true">
          <Lottie
            animationData={logoAnimation}
            loop
            autoplay
            lottieRef={logoLottieRef}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Progress / enter button are ABSOLUTELY positioned so the logo never shifts */}
        <div className="loaderActions" aria-live="polite">
          <div ref={progressWrapRef} className="loaderProgressWrap" aria-label={`Loading ${pct}%`}>
            <div className="loaderProgressText">{pct}%</div>
            <div className="loaderProgressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div
                className="loaderProgressFill"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
          </div>

          <button
            ref={enterBtnRef}
            type="button"
            className="glassButton loaderEnterButton"
            onClick={onEnter}
            disabled={phase !== "ready"}
          >
            Enter with sound
          </button>
        </div>
      </div>
    </div>
  );
}
