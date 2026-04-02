/* ============================================
   보쌈런 - 메인 애플리케이션 로직
   ============================================ */

/** 구글 앱스 스크립트 웹앱 URL */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzNmqkp394pNPjWoAuL20vGFOArpYoasvfDZYhogK3r9N6RAWoRhSQPTsV6D5uiJ8FYCw/exec';

// =============================================
// 1. localStorage 유틸리티 함수
// =============================================

/**
 * 데이터를 localStorage에 저장하는 함수
 * @param {string} key - 저장 키
 * @param {*} value - 저장할 값 (자동으로 JSON 직렬화)
 */
function saveData(key, value) {
  try {
    localStorage.setItem(`bossam_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

/**
 * localStorage에서 데이터를 불러오는 함수
 * @param {string} key - 불러올 키
 * @returns {*} 파싱된 데이터 또는 null
 */
function loadData(key) {
  try {
    const raw = localStorage.getItem(`bossam_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('localStorage 읽기 실패:', e);
    return null;
  }
}


// =============================================
// 2. 페이지 라우팅 시스템
// =============================================

/** 현재 활성화된 페이지 번호 */
let currentPage = 0;

/**
 * 특정 페이지로 이동하는 라우팅 함수
 * - 모든 .page 요소를 숨기고 대상 페이지만 표시
 * - 현재 페이지 번호를 localStorage에 저장
 * - Page 0이 아닌 경우 뒤로가기 버튼 표시
 * @param {number} pageId - 이동할 페이지 번호 (0~15)
 */
function navigateTo(pageId) {
  // 모든 페이지 비활성화
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));

  // 대상 페이지 활성화
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
    currentPage = pageId;
    saveData('currentPage', pageId);

    // 뒤로가기 버튼 표시/숨김
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
      // Page 0, 메인 앱, 미션 상세에서는 숨김
      const hiddenPages = [0, 'main', 'mission-detail'];
      btnBack.classList.toggle('hidden', hiddenPages.includes(pageId));
    }

    // 메인 앱 진입 시 초기화
    if (pageId === 'main') {
      initMainApp();
    }

    // 특정 페이지 진입 시 초기화 로직 실행
    onPageEnter(pageId);
  }
}

/**
 * 이전 페이지로 돌아가는 함수
 */
function goBack() {
  if (currentPage > 0) {
    navigateTo(currentPage - 1);
  }
}

/**
 * 페이지 진입 시 실행되는 콜백
 * - 각 페이지별 초기화 로직 분기
 * @param {number} pageId - 진입한 페이지 번호
 */
function onPageEnter(pageId) {
  switch (pageId) {
    case 5:
      restoreTeamName();
      break;
    case 6:
      restoreMembers();
      break;
    case 7:
      renderQuestionInputs('foods', 'q-food-list', '예: 피자, 삼겹살, 보쌈...');
      break;
    case 8:
      renderQuestionInputs('superpowers', 'q-superpower-list', '예: 순간이동, 투명인간...');
      break;
    case 9:
      renderQuestionInputs('money', 'q-money-list', '예: 맛있는 거 사먹기, 저축...');
      break;
    case 10:
      renderQuestionInputs('stress', 'q-stress-list', '예: 코인노래방, 수면...');
      break;
    case 17:
      showBalanceResult();
      break;
  }
}


// =============================================
// 3. 팀명 입력 (Page 5)
// =============================================

/**
 * 팀명 input의 입력 이벤트 핸들러
 * - 입력값이 있으면 [다음] 버튼 활성화
 */
function onTeamNameInput() {
  const input = document.getElementById('team-name-input');
  const btn = document.getElementById('btn-team-next');
  btn.disabled = !input.value.trim();
}

/**
 * 팀명을 localStorage에 저장하고 다음 페이지로 이동
 */
function saveTeamName() {
  const input = document.getElementById('team-name-input');
  const name = input.value.trim();
  if (name) {
    saveData('teamName', name);
    navigateTo(6);
  }
}

/**
 * 저장된 팀명을 input에 복원
 */
function restoreTeamName() {
  const saved = loadData('teamName');
  if (saved) {
    const input = document.getElementById('team-name-input');
    input.value = saved;
    onTeamNameInput(); // 버튼 상태 갱신
  }
}


// =============================================
// 4. 팀원 추가 (Page 6)
// =============================================

/** 팀원 카운터 (고유 ID용) */
let memberCounter = 0;

/**
 * 팀원 input 항목을 하나 추가하는 함수
 * @param {string} [name=''] - 미리 채울 이름 (복원 시 사용)
 */
function addMember(name = '') {
  memberCounter++;
  const list = document.getElementById('member-list');
  const item = document.createElement('div');
  item.className = 'member-item';
  item.setAttribute('data-id', memberCounter);
  item.innerHTML = `
    <span class="member-number">${list.children.length + 1}</span>
    <input type="text" class="input-field" placeholder="이름 입력"
      value="${name}" oninput="onMemberInput()">
    <button class="btn-remove" onclick="removeMember(this)" title="삭제">✕</button>
  `;
  list.appendChild(item);
  // 새로 추가된 input에 포커스 (복원 시에는 제외)
  if (!name) {
    item.querySelector('input').focus();
  }
}

/**
 * 팀원 input 항목 삭제
 * @param {HTMLElement} btn - 삭제 버튼 요소
 */
function removeMember(btn) {
  const item = btn.closest('.member-item');
  item.remove();
  // 번호 재정렬
  reorderMemberNumbers();
  onMemberInput();
}

/**
 * 팀원 번호를 1부터 순서대로 재정렬
 */
