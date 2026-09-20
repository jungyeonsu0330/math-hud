/**
 * ProofChecker: Math.js CAS 대수 엔진 기반 실시간 수식 검증 및 논리 오류 진단기
 */

class ProofChecker {
  /**
   * LaTeX 수식을 Math.js가 해석할 수 있는 표준 수식 문자열로 변환
   */
  static cleanLatexForMathjs(latex) {
    if (!latex) return '';
    let s = latex.trim();

    // 1. LaTeX 특수 명령어 제거 및 변환
    s = s.replace(/\\implies/g, '=')
         .replace(/\\Rightarrow/g, '=')
         .replace(/\\cdot/g, '*')
         .replace(/\\times/g, '*')
         .replace(/\\div/g, '/')
         .replace(/\\pm/g, '+');

    // 2. 분수 및 제곱근 변환
    s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
    s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)');

    // 3. 지수 변환 (x^{2} -> x^2)
    s = s.replace(/\^{([^{}]+)}/g, '^($1)');

    // 4. 불필요한 LaTeX 서식 제거
    s = s.replace(/\\left/g, '').replace(/\\right/g, '');
    s = s.replace(/\\quad/g, ' ').replace(/\\,/g, ' ');

    // 5. 암시적 곱셈 보완 (3x -> 3*x, 2(x) -> 2*(x))
    s = s.replace(/([0-9])([a-zA-Z])/g, '$1*$2');
    s = s.replace(/([a-zA-Z0-9\)])\s*\(/g, '$1*(');

