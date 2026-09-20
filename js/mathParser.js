/**
 * MathParser: 구어체 수학 음성 및 텍스트를 정밀 LaTeX 수식으로 변환 & 하이브리드 수식 렌더러
 */

const MATH_SPOKEN_DICTIONARY = [
  // 거듭제곱 및 지수
  { pattern: /([a-zA-Z0-9\(\)]+)\s*제곱/g, replace: '$1^2' },
  { pattern: /([a-zA-Z0-9\(\)]+)\s*세제곱/g, replace: '$1^3' },
  { pattern: /([a-zA-Z0-9\(\)]+)\s*의\s*([0-9nkm]+)\s*승/g, replace: '$1^{$2}' },
  { pattern: /([a-zA-Z0-9\(\)]+)\s*의\s*([0-9nkm]+)\s*제곱/g, replace: '$1^{$2}' },

  // 분수 (예: 3 분의 1, x+1 분의 2)
  { pattern: /([a-zA-Z0-9\+\-\*\(\)]+)\s*분의\s*([a-zA-Z0-9\+\-\*\(\)]+)/g, replace: '\\frac{$2}{$1}' },

  // 제곱근 / 루트
  { pattern: /루트\s*([a-zA-Z0-9]+)/g, replace: '\\sqrt{$1}' },
  { pattern: /루트\s*\(([^)]+)\)/g, replace: '\\sqrt{$1}' },

  // 미분 / 도함수
  { pattern: /에프\s*프라임\s*엑스/g, replace: "f'(x)" },
  { pattern: /에프\s*엑스/g, replace: "f(x)" },
  { pattern: /지\s*엑스/g, replace: "g(x)" },
  { pattern: /미분하면/g, replace: '\\implies \\frac{d}{dx}' },

  // 적분
  { pattern: /인테그랄\s*([0-9a-zA-Z\-]+)\s*부터\s*([0-9a-zA-Z\-]+)\s*까지/g, replace: '\\int_{$1}^{$2}' },
  { pattern: /인테그랄/g, replace: '\\int' },

  // 극한
  { pattern: /리미트\s*([a-z])\s*가\s*([0-9a-zA-Z\-무한대\\infty]+)\s*(?:로\s*갈\s*때)?/g, (match, p1, p2) => {
    const target = (p2 === '무한대' || p2 === '인피니티') ? '\\infty' : p2;
    return `\\lim_{${p1} \\to ${target}}`;
  }},

  // 시그마
  { pattern: /시그마\s*([a-z])\s*는\s*([0-9]+)\s*부터\s*([a-zA-Z0-9]+)\s*까지/g, replace: '\\sum_{$1=$2}^{$3}' },

  // 부등호 및 등호
  { pattern: /크거나\s*같다/g, replace: '\\ge' },
  { pattern: /작거나\s*같다/g, replace: '\\le' },
  { pattern: /같지\s*않다/g, replace: '\\neq' },
  { pattern: /플러스\s*마이너스/g, replace: '\\pm' },
  { pattern: /절댓값\s*([a-zA-Z0-9\+\-]+)/g, replace: '|$1|' },

  // 그리스 문자 및 상수
  { pattern: /파이/g, replace: '\\pi' },
  { pattern: /세타/g, replace: '\\theta' },
  { pattern: /알파/g, replace: '\\alpha' },
  { pattern: /베타/g, replace: '\\beta' },
  { pattern: /감마/g, replace: '\\gamma' },

  // 연산자 기호
  { pattern: /\s*더하기\s*/g, replace: ' + ' },
  { pattern: /\s*빼기\s*/g, replace: ' - ' },
  { pattern: /\s*곱하기\s*/g, replace: ' \\cdot ' },
  { pattern: /\s*나누기\s*/g, replace: ' \\div ' },
  { pattern: /\s*는\s*영\b|\s*은\s*영\b/g, replace: ' = 0' }
];

class MathParser {
  /**
   * 구어체 음성 텍스트를 LaTeX 친화적 수식으로 정제
   */
  static normalizeSpokenMath(rawText) {
    if (!rawText) return '';
    let result = rawText;

    MATH_SPOKEN_DICTIONARY.forEach(({ pattern, replace }) => {
      if (typeof replace === 'function') {
        result = result.replace(pattern, replace);
      } else {
        result = result.replace(pattern, replace);
      }
    });

    return result;
  }

