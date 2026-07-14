const FEATURE_NAMES = [
  "Sonrisa",
  "Comisuras abajo",
  "Parpadeo",
  "Ojos abiertos",
  "Cejas elevadas",
  "Cejas contraídas",
  "Mandíbula abierta",
  "Labios fruncidos",
  "Mejillas"
];

const DIM = FEATURE_NAMES.length;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

class MirrorNeuronModel {
  constructor() {
    this.alpha = 0.18;
    this.eta = 0.020;
    this.learning = false;

    this.W = this.identityMatrix();
    this.K = this.identityMatrix();
    this.b = new Float32Array(DIM);

    this.x = new Float32Array(DIM);
    this.z = new Float32Array(DIM);
    this.m = new Float32Array(DIM);
    this.q = new Float32Array(DIM);
    this.target = new Float32Array(DIM);

    this.error = 0;
  }

  identityMatrix() {
    const matrix = new Float32Array(DIM * DIM);
    for (let i = 0; i < DIM; i += 1) matrix[i * DIM + i] = 1;
    return matrix;
  }

  matvec(matrix, vector) {
    const output = new Float32Array(DIM);
    for (let row = 0; row < DIM; row += 1) {
      let sum = 0;
      for (let col = 0; col < DIM; col += 1) {
        sum += matrix[row * DIM + col] * vector[col];
      }
      output[row] = sum;
    }
    return output;
  }

  phi(vector) {
    return Float32Array.from(vector, value => clamp01(value));
  }

  step(observation) {
    this.x = Float32Array.from(observation, clamp01);
    this.target = Float32Array.from(this.x);

    const pre = this.matvec(this.W, this.x);
    for (let i = 0; i < DIM; i += 1) pre[i] += this.b[i];

    this.z = this.phi(pre);

    for (let i = 0; i < DIM; i += 1) {
      this.m[i] = (1 - this.alpha) * this.m[i] + this.alpha * this.z[i];
    }

    this.q = this.phi(this.matvec(this.K, this.m));

    const errorVector = new Float32Array(DIM);
    let squared = 0;
    for (let i = 0; i < DIM; i += 1) {
      errorVector[i] = this.target[i] - this.m[i];
      squared += errorVector[i] ** 2;
    }
    this.error = Math.sqrt(squared);

    if (this.learning) {
      for (let row = 0; row < DIM; row += 1) {
        for (let col = 0; col < DIM; col += 1) {
          const index = row * DIM + col;
          this.W[index] += this.eta * errorVector[row] * this.x[col];
          this.W[index] = Math.max(-1, Math.min(1, this.W[index]));
        }
      }
    }

    return {
      x: this.x,
      z: this.z,
      m: this.m,
      q: this.q,
      error: this.error
    };
  }

  decay() {
    const observation = Float32Array.from(this.x, value => value * 0.88);
    return this.step(observation);
  }

  perturb() {
    for (let i = 0; i < this.W.length; i += 1) {
      const base = i % (DIM + 1) === 0 ? 0.68 : 0;
      this.W[i] = Math.max(-1, Math.min(1, base + (Math.random() - 0.5) * 0.45));
    }
  }

  reset() {
    this.W = this.identityMatrix();
    this.K = this.identityMatrix();
    this.b.fill(0);
    this.x.fill(0);
    this.z.fill(0);
    this.m.fill(0);
    this.q.fill(0);
    this.target.fill(0);
    this.error = 0;
    this.learning = false;
  }
}

window.mirrorModel = new MirrorNeuronModel();
