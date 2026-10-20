# Implementation Plan: In-Place Animated Nessa Mascot (Fixed Size)

Play the animated talking video of Nessa directly in-place inside the bottom-right corner mascot widget, preserving the exact same size with no size changes or separate large modal popups.

---

## 1. In-Place Fixed-Size Video Playback
- **Exact Dimension Locking**:
  - Lock container and media strictly to `h-28 md:h-36 w-auto` with zero scaling (`scale-100`, no hover zoom, no active click shrink).
- **Seamless State Swap**:
  - **Idle**: Displays the crisp resting avatar image (`/assets/nessa-avatar.png`).
  - **Active (Clicked)**: Instantly switches to the animated video (`/video/nessa.mp4`) at the exact same position and pixel dimensions.
  - **Background-Free Blending**: Applies `mix-blend-mode: screen` and golden-red aura filter so the video's black backdrop is 100% transparent. Only the moving cat and sparkles appear.
  - **Audio & Video**: Starts playback with full synchronized audio upon user click.
  - **Click to Pause/Reset**: Tapping while playing pauses and resets back to the resting avatar.
  - **On Completion**: Automatically resets to the resting avatar when the video concludes.

---

## 2. Speech Caption & Clean Presentation
- Retain the elegant luxury gold caption bubble above the corner mascot displaying:
  > *"Hi, welcome to Luckily. I'm Nessa, the golden cat. Tap around. I'll explain how everything works."*
- Automatically closes after playback completes.
- Remove the separate full-screen popup modal so the entire experience is focused and contained directly in the corner.

---

## 3. Integration & Automated Tests
- Streamline `src/components/NessaMascot.tsx` with in-place `<video>` switching and fixed dimensions.
- Update `src/App.tsx` to mount the self-contained in-place `NessaMascot`.
- Verify with automated self-test suites:
  - Assert in-place video playback at constant size (`h-28 md:h-36`).
  - Assert zero scaling transformations.
  - Maintain 100% test pass rate across all suites.
