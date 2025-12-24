import React, { useEffect, useMemo, useRef } from "react"
import gsap from "gsap"
import "./CaseStudyDetail.css"

export default function CaseStudyDetail({
  visible,
  onBack,
  title = "The Right Web Experience",
  eyebrow = "DEVFUM",
  heading = "TideLab",
  paragraphs = [
    `An interactive 3D ocean scene where the water responds naturally to cursor movement, generating smooth ripple waves with controlled spacing, bloom, easing, and reliable spawning behavior across camera distances. We also developed a glass “WobbleBubble” system with localized (hover-only) deformation using noise-based displacement, plus clean, controllable hover color refraction/iridescence that stays confined to the interaction area. On top of that, we created a stable bubble emission system that spawns bubbles progressively (single/pairs), cycles cleanly without glitches, supports region/spacing/radius controls, and adds hover interaction to push bubbles away and boost rise speed. Finally, we introduced a scroll-driven camera choreography that fades elements, rotates the logo, moves the camera along a non-linear cinematic path, and transitions the layout to make room for content.
`  ],
  buttonLabel = "next",
  onButtonClick,
  media = [
    { src: "/full render.gif", alt: "Full render" },
    { src: "/code.gif", alt: "Code" },
    { src: "/WIREFRAME.gif", alt: "Wireframe" },
  ],
}) {
  const rootRef = useRef(null)
  const tlRef = useRef(null)

  const rightItems = useMemo(() => media.slice(0, 3), [media])

  useEffect(() => {
    if (!visible) {
      tlRef.current?.kill()
      tlRef.current = null
      return
    }

    const root = rootRef.current
    if (!root) return

    const right = root.querySelectorAll("[data-cs-right]")
    const leftItems = root.querySelectorAll("[data-cs-left]")
    const leftButton = root.querySelector("[data-cs-button]")

    // Set initial states
    gsap.set(right, { opacity: 0, y: 24, rotateZ: -8, transformOrigin: "50% 50%" })
    gsap.set(leftItems, { opacity: 0, y: 12 })
    gsap.set(leftButton, { opacity: 0, y: 10, scale: 0.98 })

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tlRef.current = tl

    // 1) Right media comes first (top -> bottom)
    tl.to(right, { opacity: 1, y: 0, rotateZ: 0, duration: 1.3, ease: "power2.out" ,  stagger: 0.18 }, 0)

    // 2) Then left text reveals one by one + button
    // Wait until the right-side sequence finishes for a clear "right first, then left" beat.
    tl.to(leftItems, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power2.out" }, 1.1)
    tl.to(leftButton, { opacity: 1, y: 0, scale: 1, duration: 0.76, ease: "power2.out" }, 1.65)

    return () => {
      tlRef.current?.kill()
      tlRef.current = null
    }
  }, [visible])

  return (
    <div
      ref={rootRef}
      className={`caseStudyOverlay ${visible ? "show" : ""}`}
      aria-hidden={!visible}
    >
      <div className="caseStudyTopBar">
        <button
          type="button"
          className="caseStudyBack"
          onClick={onBack}
          aria-label="Back"
        >
          ←
        </button>

        <div className="caseStudyTopMark" aria-hidden="true">
          {/* optional center mark */}
        </div>

        <div className="caseStudyTopTitle">{title}</div>
      </div>

      <div className="caseStudyGrid">
        <div className="caseStudyLeft">
          <div className="caseStudyEyebrow" data-cs-left>
            {eyebrow}
          </div>
          <div className="caseStudyHeading" data-cs-left>
            {heading}
          </div>

          <div className="caseStudyBody">
            {/* {paragraphs.map((p, idx) => (
              <p key={idx} className="caseStudyParagraph" data-cs-left>
                {p}
              </p>
            ))} */}
            <p className="caseStudyParagraph" data-cs-left>
            An interactive 3D ocean scene where the water responds naturally to cursor movement, generating smooth ripple waves with controlled spacing, bloom, easing, and reliable spawning behavior across camera distances. We also developed a glass “WobbleBubble” system with localized (hover-only) deformation using noise-based displacement, plus clean, controllable hover color refraction/iridescence that stays confined to the interaction area. On top of that, we created a stable bubble emission system that spawns bubbles progressively (single/pairs), cycles cleanly without glitches, supports region/spacing/radius controls, and adds hover interaction to push bubbles away and boost rise speed. Finally, we introduced a scroll-driven camera choreography that fades elements, rotates the logo, moves the camera along a non-linear cinematic path, and transitions the layout to make room for content.
            </p>

          </div>

          <button
            type="button"
            className="caseStudyCta"
            data-cs-button
            onClick={onButtonClick}
          >
            {buttonLabel}
          </button>
        </div>

        <div className="caseStudyRight">
          <div className="caseStudyMediaGrid">
            <div className="caseStudyMedia caseStudyMedia--hero" data-cs-right>
              <img src={rightItems[0]?.src} alt={rightItems[0]?.alt ?? ""} />
            </div>
            <div className="caseStudyMedia caseStudyMedia--small" data-cs-right>
              <img src={rightItems[1]?.src} alt={rightItems[1]?.alt ?? ""} />
            </div>
            <div className="caseStudyMedia caseStudyMedia--small" data-cs-right>
              <img src={rightItems[2]?.src} alt={rightItems[2]?.alt ?? ""} />
            </div>
          </div>
        </div>
      </div>

      <div className="caseStudyBottomBar">
        <div className="caseStudyBrand">DEVFUM</div>
        <div className="caseStudyFooterRight">Research &amp; Dev</div>
      </div>
    </div>
  )
}