function reorderMemberNumbers() {
  const items = document.querySelectorAll('#member-list .member-item');
  items.forEach((item, idx) => {
    item.querySelector('.member-number').textContent = idx + 1;
  });
}

/**
 * 팀원 입력 변경 시 호출 (현재는 추가 검증 없음)
 */
function onMemberInput() {
  // 필요 시 추가 유효성 검사
}

/**
 * 팀원 목록을 저장하고, 성향 파악 인트로(6-5)로 이동
 */
function saveMembersAndNext() {
  const list = document.getElementById('member-list');
  const inputs = list.querySelectorAll('.input-field');
  const members = [];
  inputs.forEach(input => {
    const val = input.value.trim();
    if (val) members.push(val);
  });

  if (members.length === 0) {
    alert('최소 1명 이상의 팀원을 입력해주세요!');
    return;
  }

  saveData('members', members);

  // 성향파악 인트로 페이지로 이동 (id: 66)
  navigateTo(66);
}

/**
 * 저장된 팀원 목록을 복원
 */
function restoreMembers() {
  const list = document.getElementById('member-list');
  list.innerHTML = '';
  memberCounter = 0;

  const saved = loadData('members');
  if (saved && saved.length > 0) {
    saved.forEach(name => addMember(name));
  } else {
    // 최소 1개 빈 입력창 제공
    addMember();
  }
}


// =============================================
// 5. 팀원별 질문 입력 (Page 7~10)
// =============================================

/**
 * 팀원별 질문 input을 렌더링
 * @param {string} storageKey - localStorage 저장 키
 * @param {string} listId - 렌더링 컨테이너 ID
 * @param {string} placeholder - 힌트 텍스트
 */
function renderQuestionInputs(storageKey, listId, placeholder) {
  const members = loadData('members') || [];
  const savedData = loadData(storageKey) || {};
  const list = document.getElementById(listId);
  list.innerHTML = '';

  members.forEach((name) => {
    const item = document.createElement('div');
    item.className = 'food-item'; // CSS 스타일 재사용
    const savedValue = savedData[name] || '';
    item.innerHTML = `
      <div class="food-member-name">
        ${name} <span>님의 답변</span>
      </div>
      <input type="text" class="input-field" placeholder="${placeholder}"
        data-member="${name}" value="${savedValue}">
    `;
    list.appendChild(item);
  });
}

/**
 * 팀원별 응답 데이터를 저장하고 다음 페이지로 이동
 */
function saveQuestionAndNext(storageKey, listId, nextPageId) {
  const inputs = document.querySelectorAll(`#${listId} .input-field`);
  const dataMap = {};
  inputs.forEach(input => {
    const member = input.getAttribute('data-member');
    dataMap[member] = input.value.trim();
  });
  saveData(storageKey, dataMap);
  navigateTo(nextPageId);
}


// =============================================
// 6. 밸런스 게임 (Page 8~12)
// =============================================

/** 밸런스 게임 선택 결과 배열 (A 또는 B, 5문항) */
let balanceAnswers = [];

/**
 * 밸런스 게임에서 선택지를 고르는 함수
 * @param {number} questionIdx - 질문 인덱스 (0~4)
 * @param {string} choice - 선택값 ('A' 또는 'B')
 */
function selectBalance(questionIdx, choice) {
  balanceAnswers[questionIdx] = choice;
  saveData('balanceAnswers', balanceAnswers);

  // 다음 페이지로 자동 전환 (약간의 딜레이로 피드백 제공)
  const nextPage = 12 + questionIdx + 1;
  setTimeout(() => {
    navigateTo(nextPage);
  }, 200);
}


// =============================================
// 7. 밸런스 게임 결과 (Page 13)
// =============================================

/**
 * 밸런스 게임 결과를 계산하고 화면에 표시
 */
function showBalanceResult() {
  const answers = loadData('balanceAnswers') || balanceAnswers;
  let aCount = 0;
  let bCount = 0;

  answers.forEach(ans => {
    if (ans === 'A') aCount++;
    else if (ans === 'B') bCount++;
  });

  const emojiEl = document.getElementById('result-emoji');
  const typeEl = document.getElementById('result-type');
  const descEl = document.getElementById('result-desc');

  if (aCount > bCount) {
    // A가 많으면 행동파
    emojiEl.textContent = '🔥';
    typeEl.textContent = '행동파';
    descEl.textContent = '일단 부딪히는 스타일! 빠른 실행력과 추진력이 강점입니다. 새로운 도전을 두려워하지 않아요!';
  } else if (bCount > aCount) {
    // B가 많으면 계획파
    emojiEl.textContent = '🧠';
    typeEl.textContent = '계획파';
    descEl.textContent = '꼼꼼하게 준비하는 스타일! 치밀한 계획과 분석이 강점입니다. 안정적으로 목표를 달성해요!';
  } else {
    // 동점
    emojiEl.textContent = '⚖️';
    typeEl.textContent = '밸런스파';
    descEl.textContent = '행동과 계획의 완벽한 균형! 상황에 따라 유연하게 대처하는 만능 타입입니다!';
  }

  // 결과 카드 애니메이션
  const card = document.getElementById('result-card');
  card.classList.remove('fade-in');
  // reflow 트리거 후 애니메이션 재시작
  void card.offsetWidth;
  card.classList.add('fade-in');

  // ★ 밸런스 결과 산출 즉시 구글 시트로 팀 데이터 전체 전송
  sendTeamInfoToSheet(typeEl.textContent);
}

/**
 * 팀 전체 정보(팀명, 인원, 팀원명단, 작성한 답변들, 밸런스 성향)를 모아 구글 시트로 전송 (GAS 호출)
 * @param {string} resultType 계산된 밸런스 성향(행동파, 계획파 등)
 * @param {boolean} isManual 수동 전송 여부 (alert 알림용)
 */
