/**
 * Kakao-Style Live Math Chat Orchestrator (app.js)
 * 1번 사진 박스(실시간 수식 정제 & 검증 박스)를 통화 헤더 바로 아래 고정 배치하고,
 * 헤더에서 실시간 음성을 듣고 고정 박스 및 대화창으로 실시간 전달하는 시스템
 */

document.addEventListener('DOMContentLoaded', () => {
  // Pinned Math Box Elements (1번 사진 박스)
  const pinnedBox = document.getElementById('live-pinned-math-box');
  const pinnedTranscriptText = document.getElementById('pinned-transcript-text');
  const pinnedLatexDisplay = document.getElementById('pinned-latex-display');
  const pinnedDiagBadge = document.getElementById('pinned-diag-badge');
  const pinnedMathNote = document.getElementById('pinned-math-note');
  const pinnedCopyBtn = document.getElementById('pinned-copy-btn');
  const pinnedSendChatBtn = document.getElementById('pinned-send-chat-btn');

  // Chat Elements
  const chatMessagesArea = document.getElementById('kakao-chat-messages');
  const chatQuickInput = document.getElementById('chat-quick-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const quickScenarioBtn = document.getElementById('quick-scenario-btn');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const samplePreset1 = document.getElementById('sample-preset-1');
  const samplePreset2 = document.getElementById('sample-preset-2');

  // Call Header Mic Controls
  const callMicBtn = document.getElementById('call-mic-btn');
  const callMicLabel = document.getElementById('call-mic-label');
  const callMicStatusText = document.getElementById('call-mic-status-text');

  // Scenario Elements
  const scenarioTabs = document.querySelectorAll('.scenario-tabs .tab-btn');
  const currentScenarioBadge = document.getElementById('current-scenario-badge');
  const firstPromptText = document.getElementById('first-prompt-text');
  const copyFirstPromptBtn = document.getElementById('copy-first-prompt-btn');
  // Floating Tablet Dock Elements
  const floatingAnalyzeBtn = document.getElementById('floating-analyze-btn');
  const smartAutoToggle = document.getElementById('smart-auto-clipboard-toggle');

  // Graph Engine
  const graphEngine = new MathGraphEngine('jxgbox');
  let speechRecognizer = null;
  let isListening = false;
  let currentPinnedLatex = "f(x) = x^3 - 3x + 2";

  // 1. 그래프 엔진 초기화
  graphEngine.init();

  function getCurrentTimeStr() {
    const d = new Date();
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // 2. 고정 실시간 수식 박스(1번 사진 박스) 갱신 함수
  function updatePinnedMathBox(text, customLatex = null, customDiag = null) {
    if (pinnedTranscriptText) {
      pinnedTranscriptText.textContent = text;
    }

    const detectedLatex = customLatex || MathParser.extractCoreEquation(text);
    currentPinnedLatex = detectedLatex;

    // 수식 렌더링 (KaTeX 또는 네이티브 수식)
    if (pinnedLatexDisplay && detectedLatex) {
      MathParser.renderLatexToElement(pinnedLatexDisplay, detectedLatex, false);
    }

    // 진단 분석
    const diag = customDiag || ProofChecker.analyzeStep(text, detectedLatex);
    if (pinnedDiagBadge) {
      if (diag.status === 'error') {
        pinnedDiagBadge.textContent = '🔴 치명적 오류';
        pinnedDiagBadge.style.background = 'rgba(255, 51, 102, 0.25)';
        pinnedDiagBadge.style.color = 'var(--neon-pink)';
      } else if (diag.status === 'warning') {
        pinnedDiagBadge.textContent = '🟡 비약 의심';
        pinnedDiagBadge.style.background = 'rgba(255, 208, 0, 0.25)';
        pinnedDiagBadge.style.color = 'var(--neon-gold)';
      } else {
        pinnedDiagBadge.textContent = '🟢 논리 무결';
        pinnedDiagBadge.style.background = 'rgba(0, 255, 136, 0.25)';
        pinnedDiagBadge.style.color = 'var(--neon-green)';
      }
    }

    if (pinnedMathNote) {
      pinnedMathNote.textContent = diag.message || '수학적 등호 성립 및 식 변형 검토 완료';
    }

    // 우측 그래프 자동 연동
    updateGraphByMathText(text);
  }

  // 3. 카카오톡 대화방 메시지 추가 함수
  function addGeminiBubble(text, latex = null, diagnosis = null) {
    const timeStr = getCurrentTimeStr();
    const row = document.createElement('div');
    row.className = 'chat-row gemini-row';

    const detectedLatex = latex || MathParser.extractCoreEquation(text);
    const diag = diagnosis || ProofChecker.analyzeStep(text, detectedLatex);

    const diagBadgeHtml = diag.status === 'error'
      ? `<span class="step-diag-badge" style="background:rgba(255,51,102,0.2); color:var(--neon-pink);">🔴 오류 주의</span>`
      : (diag.status === 'warning'
        ? `<span class="step-diag-badge" style="background:rgba(255,208,0,0.2); color:var(--neon-gold);">🟡 비약 의심</span>`
        : `<span class="step-diag-badge" style="background:rgba(0,255,136,0.2); color:var(--neon-green);">🟢 논리 무결</span>`);

    row.innerHTML = `
      <div class="chat-bubble gemini-bubble">
        <div>
          <span class="gemini-voice-prefix">
            <span class="sound-bars-mini"><span></span><span></span><span></span></span>
            Gemini Live
          </span>
          <span class="bubble-text-content">${text}</span>
        </div>
        
        <div class="bubble-math-card">
          <div style="font-size:0.7rem; color:var(--text-sub); margin-bottom:2px;">📐 정제 표준 수식:</div>
          <div class="bubble-math-latex"></div>
          <div class="bubble-math-footer">
            ${diagBadgeHtml}
            <button class="copy-mini-btn btn-counter-ask" style="font-size:0.75rem;">반문 복사 🚀</button>
          </div>
        </div>
      </div>
      <span class="chat-timestamp">${timeStr}</span>
    `;

    chatMessagesArea.appendChild(row);

    const latexEl = row.querySelector('.bubble-math-latex');
    if (latexEl && detectedLatex) {
      MathParser.renderLatexToElement(latexEl, detectedLatex, false);
    }

    row.querySelector('.btn-counter-ask').addEventListener('click', () => {
      const scenario = QuestionPromptsManager.getScenario('scenario1');
      QuestionPromptsManager.copyPromptToClipboard(scenario.firstQuestion.prompt, '제미니에게 반문할 질문이 복사되었습니다!');
    });

    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    return row;
  }

  function addUserBubble(text) {
    const timeStr = getCurrentTimeStr();
    const row = document.createElement('div');
    row.className = 'chat-row user-row';

    row.innerHTML = `
      <span class="chat-timestamp">${timeStr}</span>
      <div class="chat-bubble user-bubble">
        ${text}
      </div>
    `;

    chatMessagesArea.appendChild(row);
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
  }

  function updateGraphByMathText(text) {
    if (!graphEngine.board && !graphEngine.canvas) return;
    if (text.includes('x^2') && !text.includes('x^3')) {
      graphEngine.setParams({ type: 'quadratic', a: 1, b: 0, c: -2, t: 1.0 });
    } else {
      graphEngine.setParams({ type: 'cubic', a: 1, b: -3, c: 2, t: 1.0 });
    }
  }

  // 4. 초기 고정 박스 및 대화방 로드
  function loadInitialState() {
    // 1번 사진 박스(고정 박스) 초기화
    updatePinnedMathBox(
      "오늘 풀 문제는 함수 f(x) = x^3 - 3x + 2 에 대하여 x가 1일 때의 접선의 방정식을 구하고 극값을 판정하는 거야.",
      "f(x) = x^3 - 3x + 2 \\quad \\Rightarrow \\quad f'(x) = 3x^2 - 3",
      { status: 'pass', message: '다항함수의 미분법 적용 완벽함' }
    );

    chatMessagesArea.innerHTML = '';
    addGeminiBubble(
      "함수 f(x) = x^3 - 3x + 2 에 대하여 x가 1일 때의 접선의 방정식을 구해보자.",
      "f(x) = x^3 - 3x + 2"
    );
    addUserBubble("대수 계산만 하지 말고 f(x) 그래프 개형이랑 접선 성질을 이용해서 직관적으로 먼저 보여줘!");
    addGeminiBubble(
      "도함수를 구하면 f'(x) = 3x^2 - 3 이고, x=1에서 기울기 m = 0이 나와서 수평 접선 y = 0이 돼.",
      "f'(x) = 3x^2 - 3 \\implies m = 0"
    );
  }

  loadInitialState();

  // 5. 고정 박스 버튼 이벤트
  pinnedCopyBtn.addEventListener('click', () => {
    const scenario = QuestionPromptsManager.getScenario('scenario1');
    addUserBubble(scenario.firstQuestion.prompt);
    QuestionPromptsManager.copyPromptToClipboard(scenario.firstQuestion.prompt, '반문 질문이 복사되어 제미니에게 전송 준비되었습니다!');
  });

  pinnedSendChatBtn.addEventListener('click', () => {
    const text = pinnedTranscriptText.textContent.trim();
    addGeminiBubble(text, currentPinnedLatex);
    QuestionPromptsManager.showToast('고정 박스의 수식 내용이 아래 카톡 대화창에 기록되었습니다.', 'info');
  });

  // 6. 실시간 음성 인식 & Web Audio 감도 레벨 메타 & 클립보드 연동 시스템
  const levelFillEl = document.getElementById('audio-level-fill');
  const levelValEl = document.getElementById('audio-level-val');
  const quickPasteBtn = document.getElementById('quick-paste-live-btn');
  const topPasteBtn = document.getElementById('paste-clipboard-btn');
  const topMicBtn = document.getElementById('mic-toggle-btn');
  const topMicText = document.getElementById('mic-btn-text');

  let audioContext = null;
  let audioAnalyser = null;
  let audioStream = null;
  let audioMeterRaf = null;

  function updateAudioMeter() {
    if (!audioAnalyser || !isListening) {
      if (levelFillEl) levelFillEl.style.width = '0%';
      if (levelValEl) levelValEl.textContent = '0%';
      return;
    }
    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    audioAnalyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    // 0 ~ 100 퍼센트 환산
    const percent = Math.min(100, Math.round((avg / 128) * 100));

    if (levelFillEl) {
      levelFillEl.style.width = `${percent}%`;
      if (percent > 60) {
        levelFillEl.style.background = 'linear-gradient(90deg, #00f0ff, #ff0055)';
      } else if (percent > 25) {
        levelFillEl.style.background = 'linear-gradient(90deg, #00f0ff, #ffd000)';
      } else {
        levelFillEl.style.background = 'linear-gradient(90deg, #00f0ff, #00ff88)';
      }
    }
    if (levelValEl) {
      levelValEl.textContent = `${percent}%`;
    }

    audioMeterRaf = requestAnimationFrame(updateAudioMeter);
  }

  async function startAudioMeter() {
    try {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      if (!audioStream) {
        // 태블릿 자체 에코 제거(AEC)를 비활성화 시도하여 스피커 소리도 마이크로 유입되도록 유도
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true
          }
        });
      }

      const source = audioContext.createMediaStreamSource(audioStream);
      audioAnalyser = audioContext.createAnalyser();
      audioAnalyser.fftSize = 128;
      source.connect(audioAnalyser);

      updateAudioMeter();
    } catch (e) {
      console.warn('Web Audio 감도 미터 초기화 실패 (권한 필요):', e);
    }
  }

  function stopAudioMeter() {
    if (audioMeterRaf) {
      cancelAnimationFrame(audioMeterRaf);
      audioMeterRaf = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }
    if (audioAnalyser) {
      audioAnalyser = null;
    }
    if (levelFillEl) levelFillEl.style.width = '0%';
    if (levelValEl) levelValEl.textContent = '0%';
  }

  // 통합 마이크 시작/중지 컨트롤러
  window.appStartListening = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      QuestionPromptsManager.showToast('현재 브라우저가 Web Speech API를 지원하지 않습니다.', 'warning');
      return;
    }

    isListening = true;

    // 통화 헤더 버튼 상태 갱신
    if (callMicBtn) callMicBtn.setAttribute('data-state', 'listening');
    if (callMicLabel) callMicLabel.textContent = '🔴 듣는 중...';
    if (callMicStatusText) callMicStatusText.textContent = '실시간 음성 분석 중';

    // 상단 버튼 상태 동기화
    if (topMicBtn) topMicBtn.setAttribute('data-state', 'listening');
    if (topMicText) topMicText.textContent = '구글 음성 듣는 중... (말씀하세요)';

    // 실시간 음성 볼륨 게이지 시작
    startAudioMeter();

    if (!speechRecognizer) {
      speechRecognizer = new SpeechRecognition();
      speechRecognizer.lang = 'ko-KR';
      speechRecognizer.continuous = true;
      speechRecognizer.interimResults = true;

      speechRecognizer.onstart = () => {
        console.log('구글 음성인식 엔진 연결 성공');
        QuestionPromptsManager.showToast('🎙️ 마이크 연결 완료! 말소리를 실시간 분석합니다.', 'success');
      };

      speechRecognizer.onresult = (event) => {
        let liveInterim = '';
        let confirmedFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) confirmedFinal += transcript;
          else liveInterim += transcript;
        }

        const currentSpoken = confirmedFinal || liveInterim;
        if (currentSpoken) {
          // ⚡ 헤더에서 들은 음성을 바로 밑의 1번 사진 고정 박스로 0.1초 만에 실시간 전송!
          updatePinnedMathBox(currentSpoken);

          // 말이 최종 확정되면 카톡 대화창에도 자동으로 추가!
          if (confirmedFinal) {
            addGeminiBubble(confirmedFinal);
          }
        }
      };

      speechRecognizer.onerror = (e) => {
        console.warn('음성 인식 에러 이벤트:', e.error);
        if (e.error === 'not-allowed') {
          QuestionPromptsManager.showToast('🚨 마이크 권한이 차단되었습니다. 주소창 좌측 🔒에서 허용해주세요.', 'warning');
        } else if (e.error === 'network') {
          QuestionPromptsManager.showToast('🚨 구글 STT 서버 통신 실패 (사설 SSL 또는 네트워크 차단). 콘솔을 확인하세요.', 'error');
        } else if (e.error === 'audio-capture') {
          QuestionPromptsManager.showToast('🚨 마이크 장치 캡처 실패 (마이크가 점유되었거나 없음).', 'error');
        } else if (e.error === 'no-speech') {
          console.log('음성이 감지되지 않음 (AEC 필터링 또는 무음)');
        } else {
          QuestionPromptsManager.showToast(`음성 인식 오류: [${e.error}]`, 'warning');
        }
      };

      speechRecognizer.onend = () => {
        // 사용자가 명시적으로 끄지 않았다면 자동으로 재연결 유지
        if (isListening) {
          try {
            speechRecognizer.start();
          } catch (e) {}
        }
      };
    }

    try {
      speechRecognizer.start();
    } catch (err) {
      console.warn('음성 시작 예외:', err);
    }
  };

  window.appStopListening = function() {
    isListening = false;
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) {}
    }
    stopAudioMeter();

    // 통화 헤더 버튼 상태 갱신
    if (callMicBtn) {
      callMicBtn.setAttribute('data-state', 'stopped');
      callMicLabel.textContent = '⏹️ 청취 종료됨';
      callMicStatusText.textContent = '음성 청취 완료';
    }

    // 상단 버튼 상태 동기화
    if (topMicBtn) {
      topMicBtn.setAttribute('data-state', 'stopped');
      if (topMicText) topMicText.textContent = '🔴 [종료됨] 음성 청취 정지';
    }

    QuestionPromptsManager.showToast('🛑 실시간 음성 청취가 종료되었습니다.', 'info');

    setTimeout(() => {
      if (!isListening) {
        if (callMicBtn) {
          callMicBtn.setAttribute('data-state', 'idle');
          callMicLabel.textContent = '🎙️ 음성 듣기';
          callMicStatusText.textContent = '대기 중';
        }
        if (topMicBtn) {
          topMicBtn.setAttribute('data-state', 'idle');
          if (topMicText) topMicText.textContent = '실시간 음성 시작';
        }
      }
    }, 2000);
  };

  // 통화 헤더 내장 마이크 버튼 토글
  window.toggleCallMic = function() {
    if (isListening) {
      window.appStopListening();
    } else {
      window.appStartListening();
    }
  };

  // 클립보드 원터치 가져오기 함수 (태블릿에서 제미니 답변 복사 후 즉시 정제)
  let lastProcessedClipboard = '';

  async function handlePasteFromClipboard(isSilent = false) {
    try {
      let text = '';
      if (navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      } else if (!isSilent) {
        text = prompt('제미니의 답변 텍스트를 붙여넣어 주세요:');
      }

      if (text && text.trim()) {
        const cleanText = text.trim();
        // 중복 처리 방지
        if (cleanText === lastProcessedClipboard) {
          if (!isSilent) QuestionPromptsManager.showToast('이미 최신으로 분석 반영된 풀이입니다.', 'info');
          return;
        }
        lastProcessedClipboard = cleanText;

        // 1번 사진 고정 박스 즉시 업데이트
        updatePinnedMathBox(cleanText);
        // 대화창에도 즉시 등록
        addGeminiBubble(cleanText);
        QuestionPromptsManager.showToast('⚡ 제미니 풀이를 성공적으로 KaTeX 수식 변환 및 분석했습니다!', 'success');
      } else if (!isSilent) {
        QuestionPromptsManager.showToast('클립보드에 복사된 텍스트가 없습니다.', 'warning');
      }
    } catch (err) {
      if (!isSilent) {
        console.warn('클립보드 읽기 권한 필요:', err);
        const text = prompt('제미니의 답변 텍스트를 여기에 붙여넣으세요:');
        if (text && text.trim()) {
          const cleanText = text.trim();
          lastProcessedClipboard = cleanText;
          updatePinnedMathBox(cleanText);
          addGeminiBubble(cleanText);
          QuestionPromptsManager.showToast('📋 수식 변환 및 반영 완료!', 'success');
        }
      }
    }
  }

  if (quickPasteBtn) quickPasteBtn.addEventListener('click', () => handlePasteFromClipboard(false));
  if (topPasteBtn) topPasteBtn.addEventListener('click', () => handlePasteFromClipboard(false));
  if (floatingAnalyzeBtn) floatingAnalyzeBtn.addEventListener('click', () => handlePasteFromClipboard(false));

  // 🚪 스마트 자동문: 태블릿에서 제미니 복사 후 웹앱 화면으로 복귀 시 0.1초 만에 자동 분석!
  function checkSmartAutoClipboard() {
    if (smartAutoToggle && smartAutoToggle.checked) {
      handlePasteFromClipboard(true);
    }
  }

  window.addEventListener('focus', () => {
    setTimeout(checkSmartAutoClipboard, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(checkSmartAutoClipboard, 150);
    }
  });

  // 7. 예제 프리셋 버튼
  samplePreset1.addEventListener('click', () => {
    loadInitialState();
    QuestionPromptsManager.showToast('삼차함수 접선 대화가 로드되었습니다.', 'success');
  });

  samplePreset2.addEventListener('click', () => {
    updatePinnedMathBox(
      "방정식 (x-1)(x+2) = 3(x-1) 에서 양변을 (x-1)로 나누어 x + 2 = 3 이므로 x = 1 이야.",
      "\\frac{(x-1)(x+2)}{x-1} = \\frac{3(x-1)}{x-1} \\implies x = 1",
      { status: 'error', message: '치명적 오류: x = 1인 경우 분모가 0이 되므로 나눌 수 없음!' }
    );
    addGeminiBubble(
      "방정식 (x-1)(x+2) = 3(x-1) 에서 양변을 (x-1)로 나누면 x + 2 = 3 이므로 x = 1 이야.",
      "\\frac{(x-1)(x+2)}{x-1} = \\frac{3(x-1)}{x-1}",
      { status: 'error', badge: '🔴 치명적 오류 (분모 0)' }
    );
    addUserBubble("잠깐! x-1로 나눌 때 x=1이면 분모가 0이 되잖아! 예외 조건이 빠졌어.");
    QuestionPromptsManager.showToast('분모 0 함정 대화가 로드되었습니다. 🔴 배지를 확인하세요!', 'warning');
  });

  clearChatBtn.addEventListener('click', () => {
    chatMessagesArea.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-sub); font-size:0.85rem;">대화가 초기화되었습니다.</div>';
    QuestionPromptsManager.showToast('대화방이 비워졌습니다.', 'info');
  });

  // 8. 하단 메시지 전송 바
  function handleSendMessage() {
    const text = chatQuickInput.value.trim();
    if (!text) return;
    addUserBubble(text);
    chatQuickInput.value = '';

    // 순수 수식 텍스트를 직접 전달하여 파싱 왜곡 원천 차단!
    setTimeout(() => {
      updatePinnedMathBox(text);
    }, 200);
  }

  chatSendBtn.addEventListener('click', handleSendMessage);
  chatQuickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  quickScenarioBtn.addEventListener('click', () => {
    const currentPrompt = firstPromptText.textContent.trim();
    addUserBubble(currentPrompt);
    QuestionPromptsManager.copyPromptToClipboard(currentPrompt, '반문이 복사되었습니다! 제미니 앱에 바로 전송하세요.');
  });

  // 9. 반문 시나리오 탭
  function renderScenario(scenarioId) {
    const scenario = QuestionPromptsManager.getScenario(scenarioId);
    if (!scenario) return;

    scenarioTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.scenario === scenarioId);
    });

    currentScenarioBadge.textContent = scenario.badge;
    firstPromptText.textContent = scenario.firstQuestion.prompt;

    followupsContainer.innerHTML = '';
    scenario.followUps.forEach(item => {
      const div = document.createElement('div');
      div.className = 'follow-up-item';
      div.innerHTML = `
        <div class="follow-up-text">
          <strong>${item.title}</strong>
          <span>${item.prompt}</span>
        </div>
        <button class="copy-mini-btn" title="이 질문을 복사하여 대화방에 발송">전송 & 복사</button>
      `;

      div.querySelector('.copy-mini-btn').addEventListener('click', () => {
        addUserBubble(item.prompt);
        QuestionPromptsManager.copyPromptToClipboard(item.prompt, `2차 꼬리물기 질문이 복사되었습니다: "${item.title}"`);
      });

      followupsContainer.appendChild(div);
    });
  }

  scenarioTabs.forEach(tab => {
    tab.addEventListener('click', () => renderScenario(tab.dataset.scenario));
  });

  copyFirstPromptBtn.addEventListener('click', () => {
    const text = firstPromptText.textContent.trim();
    addUserBubble(text);
    QuestionPromptsManager.copyPromptToClipboard(text, '1차 즉시 반문이 복사되었습니다!');
  });

  renderScenario('scenario1');

  // 10. 그래프 컨트롤
  document.getElementById('graph-anim-btn').addEventListener('click', () => {
    const isPlaying = graphEngine.toggleAnimation();
    document.getElementById('anim-icon').textContent = isPlaying ? '⏸' : '▶';
    document.getElementById('anim-text').textContent = isPlaying ? '애니메이션 일시정지' : '동적 애니메이션 재생';
  });

  document.getElementById('graph-reset-btn').addEventListener('click', () => {
    graphEngine.stopAnimation();
    graphEngine.init();
    QuestionPromptsManager.showToast('그래프가 초기화되었습니다.', 'info');
  });

  // 11. 브라우저 로드 완료 시 강제 재렌더링
  window.addEventListener('load', () => {
    loadInitialState();
    graphEngine.init();
  });

  window.addEventListener('resize', () => graphEngine.resize());
});
