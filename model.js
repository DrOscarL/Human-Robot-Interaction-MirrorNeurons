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

    // W representa la asociación sensorial -> población espejo.
    // Se inicia como identidad para que la imitación funcione desde el comienzo.
    this.W = this.identityMatrix();
    this.K = this.identityMatrix();
    this.b = new Float32Array(DIM);

    this.x = new Float32Array(DIM);
    this.z = new Float32Array(DIM);
    this.m = new Float32Array(DIM);
    this.q = new Float32Array(DIM);
    this.target = new Float32Array(DIM);

    this.error = 0;
    this.initialTrainingError = null;
    this.trainingSteps = 0;
    this.errorHistory = [];
    this.associationHistory = [];
    this.trainingHistory = [];
    this.maxHistory = 240;
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

  computeAssociationScore() {
    // Mide cuánta energía está en la diagonal respecto de toda la matriz.
    // 1.0 significa asociación uno-a-uno perfecta.
    let diagonal = 0;
    let total = 0;

    for (let row = 0; row < DIM; row += 1) {
      for (let col = 0; col < DIM; col += 1) {
        const value = Math.abs(this.W[row * DIM + col]);
        total += value;
        if (row === col) diagonal += value;
      }
    }
    return total > 1e-9 ? diagonal / total : 0;
  }

  step(observation) {
    this.x = Float32Array.from(observation, clamp01);

    // El objetivo docente es una asociación espejo uno-a-uno:
    // cada gesto observado debe activar el canal motor equivalente.
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
      if (this.initialTrainingError === null) {
        this.initialTrainingError = Math.max(this.error, 1e-6);
      }

      // Regla supervisada local basada en error:
      // ΔW = η (m* - z) x^T
      // Se usa z para ajustar directamente la asociación instantánea.
      const instantaneousError = new Float32Array(DIM);
      for (let i = 0; i < DIM; i += 1) {
        instantaneousError[i] = this.target[i] - this.z[i];
      }

      for (let row = 0; row < DIM; row += 1) {
        for (let col = 0; col < DIM; col += 1) {
          const index = row * DIM + col;
          this.W[index] += this.eta * instantaneousError[row] * this.x[col];

          // Regularización suave hacia cero para conexiones cruzadas.
          if (row !== col) {
            this.W[index] *= 0.999;
          }

          this.W[index] = Math.max(-1, Math.min(1, this.W[index]));
        }
      }

      this.trainingSteps += 1;
    }

    const associationScore = this.computeAssociationScore();
    const progress = this.initialTrainingError
      ? clamp01(1 - this.error / this.initialTrainingError)
      : 0;

    this.errorHistory.push(this.error);
    this.associationHistory.push(associationScore);
    this.trainingHistory.push(progress);

    if (this.errorHistory.length > this.maxHistory) this.errorHistory.shift();
    if (this.associationHistory.length > this.maxHistory) this.associationHistory.shift();
    if (this.trainingHistory.length > this.maxHistory) this.trainingHistory.shift();

    return {
      x: this.x,
      z: this.z,
      m: this.m,
      q: this.q,
      error: this.error,
      associationScore,
      progress
    };
  }

  decay() {
    const observation = Float32Array.from(this.x, value => value * 0.88);
    return this.step(observation);
  }

  perturb() {
    for (let row = 0; row < DIM; row += 1) {
      for (let col = 0; col < DIM; col += 1) {
        const index = row * DIM + col;
        const base = row === col ? 0.45 : 0;
        this.W[index] = Math.max(
          -1,
          Math.min(1, base + (Math.random() - 0.5) * 0.75)
        );
      }
    }

    this.initialTrainingError = null;
    this.trainingSteps = 0;
    this.errorHistory = [];
    this.associationHistory = [];
    this.trainingHistory = [];
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
    this.initialTrainingError = null;
    this.trainingSteps = 0;
    this.errorHistory = [];
    this.associationHistory = [];
    this.trainingHistory = [];
  }
}

window.mirrorModel = new MirrorNeuronModel();