function sendTeamInfoToSheet(resultType, isManual = false) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === '여기에_앱스스크립트_URL을_넣으세요') {
    if (isManual) alert("구글 앱스 스크립트 URL이 설정되지 않았습니다.");
    return;
  }

  const teamName = loadData('teamName') || '미정';
  const members = loadData('members') || [];
  const foods = loadData('foods') || {};
  const superpowers = loadData('superpowers') || {};
  const money = loadData('money') || {};
  const stress = loadData('stress') || {};

  const payload = {
    type: 'teamInfo',
    teamName: teamName,
    members: members,
    resultType: resultType,
    foods: foods,
    superpowers: superpowers,
    money: money,
    stress: stress
  };

  if (isManual) {
    const btn = document.getElementById('btn-sync-sheet');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '전송 중... ⏳';
    }
  }

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
    .then(res => res.text())
    .then(text => {
      console.log('팀 정보 시트 전송 성공:', text);
      if (isManual) {
        alert("✅ 팀 정보가 구글 시트에 성공적으로 저장되었습니다!");
        const btn = document.getElementById('btn-sync-sheet');
        if (btn) { btn.disabled = false; btn.textContent = '구글 시트로 팀 데이터 전송 (동기화)'; }
      }
    })
    .catch(err => {
      console.error('팀 정보 시트 전송 실패:', err);
      if (isManual) {
        alert("🚨 전송 실패: 앱스 스크립트 권한 문제이거나 네트워크 오류입니다. 구글 시트 접근 권한을 확인해주세요.");
        const btn = document.getElementById('btn-sync-sheet');
        if (btn) { btn.disabled = false; btn.textContent = '다시 전송 시도하기'; }
      }
    });
}


// =============================================
// 8. 퀴즈 (Page 15)
// =============================================

/** 정답 인덱스 (0-based): "팀워크와 협동이 핵심이다" → 1번 */
const QUIZ_CORRECT_INDEX = 1;

/** 현재 선택된 퀴즈 답 인덱스 */
let selectedQuizIndex = -1;

/**
 * 퀴즈 선택지를 고르는 함수
 * @param {number} idx - 선택한 보기 인덱스 (0~3)
 */
function selectQuiz(idx) {
  selectedQuizIndex = idx;
  const options = document.querySelectorAll('#quiz-options .quiz-option');
  const feedback = document.getElementById('quiz-feedback');
  const btn = document.getElementById('btn-quiz-next');

  // 모든 선택지 초기화
  options.forEach(opt => {
    opt.classList.remove('selected', 'correct', 'wrong');
  });

  // 피드백 초기화 (shake 애니메이션 재트리거용)
  feedback.classList.remove('wrong', 'correct');
  void feedback.offsetWidth;

  // 선택한 항목 표시
  options[idx].classList.add('selected');

  // 정답 여부 판단
  if (idx === QUIZ_CORRECT_INDEX) {
    // 정답!
    options[idx].classList.add('correct');
    feedback.textContent = '정답입니다! 🎉';
    feedback.classList.add('correct');
    btn.disabled = false;
  } else {
    // 오답 - 다시 풀라는 피드백
    options[idx].classList.add('wrong');
    feedback.textContent = '다시 풀어보세요! 🙈';
    feedback.classList.add('wrong');
    btn.disabled = true;
  }
}

/**
 * 미션 시작 버튼 클릭 시 → 메인 앱으로 이동
 */
function onMissionStart() {
  navigateTo('main');
}


// =============================================
// 9. 팀 단체사진 업로드 (Page 8)
// =============================================

/**
 * 사진 선택 시 미리보기 표시 및 버튼 활성화
 */
function onPhotoSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('photo-placeholder');
    const btnRetake = document.getElementById('btn-retake');
    const btnNext = document.getElementById('btn-photo-next');

    // 미리보기 표시
    preview.src = e.target.result;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    btnRetake.style.display = 'inline-flex';
    btnNext.disabled = false;

    // localStorage에 이미지 데이터 저장
    saveData('teamPhoto', e.target.result);
  };
  reader.readAsDataURL(file);
}

/**
 * 사진 다시 찍기
 */
function retakePhoto() {
  const input = document.getElementById('team-photo-input');
  const preview = document.getElementById('photo-preview');
  const placeholder = document.getElementById('photo-placeholder');
  const btnRetake = document.getElementById('btn-retake');
  const btnNext = document.getElementById('btn-photo-next');

  // 초기화
  input.value = '';
  preview.src = '';
  preview.style.display = 'none';
  placeholder.style.display = 'flex';
  btnRetake.style.display = 'none';
  btnNext.disabled = true;
}

/**
 * 사진 저장 후 구글 클라우드 전송 및 다음 페이지로 이동
 */
function savePhotoAndNext() {
  const teamPhotoBase64 = loadData('teamPhoto');
  if (!teamPhotoBase64) {
    navigateTo(12);
    return;
  }

  const btnNext = document.getElementById('btn-photo-next');
  if (btnNext) {
    btnNext.disabled = true;
    btnNext.textContent = '사진 전송 중... ⏳';
  }

  const teamName = loadData('teamName') || '알수없는팀';
  const fileName = `${teamName}_단체인증샷.jpeg`;
  const base64Data = teamPhotoBase64.split('base64,')[1] || '';

  if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== '여기에_앱스스크립트_URL을_넣으세요') {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        fileName: fileName,
        mimeType: 'image/jpeg',
        data: base64Data
      })
    })
      .then(res => res.text())
      .then(text => {
        if (btnNext) btnNext.textContent = '다음';
        navigateTo(12);
      })
      .catch(err => {
        console.error('단체사진 업로드 실패:', err);
        // 실패하더라도 다음 진행 및 팀 탭에는 로컬 사진으로 표시됨
        if (btnNext) btnNext.textContent = '다음';
        navigateTo(12);
      });
  } else {
    setTimeout(() => {
      navigateTo(12);
    }, 500);
  }
}


