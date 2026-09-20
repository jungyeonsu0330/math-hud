/**
 * GraphEngine: 하이브리드 인터랙티브 수학 애니메이션 엔진
 * JSXGraph가 있으면 JSXGraph로, 없거나 로딩 중이면 고성능 네이티브 HTML5 Canvas로 100% 즉시 렌더링!
 */

class MathGraphEngine {
  constructor(containerId = 'jxgbox') {
    this.containerId = containerId;
    this.board = null;
    this.canvas = null;
    this.ctx = null;
    this.animInterval = null;
    this.isPlaying = false;
    this.params = {
      type: 'cubic',
      a: 1,
      b: -3,
      c: 2,
      t: 1.0,
      direction: 1
    };
  }

  init(savedParams = null) {
    if (savedParams) {
      this.params = { ...this.params, ...savedParams };
    }

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // 1. JSXGraph가 정상 로드된 경우
    if (window.JXG && typeof JXG.JSXGraph !== 'undefined') {
      try {
        if (this.board) JXG.JSXGraph.freeBoard(this.board);
        container.innerHTML = '';
        this.board = JXG.JSXGraph.initBoard(this.containerId, {
          boundingbox: [-3.5, 5.5, 3.5, -4.5],
          axis: true,
          showNavigation: false,
          showCopyright: false,
          pan: { enabled: true, needShift: false },
          zoom: { enabled: true, factorX: 1.2, factorY: 1.2 }
        });
        this.renderJSXGraph();
        return;
      } catch (e) {
        console.warn('JSXGraph 보드 생성 실패, 네이티브 캔버스로 전환:', e);
      }
    }

    // 2. Fallback: 초경량 고성능 네이티브 HTML5 Canvas 2D 렌더러 (100% 보장)
    this.initNativeCanvas(container);
  }

  evalFunction(x) {
    const { type, a, b, c } = this.params;
    if (type === 'quadratic') return a * x * x + b * x + c;
    if (type === 'sine') return a * Math.sin(b * x) + c;
    return a * Math.pow(x, 3) + b * x + c;
  }

  evalDerivative(x) {
    const { type, a, b } = this.params;
    if (type === 'quadratic') return 2 * a * x + b;
    if (type === 'sine') return a * b * Math.cos(b * x);
    return 3 * a * Math.pow(x, 2) + b;
  }

  initNativeCanvas(container) {
    container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // 리사이즈 및 초기 렌더링
    this.resizeNativeCanvas();
    this.renderNativeCanvas();

    // 터치 및 마우스 드래그로 접점 P 이동
    let isDragging = false;
    const updateTFromPointer = (clientX) => {
      const rect = this.canvas.getBoundingClientRect();
      const xRatio = (clientX - rect.left) / rect.width;
      this.params.t = -3 + xRatio * 6; // -3 ~ +3
      this.renderNativeCanvas();
      this.updateStats();
    };

    this.canvas.addEventListener('mousedown', (e) => { isDragging = true; updateTFromPointer(e.clientX); });
    window.addEventListener('mousemove', (e) => { if (isDragging) updateTFromPointer(e.clientX); });
    window.addEventListener('mouseup', () => { isDragging = false; });

    this.canvas.addEventListener('touchstart', (e) => { isDragging = true; updateTFromPointer(e.touches[0].clientX); }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => { if (isDragging) updateTFromPointer(e.touches[0].clientX); }, { passive: true });
    this.canvas.addEventListener('touchend', () => { isDragging = false; });
  }

  resizeNativeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 400) * dpr;
    this.canvas.height = (rect.height || 280) * dpr;
    if (this.ctx) this.ctx.scale(dpr, dpr);
  }

  renderNativeCanvas() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 400;
    const h = rect.height || 280;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // 좌표계 매핑: x[-3, 3] -> [0, w], y[-4, 5] -> [h, 0]
    const toCanvasX = (x) => (x + 3) / 6 * w;
    const toCanvasY = (y) => h - (y + 4) / 9 * h;

    // 1. 그리드 및 축
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = -3; x <= 3; x += 1) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x), 0);
      ctx.lineTo(toCanvasX(x), h);
      ctx.stroke();
    }
    for (let y = -4; y <= 5; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, toCanvasY(y));
      ctx.lineTo(w, toCanvasY(y));
      ctx.stroke();
    }

    // X축, Y축
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, toCanvasY(0));
    ctx.lineTo(w, toCanvasY(0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), 0);
    ctx.lineTo(toCanvasX(0), h);
    ctx.stroke();

    // 2. 주 곡선 그리기 (네온 사이언 #00f0ff)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    let first = true;
    for (let px = 0; px <= w; px += 2) {
      const mathX = -3 + (px / w) * 6;
      const mathY = this.evalFunction(mathX);
      const py = toCanvasY(mathY);
      if (first) { ctx.moveTo(px, py); first = false; }
      else { ctx.lineTo(px, py); }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. 접점 및 접선 그리기 (네온 핑크 #ff3366)
    const t = this.params.t;
    const ptY = this.evalFunction(t);
    const slope = this.evalDerivative(t);

    const ptCanvasX = toCanvasX(t);
    const ptCanvasY = toCanvasY(ptY);

    // 접선 직선 그리기 (y - ptY = slope * (x - t))
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const x1 = -3, y1 = ptY + slope * (x1 - t);
    const x2 = 3, y2 = ptY + slope * (x2 - t);
    ctx.moveTo(toCanvasX(x1), toCanvasY(y1));
    ctx.lineTo(toCanvasX(x2), toCanvasY(y2));
    ctx.stroke();
    ctx.setLineDash([]);

    // 접점 P 그리기 (골드 #ffd000)
    ctx.fillStyle = '#ffd000';
    ctx.shadowColor = '#ffd000';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ptCanvasX, ptCanvasY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 라벨
    ctx.fillStyle = '#ffd000';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText(`P (${t.toFixed(2)}, ${ptY.toFixed(2)})`, ptCanvasX + 10, ptCanvasY - 8);

    this.updateStats();
  }

  renderJSXGraph() {
    if (!this.board) return;
    this.board.suspendUpdate();
    const self = this;

    const curve = this.board.create('functiongraph', [(x) => self.evalFunction(x)], {
      strokeColor: '#00f0ff', strokeWidth: 3, highlight: false
    });

    const pointP = this.board.create('glider', [self.params.t, self.evalFunction(self.params.t), curve], {
      name: 'P', fillColor: '#ffd000', size: 6
    });

    this.board.create('tangent', [pointP], { strokeColor: '#ff3366', strokeWidth: 2, dash: 2 });

    pointP.on('drag', () => {
      self.params.t = pointP.X();
      self.updateStats();
    });

    this.board.unsuspendUpdate();
    this.updateStats();
  }

  toggleAnimation() {
    if (this.isPlaying) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
    return this.isPlaying;
  }

  startAnimation() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const speed = 0.04;
    const minT = -2.2;
    const maxT = 2.2;

    this.animInterval = setInterval(() => {
      this.params.t += speed * this.params.direction;
      if (this.params.t >= maxT) {
        this.params.t = maxT;
        this.params.direction = -1;
      } else if (this.params.t <= minT) {
        this.params.t = minT;
        this.params.direction = 1;
      }

      if (this.canvas) {
        this.renderNativeCanvas();
      } else if (this.board) {
        this.board.update();
        this.updateStats();
      }
    }, 25);
  }

  stopAnimation() {
    this.isPlaying = false;
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
  }

  setParams(newParams) {
    this.params = { ...this.params, ...newParams };
    if (this.canvas) this.renderNativeCanvas();
    else if (this.board) this.board.update();
  }

  updateStats() {
    const xVal = this.params.t;
    const yVal = this.evalFunction(xVal);
    const slope = this.evalDerivative(xVal);

    const xEl = document.getElementById('stat-x');
    const yEl = document.getElementById('stat-y');
    const slopeEl = document.getElementById('stat-slope');
    const formulaEl = document.getElementById('stat-tangent-formula');

    if (xEl) xEl.textContent = xVal.toFixed(2);
    if (yEl) yEl.textContent = yVal.toFixed(2);
    if (slopeEl) slopeEl.textContent = slope.toFixed(2);

    if (formulaEl) {
      const bTerm = yVal - slope * xVal;
      const bSign = bTerm >= 0 ? '+' : '-';
      formulaEl.textContent = `y = ${slope.toFixed(2)}x ${bSign} ${Math.abs(bTerm).toFixed(2)}`;
    }
  }

  resize() {
    if (this.canvas) {
      this.resizeNativeCanvas();
      this.renderNativeCanvas();
    }
  }
}

window.MathGraphEngine = MathGraphEngine;