  /**
   * 텍스트 내의 LaTeX 수식을 안전하게 렌더링
   * KaTeX가 로드되어 있으면 KaTeX로 렌더링하고, 없더라도 미려한 네이티브 수식으로 100% 무조건 렌더링!
   */
  static renderLatexToElement(element, latexString, displayMode = false) {
    if (!element) return;
    if (!latexString || latexString.trim() === '') {
      element.innerHTML = '<span style="color: var(--text-sub); font-size: 0.9rem;">입력된 수식이 없습니다.</span>';
      return;
    }

    // 1. KaTeX 엔진이 사용 가능한 경우 최고급 렌더링 시도
    if (window.katex && typeof window.katex.render === 'function') {
      try {
        window.katex.render(latexString, element, {
          displayMode: displayMode,
          throwOnError: false,
          errorColor: '#ff3366'
        });
        return;
      } catch (e) {
        console.warn('KaTeX 내부 렌더링 에러 (Fallback 수식 적용):', e);
      }
    }

    // 2. Fallback: KaTeX가 없거나 실패하더라도 100% 미려하게 보이는 네이티브 HTML 수식 뷰어
    const prettyHtml = this.formatLatexToPrettyHtml(latexString);
    element.innerHTML = `
      <div style="font-family: 'JetBrains Mono', 'Cambria Math', serif; font-size: ${displayMode ? '1.35rem' : '1.05rem'}; color: #00f0ff; letter-spacing: 0.8px; font-weight: 600; text-shadow: 0 0 10px rgba(0,240,255,0.4);">
        ${prettyHtml}
      </div>
    `;
  }

  /**
   * LaTeX 기호를 읽기 쉬운 유니코드 수학 기호로 변환 (완벽한 안전망)
   */
  static formatLatexToPrettyHtml(latex) {
    if (!latex) return '';
    let s = latex;
    // 거듭제곱 변환
    s = s.replace(/\^3/g, '³').replace(/\^2/g, '²').replace(/\^{([0-9nkm]+)}/g, '<sup>$1</sup>');
    // 분수 변환
    s = s.replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1 / $2)');
    // 루트 변환
    s = s.replace(/\\sqrt{([^}]+)}/g, '√($1)');
    // 화살표 및 기호
    s = s.replace(/\\implies/g, ' ⟹ ')
         .replace(/\\Rightarrow/g, ' ⟹ ')
         .replace(/\\pm/g, '±')
         .replace(/\\ge/g, '≥')
         .replace(/\\le/g, '≤')
         .replace(/\\neq/g, '≠')
         .replace(/\\cdot/g, '·')
         .replace(/\\quad/g, ' &nbsp; ');
    return s;
  }

  /**
   * 문장에서 한글 조사를 피해 순수 수식 덩어리만 칼같이 추출
   */
  static extractCoreEquation(text) {
    if (!text) return 'f(x) = x^3 - 3x + 2';

    // 1. f(x) = ... 또는 y = ... 수식 분리 (한글 조사 이전까지만 추출)
    const matchFunc = text.match(/(f\(x\)\s*=\s*[a-zA-Z0-9\^_\+\-\*\/\(\)\s\.]+?)(?=\s*(?:에\s*대하여|의|일\s*때|에서|를|은|는|,|\.|$))/);
    if (matchFunc) return matchFunc[1].trim();

    const matchY = text.match(/(y\s*=\s*[a-zA-Z0-9\^_\+\-\*\/\(\)\s\.]+?)(?=\s*(?:에\s*대하여|의|일\s*때|에서|를|은|는|,|\.|$))/);
    if (matchY) return matchY[1].trim();

    // 2. 등식 형태 (A = B)
    const matchEq = text.match(/([a-zA-Z0-9\^_\+\-\*\/\(\)\s]+\s*=\s*[a-zA-Z0-9\^_\+\-\*\/\(\)\s]+)/);
    if (matchEq) return matchEq[1].trim();

    // 3. 음성 정제본
    return this.normalizeSpokenMath(text).slice(0, 50);
  }
}

window.MathParser = MathParser;