// =============================================
// 10. 메인 앱 - 탭 네비게이션
// =============================================

/**
 * 탭 전환 함수
 * @param {string} tabName - 'mission' | 'map' | 'team'
 */
function switchTab(tabName) {
  // 모든 탭 뷰 비활성화
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

  // 선택 탭 활성화
  const view = document.getElementById(`tab-${tabName}`);
  const item = document.querySelector(`.tab-item[data-tab="${tabName}"]`);
  if (view) view.classList.add('active');
  if (item) item.classList.add('active');

  // 탭별 초기화
  if (tabName === 'mission') renderMissionGrid();
  if (tabName === 'map') updateMapMarkers();
  if (tabName === 'team') renderTeamView();
}


// =============================================
// 11. 미션 탭 - 6분할 그리드
// =============================================

/** 미션 데이터 (6개) */
const MISSIONS = [
  { id: 1, emoji: '🔍', image: 'm1.png', name: '세라 돼지의 버킷리스트', detailTitle: '<span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">재열 돼지의 버킷리스트</span><br><span style="font-size: 26px; font-weight: 800; line-height: 1.4; display: inline-block; margin-top: 4px; color: var(--text-primary);">우리, 진짜 친해진 거 맞지?</span>', desc: '내 버킷리스트는 바로 \'눈빛만 봐도 통하는 진짜 팀\'을 만나보는 거야!<br>너희끼리 꽤 친해졌니? 내가 직접 아주 날카롭게 테스트해 볼게.<br>자신 있다면 하단 [지도] 탭을 열고 내가 있는 곳으로 찾아와!', answer: '보쌈' },
  { id: 2, emoji: '🧩', images: ['m2_1.png', 'm2_2.png', 'm2_3.png', 'm2_4.png'], name: '현정 돼지의 버킷리스트', detailTitle: '<span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">형빈 돼지의 버킷리스트</span><br><span style="font-size: 26px; font-weight: 800; line-height: 1.4; display: inline-block; margin-top: 4px; color: var(--text-primary);">우리만의 기발한 레전드 인증샷</span>', desc: '내 버킷리스트는  \'레전드급 한 장면\'을 만드는 거야!<br>그냥 남들 다 하는 뻔한 인증샷은 재미없잖아?<br>위에 사진을 참고해서 너희만의 기발한 포즈를 보여줘.', type: 'photo', answer: '사진제출' },
  { id: 3, emoji: '🔍', images: ['m3_1.png', 'm3_2.png', 'm3_3.png', 'm3_4.png'], name: '소영 돼지의 버킷리스트', detailTitle: '<span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">유라 돼지의 버킷리스트</span><br><span style="font-size: 26px; font-weight: 800; line-height: 1.4; display: inline-block; margin-top: 4px; color: var(--text-primary);">흩어진 메시지를 찾아라!</span>', desc: '내 버킷리스트는 바로 \'보물 같은 문장을 완성하는 것\'이지.<br>사진의 표지판을 찾아 분홍 글자를 조합해 단어를 완성해<br>[지도] 탭에 표시된 구역으로 가서 눈을 크게 뜨고 찾아봐!', answer: '사랑하자' },
  { id: 4, emoji: '🎵', image: 'm4.png', name: '현수 돼지의 버킷리스트', detailTitle: '<span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">지현 돼지의 버킷리스트</span><br><span style="font-size: 26px; font-weight: 800; line-height: 1.4; display: inline-block; margin-top: 4px; color: var(--text-primary);">마음의 거리만큼은 0cm</span>', desc: '내 버킷리스트는 \'서로의 호흡까지 맞추는 완벽한 팀\'을 만나는 거야.<br>너희가 얼마나 서로를 믿고 의지하는지 테스트해 볼게.<br>작은 물병 하나를 밀어낼 때도 서로의 믿음이 필요해.', answer: '꿈드림' },
  { id: 5, emoji: '🏃', image: 'm5.png', name: '재열 돼지의 버킷리스트', detailTitle: '<span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">현정 돼지의 버킷리스트</span><br><span style="font-size: 26px; font-weight: 800; line-height: 1.4; display: inline-block; margin-top: 4px; color: var(--text-primary);">숨겨진 행운을 찾아라!</span>', desc: '내 버킷리스트는 바로 \'보물 같은 행운을 함께 하는 것\'이야.<br>비밀 QR코드들을 숨겨놨어, 단 하나만이 진짜 보물을 품고 있지!<br>진짜 QR코드를 찾아 스캔하면, 마지막 선물이 나타날 거야.', type: 'qr', answer: 'QR스캔' },
  { id: 6, emoji: '🎁', image: 'm6.png', name: '희완 돼지의 버킷리스트', detailTitle: '<span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">희완 돼지의 버킷리스트</span><br><span style="font-size: 26px; font-weight: 800; line-height: 1.4; display: inline-block; margin-top: 4px; color: var(--text-primary);">너를 칭찬해!</span>', desc: '내 버킷리스트는 \'서로를 칭찬하는 것\'이야.<br>지금 바로 노원구 꿈드림 센터 지하 1층으로 내려가 봐.<br>\'칭찬카드\'에 따뜻한 칭찬을 정성껏 적어서 상자에 넣어줘.', answer: '보쌈런' },
];

/** 현재 열려있는 미션 번호 (상세 페이지용) */
let currentMissionId = 0;

