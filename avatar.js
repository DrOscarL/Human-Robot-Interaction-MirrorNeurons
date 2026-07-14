/**
 * avatar.js — 2D humanoid avatar driven by q[k]
 *
 * q[k] ∈ ℝ⁸:
 *   q[0] — shoulder L rotation
 *   q[1] — elbow L angle
 *   q[2] — shoulder R rotation
 *   q[3] — elbow R angle
 *   q[4] — head tilt
 *   q[5] — torso lean
 *   q[6] — hand L openness
 *   q[7] — hand R openness
 */

class AvatarRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = rect.width  || 400;
    this.canvas.height = rect.height || 300;
  }

  draw(q) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Background
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, W, H);

    // Grid lines (neural aesthetic)
    this._drawGrid(ctx, W, H);

    // Avatar center
    const cx = W / 2;
    const cy = H * 0.38;
    const scale = Math.min(W, H) * 0.28;

    // Parse q → angles (map [0,1] → joint angle range)
    const shoulderL = (q[0] - 0.5) * Math.PI * 0.8;
    const elbowL    = (q[1] * 0.7 + 0.1) * Math.PI;
    const shoulderR = (q[2] - 0.5) * -Math.PI * 0.8;
    const elbowR    = (q[3] * 0.7 + 0.1) * -Math.PI;
    const headTilt  = (q[4] - 0.5) * 0.5;
    const torsoLean = (q[5] - 0.5) * 0.3;
    const handLOpen = q[6];
    const handROpen = q[7];

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(torsoLean);

    // ── Torso
    this._drawTorso(ctx, scale);

    // ── Head
    ctx.save();
    ctx.rotate(headTilt);
    this._drawHead(ctx, scale);
    ctx.restore();

    // ── Left arm
    ctx.save();
    ctx.translate(-scale * 0.18, scale * 0.05);
    ctx.rotate(shoulderL - Math.PI * 0.15);
    this._drawArm(ctx, scale, elbowL, handLOpen, '#00e5ff');
    ctx.restore();

    // ── Right arm
    ctx.save();
    ctx.translate(scale * 0.18, scale * 0.05);
    ctx.rotate(shoulderR + Math.PI * 0.15);
    this._drawArm(ctx, scale, elbowR, handROpen, '#ff6b9d');
    ctx.restore();

    // ── Legs (static, slight stance)
    this._drawLegs(ctx, scale);

    ctx.restore();

    // Mirror neuron glow effect when learning
    if (model.learning) {
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.2);
      grd.addColorStop(0, 'rgba(57,255,133,0.0)');
      grd.addColorStop(0.7, 'rgba(57,255,133,0.04)');
      grd.addColorStop(1, 'rgba(57,255,133,0.0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(30,48,72,0.6)';
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  _drawTorso(ctx, s) {
    // Neck
    ctx.strokeStyle = '#cde4f5';
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.lineTo(0, -s * 0.22);
    ctx.stroke();

    // Torso body
    ctx.strokeStyle = '#cde4f5';
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.lineTo(0, s * 0.25);
    ctx.stroke();

    // Shoulders line
    ctx.lineWidth = s * 0.055;
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, s * 0.05);
    ctx.lineTo(s * 0.18, s * 0.05);
    ctx.stroke();

    // Hip line
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(-s * 0.13, s * 0.25);
    ctx.lineTo(s * 0.13, s * 0.25);
    ctx.stroke();

    // Spine highlight
    const grad = ctx.createLinearGradient(0, -s * 0.12, 0, s * 0.25);
    grad.addColorStop(0, 'rgba(0,229,255,0.3)');
    grad.addColorStop(1, 'rgba(0,229,255,0.0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.lineTo(0, s * 0.2);
    ctx.stroke();
  }

  _drawHead(ctx, s) {
    const hy = -s * 0.32;

    // Outer glow
    const grd = ctx.createRadialGradient(0, hy, 0, 0, hy, s * 0.15);
    grd.addColorStop(0, 'rgba(0,229,255,0.15)');
    grd.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, hy, s * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Head circle
    ctx.fillStyle = '#0d1521';
    ctx.strokeStyle = '#cde4f5';
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.arc(0, hy, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes
    const eyeY = hy - s * 0.015;
    const eyeX = s * 0.045;
    [-1, 1].forEach(side => {
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(side * eyeX, eyeY, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  _drawArm(ctx, s, elbowAngle, handOpen, color) {
    const upperLen = s * 0.32;
    const lowerLen = s * 0.28;

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    // Upper arm
    ctx.lineWidth = s * 0.055;
    const ex = Math.sin(elbowAngle * 0.4) * upperLen;
    const ey = Math.cos(elbowAngle * 0.4) * upperLen;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Elbow joint
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Forearm
    ctx.lineWidth = s * 0.04;
    const angle2 = elbowAngle * 0.7;
    const hx = ex + Math.sin(angle2) * lowerLen;
    const hy = ey + Math.cos(angle2) * lowerLen;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // Hand
    this._drawHand(ctx, hx, hy, handOpen, color, s);
  }

  _drawHand(ctx, x, y, openness, color, s) {
    const fingerLen = s * 0.1 * (0.4 + openness * 0.6);
    const spread = openness * Math.PI * 0.5;
    const numFingers = 5;
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.022;
    for (let i = 0; i < numFingers; i++) {
      const angle = (i / (numFingers - 1) - 0.5) * spread;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.sin(angle) * fingerLen,
        y + Math.cos(angle) * fingerLen
      );
      ctx.stroke();
    }
    // Palm circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawLegs(ctx, s) {
    const hipY = s * 0.25;
    ctx.strokeStyle = '#cde4f5';
    ctx.lineCap = 'round';

    [[-1, -0.07], [1, 0.07]].forEach(([side, lean]) => {
      const hx = side * s * 0.085;
      // Thigh
      ctx.lineWidth = s * 0.065;
      const kx = hx + s * lean;
      const ky = hipY + s * 0.3;
      ctx.beginPath();
      ctx.moveTo(hx, hipY);
      ctx.lineTo(kx, ky);
      ctx.stroke();

      // Knee
      ctx.fillStyle = '#cde4f5';
      ctx.beginPath();
      ctx.arc(kx, ky, s * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Shin
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(kx + s * lean * 0.3, ky + s * 0.28);
      ctx.stroke();
    });
  }
}

const avatarRenderer = new AvatarRenderer('avatarCanvas');
