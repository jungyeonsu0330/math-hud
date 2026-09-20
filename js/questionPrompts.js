/**
 * QuestionPrompts: 제미니 실시간 즉시 반문 및 2단계 꼬리물기 질문 관리자
 */

const QUESTION_SCENARIOS = {
  scenario1: {
    id: 'scenario1',
    title: '시나리오 1: 그래프 직관 풀이 유도',
    subtitle: '정석 대수 풀이 후 → 기하학적/그래프 위치 관계로 시각적 전환',
    badge: '📊 기하/그래프 직관',
    firstQuestion: {
      tag: '1차 즉시 반문',
      prompt: "지금 풀어준 식 전개 방식은 이해했어. 그런데 이 문제를 대수적 계산을 최소화하고, f(x)와 g(x)의 그래프 개형이나 교점의 위치 관계, 접선 성질을 이용해서 직관적으로 푸는 기하학적 풀이도 보여줄래?"
    },
    followUps: [
      {
        id: 's1_followup_1',
        title: '2차 질문 A (파라미터 부호 반전)',
        prompt: "그래프 개형으로 보니까 훨씬 빠르네! 그렇다면 만약 최고차항 계수나 상수 k가 음수로 바뀐다면 그래프 접점의 위치와 실근 개수는 어떻게 변하는지 그 임계값(경계 조건)만 빠르게 짚어줘."
      },
      {
        id: 's1_followup_2',
        title: '2차 질문 B (삼차함수 비율 관계)',
        prompt: "이 그래프에서 변곡점, 극점, 접점 사이의 삼차함수 특유의 2:1 또는 1:1:1 비율 관계를 적용할 수 있는 구간이 있는지 도식화해서 짚어줄래?"
      },
      {
        id: 's1_followup_3',
        title: '2차 질문 C (수식 vs 그래프 효율 비교)',
        prompt: "실제 시험 시간에서 대수적 판별식 풀이와 이 그래프 관찰 풀이 중 어느 쪽이 계산 실수를 줄이기에 유리한지 근거를 들어 비교해줘."
      }
    ]
  },

  scenario2: {
    id: 'scenario2',
    title: '시나리오 2: 논리 비약/조건 누락 검증',
    subtitle: '계산 과정 중 빠진 정의역, 분모=0, 부호 등의 허점을 예리하게 지적',
    badge: '⚠️ 논리 비약 검증',
    firstQuestion: {
      tag: '1차 즉시 반문',
      prompt: "방금 풀이 과정 중간에서 양변을 문자로 나누거나 제곱근을 벗길 때, 분모가 0이 아니라는 전제 조건이나 절댓값 부호 처리가 확실하게 배제된 거야? 진수 조건이나 무연근 가능성은 없는지 확인해 줘."
    },
    followUps: [
      {
        id: 's2_followup_1',
        title: '2차 질문 A (서술형 완벽 답안 작성)',
        prompt: "그렇다면 그 예외 조건(분모=0 또는 경계값)을 완벽하게 포함해서, 서술형 주관식 답안지에서 1점도 감점당하지 않도록 논리적으로 무결한 3줄 요약 답안으로 다시 작성해 줄래?"
      },
      {
        id: 's2_followup_2',
        title: '2차 질문 B (무연근 발생 메커니즘)',
        prompt: "방금 양변을 제곱하거나 동치 변형할 때 왜 가짜 근(무연근)이 침투할 수 있는지 원리를 간략히 설명하고 검산 기준을 짚어줘."
      },
      {
        id: 's2_followup_3',
        title: '2차 질문 C (필요충분조건 검토)',
        prompt: "지금 전개한 화살표가 '필요충분조건(동치)'인지, 아니면 '필요조건(일방향)'인지 엄밀하게 증명해줘."
      }
    ]
  },

  scenario3: {
    id: 'scenario3',
    title: '시나리오 3: 수능/시험 실전 속해법',
    subtitle: '정석을 넘어 1분 안에 답을 도출하는 킬러 테크닉 & 속해 팁',
    badge: '⚡ 실전 킬러 속해법',
    firstQuestion: {
      tag: '1차 즉시 반문',
      prompt: "정석 풀이는 잘 알겠어. 그런데 실전 수능이나 내신 객관식 시험에서 1분 안에 답을 도출할 수 있는 '대칭성 이용', '특수값(0이나 1) 대입법', 또는 '공식 단축 팁'이 있어?"
    },
    followUps: [
      {
        id: 's3_followup_1',
        title: '2차 질문 A (속해법 출제자 함정)',
        prompt: "이 속해법이나 특수값 대입 테크닉을 쓸 때 출제자가 파놓는 전형적인 함정 유형은 어떤 게 있어? 어떤 조건이 주어지면 이 속해법을 쓰면 안 되는지 주의점을 알려줘."
      },
      {
        id: 's3_followup_2',
        title: '2차 질문 B (선지 소거 테크닉)',
        prompt: "객관식 5지 선다에서 주기성이나 홀수/짝수(우함수/기함수) 대칭성만으로 오답 선지 2~3개를 10초 만에 소거하는 기준을 보여줘."
      },
      {
        id: 's3_followup_3',
        title: '2차 질문 C (유사 킬러 변형 문제)',
        prompt: "이 문제와 핵심 아이디어가 동일하지만 한 단계 더 꼬아놓은 평가원 기출 변형 문제 하나만 예시로 들어줄래?"
      }
    ]
  }
};

class QuestionPromptsManager {
  static getScenario(scenarioId) {
    return QUESTION_SCENARIOS[scenarioId] || QUESTION_SCENARIOS.scenario1;
  }

  static getAllScenarios() {
    return QUESTION_SCENARIOS;
  }

  /**
   * 클립보드에 질문을 즉시 복사하고 태블릿 햅틱 및 토스트 호출
   */
  static async copyPromptToClipboard(text, customToastMsg = '제미니에게 반문할 질문이 복사되었습니다!') {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(customToastMsg, 'success');
      return true;
    } catch (e) {
      // 레거시 대체 복사
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showToast(customToastMsg, 'success');
      return true;
    }
  }

  static showToast(message, type = 'info') {
    let toast = document.getElementById('hud-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hud-toast';
      toast.className = 'hud-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `hud-toast show ${type}`;

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.className = 'hud-toast';
    }, 2400);
  }
}

window.QuestionPromptsManager = QuestionPromptsManager;
window.QUESTION_SCENARIOS = QUESTION_SCENARIOS;
