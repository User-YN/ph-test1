window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Games = (function() {
    'use strict';

    const css = `
        <style>
            .st-games-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: #1a1a2e;
                color: #fff;
                font-family: var(--pt-font, -apple-system, sans-serif);
            }
            .st-games-header {
                padding: 20px 20px 15px;
                text-align: center;
                flex-shrink: 0;
            }
            .st-games-title {
                font-size: 28px;
                font-weight: 700;
            }
            .st-games-menu {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                gap: 15px;
            }
            .st-game-card {
                width: 100%;
                max-width: 280px;
                background: rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 20px;
                text-align: center;
                cursor: pointer;
                transition: transform 0.2s, background 0.2s;
            }
            .st-game-card:hover {
                background: rgba(255,255,255,0.15);
                transform: scale(1.02);
            }
            .st-game-card-icon {
                font-size: 36px;
                margin-bottom: 10px;
            }
            .st-game-card-name {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 5px;
            }
            .st-game-card-desc {
                font-size: 13px;
                opacity: 0.7;
            }
            
            /* 숫자 맞추기 게임 */
            .st-number-game {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%;
                background: #24243e;
                display: flex; flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
                z-index: 1001;
            }
            .st-number-back {
                position: absolute;
                top: 15px; left: 15px;
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
            }
            .st-number-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .st-number-range {
                font-size: 14px;
                opacity: 0.7;
                margin-bottom: 30px;
            }
            .st-number-attempts {
                font-size: 16px;
                margin-bottom: 20px;
            }
            .st-number-input {
                width: 150px;
                padding: 15px;
                font-size: 24px;
                text-align: center;
                border: none;
                border-radius: 12px;
                background: rgba(255,255,255,0.1);
                color: white;
                outline: none;
                margin-bottom: 15px;
            }
            .st-number-input::placeholder { color: rgba(255,255,255,0.4); }
            .st-number-btn {
                padding: 15px 40px;
                border: none;
                border-radius: 25px;
                background: #6c5ce7;
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                margin-bottom: 20px;
            }
            .st-number-hint {
                font-size: 18px;
                padding: 15px 25px;
                border-radius: 12px;
                background: rgba(255,255,255,0.1);
                min-height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .st-number-hint.up { color: #fd79a8; }
            .st-number-hint.down { color: #74b9ff; }
            .st-number-hint.correct { color: #55efc4; }
            
            /* 가위바위보 */
            .st-rps-game {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%;
                background: #00b894;
                display: flex; flex-direction: column;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
                z-index: 1001;
            }
            .st-rps-score {
                display: flex;
                justify-content: space-around;
                width: 100%;
                margin: 30px 0;
            }
            .st-rps-score-item {
                text-align: center;
            }
            .st-rps-score-label {
                font-size: 14px;
                opacity: 0.8;
            }
            .st-rps-score-value {
                font-size: 36px;
                font-weight: 700;
            }
            .st-rps-vs {
                display: flex;
                justify-content: space-around;
                align-items: center;
                width: 100%;
                margin: 20px 0;
            }
            .st-rps-choice {
                font-size: 64px;
                width: 100px; height: 100px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
            }
            .st-rps-result {
                font-size: 24px;
                font-weight: 600;
                margin: 20px 0;
                min-height: 35px;
            }
            .st-rps-buttons {
                display: flex;
                gap: 20px;
                margin-top: 30px;
            }
            .st-rps-btn {
                font-size: 36px;
                background: rgba(255,255,255,0.2);
                border: none;
                width: 70px; height: 70px;
                border-radius: 50%;
                cursor: pointer;
                transition: transform 0.2s, background 0.2s;
            }
            .st-rps-btn:hover { background: rgba(255,255,255,0.3); }
            .st-rps-btn:active { transform: scale(0.95); }
        </style>
    `;

    function open() {
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        const html = `
            ${css}
            <div class="st-games-app">
                <div class="st-games-header">
                    <div class="st-games-title">🎮 미니게임</div>
                </div>
                <div class="st-games-menu">
                    <div class="st-game-card" data-game="number">
                        <div class="st-game-card-icon">🔢</div>
                        <div class="st-game-card-name">숫자 맞추기</div>
                        <div class="st-game-card-desc">1~100 사이의 숫자를 맞춰보세요!</div>
                    </div>
                    <div class="st-game-card" data-game="rps">
                        <div class="st-game-card-icon">✊</div>
                        <div class="st-game-card-name">가위바위보</div>
                        <div class="st-game-card-desc">AI와 가위바위보 대결!</div>
                    </div>
                </div>
            </div>
        `;

        $screen.append(html);

        $('.st-game-card').on('click', function() {
            const game = $(this).data('game');
            if (game === 'number') openNumberGame();
            else if (game === 'rps') openRPSGame();
        });
    }

    // 숫자 맞추기 게임
    let targetNumber = 0;
    let attempts = 0;

    function openNumberGame() {
        targetNumber = Math.floor(Math.random() * 100) + 1;
        attempts = 0;

        const html = `
            <div class="st-number-game" id="st-number-game">
                <button class="st-number-back" id="st-number-back">‹</button>
                <div class="st-number-title">🔢 숫자 맞추기</div>
                <div class="st-number-range">1 ~ 100 사이의 숫자</div>
                <div class="st-number-attempts" id="st-number-attempts">시도: 0회</div>
                <input type="number" class="st-number-input" id="st-number-input" placeholder="?" min="1" max="100">
                <button class="st-number-btn" id="st-number-guess">확인</button>
                <div class="st-number-hint" id="st-number-hint">숫자를 입력하세요</div>
            </div>
        `;

        $('.st-games-app').append(html);

        $('#st-number-back').on('click', () => {
            $('#st-number-game').remove();
        });

        $('#st-number-guess').on('click', checkGuess);
        $('#st-number-input').on('keypress', function(e) {
            if (e.which === 13) checkGuess();
        });
    }

    function checkGuess() {
        const guess = parseInt($('#st-number-input').val());
        if (isNaN(guess) || guess < 1 || guess > 100) {
            $('#st-number-hint').removeClass('up down correct').text('1~100 사이 숫자를 입력하세요');
            return;
        }

        attempts++;
        $('#st-number-attempts').text(`시도: ${attempts}회`);

        const $hint = $('#st-number-hint');
        
        if (guess === targetNumber) {
            $hint.removeClass('up down').addClass('correct').text(`🎉 정답! ${attempts}번 만에 맞췄어요!`);
            $('#st-number-guess').text('다시 하기').off('click').on('click', () => {
                $('#st-number-game').remove();
                openNumberGame();
            });
        } else if (guess < targetNumber) {
            $hint.removeClass('down correct').addClass('up').text('📈 더 큰 숫자입니다!');
        } else {
            $hint.removeClass('up correct').addClass('down').text('📉 더 작은 숫자입니다!');
        }

        $('#st-number-input').val('').focus();
    }

    // 가위바위보 게임
    let playerScore = 0;
    let cpuScore = 0;

    function openRPSGame() {
        playerScore = 0;
        cpuScore = 0;

        const html = `
            <div class="st-rps-game" id="st-rps-game">
                <button class="st-number-back" id="st-rps-back">‹</button>
                <div class="st-number-title">✊ 가위바위보</div>
                
                <div class="st-rps-score">
                    <div class="st-rps-score-item">
                        <div class="st-rps-score-label">나</div>
                        <div class="st-rps-score-value" id="st-rps-player">0</div>
                    </div>
                    <div class="st-rps-score-item">
                        <div class="st-rps-score-label">AI</div>
                        <div class="st-rps-score-value" id="st-rps-cpu">0</div>
                    </div>
                </div>
                
                <div class="st-rps-vs">
                    <div class="st-rps-choice" id="st-rps-my-choice">❓</div>
                    <span style="font-size:24px;">VS</span>
                    <div class="st-rps-choice" id="st-rps-cpu-choice">❓</div>
                </div>
                
                <div class="st-rps-result" id="st-rps-result"></div>
                
                <div class="st-rps-buttons">
                    <button class="st-rps-btn" data-choice="scissors">✌️</button>
                    <button class="st-rps-btn" data-choice="rock">✊</button>
                    <button class="st-rps-btn" data-choice="paper">🖐️</button>
                </div>
            </div>
        `;

        $('.st-games-app').append(html);

        $('#st-rps-back').on('click', () => {
            $('#st-rps-game').remove();
        });

        $('.st-rps-btn').on('click', function() {
            playRPS($(this).data('choice'));
        });
    }

    function playRPS(playerChoice) {
        const choices = ['scissors', 'rock', 'paper'];
        const icons = { scissors: '✌️', rock: '✊', paper: '🖐️' };
        const cpuChoice = choices[Math.floor(Math.random() * 3)];

        $('#st-rps-my-choice').text(icons[playerChoice]);
        $('#st-rps-cpu-choice').text(icons[cpuChoice]);

        let result = '';
        if (playerChoice === cpuChoice) {
            result = '무승부! 🤝';
        } else if (
            (playerChoice === 'rock' && cpuChoice === 'scissors') ||
            (playerChoice === 'scissors' && cpuChoice === 'paper') ||
            (playerChoice === 'paper' && cpuChoice === 'rock')
        ) {
            result = '승리! 🎉';
            playerScore++;
        } else {
            result = '패배... 😢';
            cpuScore++;
        }

        $('#st-rps-result').text(result);
        $('#st-rps-player').text(playerScore);
        $('#st-rps-cpu').text(cpuScore);
    }

    return { open };
})();