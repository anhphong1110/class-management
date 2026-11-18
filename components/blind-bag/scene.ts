import * as THREE from 'three'
import { clamp, easeOutBack, easeOutCubic } from '@/lib/blind-bag/easing'
import { RARITY_COLORS } from '@/lib/blind-bag/odds'
import { TearMotion } from '@/lib/blind-bag/tear-motion'
import { paintCard } from './card-texture'
import { deformStrip } from './strip'
import type { RevealGift } from './types'

// Túi cao 3, rộng 2 (đúng tỉ lệ 816x1224). Đường răng cưa nằm ở 22,7% chiều cao từ đỉnh.
const BAG_W = 2
const BAG_H = 3
const SEAM = 0.227
const STRIP_H = BAG_H * SEAM
const BODY_H = BAG_H - STRIP_H
const CARD_W = 1.5
const CARD_H = 2
const HAPTIC_MARKS = [0.12, 0.28, 0.44, 0.6, 0.76, 0.9]
const MAX_PARTICLES = 700

export type SceneEvents = {
  /** Thả tay đã đủ ngưỡng: túi đã xé, cần gọi máy chủ. */
  onTorn: () => void
  /** Pháo hoa xong, thẻ đã dừng ở mặt trước. */
  onRevealed: () => void
}

type Phase = 'idle' | 'dragging' | 'waiting' | 'revealing' | 'done'

function loadTexture(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        resolve(t)
      },
      undefined,
      reject,
    )
  })
}