/**
 * 미션 그리드를 렌더링 (currentMissionStep 기반 잠금/활성)
 */
function renderMissionGrid() {
  const step = loadData('currentMissionStep') || 1;
  const grid = document.getElementById('mission-grid');
  grid.innerHTML = '';

  MISSIONS.forEach(m => {
    const card = document.createElement('div');
    card.className = 'mission-card';

    if (m.id < step) {
      // 클리어
      card.classList.add('cleared');
      card.innerHTML = `
        <span class="mission-badge" style="z-index:10;">✅</span>
        <div class="mission-img-wrap">
          <img src="mi${m.id}.png" alt="미션 아이콘" class="mission-grid-image">
        </div>
        <div class="mission-name-wrap">
          <span class="mission-name">${m.name}</span>
        </div>
      `;
      card.onclick = () => openMissionDetail(m.id);
    } else if (m.id === step) {
      // 현재 미션
      card.classList.add('current');
      card.innerHTML = `
        <span class="mission-badge" style="z-index:10;">▶️</span>
        <div class="mission-img-wrap">
          <img src="mi${m.id}.png" alt="미션 아이콘" class="mission-grid-image">
        </div>
        <div class="mission-name-wrap">
          <span class="mission-name">${m.name}</span>
        </div>
      `;
      card.onclick = () => openMissionDetail(m.id);
    } else {
      // 잠긴 미션
      card.classList.add('locked');
      card.innerHTML = `
        <span class="mission-badge" style="z-index:10;">🔒</span>
        <div class="mission-img-wrap">
          <img src="mi${m.id}.png" alt="미션 아이콘" class="mission-grid-image" style="filter:grayscale(100%); opacity:0.6;">
        </div>
        <div class="mission-name-wrap">
          <span class="mission-name">${m.name}</span>
        </div>
      `;
    }

    grid.appendChild(card);
  });
}


// =============================================
// 12. 미션 상세 페이지
// =============================================

/**
 * 미션 상세 페이지 열기
 * @param {number} missionId - 미션 번호 (1~6)
 */
function openMissionDetail(missionId) {
  currentMissionId = missionId;
  const mission = MISSIONS.find(m => m.id === missionId);
  if (!mission) return;

  const step = loadData('currentMissionStep') || 1;

  // 상세 페이지 내용 채움
  // 상세 페이지 내용 채움
  const displayTitle = mission.detailTitle ? mission.detailTitle : mission.name;

  const imageContainer = document.getElementById('mission-detail-image');
  if (mission.images && mission.images.length > 0) {
    let sliderHtml = '<div class="mission-image-slider-wrapper" style="position: relative; width: 100%; height: 100%;">';
    sliderHtml += '<div class="mission-image-slider">';
    mission.images.forEach(img => {
      sliderHtml += `<img src="${img}" alt="미션 슬라이드 이미지" class="slider-img">`;
    });
    sliderHtml += '</div>';
    sliderHtml += '<div class="swipe-hint" style="position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px); color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; pointer-events: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);"><span>❮</span> 옆으로 밀어서 보기 <span>❯</span></div>';
    sliderHtml += '</div>';

    imageContainer.innerHTML = sliderHtml;
    imageContainer.style.background = 'linear-gradient(145deg, #F0F8FF, #E6F3FF)';
  } else if (mission.image) {
    imageContainer.innerHTML = `<img src="${mission.image}" alt="미션 이미지" style="width:100%; height:100%; object-fit:contain; padding: 20px;">`;
    imageContainer.style.background = 'linear-gradient(145deg, #F0F8FF, #E6F3FF)';
  } else {
    imageContainer.innerHTML = `<span style="font-size: 64px;" id="mission-detail-emoji">${mission.emoji}</span>`;
    imageContainer.style.background = 'linear-gradient(145deg, #F0F8FF, #FFF5F7)';
  }

  document.getElementById('mission-detail-title').innerHTML = displayTitle;
  document.getElementById('mission-detail-desc').innerHTML = mission.desc;

  // 정답 입력 영역 (클리어된 텍스트 미션은 숨김, 사진/QR 미션은 항상 표시)
  const answerArea = document.querySelector('.mission-answer-area');
  if (missionId < step && mission.type !== 'photo' && mission.type !== 'qr') {
    answerArea.style.display = 'none';
  } else {
    answerArea.style.display = 'block';
  }

  // 입력창, 피드백 초기화 (HTML 동적 생성)
  if (mission.type === 'photo') {
    answerArea.innerHTML = `
      <div class="photo-submit-row" style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:10px;">
          <label class="btn-primary" style="flex:1; background:#f0f0f8; color:var(--text-primary); text-align:center; padding:12px; border-radius:12px; cursor:pointer;">
            <input type="file" accept="image/*" id="mission-photo-input" onchange="onMissionPhotoSelected(event)" hidden>
            📁 사진 선택
          </label>
          <button class="btn-primary blue" id="btn-mission-submit" disabled style="width: 100px; flex-shrink: 0;" onclick="submitMissionPhoto()">제출하기</button>
        </div>
        <div id="mission-photo-preview-container" style="display:none; text-align:center; padding-top:8px;">
          <img id="mission-photo-preview" src="" style="width:100px; height:100px; object-fit:cover; border-radius: 8px; border:2px solid var(--border-color);">
        </div>
      </div>
      <div id="answer-feedback" class="answer-feedback"></div>
    `;
  } else if (mission.type === 'qr') {
    answerArea.innerHTML = `
      <div class="qr-submit-row" style="display:flex; justify-content:center; padding: 10px 0;">
        <button class="btn-primary" style="background:#FFD1DA; color:#FFFFFF; font-size:18px; padding:16px 32px; border-radius:30px; width:100%; box-shadow:0 4px 12px rgba(255, 209, 218, 0.4);" onclick="startQrScanner()">
          QR 코드 스캔하기
        </button>
      </div>
      <div id="answer-feedback" class="answer-feedback"></div>
    `;
  } else {
    answerArea.innerHTML = `
      <div class="answer-input-row" style="display: flex; gap: 10px;">
        <input type="text" class="input-field" id="mission-answer-input" placeholder="정답을 입력하세요" style="flex: 1;">
        <button class="btn-primary blue" style="width: 80px; flex-shrink: 0;" onclick="checkMissionAnswer()">확인</button>
      </div>
      <div id="answer-feedback" class="answer-feedback"></div>
    `;
    const input = document.getElementById('mission-answer-input');
    if (input) input.value = '';
  }

  const feedback = document.getElementById('answer-feedback');
  if (feedback) {
    feedback.textContent = '';
    feedback.className = 'answer-feedback';
  }

  // 페이지 이동 (뒤로가기 버튼 숨김)
  navigateTo('mission-detail');
  const btnBack = document.getElementById('btn-back');
  if (btnBack) btnBack.classList.add('hidden');
}

