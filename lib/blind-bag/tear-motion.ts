import { clamp } from './easing'

/**
 * Chuyển động xé túi, port từ CrownCard (pack-ring-tear.ts) nhưng không phụ thuộc THREE.
 * Chỉ TARGET đi theo ngón tay; lò xo kéo progress theo sau để lá bạc có "khối lượng".
 */
export const TEAR_COMMIT_THRESHOLD = 0.34
export const TEAR_DIRECTION_LOCK_DISTANCE = 12
export const TEAR_STRIP_FALL_DURATION = 0.84

const STIFFNESS_DRAGGING = 36
const STIFFNESS_RELEASED = 18
const DAMPING_DRAGGING = 18
const DAMPING_RELEASED = 10

export class TearMotion {
  progress = 0
  fallProgress = 0
  released = false
  direction: 1 | -1 = 1
  pullX = 0
  pullY = 0

  private target = 0
  private velocity = 0
  private scrubbing = false
  private locked = false

  get isScrubbing() {
    return this.scrubbing
  }
  get committed() {
    return this.target === 1
  }

  lockDirection(deltaX: number): boolean {
    if (this.locked) return true
    if (Math.abs(deltaX) < TEAR_DIRECTION_LOCK_DISTANCE) return false
    this.direction = deltaX >= 0 ? 1 : -1
    this.locked = true
    return true
  }

  /** Ngón tay kéo tới đâu. Đơn điệu tăng: tay quay lại không làm lá bạc dán lại. */
  scrub(progress: number, pullX = 0, pullY = 0) {
    if (this.committed) return
    this.scrubbing = true
    this.pullX = clamp(pullX, -1, 1)
    this.pullY = clamp(pullY, -1, 1)
    this.target = Math.max(this.target, clamp(progress, 0, 1))
  }

  /** Thả tay: qua ngưỡng thì xé hẳn, không thì lò xo kéo về như cũ. */
  settle(): { opened: boolean } {
    const opened = Math.max(this.progress, this.target) >= TEAR_COMMIT_THRESHOLD
    this.scrubbing = false
    this.target = opened ? 1 : 0
    this.fallProgress = 0
    if (opened) {
      this.released = true
    } else {
      this.released = false
      this.locked = false
      this.pullX = 0
      this.pullY = 0
    }
    return { opened }
  }

  reset() {
    this.progress = 0
    this.fallProgress = 0
    this.released = false
    this.direction = 1
    this.target = 0
    this.velocity = 0
    this.scrubbing = false
    this.locked = false
    this.pullX = 0
    this.pullY = 0
  }

  /** Trả về true nếu có gì đó chuyển động và cần vẽ lại. */
  advance(dt: number): boolean {
    let moved = false
    if (Math.abs(this.target - this.progress) > 0.0005 || Math.abs(this.velocity) > 0.0005) {
      const diff = this.target - this.progress
      this.velocity += diff * (this.scrubbing ? STIFFNESS_DRAGGING : STIFFNESS_RELEASED) * dt
      this.velocity *= Math.exp(-(this.scrubbing ? DAMPING_DRAGGING : DAMPING_RELEASED) * dt)
      let next = clamp(this.progress + this.velocity, 0, 1)
      if (Math.abs(diff) < 0.0015 && Math.abs(this.velocity) < 0.0015) {
        next = this.target
        this.velocity = 0
      }
      this.progress = next
      moved = true
    }
    if (this.released && this.fallProgress < 1) {
      this.fallProgress = Math.min(1, this.fallProgress + dt / TEAR_STRIP_FALL_DURATION)
      moved = true
    }
    return moved
  }
}