    return s.trim();
  }

  /**
   * Math.js를 이용한 실제 대수적 등호 성립 및 계산 오류 검증
   */
  static verifyWithMathjs(latexText) {
    if (!window.math || !latexText) return null;

    try {
      // 1. 등식 분리 (A = B)
      const parts = latexText.split('=');
      if (parts.length === 2) {
        const leftRaw = parts[0].trim();
        const rightRaw = parts[1].trim();

        // f(x) = ... 또는 y = ... 함수 정의는 도함수 검증 또는 패스
        if (/^(?:f|g|h)\s*\([a-z]\)$/i.test(leftRaw) || /^y$/i.test(leftRaw)) {
          return null;
        }

        // f'(x) = ... 도함수 표기인 경우
        if (/^(?:f'|g'|h')\s*\([a-z]\)$/i.test(leftRaw)) {
          return null;
        }

        const leftClean = this.cleanLatexForMathjs(leftRaw);
        const rightClean = this.cleanLatexForMathjs(rightRaw);

        if (!leftClean || !rightClean) return null;

        // 1-1. 단순 수치 등식 검증 (예: 2 + 3 = 6)
        try {
          const leftVal = window.math.evaluate(leftClean);
          const rightVal = window.math.evaluate(rightClean);

          if (typeof leftVal === 'number' && typeof rightVal === 'number') {
            if (Math.abs(leftVal - rightVal) > 1e-7) {
              return {
                level: 'error',
                code: 'ARITHMETIC_MISMATCH',
                title: '수학적 계산 불일치 (등호 성립 불가)',
                message: `좌변(${leftVal})과 우변(${rightVal})의 계산 결과가 일치하지 않습니다. 등호가 성립하지 않습니다.`,
                fixSuggestion: `계산 과정을 다시 검토하여 양변의 값을 일치시키세요.`
              };
            }
          }
        } catch (e) {}

        // 1-2. 변수가 포함된 다항식 동치 검증 (L - R == 0 여부 샘플링)
        try {
          const diffExpr = `(${leftClean}) - (${rightClean})`;
          const compiled = window.math.compile(diffExpr);
          const testPoints = [-3, -1, 0, 1, 2, 5];
          let allMatch = true;

          for (const xVal of testPoints) {
            try {
              const res = compiled.evaluate({ x: xVal, a: xVal, t: xVal });
              if (typeof res === 'number' && Math.abs(res) > 1e-5) {
                allMatch = false;
                break;
              }
            } catch (evalErr) {}
          }

          if (!allMatch) {
            return {
              level: 'error',
              code: 'ALGEBRAIC_INEQUIVALENCE',
              title: '대수적 식 변형 오류 (양변 불일치)',
              message: `좌변(${leftRaw})과 우변(${rightRaw})은 대수적으로 동치(항등식)가 아닙니다. 인수분해나 식 전개 오류일 수 있습니다.`,
              fixSuggestion: `다항식 전개 및 인수분해 부호를 다시 확인하세요.`
            };
          }
        } catch (symErr) {}
      }
    } catch (err) {
      console.warn('Math.js 정밀 검증 스킵:', err);
    }
    return null;
  }

  /**
   * 풀이 단계별 텍스트 및 수식을 분석하여 잠재적 비약/오류를 진단
   */
  static analyzeStep(stepText, latexText, allSteps = []) {
    const combined = `${stepText} ${latexText}`.toLowerCase();
    const results = [];

    // ⭐ 0. Math.js 컴퓨터 대수(CAS) 엔진 기반 정밀 등식 계산 검증
    const mathjsResult = this.verifyWithMathjs(latexText);
    if (mathjsResult) {
      results.push(mathjsResult);
    }

    // 1. 분모 0 조건 (양변 나누기 시)
    if (combined.includes('나누') || combined.includes('\\div') || combined.includes('\\frac') || combined.includes('/ 0')) {
      if (combined.includes('/ 0') || combined.includes('분의 0')) {
        results.push({
          level: 'error',
          code: 'ZERO_DIVISION_CRITICAL',
          title: '0으로 나누기 (Zero Division)',
          message: '분모가 0인 수는 수학적으로 정의되지 않습니다.',
          fixSuggestion: '분모가 0이 되는 지점을 정의역에서 제외하세요.'
        });
      }

      const hasZeroCheck = combined.includes('\\neq 0') || combined.includes('!= 0') || combined.includes('0이 아니');
      const hasVariableDivision = /([a-z]\s*[-+]\s*[0-9a-z]+)로\s*나누/.test(stepText) || /양변을\s*([a-z]+)로\s*나누/.test(stepText);
      if (hasVariableDivision && !hasZeroCheck) {
        results.push({
          level: 'error',
          code: 'ZERO_DIVISION_RISK',
          title: '분모 0 (Zero Division) 전제 조건 누락',
          message: '문자가 포함된 식으로 양변을 나눌 때, 해당 식이 0이 아니라는 전제 조건($x \\neq a$)을 명시하지 않으면 근의 손실이나 모순이 발생합니다.',
          fixSuggestion: '해당 인수가 0인 경우와 0이 아닌 경우로 나누어 케이스 분류를 진행해야 합니다.'
        });
      }
    }

    // 2. 제곱근 및 절댓값 범위 비약
    if (combined.includes('\\sqrt') || combined.includes('루트')) {
      if ((combined.includes('x^2') || combined.includes('^2')) && !combined.includes('|') && !combined.includes('\\pm')) {
        results.push({
          level: 'warning',
          code: 'ROOT_ABS_LEAP',
          title: '제곱근 벗기기 부호/절댓값 비약',
          message: '$\\sqrt{x^2} = |x|$ 이므로, $x$의 부호 조건에 따라 부호가 바뀝니다. 절댓값을 생략하고 바로 $x$로 쓰면 음수 영역에서 오답이 됩니다.',
          fixSuggestion: '정의역 범위를 확인하거나 $|x|$ 기호를 사용하여 서술을 보완하세요.'
        });
      }
    }

    // 3. 로그 진수 조건 및 밑 조건 누락
    if (combined.includes('\\log') || combined.includes('\\ln') || combined.includes('로그')) {
      const hasDomainCheck = combined.includes('> 0') || combined.includes('진수') || combined.includes('정의역');
      if (!hasDomainCheck) {
        results.push({
          level: 'warning',
          code: 'LOG_DOMAIN_MISSING',
          title: '로그의 진수 조건 ($> 0$) 미검토',
          message: '로그 방정식을 풀 때는 계산에 앞서 진수 조건($f(x) > 0$)과 밑 조건($a > 0, a \\neq 1$)을 먼저 설정해야 무연근을 걸러낼 수 있습니다.',
          fixSuggestion: '풀이 첫 줄에 진수 조건의 공통 범위를 명시해 두세요.'
        });
      }
    }

    // 4. 이차방정식 실근 판별식 조건
    if (combined.includes('실근') || combined.includes('서로 다른 두 실근')) {
      const hasDiscriminant = combined.includes('d \\ge 0') || combined.includes('판별식') || combined.includes('b^2 - 4ac');
      if (!hasDiscriminant) {
        results.push({
          level: 'warning',
          code: 'DISCRIMINANT_LEAP',
          title: '실근 존재 조건(판별식 $D \\ge 0$) 누락 위험',
          message: '실근을 갖는다는 조건이 주어졌을 때 판별식 $D \\ge 0$ 범위를 체크하지 않으면 파라미터의 유효 범위가 누락될 수 있습니다.',
          fixSuggestion: '이차방정식 계수에 대한 판별식 계산을 명시적으로 추가하세요.'
        });
      }
    }

    // 5. 극값 판정 시 도함수 부호 변화 누락
    if (combined.includes('극값') || combined.includes('극댓값') || combined.includes('극솟값')) {
      const hasSignAnalysis = combined.includes('부호') || combined.includes('증감표') || combined.includes('좌우');
      if (!hasSignAnalysis && combined.includes("f'(x) = 0")) {
        results.push({
          level: 'warning',
          code: 'EXTREMA_SIGN_CHECK',
          title: '도함수 부호 변화(증감표) 서술 생략',
          message: "$f'(a) = 0$이라고 해서 항상 극값인 것은 아닙니다. 좌우에서의 $f'(x)$ 부호 변화를 밝혀야 완벽한 서술입니다.",
          fixSuggestion: "증감표나 도함수 개형을 언급하여 부호 변화를 확인했음을 명시하세요."
        });
      }
    }

    // 기본 통과 상태
    if (results.length === 0) {
      return {
        status: 'pass',
        badge: '🟢 논리 무결',
        title: '수학적 비약 없음',
        message: '현재 단계의 등호 성립 및 대수적 식 변형에 논리적 결함이 발견되지 않았습니다.',
        fixSuggestion: null
      };
    }

    // 에러가 하나라도 있으면 전체 상태는 error, 아니면 warning
    const hasError = results.some(r => r.level === 'error');
    return {
      status: hasError ? 'error' : 'warning',
      badge: hasError ? '🔴 치명적 오류' : '🟡 논리 비약 주의',
      title: results[0].title,
      message: results[0].message,
      fixSuggestion: results[0].fixSuggestion,
      allIssues: results
    };
  }

  /**
   * 여러 단계의 풀이 전체를 종합 진단
   */
  static analyzeFullProof(steps) {
    if (!steps || steps.length === 0) {
      return { totalStatus: 'pass', issuesCount: 0, summary: '검토할 풀이 단계가 없습니다.' };
    }

    const analyzedSteps = steps.map((step, idx) => {
      const diagnosis = this.analyzeStep(step.desc || '', step.latex || '', steps);
      return {
        ...step,
        diagnosis
      };
    });

    const errorCount = analyzedSteps.filter(s => s.diagnosis.status === 'error').length;
    const warningCount = analyzedSteps.filter(s => s.diagnosis.status === 'warning').length;

    let totalStatus = 'pass';
    if (errorCount > 0) totalStatus = 'error';
    else if (warningCount > 0) totalStatus = 'warning';

    return {
      totalStatus,
      errorCount,
      warningCount,
      analyzedSteps,
      summary: totalStatus === 'pass' 
        ? '모든 풀이 단계의 수학적 논리가 견고합니다.' 
        : `발견된 비약/주의: 오류 ${errorCount}건, 주의 ${warningCount}건`
    };
  }
}

window.ProofChecker = ProofChecker;