/**
 * 미션 상세 닫고 메인으로 복귀
 */
function closeMissionDetail() {
  navigateTo('main');
  switchTab('mission');
}

/**
 * 미션 사진 선택 시 미리보기 표시 및 제출 활성화
 */
let currentMissionPhotoBase64 = '';

function onMissionPhotoSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    currentMissionPhotoBase64 = e.target.result;
    const preview = document.getElementById('mission-photo-preview');
    const container = document.getElementById('mission-photo-preview-container');
    const btnSubmit = document.getElementById('btn-mission-submit');

    if (preview && container && btnSubmit) {
      preview.src = e.target.result;
      container.style.display = 'block';
      btnSubmit.disabled = false;
    }
  };
  reader.readAsDataURL(file);
}

/**
 * 미션 사진 구글 클라우드 제출
 */

/**
 * 미션 사진 구글 클라우드 제출
 */
function submitMissionPhoto() {
  if (!currentMissionPhotoBase64) return;

  const btnSubmit = document.getElementById('btn-mission-submit');
  const feedback = document.getElementById('answer-feedback');
  const mission = MISSIONS.find(m => m.id === currentMissionId);

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = '제출 중...';
  }
  if (feedback) {
    feedback.textContent = '사진을 제출하는 중입니다... ⏳';
    feedback.className = 'answer-feedback';
  }

  // 데이터 추출
  const base64Data = currentMissionPhotoBase64.split('base64,')[1] || '';
  const teamName = loadData('teamName') || '알수없는팀';
  const fileName = `${teamName}_미션${currentMissionId}_인증샷.jpeg`;

  // 구글 앱스 스크립트 URL이 아직 세팅되지 않았다면 (테스트용 바로 성공)
  if (GOOGLE_SCRIPT_URL === '여기에_앱스스크립트_URL을_넣으세요') {
    setTimeout(() => {
      onMissionPhotoSuccess(mission);
    }, 1500);
    return;
  }

  // GAS로 POST 전송
  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({
      fileName: fileName,
      mimeType: 'image/jpeg',
      data: base64Data
    })
  })
    .then(res => res.text())
    .then(text => {
      onMissionPhotoSuccess(mission);
    })
    .catch(err => {
      console.error('업로드 실패:', err);
      if (feedback) {
        feedback.textContent = '업로드에 실패했습니다. 다시 시도해주세요 😢';
        feedback.className = 'answer-feedback wrong';
      }
      if (btnSubmit) btnSubmit.disabled = false;
    });
}

function onMissionPhotoSuccess(mission) {
  const feedback = document.getElementById('answer-feedback');
  if (feedback) {
    feedback.textContent = '제출 완료! 🎉';
    feedback.className = 'answer-feedback correct';
  }

  // currentMissionStep 증가
  const step = loadData('currentMissionStep') || 1;
  if (currentMissionId === step) {
    saveData('currentMissionStep', step + 1);
  }

  // 이미 클리어한 미션도 다시 제출할 수 있도록 버튼 재활성 및 텍스트 변경
  const btnSubmit = document.getElementById('btn-mission-submit');
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.textContent = '다시 제출하기';
  }

  // 축하 팝업
  setTimeout(() => showCongratsPopup(mission), 800);
}

/**
 * 미션 정답 확인
 */
function checkMissionAnswer() {
  const input = document.getElementById('mission-answer-input');
  const feedback = document.getElementById('answer-feedback');
  const mission = MISSIONS.find(m => m.id === currentMissionId);
  if (!mission) return;

  const userAnswer = input.value.trim();
  if (!userAnswer) {
    feedback.textContent = '정답을 입력해주세요!';
    feedback.className = 'answer-feedback wrong';
    return;
  }

  let isCorrect = false;

  // 정답 판별
  if (currentMissionId === 1) {
    // 1번 미션: 설정한 팀명이 정답
    const teamName = loadData('teamName') || '';
    if (userAnswer === teamName) {
      isCorrect = true;
    }
  } else {
    // 그 외 미션: 지정된 answer와 일치
    if (userAnswer === mission.answer) {
      isCorrect = true;
    }
  }

  if (isCorrect) {
    // 정답!
    feedback.textContent = '정답입니다! 🎉';
    feedback.className = 'answer-feedback correct';

    // currentMissionStep 증가
    const step = loadData('currentMissionStep') || 1;
    if (currentMissionId === step) {
      saveData('currentMissionStep', step + 1);
    }

    // 축하 팝업
    setTimeout(() => showCongratsPopup(mission), 500);
  } else {
    // 오답
    feedback.textContent = '틀렸어요! 다시 도전해보세요 💪';
    feedback.className = 'answer-feedback wrong';
    input.value = '';
    input.focus();
  }
}

