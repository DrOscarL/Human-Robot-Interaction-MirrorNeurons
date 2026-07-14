/**
 * model.js — Mirror Neuron Sensorimotor Model
 *
 * Implements:
 *   z[k]   = φ( W_SM · x[k] + b )       activation
 *   m[k+1] = (1-α)m[k] + α·z[k]         mirror dynamics (IIR)
 *   q[k]   = K · m[k]                    motor projection
 *   ΔW     = η·(m*-m)·xᵀ                Hebbian update
 *
 * Dimensions:
 *   x  ∈ ℝⁿ  (n = INPUT_DIM  = 21 landmarks × 2 coords = 42, compressed to 8)
 *   z  ∈ ℝᵐ  (m = MIRROR_DIM = 16)
 *   m  ∈ ℝᵐ
 *   q  ∈ ℝᵒ  (o = MOTOR_DIM  = 8  — avatar joint angles)
 */

const INPUT_DIM  = 8;
const MIRROR_DIM = 16;
const MOTOR_DIM  = 8;

class MirrorNeuronModel {
  constructor() {
    this.alpha = 0.10;   // mirror update rate
    this.eta   = 0.01;   // learning rate

    // W_SM : MIRROR_DIM × INPUT_DIM
    this.W_SM = this._randMatrix(MIRROR_DIM, INPUT_DIM, 0.3);
    // b : MIRROR_DIM
    this.b    = new Float32Array(MIRROR_DIM).fill(0.0);
    // K  : MOTOR_DIM × MIRROR_DIM
    this.K    = this._randMatrix(MOTOR_DIM, MIRROR_DIM, 0.2);

    // State
    this.x  = new Float32Array(INPUT_DIM);
    this.z  = new Float32Array(MIRROR_DIM);
    this.m  = new Float32Array(MIRROR_DIM);
    this.q  = new Float32Array(MOTOR_DIM);

    // Target gesture (for Hebbian)
    this.mStar = new Float32Array(MIRROR_DIM).fill(0.5);

    this.learning = false;
    this.stepCount = 0;
    this.errorHistory = [];
    this.MAX_HISTORY = 200;
  }

  // ─── Activation: leaky ReLU ────────────────────
  _phi(v) {
    const out = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++)
      out[i] = v[i] > 0 ? v[i] : 0.01 * v[i];
    return out;
  }

  // ─── Matrix × vector ──────────────────────────
  _matvec(M, rows, cols, v) {
    const out = new Float32Array(rows);
    for (let i = 0; i < rows; i++) {
      let s = 0;
      for (let j = 0; j < cols; j++) s += M[i * cols + j] * v[j];
      out[i] = s;
    }
    return out;
  }

  // ─── Random matrix (Xavier-like) ──────────────
  _randMatrix(rows, cols, scale) {
    const M = new Float32Array(rows * cols);
    for (let i = 0; i < M.length; i++)
      M[i] = (Math.random() * 2 - 1) * scale;
    return M;
  }

  // ─── Main step ────────────────────────────────
  step(xRaw) {
    // Compress/normalize landmarks → INPUT_DIM
    this.x = this._compressLandmarks(xRaw);

    // 1. z[k] = φ(W_SM · x + b)
    const Wx = this._matvec(this.W_SM, MIRROR_DIM, INPUT_DIM, this.x);
    const preAct = Wx.map((v, i) => v + this.b[i]);
    this.z = this._phi(preAct);

    // 2. m[k+1] = (1-α)m + α·z
    const alpha = this.alpha;
    this.m = this.m.map((v, i) => (1 - alpha) * v + alpha * this.z[i]);

    // 3. q[k] = K · m
    this.q = this._matvec(this.K, MOTOR_DIM, MIRROR_DIM, this.m);

    // 4. Hebbian update if learning is ON
    if (this.learning) {
      const err = this.mStar.map((v, i) => v - this.m[i]);
      // ΔW = η · err · xᵀ
      for (let i = 0; i < MIRROR_DIM; i++)
        for (let j = 0; j < INPUT_DIM; j++)
          this.W_SM[i * INPUT_DIM + j] += this.eta * err[i] * this.x[j];
      // Clip weights to [-2, 2]
      this.W_SM = this.W_SM.map(v => Math.max(-2, Math.min(2, v)));
    }

    // Error norm
    const errVec = this.mStar.map((v, i) => v - this.m[i]);
    const errNorm = Math.sqrt(errVec.reduce((s, v) => s + v * v, 0));
    this.errorHistory.push(errNorm);
    if (this.errorHistory.length > this.MAX_HISTORY)
      this.errorHistory.shift();

    this.stepCount++;
    return { x: this.x, z: this.z, m: this.m, q: this.q, errNorm };
  }

  // ─── Compress 21 landmarks (42 values) → 8 features ──
  _compressLandmarks(lm) {
    if (!lm || lm.length === 0) {
      // Decay toward zero when no hand
      return this.x.map(v => v * 0.9);
    }
    // lm: array of {x, y, z} objects (MediaPipe)
    const pts = lm;
    const n = pts.length; // 21

    // Feature 1-2: wrist position (landmark 0)
    const wx = pts[0].x - 0.5;
    const wy = pts[0].y - 0.5;

    // Feature 3: finger spread (std of tip x-coords)
    const tips = [4, 8, 12, 16, 20];
    const txs = tips.map(i => pts[i].x);
    const meanTx = txs.reduce((a, b) => a + b) / tips.length;
    const spread = Math.sqrt(txs.reduce((s, v) => s + (v - meanTx) ** 2, 0) / tips.length);

    // Feature 4: hand openness (avg dist tips to wrist)
    const openness = tips.map(i =>
      Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y)
    ).reduce((a, b) => a + b) / tips.length;

    // Features 5-8: individual finger extension (tip vs mcp y)
    const mcps = [5, 9, 13, 17];
    const ext = tips.slice(1).map((tip, i) =>
      Math.max(0, Math.min(1, (pts[mcps[i]].y - pts[tip].y) + 0.5))
    );

    return new Float32Array([
      wx, wy,
      Math.min(1, spread * 5),
      Math.min(1, openness * 3),
      ...ext
    ]);
  }

  // ─── Perturb W_SM ─────────────────────────────
  perturb(scale = 0.5) {
    for (let i = 0; i < this.W_SM.length; i++)
      this.W_SM[i] += (Math.random() * 2 - 1) * scale;
    this.W_SM = this.W_SM.map(v => Math.max(-2, Math.min(2, v)));
  }

  // ─── Reset ────────────────────────────────────
  reset() {
    this.W_SM   = this._randMatrix(MIRROR_DIM, INPUT_DIM, 0.3);
    this.b      = new Float32Array(MIRROR_DIM).fill(0);
    this.K      = this._randMatrix(MOTOR_DIM, MIRROR_DIM, 0.2);
    this.x      = new Float32Array(INPUT_DIM);
    this.z      = new Float32Array(MIRROR_DIM);
    this.m      = new Float32Array(MIRROR_DIM);
    this.q      = new Float32Array(MOTOR_DIM);
    this.learning = false;
    this.stepCount = 0;
    this.errorHistory = [];
  }

  toggleLearning() {
    this.learning = !this.learning;
    return this.learning;
  }

  setParam(name, value) {
    if (name === 'alpha') this.alpha = parseFloat(value);
    if (name === 'eta')   this.eta   = parseFloat(value);
  }
}

// Singleton
const model = new MirrorNeuronModel();
