window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Weather = (function() {
    'use strict';

    const css = `
        <style>
            .st-weather-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: #4a90d9;
                color: #fff;
                font-family: var(--pt-font, -apple-system, sans-serif);
            }
            .st-weather-main {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .st-weather-location {
                font-size: 28px;
                font-weight: 500;
                margin-bottom: 5px;
            }
            .st-weather-condition {
                font-size: 18px;
                opacity: 0.9;
                margin-bottom: 20px;
            }
            .st-weather-icon {
                font-size: 72px;
                margin-bottom: 10px;
            }
            .st-weather-temp {
                font-size: 72px;
                font-weight: 200;
            }
            .st-weather-range {
                font-size: 18px;
                margin-top: 10px;
                opacity: 0.9;
            }
            
            .st-weather-details {
                background: rgba(255,255,255,0.2);
                border-radius: 20px;
                margin: 20px;
                padding: 15px;
            }
            .st-weather-detail-row {
                display: flex;
                justify-content: space-around;
                text-align: center;
            }
            .st-weather-detail-item {
                flex: 1;
            }
            .st-weather-detail-label {
                font-size: 12px;
                opacity: 0.8;
                margin-bottom: 5px;
            }
            .st-weather-detail-value {
                font-size: 18px;
                font-weight: 500;
            }
            
            .st-weather-forecast {
                background: rgba(255,255,255,0.2);
                border-radius: 20px;
                margin: 0 20px 30px;
                padding: 15px;
            }
            .st-forecast-title {
                font-size: 14px;
                opacity: 0.8;
                margin-bottom: 10px;
                padding-left: 5px;
            }
            .st-forecast-list {
                display: flex;
                justify-content: space-around;
            }
            .st-forecast-item {
                text-align: center;
            }
            .st-forecast-day {
                font-size: 13px;
                opacity: 0.8;
                margin-bottom: 5px;
            }
            .st-forecast-icon {
                font-size: 24px;
                margin-bottom: 5px;
            }
            .st-forecast-temp {
                font-size: 15px;
            }
        </style>
    `;

    const weatherTypes = [
        { icon: '☀️', condition: '맑음', bgGradient: 'linear-gradient(180deg, #4a90d9 0%, #87ceeb 100%)' },
        { icon: '⛅', condition: '구름 조금', bgGradient: 'linear-gradient(180deg, #6c9dc6 0%, #9bc5d9 100%)' },
        { icon: '☁️', condition: '흐림', bgGradient: 'linear-gradient(180deg, #8096a7 0%, #a8b9c5 100%)' },
        { icon: '🌧️', condition: '비', bgGradient: 'linear-gradient(180deg, #5a6d7a 0%, #78909c 100%)' },
        { icon: '⛈️', condition: '천둥번개', bgGradient: 'linear-gradient(180deg, #37474f 0%, #546e7a 100%)' },
        { icon: '🌨️', condition: '눈', bgGradient: 'linear-gradient(180deg, #90a4ae 0%, #cfd8dc 100%)' },
        { icon: '🌤️', condition: '대체로 맑음', bgGradient: 'linear-gradient(180deg, #5d9fd4 0%, #8ec8e8 100%)' }
    ];

    function getRandomWeather() {
        const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const temp = Math.floor(Math.random() * 30) - 5; // -5 ~ 25
        const high = temp + Math.floor(Math.random() * 5) + 2;
        const low = temp - Math.floor(Math.random() * 5) - 2;
        const humidity = Math.floor(Math.random() * 60) + 30;
        const wind = (Math.random() * 10).toFixed(1);
        const uv = Math.floor(Math.random() * 11);
        
        return { ...weather, temp, high, low, humidity, wind, uv };
    }

    function getForecast() {
        const days = ['일', '월', '화', '수', '목'];
        const today = new Date().getDay();
        
        return days.map((_, i) => {
            const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
            const dayIndex = (today + i) % 7;
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            return {
                day: i === 0 ? '오늘' : dayNames[dayIndex],
                icon: weather.icon,
                temp: Math.floor(Math.random() * 30) - 5
            };
        });
    }

    function open() {
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        const weather = getRandomWeather();
        const forecast = getForecast();

        const html = `
            ${css}
            <div class="st-weather-app" style="background: ${weather.bgGradient}">
                <div class="st-weather-main">
                    <div class="st-weather-location">서울특별시</div>
                    <div class="st-weather-condition">${weather.condition}</div>
                    <div class="st-weather-icon">${weather.icon}</div>
                    <div class="st-weather-temp">${weather.temp}°</div>
                    <div class="st-weather-range">최고: ${weather.high}° 최저: ${weather.low}°</div>
                </div>
                
                <div class="st-weather-details">
                    <div class="st-weather-detail-row">
                        <div class="st-weather-detail-item">
                            <div class="st-weather-detail-label">습도</div>
                            <div class="st-weather-detail-value">${weather.humidity}%</div>
                        </div>
                        <div class="st-weather-detail-item">
                            <div class="st-weather-detail-label">바람</div>
                            <div class="st-weather-detail-value">${weather.wind}m/s</div>
                        </div>
                        <div class="st-weather-detail-item">
                            <div class="st-weather-detail-label">자외선</div>
                            <div class="st-weather-detail-value">${weather.uv}</div>
                        </div>
                    </div>
                </div>
                
                <div class="st-weather-forecast">
                    <div class="st-forecast-title">5일 예보</div>
                    <div class="st-forecast-list">
                        ${forecast.map(f => `
                            <div class="st-forecast-item">
                                <div class="st-forecast-day">${f.day}</div>
                                <div class="st-forecast-icon">${f.icon}</div>
                                <div class="st-forecast-temp">${f.temp}°</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        $screen.append(html);
    }

    return { open };
})();