/**
 * 축하 팝업 표시
 * @param {object} mission - 클리어한 미션 객체
 */
function showCongratsPopup(mission) {
  const step = loadData('currentMissionStep') || 1;
  const isLastMission = step > MISSIONS.length;

  const overlay = document.createElement('div');
  overlay.className = 'congrats-overlay';
  overlay.innerHTML = `
    <div class="congrats-card">
      <div class="congrats-emoji">🎉</div>
      <h3 class="congrats-title">미션 클리어!</h3>
      <p class="congrats-desc">"${mission.name}" 미션을 완료했어요!${isLastMission ? '<br>🏆 모든 미션을 클리어했습니다!' : ''}</p>
      <button class="congrats-btn" onclick="closeCongratsPopup()">확인</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

/**
 * 축하 팝업 닫기 → 미션 탭으로
 */
function closeCongratsPopup() {
  const overlay = document.querySelector('.congrats-overlay');
  if (overlay) overlay.remove();
  navigateTo('main');
  switchTab('mission');
}


// =============================================
// 13. 지도 탭 - 마커 하이라이트
// =============================================

/**
 * 지도 마커를 현재 미션 단계에 맞게 업데이트
 */
function updateMapMarkers() {
  const step = loadData('currentMissionStep') || 1;

  for (let i = 1; i <= 6; i++) {
    const marker = document.getElementById(`map-marker-${i}`);
    if (!marker) continue;

    marker.classList.remove('cleared', 'current', 'locked');

    if (i < step) {
      marker.classList.add('cleared');
    } else if (i === step) {
      marker.classList.add('current');
    } else {
      marker.classList.add('locked');
    }
  }
}


// =============================================
// 14. 팀 탭 - 데이터 렌더링
// =============================================

/**
 * 팀 뷰 렌더링 (localStorage 데이터 기반)
 */
function renderTeamView() {
  const teamName = loadData('teamName') || '미정';
  const members = loadData('members') || [];
  const foods = loadData('foods') || {};
  const superpowers = loadData('superpowers') || {};
  const money = loadData('money') || {};
  const stress = loadData('stress') || {};
  const answers = loadData('balanceAnswers') || [];
  const photo = loadData('teamPhoto');

  // 팀 사진 배너
  const banner = document.getElementById('team-photo-banner');
  if (photo) {
    banner.innerHTML = `<img src="${photo}" alt="팀 단체사진" style="width:100%; height:100%; object-fit:cover; display:block;">`;
  } else {
    banner.innerHTML = `<div class="team-photo-placeholder">📸 팀 사진</div>`;
  }

  // 밸런스 결과 계산
  let aCount = 0, bCount = 0;
  answers.forEach(a => { if (a === 'A') aCount++; else if (a === 'B') bCount++; });

  let resultEmoji, resultType, badgeClass;
  if (aCount > bCount) {
    resultEmoji = '🔥'; resultType = '행동파'; badgeClass = 'action';
  } else if (bCount > aCount) {
    resultEmoji = '🧠'; resultType = '계획파'; badgeClass = 'plan';
  } else {
    resultEmoji = '⚖️'; resultType = '밸런스파'; badgeClass = 'balance';
  }

  // 팀원 일람 (표 형식)
  let tableRows = '';
  members.forEach((name, idx) => {
    const food = foods[name] || '-';
    const power = superpowers[name] || '-';
    const mon = money[name] || '-';
    const str = stress[name] || '-';

    tableRows += `
      <tr>
        <td style="font-weight:700; color:var(--text-primary); text-align:center;">${name}</td>
        <td>${food}</td>
        <td>${power}</td>
        <td>${mon}</td>
        <td>${str}</td>
      </tr>
    `;
  });

  const membersHtml = `
    <div style="overflow-x:auto;">
      <table class="team-table">
        <thead>
          <tr>
            <th style="min-width:60px;">이름</th>
            <th>🍕 막끼</th>
            <th>⚡ 능력</th>
            <th>💰 5만</th>
            <th>😤 풀기</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  // 팀 정보 영역 렌더링 (가로 구조 컴팩트화)
  const area = document.getElementById('team-info-area');
  area.innerHTML = `
    <div class="team-overview-row">
      <div class="team-overview-item">
        <div class="to-label">팀 이름</div>
        <div class="to-value">${teamName}</div>
      </div>
      <div class="team-overview-item">
        <div class="to-label">팀 성향</div>
        <div class="to-value"><span class="team-result-badge small ${badgeClass}">${resultEmoji} ${resultType}</span></div>
      </div>
    </div>

    <div class="team-card" style="margin-top:10px;">
      <div class="team-card-label" style="display:flex; justify-content:space-between; align-items:center;">
        <span>팀원 상세 정보</span>
        <span style="font-weight:700; color:var(--point-blue); background:#E6F3FF; padding:2px 8px; border-radius:12px;">${members.length}명</span>
      </div>
      <div class="team-card-list">${members.length > 0 ? membersHtml : '<p style="color:var(--text-muted);">등록된 팀원이 없습니다.</p>'}</div>
    </div>
  `;
}


// =============================================
// 14. 지도 탭 기능
// =============================================

function updateMapMarkers() {
  const step = loadData('currentMissionStep') || 1;
  const mapImg = document.getElementById('current-mission-map');

  if (mapImg) {
    if (step >= 1 && step <= 6) {
      mapImg.src = `map_${step}.png`;
    } else {
      mapImg.src = 'map_0.png';
    }
  }
}

