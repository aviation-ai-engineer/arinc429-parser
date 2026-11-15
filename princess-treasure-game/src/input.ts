/**
 * Movement input: keyboard (arrows / WASD) plus an on-screen touch joystick.
 * Exposes a single 2D vector in "screen" space: x = right, y = forward (up).
 */
export class Input {
  private keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private stickPointer: number | null = null;
  /** True once the player has pressed anything (used to fade the hint). */
  touched = false;

  constructor(joystick: HTMLElement, knob: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.touched = true;
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch');
    }

    const radius = 55;
    const update = (e: PointerEvent) => {
      const r = joystick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > radius) {
        dx = (dx / len) * radius;
        dy = (dy / len) * radius;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick.x = dx / radius;
      this.stick.y = -dy / radius;
    };
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.stick.x = 0;
      this.stick.y = 0;
      knob.style.transform = '';
    };

    joystick.addEventListener('pointerdown', (e) => {
      this.stickPointer = e.pointerId;
      this.touched = true;
      joystick.setPointerCapture(e.pointerId);
      update(e);
    });
    joystick.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickPointer) update(e);
    });
    joystick.addEventListener('pointerup', release);
    joystick.addEventListener('pointercancel', release);
  }

  /** Returns the movement direction, length clamped to 1. */
  move(): { x: number; y: number } {
    let x = this.stick.x;
    let y = this.stick.y;
    const k = this.keys;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y += 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }
}
