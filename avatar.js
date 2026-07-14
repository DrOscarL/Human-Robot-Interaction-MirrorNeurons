class AvatarRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.headX = 0;
    this.headY = 0;
    this.eyeX = 0;
    this.eyeY = 0;
    this.lastTime = performance.now();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  draw(q, pose) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const targetX = pose?.x ?? 0;
    const targetY = pose?.y ?? 0;

    this.eyeX = this.lerp(this.eyeX, targetX, 1 - Math.exp(-10 * dt));
    this.eyeY = this.lerp(this.eyeY, targetY, 1 - Math.exp(-10 * dt));
    this.headX = this.lerp(this.headX, targetX, 1 - Math.exp(-3.8 * dt));
    this.headY = this.lerp(this.headY, targetY, 1 - Math.exp(-3.8 * dt));

    const ctx = this.ctx;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    ctx.clearRect(0, 0, cssW, cssH);

    const cx = cssW * 0.5 + this.headX * cssW * 0.045;
    const cy = cssH * 0.45 + this.headY * cssH * 0.035;
    const S = Math.min(cssW, cssH) * 0.38;

    const smile = q[0] ?? 0;
    const frown = q[1] ?? 0;
    const blink = q[2] ?? 0;
    const eyeWide = q[3] ?? 0;
    const browUp = q[4] ?? 0;
    const browDown = q[5] ?? 0;
    const jawOpen = q[6] ?? 0;
    const pucker = q[7] ?? 0;
    const cheek = q[8] ?? 0;

    ctx.save();
    ctx.translate(cx, cy);

    this.drawBase(ctx, S);
    this.drawHead(ctx, S);
    this.drawPanels(ctx, S);
    this.drawEyes(ctx, S, blink, eyeWide);
    this.drawBrows(ctx, S, browUp, browDown, frown);
    this.drawNose(ctx, S);
    this.drawMouth(ctx, S, smile, frown, jawOpen, pucker);
    this.drawCheeks(ctx, S, cheek);

    ctx.restore();
  }

  drawBase(ctx, S) {
    ctx.fillStyle = "rgba(79, 102, 124, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, S * 1.12, S * 0.74, S * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9cacba";
    ctx.strokeStyle = "#617383";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-S * 0.52, S * 0.92);
    ctx.lineTo(-S * 0.34, S * 0.72);
    ctx.lineTo(S * 0.34, S * 0.72);
    ctx.lineTo(S * 0.52, S * 0.92);
    ctx.lineTo(S * 0.43, S * 1.08);
    ctx.lineTo(-S * 0.43, S * 1.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#8193a4";
    ctx.fillRect(-S * 0.13, S * 0.65, S * 0.26, S * 0.31);
  }

  drawHead(ctx, S) {
    const gradient = ctx.createRadialGradient(-S * 0.2, -S * 0.35, 0, 0, 0, S);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.62, "#e8eef4");
    gradient.addColorStop(1, "#becbd7");

    ctx.shadowColor = "rgba(42, 64, 84, 0.18)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 12;

    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#708395";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -S * 0.08, S * 0.70, S * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = "transparent";
  }

  drawPanels(ctx, S) {
    ctx.strokeStyle = "rgba(100, 122, 143, 0.58)";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -S * 0.94);
    ctx.lineTo(0, -S * 0.43);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-S * 0.39, -S * 0.80);
    ctx.lineTo(0, -S * 0.43);
    ctx.lineTo(S * 0.39, -S * 0.80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-S * 0.64, S * 0.22);
    ctx.quadraticCurveTo(0, S * 0.42, S * 0.64, S * 0.22);
    ctx.stroke();

    for (const side of [-1, 1]) {
      ctx.fillStyle = "#718292";
      ctx.beginPath();
      ctx.arc(side * S * 0.42, -S * 0.63, S * 0.025, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(side * S * 0.56, S * 0.23, S * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEyes(ctx, S, blink, eyeWide) {
    const eyeOpen = Math.max(0.05, Math.min(1.25, 1 - 0.92 * blink + 0.28 * eyeWide));
    const pupilDX = this.eyeX * S * 0.045;
    const pupilDY = this.eyeY * S * 0.030;

    for (const side of [-1, 1]) {
      const ex = side * S * 0.31;
      const ey = -S * 0.22;
      const ew = S * 0.20;
      const eh = S * 0.13 * eyeOpen;

      ctx.fillStyle = "#fbfdff";
      ctx.strokeStyle = "#394856";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(ex, ey, ew, Math.max(2, eh), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (eh > S * 0.025) {
        const iris = Math.min(S * 0.085, eh * 0.72);
        const px = ex + pupilDX;
        const py = ey + pupilDY;

        const irisGradient = ctx.createRadialGradient(px, py, 0, px, py, iris);
        irisGradient.addColorStop(0, "#0d3559");
        irisGradient.addColorStop(0.55, "#2b85c7");
        irisGradient.addColorStop(1, "#62b7ef");

        ctx.fillStyle = irisGradient;
        ctx.beginPath();
        ctx.arc(px, py, iris, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#06131f";
        ctx.beginPath();
        ctx.arc(px, py, iris * 0.43, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(px - iris * 0.25, py - iris * 0.25, iris * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawBrows(ctx, S, browUp, browDown, frown) {
    ctx.strokeStyle = "#39434d";
    ctx.lineWidth = S * 0.045;
    ctx.lineCap = "round";

    for (const side of [-1, 1]) {
      const ex = side * S * 0.31;
      const y = -S * 0.45 - browUp * S * 0.09 + browDown * S * 0.035;
      const inner = -side * (browDown + frown) * S * 0.055;

      ctx.beginPath();
      ctx.moveTo(ex - side * S * 0.15, y + inner);
      ctx.lineTo(ex + side * S * 0.15, y);
      ctx.stroke();
    }
  }

  drawNose(ctx, S) {
    ctx.fillStyle = "#d5dfe8";
    ctx.strokeStyle = "#8a9aa9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.10);
    ctx.lineTo(-S * 0.11, S * 0.20);
    ctx.lineTo(0, S * 0.27);
    ctx.lineTo(S * 0.11, S * 0.20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawMouth(ctx, S, smile, frown, jawOpen, pucker) {
    const centerY = S * 0.43;
    const width = S * (0.19 + smile * 0.10 - pucker * 0.08);
    const height = S * (0.025 + jawOpen * 0.17);

    ctx.strokeStyle = "#33404c";
    ctx.fillStyle = "#1d2832";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(0, centerY, Math.max(S * 0.07, width), Math.max(2, height), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (smile > 0.12) {
      ctx.strokeStyle = "#f4f8fb";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, centerY - S * 0.015, width * 0.96, S * (0.05 + smile * 0.10), 0.10 * Math.PI, 0.90 * Math.PI);
      ctx.stroke();
    }

    if (frown > 0.15) {
      ctx.strokeStyle = "#9aa8b5";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, centerY + S * 0.10, width, S * 0.09, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
  }

  drawCheeks(ctx, S, cheek) {
    if (cheek < 0.08) return;
    ctx.fillStyle = `rgba(68, 139, 195, ${0.06 + cheek * 0.16})`;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * S * 0.43, S * 0.16, S * 0.12, S * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

window.AvatarRenderer = AvatarRenderer;
