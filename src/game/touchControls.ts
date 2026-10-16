/**
 * Dedicated Touch & Mobile Controls System
 * Provides virtual joystick, on-screen D-Pad, and swipe look rotation.
 * Compatible with mobile touchscreens, tablets, and desktop drag fallback.
 */

export interface TouchInputState {
  moveX: number; // -1 to 1 (strafe left/right)
  moveZ: number; // -1 to 1 (forward/backward)
  lookDeltaX: number; // yaw rotation delta
  lookDeltaY: number; // pitch rotation delta
  isSprinting: boolean;
  toggleFlashlightJustPressed: boolean;
  interactJustPressed: boolean;
}

export class TouchController {
  public state: TouchInputState = {
    moveX: 0,
    moveZ: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    isSprinting: false,
    toggleFlashlightJustPressed: false,
    interactJustPressed: false,
  };

  // Virtual Joystick visual state
  public joystickActive: boolean = false;
  public joystickBaseX: number = 0;
  public joystickBaseY: number = 0;
  public joystickThumbX: number = 0;
  public joystickThumbY: number = 0;

  private moveTouchId: number | null = null;
  private lookTouchId: number | null = null;
  private lastLookX: number = 0;
  private lastLookY: number = 0;

  private maxJoystickRadius: number = 48; // px
  private isMobileDevice: boolean = false;

  // D-Pad manual input channels
  public dpadMoveX: number = 0;
  public dpadMoveZ: number = 0;

  constructor() {
    this.checkIfMobile();
  }

  private checkIfMobile() {
    if (typeof window !== 'undefined') {
      const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent || ''
      );
      const isSmallScreen = window.innerWidth <= 840;
      this.isMobileDevice = Boolean(hasTouch || isMobileUA || isSmallScreen);
    }
  }

  public getIsMobile(): boolean {
    return this.isMobileDevice;
  }

  public hasTouchSupport(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  }

  /**
   * Set directional movement directly from on-screen virtual joystick or D-Pad
   * @param normX -1 (left) to 1 (right)
   * @param normZ -1 (backward) to 1 (forward)
   */
  public setJoystickVector(normX: number, normZ: number) {
    this.state.moveX = Math.max(-1, Math.min(1, normX));
    this.state.moveZ = Math.max(-1, Math.min(1, normZ));
  }

  public setDpadDirection(fwd: number, right: number) {
    this.dpadMoveZ = fwd;
    this.dpadMoveX = right;
  }

  public addLookDelta(dx: number, dy: number) {
    this.state.lookDeltaX += dx;
    this.state.lookDeltaY += dy;
  }

  /**
   * Global screen touch start handler
   */
  public handleTouchStart(e: TouchEvent) {
    this.isMobileDevice = true;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const target = touch.target as HTMLElement | null;

      // Ignore touches on interactive HUD buttons (sprint button, pause, flashlight, etc.)
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.closest('button') ||
          target.getAttribute('role') === 'button' ||
          target.dataset.control === 'interactive')
      ) {
        continue;
      }

      const x = touch.clientX;
      const y = touch.clientY;
      const halfW = window.innerWidth * 0.48;

      // Left zone -> Dynamic Joystick
      if (x < halfW && this.moveTouchId === null) {
        this.moveTouchId = touch.identifier;
        this.joystickActive = true;
        this.joystickBaseX = x;
        this.joystickBaseY = y;
        this.joystickThumbX = x;
        this.joystickThumbY = y;
        this.state.moveX = 0;
        this.state.moveZ = 0;
        if (e.cancelable) e.preventDefault();
      }
      // Right zone -> Look rotation
      else if (x >= halfW && this.lookTouchId === null) {
        this.lookTouchId = touch.identifier;
        this.lastLookX = x;
        this.lastLookY = y;
        if (e.cancelable) e.preventDefault();
      }
    }
  }

  /**
   * Global screen touch move handler
   */
  public handleTouchMove(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Update movement joystick
      if (touch.identifier === this.moveTouchId) {
        if (e.cancelable) e.preventDefault();
        const dx = touch.clientX - this.joystickBaseX;
        const dy = touch.clientY - this.joystickBaseY;
        const dist = Math.hypot(dx, dy);

        const clampedDist = Math.min(dist, this.maxJoystickRadius);
        const angle = Math.atan2(dy, dx);

        this.joystickThumbX = this.joystickBaseX + Math.cos(angle) * clampedDist;
        this.joystickThumbY = this.joystickBaseY + Math.sin(angle) * clampedDist;

        // Normalized direction (-1 to 1)
        const normDist = clampedDist / this.maxJoystickRadius;
        this.state.moveX = Math.cos(angle) * normDist;
        // Dragging up on screen produces negative dy, which corresponds to forward move (+1 moveZ)
        this.state.moveZ = -Math.sin(angle) * normDist;
      }

      // Update look rotation
      if (touch.identifier === this.lookTouchId) {
        if (e.cancelable) e.preventDefault();
        const dx = touch.clientX - this.lastLookX;
        const dy = touch.clientY - this.lastLookY;

        this.state.lookDeltaX += dx * 0.0045;
        this.state.lookDeltaY += dy * 0.0045;

        this.lastLookX = touch.clientX;
        this.lastLookY = touch.clientY;
      }
    }
  }

  /**
   * Global screen touch end & cancel handler
   */
  public handleTouchEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === this.moveTouchId) {
        this.moveTouchId = null;
        this.joystickActive = false;
        this.state.moveX = 0;
        this.state.moveZ = 0;
      }

      if (touch.identifier === this.lookTouchId) {
        this.lookTouchId = null;
      }
    }
  }

  public triggerFlashlight() {
    this.state.toggleFlashlightJustPressed = true;
  }

  public triggerInteract() {
    this.state.interactJustPressed = true;
  }

  public setSprint(sprint: boolean) {
    this.state.isSprinting = sprint;
  }

  /**
   * Reset transient frame deltas at end of each frame
   */
  public resetFrameDeltas() {
    this.state.lookDeltaX = 0;
    this.state.lookDeltaY = 0;
    this.state.toggleFlashlightJustPressed = false;
    this.state.interactJustPressed = false;
  }
}