function softDot(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

export class BlindBagScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50)
  private motion = new TearMotion()
  private phase: Phase = 'idle'
  private raf = 0
  private last = 0
  private disposed = false
  private baseCamZ = 8

  private bag = new THREE.Group()
  private body = new THREE.Group()
  private stripGroup = new THREE.Group()
  private stripGeo!: THREE.PlaneGeometry
  private stripBase!: Float32Array
  private stripMats: THREE.MeshBasicMaterial[] = []
  private seamGlow!: THREE.Mesh
  private innerGlow!: THREE.Mesh
  private shadow!: THREE.Mesh
  private card = new THREE.Group()
  private cardFront!: THREE.Mesh
  private dot = softDot()
  private textures: THREE.Texture[] = []
  private geometries: THREE.BufferGeometry[] = []
  private materials: THREE.Material[] = []

  private particles!: THREE.Points
  private pPos = new Float32Array(MAX_PARTICLES * 3)
  private pCol = new Float32Array(MAX_PARTICLES * 3)
  private pVel = new Float32Array(MAX_PARTICLES * 3)
  private pLife = new Float32Array(MAX_PARTICLES)
  private pNext = 0

  // Kéo
  private startX = 0
  private startY = 0
  private dragging = false
  private hapticIdx = 0

  // Reveal
  private gift: RevealGift | null = null
  private revealT = 0
  private revealSpeed = 1
  private burstAcc = 0
  private shake = 0

  constructor(
    private container: HTMLElement,
    private events: SceneEvents,
    private assets: { front: string; back: string; cardBack: string },
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;'
    container.appendChild(this.renderer.domElement)
  }

  async init() {
    const [front, back, cardBack] = await Promise.all([
      loadTexture(this.assets.front, this.renderer),
      loadTexture(this.assets.back, this.renderer),
      loadTexture(this.assets.cardBack, this.renderer),
    ])
    if (this.disposed) return
    this.textures.push(front, back, cardBack)
    back.wrapS = THREE.RepeatWrapping
    back.repeat.x = -1
    back.offset.x = 1

    const mat = (map: THREE.Texture, side: THREE.Side) => {
      const m = new THREE.MeshBasicMaterial({ map, side, transparent: true, toneMapped: false })
      this.materials.push(m)
      return m
    }
    const remap = (geo: THREE.PlaneGeometry, v0: number, v1: number) => {
      const uv = geo.attributes.uv as THREE.BufferAttribute
      for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (v1 - v0))
      uv.needsUpdate = true
    }

    // Thân túi (nửa dưới)
    const bodyGeo = new THREE.PlaneGeometry(BAG_W, BODY_H)
    remap(bodyGeo, 0, 1 - SEAM)
    this.geometries.push(bodyGeo)
    const bodyFront = new THREE.Mesh(bodyGeo, mat(front, THREE.FrontSide))
    const bodyBack = new THREE.Mesh(bodyGeo, mat(back, THREE.BackSide))
    this.body.add(bodyFront, bodyBack)
    this.body.position.y = BAG_H / 2 - STRIP_H - BODY_H / 2
    this.body.renderOrder = 2

    // Dải xé (nửa trên), chia nhiều đoạn để uốn được
    this.stripGeo = new THREE.PlaneGeometry(BAG_W, STRIP_H, 64, 6)
    remap(this.stripGeo, 1 - SEAM, 1)
    this.geometries.push(this.stripGeo)
    this.stripBase = Float32Array.from(this.stripGeo.attributes.position.array as Float32Array)
    const sFront = mat(front, THREE.FrontSide)
    const sBack = mat(back, THREE.BackSide)
    this.stripMats = [sFront, sBack]
    this.stripGroup.add(new THREE.Mesh(this.stripGeo, sFront), new THREE.Mesh(this.stripGeo, sBack))
    this.stripGroup.position.y = BAG_H / 2 - STRIP_H / 2
    this.stripGroup.renderOrder = 3

    // Vệt sáng dọc đường xé
    const seamMat = new THREE.MeshBasicMaterial({
      color: 0xfff3c4,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.dot,
    })
    this.materials.push(seamMat)
    const seamGeo = new THREE.PlaneGeometry(1, 0.22)
    this.geometries.push(seamGeo)
    this.seamGlow = new THREE.Mesh(seamGeo, seamMat)
    this.seamGlow.position.set(0, BAG_H / 2 - STRIP_H, 0.04)
    this.seamGlow.renderOrder = 4

    // Ánh sáng trong túi + bóng dưới đất
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffe28a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.dot,
    })
    this.materials.push(glowMat)
    const glowGeo = new THREE.PlaneGeometry(4.2, 4.2)
    this.geometries.push(glowGeo)
    this.innerGlow = new THREE.Mesh(glowGeo, glowMat)
    this.innerGlow.position.set(0, 0.7, -0.2)
    this.innerGlow.renderOrder = 0

    const shMat = new THREE.MeshBasicMaterial({ color: 0x231f4d, transparent: true, opacity: 0.22, depthWrite: false, map: this.dot })
    this.materials.push(shMat)
    const shGeo = new THREE.PlaneGeometry(2.8, 0.6)
    this.geometries.push(shGeo)
    this.shadow = new THREE.Mesh(shGeo, shMat)
    this.shadow.position.set(0, -BAG_H / 2 - 0.35, -0.3)

    // Thẻ quà (mặt trước vẽ khi có kết quả)
    const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H)
    this.geometries.push(cardGeo)
    const cardBackMesh = new THREE.Mesh(cardGeo, mat(cardBack, THREE.FrontSide))
    cardBackMesh.rotation.y = Math.PI
    cardBackMesh.position.z = -0.002
    this.cardFront = new THREE.Mesh(cardGeo, mat(cardBack, THREE.FrontSide))
    this.cardFront.position.z = 0.002
    this.card.add(this.cardFront, cardBackMesh)
    this.card.renderOrder = 1
    this.card.visible = false

    // Pháo hoa
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3))
    this.geometries.push(pGeo)
    const pMat = new THREE.PointsMaterial({
      size: 0.16,
      map: this.dot,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    this.materials.push(pMat)
    this.particles = new THREE.Points(pGeo, pMat)
    this.particles.frustumCulled = false
    for (let i = 0; i < MAX_PARTICLES; i++) this.pPos[i * 3 + 2] = -100

    this.bag.add(this.body, this.stripGroup, this.seamGlow)
    this.scene.add(this.innerGlow, this.shadow, this.card, this.bag, this.particles)

    this.resize()
    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // Màn hẹp (điện thoại dọc) phải lùi camera để túi và thẻ không tràn.
    this.baseCamZ = Math.max(8, 4.4 / this.camera.aspect, 5.6 / (this.camera.aspect * (CARD_W / CARD_H) * 1.5))
    this.camera.position.set(0, 0.2, this.baseCamZ)
    this.camera.updateProjectionMatrix()
  }

  // ---------- Cử chỉ ----------
  private onDown = (e: PointerEvent) => {
    if (this.phase !== 'idle' || this.motion.committed) return
    this.dragging = true
    this.startX = e.clientX
    this.startY = e.clientY
    this.hapticIdx = 0
    this.renderer.domElement.setPointerCapture?.(e.pointerId)
    this.phase = 'dragging'
  }

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return
    const w = this.container.clientWidth
    const dx = e.clientX - this.startX
    const dy = e.clientY - this.startY
    if (!this.motion.lockDirection(dx)) return
    const dist = clamp(w * 0.32, 150, 280)
    const p = Math.abs(dx) / dist
    this.motion.scrub(p, dx / dist, dy / (dist * 0.8))
    while (this.hapticIdx < HAPTIC_MARKS.length && p >= HAPTIC_MARKS[this.hapticIdx]) {
      navigator.vibrate?.(8)
      this.hapticIdx++
    }
  }

  private onUp = () => {
    if (!this.dragging) return
    this.dragging = false
    const { opened } = this.motion.settle()
    if (opened) {
      this.phase = 'waiting'
      navigator.vibrate?.([20, 30, 20])
      this.events.onTorn()
    } else {
      this.phase = 'idle'
    }
  }

  /** Xé bằng nút (không cần vuốt): dành cho bàn phím và người khó thao tác cử chỉ. */
  tearNow() {
    if (this.phase !== 'idle') return
    this.motion.lockDirection(99)
    this.motion.scrub(1)
    this.motion.settle()
    this.phase = 'waiting'
    this.events.onTorn()
  }

  /** Máy chủ trả kết quả: vẽ thẻ rồi chờ dải xé rơi xong thì bắt đầu reveal. */
  async reveal(gift: RevealGift) {
    this.gift = gift
    const canvas = await paintCard(gift)
    if (this.disposed) return
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    this.textures.push(tex)
    ;(this.cardFront.material as THREE.MeshBasicMaterial).map = tex
    ;(this.cardFront.material as THREE.MeshBasicMaterial).needsUpdate = true
    this.revealPending = true
  }
  private revealPending = false

  /** Chạm màn hình để tua nhanh 3 lần. */
  speedUp() {
    if (this.phase === 'revealing') this.revealSpeed = 3
  }

  // ---------- Vòng lặp ----------
  private tick = (now: number) => {
    if (this.disposed) return
    const dt = Math.min((now - this.last) / 1000, 1 / 30)
    this.last = now
    this.update(dt, now / 1000)
    this.renderer.render(this.scene, this.camera)
    this.raf = requestAnimationFrame(this.tick)
  }

  private update(dt: number, time: number) {
    const m = this.motion
    m.advance(dt)

    // Túi nhún nhẹ khi chờ; nghiêng theo tay kéo
    const idle = this.phase === 'idle' || this.phase === 'dragging'
    this.bag.position.y = idle ? Math.sin(time * 1.6) * 0.04 : 0
    this.bag.rotation.z = idle ? Math.sin(time * 1.1) * 0.015 + (m.isScrubbing ? m.pullX * 0.03 : 0) : 0

    // Dải xé
    deformStrip(
      this.stripGeo.attributes.position.array as Float32Array,
      this.stripBase,
      -BAG_W / 2,
      BAG_W / 2,
      m.progress,
      m.fallProgress,
      m.direction,
      m.pullX,
      m.pullY,
    )
    this.stripGeo.attributes.position.needsUpdate = true
    this.stripGeo.computeBoundingSphere()
    if (m.released) {
      const k = easeOutCubic(m.fallProgress)
      this.stripGroup.position.set(m.direction * -0.6 * k, BAG_H / 2 - STRIP_H / 2 + 0.9 * k - 1.2 * k * k, 0.3 * k)
      this.stripGroup.rotation.z = m.direction * -(Math.PI * 2 / 3) * k
      const fade = 1 - clamp((m.fallProgress - 0.55) / 0.45, 0, 1)
      for (const sm of this.stripMats) sm.opacity = fade
      this.stripGroup.visible = fade > 0.01
    } else {
      this.stripGroup.position.set(0, BAG_H / 2 - STRIP_H / 2, 0)
      this.stripGroup.rotation.z = 0
      for (const sm of this.stripMats) sm.opacity = 1
      this.stripGroup.visible = true
    }

    // Vệt sáng đường xé chạy theo tiến độ
    const glowMat = this.seamGlow.material as THREE.MeshBasicMaterial
    const reach = BAG_W * clamp(m.progress, 0, 1)
    const glowOn = m.progress > 0.02 && !m.released
    glowMat.opacity = glowOn ? 0.9 : Math.max(0, glowMat.opacity - dt * 4)
    this.seamGlow.scale.x = Math.max(reach, 0.001)
    this.seamGlow.position.x = m.direction === 1 ? -BAG_W / 2 + reach / 2 : BAG_W / 2 - reach / 2

    // Ánh sáng trong túi
    const inner = this.innerGlow.material as THREE.MeshBasicMaterial
    if (this.phase === 'waiting' || this.phase === 'revealing') {
      const pulse = 0.55 + 0.25 * Math.sin(time * 6)
      inner.opacity = Math.min(inner.opacity + dt * 2, this.phase === 'waiting' ? pulse : 0.7)
    } else if (this.phase === 'done') {
      inner.opacity = Math.max(0, inner.opacity - dt)
    }

    this.updateReveal(dt)
    this.updateParticles(dt)

    // Rung camera (bậc hiếm nhất)
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt)
      const a = 0.04 * (this.shake > 0 ? 1 : 0)
      this.camera.position.x = Math.sin(time * 160) * a
      this.camera.position.y = 0.2 + Math.cos(time * 140) * a
    } else {
      this.camera.position.x = 0
      this.camera.position.y = 0.2
    }
  }

  private updateReveal(dt: number) {
    if (this.revealPending && this.motion.fallProgress >= 0.6 && this.phase === 'waiting') {
      this.revealPending = false
      this.phase = 'revealing'
      this.revealT = 0
      this.revealSpeed = 1
      this.burstAcc = 0
      this.card.visible = true
    }
    if (this.phase !== 'revealing' || !this.gift) return
    this.revealT += dt * this.revealSpeed
    const t = this.revealT
    const tier = this.gift.tier
    const grail = tier >= 4

    // Thân túi rơi sau 0,35s
    if (t > 0.35) {
      const f = t - 0.35
      this.bag.position.y = -0.5 * 16 * f * f
      this.bag.rotation.z = -0.25 * Math.min(f, 1)
      this.shadow.visible = false
      if (this.bag.position.y < -6) this.bag.visible = false
    }

    // Thẻ nhô lên (0 – 0,6s), bay ra giữa (0,6 – 1,2s)
    const baseY = BAG_H / 2 - STRIP_H - 0.2
    if (t < 0.6) {
      const k = easeOutBack(t / 0.6)
      this.card.position.set(0, baseY - CARD_H * 0.55 + k * (CARD_H * 0.75), -0.05)
      this.card.scale.setScalar(0.7)
      this.card.rotation.set(0, Math.PI, 0)
    } else {
      const a = easeOutCubic((t - 0.6) / 0.6)
      const y0 = baseY - CARD_H * 0.55 + CARD_H * 0.75
      this.card.position.set(0, y0 + (0.1 - y0) * a, -0.05 + 1.2 * a)
      this.card.scale.setScalar(0.7 + 0.5 * a)
      const flipK = clamp((t - 0.6) / 3, 0, 1)
      this.card.rotation.y = Math.PI + 5 * Math.PI * easeOutCubic(flipK)
      if (t > 3 && t < 3.6) this.card.rotation.y -= 0.28 * Math.sin(((t - 3) / 0.6) * Math.PI)
    }

    // Pháo hoa: dày dần khi thẻ lật
    if (t > 0.6 && t < 3.8) {
      const flipK = clamp((t - 0.6) / 3, 0, 1)
      this.burstAcc += dt * this.revealSpeed
      const interval = 0.18 * (1.6 - 1.2 * flipK) * (tier >= 2 ? 1 : 1.8)
      if (this.burstAcc >= interval) {
        this.burstAcc = 0
        this.burst(tier)
      }
    }

    if (grail && t > 3.6 && t < 4.7) {
      this.shake = 0.05
      this.card.position.x = Math.sin(t * 190) * 0.02
      this.camera.position.z = this.baseCamZ - 0.2 * clamp((t - 3.6) / 0.3, 0, 1)
    }
    const end = grail ? 4.7 : 3.6
    if (t >= end) {
      this.card.rotation.set(0, 6 * Math.PI, 0)
      this.card.position.set(0, 0.1, 1.15)
      this.card.scale.setScalar(1.2)
      this.camera.position.z = this.baseCamZ
      this.phase = 'done'
      this.events.onRevealed()
    }
  }

  private burst(tier: number) {
    const color = new THREE.Color(RARITY_COLORS[Math.min(tier, 4)])
    const white = new THREE.Color(0xffffff)
    const n = 26 + tier * 6
    const cx = (Math.random() - 0.5) * 2.6
    const cy = 0.1 + (Math.random() - 0.5) * 2.6
    for (let k = 0; k < n; k++) {
      const i = this.pNext
      this.pNext = (this.pNext + 1) % MAX_PARTICLES
      const ang = Math.random() * Math.PI * 2
      const sp = 0.8 + Math.random() * 1.8
      this.pPos[i * 3] = cx
      this.pPos[i * 3 + 1] = cy
      this.pPos[i * 3 + 2] = 1.4
      this.pVel[i * 3] = Math.cos(ang) * sp
      this.pVel[i * 3 + 1] = Math.sin(ang) * sp
      this.pVel[i * 3 + 2] = 0
      this.pLife[i] = 1 + Math.random() * 0.4
      const c = Math.random() < 0.3 ? white : color
      this.pCol[i * 3] = c.r
      this.pCol[i * 3 + 1] = c.g
      this.pCol[i * 3 + 2] = c.b
    }
  }

  private updateParticles(dt: number) {
    let dirty = false
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pLife[i] <= 0) continue
      this.pLife[i] -= dt
      dirty = true
      if (this.pLife[i] <= 0) {
        this.pPos[i * 3 + 2] = -100
        continue
      }
      this.pVel[i * 3 + 1] -= 1.6 * dt
      this.pPos[i * 3] += this.pVel[i * 3] * dt
      this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1] * dt
      const fadeK = clamp(this.pLife[i], 0, 1)
      this.pCol[i * 3] *= 0.5 + 0.5 * fadeK
      this.pCol[i * 3 + 1] *= 0.5 + 0.5 * fadeK
      this.pCol[i * 3 + 2] *= 0.5 + 0.5 * fadeK
    }
    if (dirty) {
      this.particles.geometry.attributes.position.needsUpdate = true
      this.particles.geometry.attributes.color.needsUpdate = true
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointercancel', this.onUp)
    for (const g of this.geometries) g.dispose()
    for (const m of this.materials) m.dispose()
    for (const t of this.textures) t.dispose()
    this.dot.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss() // iOS Safari giới hạn số WebGL context
    el.remove()
  }
}
