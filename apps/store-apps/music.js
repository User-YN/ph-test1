window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Music = (function() {
    'use strict';

    const css = `
        <style>
            .st-music-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: #1a1a2e;
                color: #fff;
                font-family: var(--pt-font, -apple-system, sans-serif);
            }
            .st-music-header {
                padding: 20px 20px 15px;
                text-align: center;
                flex-shrink: 0;
            }
            .st-music-title {
                font-size: 18px;
                font-weight: 600;
            }
            
            .st-music-player {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .st-music-cover {
                width: 220px; height: 220px;
                border-radius: 20px;
                background: #9b59b6;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 60px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                margin-bottom: 30px;
            }
            .st-music-info {
                text-align: center;
                margin-bottom: 30px;
            }
            .st-music-song {
                font-size: 22px;
                font-weight: 600;
                margin-bottom: 5px;
            }
            .st-music-artist {
                font-size: 16px;
                opacity: 0.7;
            }
            
            .st-music-progress {
                width: 100%;
                max-width: 300px;
                margin-bottom: 20px;
            }
            .st-music-progress-bar {
                height: 4px;
                background: rgba(255,255,255,0.2);
                border-radius: 2px;
                position: relative;
                cursor: pointer;
            }
            .st-music-progress-fill {
                height: 100%;
                background: #fff;
                border-radius: 2px;
                width: 35%;
                transition: width 0.3s;
            }
            .st-music-times {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                opacity: 0.6;
                margin-top: 8px;
            }
            
            .st-music-controls {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 30px;
                margin-bottom: 30px;
            }
            .st-music-btn {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                transition: transform 0.1s, opacity 0.2s;
            }
            .st-music-btn:active { transform: scale(0.95); }
            .st-music-btn.small { font-size: 24px; opacity: 0.7; }
            .st-music-btn.play {
                width: 70px; height: 70px;
                border-radius: 50%;
                background: #fff;
                color: #1a1a2e;
                font-size: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .st-music-playlist {
                background: rgba(255,255,255,0.1);
                border-radius: 20px 20px 0 0;
                padding: 20px 15px 50px;
                max-height: 200px;
                overflow-y: auto;
            }
            .st-playlist-title {
                font-size: 14px;
                opacity: 0.6;
                margin-bottom: 10px;
            }
            .st-playlist-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .st-playlist-item:hover { background: rgba(255,255,255,0.1); }
            .st-playlist-item.active { background: rgba(255,255,255,0.15); }
            .st-playlist-icon {
                width: 40px; height: 40px;
                border-radius: 8px;
                background: #9b59b6;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
            }
            .st-playlist-info { flex: 1; }
            .st-playlist-song { font-size: 15px; font-weight: 500; }
            .st-playlist-artist { font-size: 13px; opacity: 0.6; }
        </style>
    `;

    const playlist = [
        { title: '별빛 속의 밤', artist: '가상 아티스트', duration: '3:45' },
        { title: '너에게로', artist: '드림 밴드', duration: '4:12' },
        { title: '봄날의 기억', artist: '사랑해요', duration: '3:28' },
        { title: '파도처럼', artist: 'Ocean Blue', duration: '5:01' },
        { title: '우리의 시간', artist: 'Time Travelers', duration: '3:55' }
    ];

    let currentIndex = 0;
    let isPlaying = false;

    function open() {
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        const current = playlist[currentIndex];

        const html = `
            ${css}
            <div class="st-music-app">
                <div class="st-music-header">
                    <div class="st-music-title">지금 재생 중</div>
                </div>
                
                <div class="st-music-player">
                    <div class="st-music-cover">🎵</div>
                    <div class="st-music-info">
                        <div class="st-music-song" id="st-music-song">${current.title}</div>
                        <div class="st-music-artist" id="st-music-artist">${current.artist}</div>
                    </div>
                    
                    <div class="st-music-progress">
                        <div class="st-music-progress-bar" id="st-music-bar">
                            <div class="st-music-progress-fill" id="st-music-fill"></div>
                        </div>
                        <div class="st-music-times">
                            <span id="st-music-current">1:18</span>
                            <span id="st-music-total">${current.duration}</span>
                        </div>
                    </div>
                    
                    <div class="st-music-controls">
                        <button class="st-music-btn small" id="st-music-prev">⏮️</button>
                        <button class="st-music-btn play" id="st-music-play">${isPlaying ? '⏸️' : '▶️'}</button>
                        <button class="st-music-btn small" id="st-music-next">⏭️</button>
                    </div>
                </div>
                
                <div class="st-music-playlist">
                    <div class="st-playlist-title">재생목록</div>
                    ${playlist.map((song, i) => `
                        <div class="st-playlist-item ${i === currentIndex ? 'active' : ''}" data-index="${i}">
                            <div class="st-playlist-icon">🎵</div>
                            <div class="st-playlist-info">
                                <div class="st-playlist-song">${song.title}</div>
                                <div class="st-playlist-artist">${song.artist}</div>
                            </div>
                            <span style="opacity:0.5;font-size:13px;">${song.duration}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        $screen.append(html);
        attachListeners();
    }

    function attachListeners() {
        $('#st-music-play').on('click', function() {
            isPlaying = !isPlaying;
            $(this).text(isPlaying ? '⏸️' : '▶️');
            if (isPlaying) {
                toastr.info(`🎵 재생 중: ${playlist[currentIndex].title}`);
            }
        });

        $('#st-music-prev').on('click', function() {
            currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
            updatePlayer();
        });

        $('#st-music-next').on('click', function() {
            currentIndex = (currentIndex + 1) % playlist.length;
            updatePlayer();
        });

        $('.st-playlist-item').on('click', function() {
            currentIndex = $(this).data('index');
            isPlaying = true;
            updatePlayer();
            toastr.info(`🎵 재생 중: ${playlist[currentIndex].title}`);
        });
    }

    function updatePlayer() {
        const current = playlist[currentIndex];
        $('#st-music-song').text(current.title);
        $('#st-music-artist').text(current.artist);
        $('#st-music-total').text(current.duration);
        $('#st-music-play').text(isPlaying ? '⏸️' : '▶️');
        
        $('.st-playlist-item').removeClass('active');
        $(`.st-playlist-item[data-index="${currentIndex}"]`).addClass('active');
    }

    return { open };
})();