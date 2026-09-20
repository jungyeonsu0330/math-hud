/**
 * Storage Engine: Auto-Restore (상태 완벽 복원 시스템)
 * 기기를 끄거나 새로고침해도 1초 전 상태 그대로 완벽 복원
 */
const STORAGE_KEY = 'gemini_math_live_hud_state_v1';

const DEFAULT_STATE = {
  inputText: "함수 f(x) = x^3 - 3x + 2 에 대하여 x가 1일 때의 접선의 방정식을 구하고 극값을 판정하시오.",
  refinedLatex: "f(x) = x^3 - 3x + 2 \\quad \\Rightarrow \\quad f'(x) = 3x^2 - 3",
  steps: [
    {
      stepNum: 1,
      desc: "함수 정의 및 도함수 계산",
      latex: "f'(x) = \\frac{d}{dx}(x^3 - 3x + 2) = 3x^2 - 3",
      status: "pass",
      note: "다항함수의 미분법 적용 완벽함"
    },
    {
      stepNum: 2,
      desc: "x = 1 에서의 미분계수(접선의 기울기) 산출",
      latex: "m = f'(1) = 3(1)^2 - 3 = 0",
      status: "pass",
      note: "기울기가 0이므로 x축과 평행한 수평 접선 형성"
    },
    {
      stepNum: 3,
      desc: "접점의 y좌표 및 접선의 방정식 작성",
      latex: "f(1) = 1^3 - 3(1) + 2 = 0 \\implies y - 0 = 0(x - 1) \\implies y = 0",
      status: "pass",
      note: "접선 y = 0 (x축)"
    },
    {
      stepNum: 4,
      desc: "극값 판정 및 증감 조사",
      latex: "f'(x) = 3(x-1)(x+1) = 0 \\implies x = -1, 1",
      status: "warning",
      note: "x = 1에서 f'(x)의 부호 변화(좌 - / 우 +)를 확인하여 극솟값임을 명시해야 감점을 피할 수 있음"
    }
  ],
  graphParams: {
    funcType: 'cubic', // 'cubic', 'quadratic', 'rational'
    a: 1,
    b: -3,
    c: 2,
    t: 1.0,
    isPlaying: false
  },
  activeScenario: 'scenario1',
  speechEnabled: false,
  timestamp: Date.now()
};

class StorageManager {
  constructor() {
    this.state = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('LocalStorage 로드 실패, 기본값 사용:', e);
    }
    return { ...DEFAULT_STATE };
  }

  save(partialState) {
    this.state = { ...this.state, ...partialState, timestamp: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify(this.state);
    } catch (e) {
      console.error('LocalStorage 저장 실패:', e);
    }
  }

  get(key) {
    return this.state[key];
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = { ...DEFAULT_STATE, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.notify(this.state);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify(state) {
    this.listeners.forEach(fn => fn(state));
  }
}

// 전역 싱글톤 인스턴스
window.hudStorage = new StorageManager();