function openFullMap() {
  const modal = document.getElementById('full-map-modal');
  if (modal) modal.style.display = 'flex';
}

function closeFullMap() {
  const modal = document.getElementById('full-map-modal');
  if (modal) modal.style.display = 'none';
}

// =============================================
// 15. 메인 페이지 진입 시 초기화
// =============================================

/**
 * 메인 앱 진입 시 초기화
 */
function initMainApp() {
  // 미션 진행 상태 초기화 (없으면 1로)
  if (!loadData('currentMissionStep')) {
    saveData('currentMissionStep', 1);
  }
  // 기본 탭 = 미션
  switchTab('mission');
}


// =============================================
// 16. 앱 초기화
// =============================================

/**
 * DOM 로드 완료 시 초기화 실행
 */
document.addEventListener('DOMContentLoaded', function () {
  // 저장된 밸런스 답변 복원
  const savedBalanceAnswers = loadData('balanceAnswers');
  if (savedBalanceAnswers) {
    balanceAnswers = savedBalanceAnswers;
  }

  // 저장된 마지막 페이지로 복원
  const savedPage = loadData('currentPage');
  if (savedPage !== null && savedPage !== undefined) {
    navigateTo(savedPage);
    // 메인 진입 시 탭 초기화
    if (savedPage === 'main') {
      initMainApp();
    }
  } else {
    navigateTo(0);
  }
});

// =============================================
// 17. QR 코드 스캐너 로직 (미션 5)
// =============================================
let html5QrCode = null;

/**
 * QR 스캐너 모달 열기
 * - html5-qrcode 라이브러리 사용
 * - 후면 카메라 우선 시도, 실패 시 전면 카메라
 */
function startQrScanner() {
  const modal = document.getElementById('qr-scanner-modal');
  if (!modal) { alert('QR 스캐너 화면이 로드되지 않았습니다.'); return; }
  modal.style.display = 'flex';

  // 이전 인스턴스 전설 제거
  const readerEl = document.getElementById('qr-reader');
  if (readerEl) readerEl.innerHTML = '';

  html5QrCode = new Html5Qrcode('qr-reader');

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  // 후면 카메라 우선
  html5QrCode.start({ facingMode: 'environment' }, config, onScanSuccess)
    .catch(() => {
      // 후면 안되면 전면 카메라 시도
      html5QrCode.start({ facingMode: 'user' }, config, onScanSuccess)
        .catch(err => {
          console.error('카메라 시작 실패:', err);
          alert('카메라 철근 권한이 필요하거나 기기에서 카메라를 지원하지 않습니다.');
          closeQrScanner();
        });
    });
}

function onScanSuccess(decodedText) {
  // 스캔 있어 즈시 중지
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      closeQrScanner();
      handleQrResult(decodedText);
    }).catch(err => {
      console.error('스캐너 정지 오류:', err);
      closeQrScanner();
      handleQrResult(decodedText);
    });
  }
}

function closeQrScanner() {
  const modal = document.getElementById('qr-scanner-modal');
  if (modal) modal.style.display = 'none';

  if (html5QrCode) {
    try {
      if (html5QrCode.isScanning) html5QrCode.stop();
    } catch (e) { }
    html5QrCode = null;
  }
  // DOM을 초기화하여 다음에 다시 열 수 있게 함
  const readerEl = document.getElementById('qr-reader');
  if (readerEl) readerEl.innerHTML = '';
}

function handleQrResult(text) {
  const resultModal = document.getElementById('qr-result-modal');
  const resultMsg = document.getElementById('qr-result-msg');
  const resultImg = document.getElementById('qr-result-img');

  if (!resultModal || !resultMsg || !resultImg) return;

  if (text === '2026 보쌈런 1') {
    resultMsg.innerHTML = '<span style="font-size:22px; font-weight:800; color:var(--point-blue);">미션을 클리어했습니다! 🎉</span>';
    resultImg.src = 'm5_1.png';
    // 미션 완료 처리
    const step = loadData('currentMissionStep') || 1;
    if (currentMissionId === step) {
      saveData('currentMissionStep', step + 1);
    }
    const mission = MISSIONS.find(m => m.id === currentMissionId);
    if (mission) setTimeout(() => showCongratsPopup(mission), 2000);
  } else if (text === '2026 보쌈런 2') {
    resultMsg.innerHTML = '아쉽네요!<br>다른 QR을 찾아보세요. 😅';
    resultImg.src = 'm5_2.png';
  } else if (text === '2026 보쌈런 3') {
    resultMsg.innerHTML = '아쉽네요!<br>다른 QR을 찾아보세요. 😅';
    resultImg.src = 'm5_3.png';
  } else if (text === '2026 보쌈런 4') {
    resultMsg.innerHTML = '아쉽네요!<br>다른 QR을 찾아보세요. 😅';
    resultImg.src = 'm5_4.png';
  } else if (text === '2026 보쌈런 5') {
    resultMsg.innerHTML = '아쉽네요!<br>다른 QR을 찾아보세요. 😅';
    resultImg.src = 'm5_5.png';
  } else if (text === '2026 보쌈런 6') {
    resultMsg.innerHTML = '아쉽네요!<br>다른 QR을 찾아보세요. 😅';
    resultImg.src = 'm5_6.png';
  } else {
    resultMsg.innerHTML = '유효하지 않은 QR 코드입니다.<br>보쌈런 전용 QR을 찾아주세요!';
    resultImg.src = '';
  }

  resultModal.style.display = 'flex';
}

function closeQrResult() {
  const modal = document.getElementById('qr-result-modal');
  if (modal) modal.style.display = 'none';
  renderMissionGrid();
}
