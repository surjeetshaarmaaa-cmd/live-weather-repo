/**
 * SkyPulse Weather Application Logic
 * Integrates high-precision weather forecasts, reverse geocoding,
 * dynamic theme shifting, 24h hourly projections, and 7-day extended forecasts.
 */

// ============================================================================
// State Management
// ============================================================================
const AppState = {
    unit: 'C', // 'C' or 'F'
    currentWeatherData: null,
    currentLocation: {
        name: 'New Delhi',
        region: 'Delhi',
        country: 'India',
        lat: 28.6139,
        lon: 77.2090
    },
    popularCitiesData: [
        { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
        { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
        { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
        { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708 },
        { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 }
    ]
};

// ============================================================================
// WMO Weather Interpretation Dictionary
// ============================================================================
const WMO_CODES = {
    0: { desc: 'Clear Sky', category: 'clear', iconDay: '☀️', iconNight: '🌙' },
    1: { desc: 'Mainly Clear', category: 'clear', iconDay: '🌤️', iconNight: '🌤️' },
    2: { desc: 'Partly Cloudy', category: 'clouds', iconDay: '⛅', iconNight: '☁️' },
    3: { desc: 'Overcast', category: 'clouds', iconDay: '☁️', iconNight: '☁️' },
    45: { desc: 'Foggy Mist', category: 'fog', iconDay: '🌫️', iconNight: '🌫️' },
    48: { desc: 'Depositing Rime Fog', category: 'fog', iconDay: '🌫️', iconNight: '🌫️' },
    51: { desc: 'Light Drizzle', category: 'rain', iconDay: '🌦️', iconNight: '🌧️' },
    53: { desc: 'Moderate Drizzle', category: 'rain', iconDay: '🌧️', iconNight: '🌧️' },
    55: { desc: 'Dense Drizzle', category: 'rain', iconDay: '🌧️', iconNight: '🌧️' },
    56: { desc: 'Light Freezing Drizzle', category: 'snow', iconDay: '🌧️', iconNight: '🌧️' },
    57: { desc: 'Dense Freezing Drizzle', category: 'snow', iconDay: '🌨️', iconNight: '🌨️' },
    61: { desc: 'Slight Rain', category: 'rain', iconDay: '🌦️', iconNight: '🌧️' },
    63: { desc: 'Moderate Rain', category: 'rain', iconDay: '🌧️', iconNight: '🌧️' },
    65: { desc: 'Heavy Rainstorm', category: 'rain', iconDay: '🌧️', iconNight: '🌧️' },
    66: { desc: 'Light Freezing Rain', category: 'snow', iconDay: '🌨️', iconNight: '🌨️' },
    67: { desc: 'Heavy Freezing Rain', category: 'snow', iconDay: '🌨️', iconNight: '🌨️' },
    71: { desc: 'Slight Snowfall', category: 'snow', iconDay: '🌨️', iconNight: '🌨️' },
    73: { desc: 'Moderate Snowfall', category: 'snow', iconDay: '❄️', iconNight: '❄️' },
    75: { desc: 'Heavy Snowfall', category: 'snow', iconDay: '❄️', iconNight: '❄️' },
    77: { desc: 'Snow Flurries', category: 'snow', iconDay: '❄️', iconNight: '❄️' },
    80: { desc: 'Light Showers', category: 'rain', iconDay: '🌦️', iconNight: '🌧️' },
    81: { desc: 'Moderate Showers', category: 'rain', iconDay: '🌧️', iconNight: '🌧️' },
    82: { desc: 'Violent Torrential Rain', category: 'rain', iconDay: '⛈️', iconNight: '⛈️' },
    85: { desc: 'Light Snow Showers', category: 'snow', iconDay: '🌨️', iconNight: '🌨️' },
    86: { desc: 'Heavy Snow Showers', category: 'snow', iconDay: '❄️', iconNight: '❄️' },
    95: { desc: 'Thunderstorm', category: 'thunderstorm', iconDay: '⛈️', iconNight: '⛈️' },
    96: { desc: 'Thunderstorm with Hail', category: 'thunderstorm', iconDay: '⛈️', iconNight: '⛈️' },
    99: { desc: 'Severe Thunderstorm & Hail', category: 'thunderstorm', iconDay: '⛈️', iconNight: '⛈️' }
};

// ============================================================================
// SVG Weather Graphic Generators
// ============================================================================
function getHeroSvgIllustration(category, isDay = 1) {
    if (!isDay && (category === 'clear' || category === 'clouds')) {
        return `
            <svg viewBox="0 0 100 100" width="100%" height="100%">
                <defs>
                    <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f8fafc" />
                        <stop offset="100%" stop-color="#94a3b8" />
                    </linearGradient>
                    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#818cf8" stop-opacity="0.6"/>
                        <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
                    </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="45" fill="url(#moonGlow)"/>
                <path d="M56 22 A30 30 0 1 0 78 68 A34 34 0 0 1 56 22 Z" fill="url(#moonGrad)"/>
                <circle cx="28" cy="24" r="1.5" fill="#ffffff" opacity="0.8"/>
                <circle cx="75" cy="20" r="2" fill="#ffffff" opacity="0.9"/>
                <circle cx="82" cy="40" r="1" fill="#ffffff" opacity="0.7"/>
            </svg>
        `;
    }

    switch (category) {
        case 'clear':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <defs>
                        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#fde047" stop-opacity="0.9"/>
                            <stop offset="40%" stop-color="#f59e0b" stop-opacity="0.7"/>
                            <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
                        </radialGradient>
                        <linearGradient id="sunCore" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#fef08a"/>
                            <stop offset="100%" stop-color="#f59e0b"/>
                        </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="44" fill="url(#sunGlow)"/>
                    <g stroke="#f59e0b" stroke-width="3" stroke-linecap="round">
                        <line x1="50" y1="12" x2="50" y2="4"/>
                        <line x1="50" y1="88" x2="50" y2="96"/>
                        <line x1="12" y1="50" x2="4" y2="50"/>
                        <line x1="88" y1="50" x2="96" y2="50"/>
                        <line x1="24" y1="24" x2="18" y2="18"/>
                        <line x1="76" y1="76" x2="82" y2="82"/>
                        <line x1="24" y1="76" x2="18" y2="82"/>
                        <line x1="76" y1="24" x2="82" y2="18"/>
                    </g>
                    <circle cx="50" cy="50" r="22" fill="url(#sunCore)"/>
                </svg>
            `;
        case 'clouds':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <defs>
                        <linearGradient id="cloudBack" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#93c5fd"/>
                            <stop offset="100%" stop-color="#60a5fa"/>
                        </linearGradient>
                        <linearGradient id="cloudFront" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="100%" stop-color="#cbd5e1"/>
                        </linearGradient>
                    </defs>
                    <path d="M40 32 a14 14 0 0 1 24 0 a11 11 0 0 1 11 11 a13 13 0 0 1 -10 13 l-28 0 a12 12 0 0 1 -6 -23 a14 14 0 0 1 9 -1 z" fill="url(#cloudBack)" opacity="0.6" transform="translate(10, -5) scale(0.9)"/>
                    <path d="M32 44 a16 16 0 0 1 30 0 a13 13 0 0 1 13 13 a16 16 0 0 1 -15 16 l-36 0 a15 15 0 0 1 -7 -28 a16 16 0 0 1 15 -1 z" fill="url(#cloudFront)"/>
                </svg>
            `;
        case 'rain':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <defs>
                        <linearGradient id="rainCloud" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#94a3b8"/>
                            <stop offset="100%" stop-color="#475569"/>
                        </linearGradient>
                    </defs>
                    <path d="M30 38 a16 16 0 0 1 30 0 a13 13 0 0 1 13 13 a16 16 0 0 1 -15 16 l-36 0 a15 15 0 0 1 -7 -28 a16 16 0 0 1 15 -1 z" fill="url(#rainCloud)"/>
                    <line x1="32" y1="74" x2="28" y2="86" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
                    <line x1="46" y1="74" x2="42" y2="86" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
                    <line x1="60" y1="74" x2="56" y2="86" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
                </svg>
            `;
        case 'thunderstorm':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <defs>
                        <linearGradient id="stormCloud" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#475569"/>
                            <stop offset="100%" stop-color="#1e293b"/>
                        </linearGradient>
                    </defs>
                    <path d="M30 34 a16 16 0 0 1 30 0 a13 13 0 0 1 13 13 a16 16 0 0 1 -15 16 l-36 0 a15 15 0 0 1 -7 -28 a16 16 0 0 1 15 -1 z" fill="url(#stormCloud)"/>
                    <polygon points="46,58 36,74 46,74 42,92 58,70 48,70" fill="#facc15" stroke="#eab308" stroke-width="1.5"/>
                </svg>
            `;
        case 'snow':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <defs>
                        <linearGradient id="snowCloud" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#cbd5e1"/>
                            <stop offset="100%" stop-color="#94a3b8"/>
                        </linearGradient>
                    </defs>
                    <path d="M30 38 a16 16 0 0 1 30 0 a13 13 0 0 1 13 13 a16 16 0 0 1 -15 16 l-36 0 a15 15 0 0 1 -7 -28 a16 16 0 0 1 15 -1 z" fill="url(#snowCloud)"/>
                    <circle cx="34" cy="78" r="3" fill="#ffffff"/>
                    <circle cx="48" cy="84" r="3" fill="#ffffff"/>
                    <circle cx="62" cy="78" r="3" fill="#ffffff"/>
                </svg>
            `;
        default:
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <line x1="20" y1="50" x2="80" y2="50" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
                    <line x1="28" y1="62" x2="72" y2="62" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
                    <line x1="16" y1="74" x2="84" y2="74" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
                </svg>
            `;
    }
}

// ============================================================================
// Temperature & Metric Converters
// ============================================================================
function formatTemp(celsiusVal) {
    if (celsiusVal === undefined || celsiusVal === null || isNaN(celsiusVal)) return '--';
    if (AppState.unit === 'F') {
        const fahrenheit = (celsiusVal * 9 / 5) + 32;
        return Math.round(fahrenheit);
    }
    return Math.round(celsiusVal);
}

function getWindCompass(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index] || 'N';
}

function getUVDescription(uv) {
    if (uv <= 2) return { text: 'Low', color: '#34d399' };
    if (uv <= 5) return { text: 'Moderate', color: '#fbbf24' };
    if (uv <= 7) return { text: 'High', color: '#f97316' };
    if (uv <= 10) return { text: 'Very High', color: '#ef4444' };
    return { text: 'Extreme', color: '#a855f7' };
}

// ============================================================================
// Core API Fetch Functions
// ============================================================================

/**
 * Searches city coordinates using Open-Meteo Free Geocoding API
 */
async function searchCityCoordinates(cityName) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Geocoding service unavailable');
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error(`No weather station found for "${cityName}". Please check the spelling.`);
    }
    return data.results[0];
}

/**
 * Fetches comprehensive live weather + hourly + 7-day forecast
 */
async function fetchFullForecast(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'weather_code',
            'cloud_cover',
            'surface_pressure',
            'wind_speed_10m',
            'wind_direction_10m'
        ].join(','),
        hourly: [
            'temperature_2m',
            'weather_code',
            'relative_humidity_2m',
            'wind_speed_10m'
        ].join(','),
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'sunrise',
            'sunset',
            'uv_index_max'
        ].join(','),
        timezone: 'auto'
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Forecast service encountered an issue.');
    }
    return await response.json();
}

/**
 * Optional RapidAPI Ninjas integration helper
 * Maintained for backward compatibility with user's initial setup
 */
async function fetchRapidApiNinjasWeather(city) {
    const url = `https://weather-by-api-ninjas.p.rapidapi.com/v1/weather?city=${encodeURIComponent(city)}`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': 'afab6be13fmshb79ff75db16ea32p1bc153jsne5e65d166d65',
            'x-rapidapi-host': 'weather-by-api-ninjas.p.rapidapi.com'
        }
    };
    try {
        const response = await fetch(url, options);
        if (response.ok) {
            return await response.json();
        }
    } catch (err) {
        console.warn('RapidAPI Ninjas fallback warning:', err);
    }
    return null;
}

// ============================================================================
// UI Renderers
// ============================================================================

function showStatusBanner(message, isError = true) {
    const banner = document.getElementById('statusBanner');
    const msg = document.getElementById('statusMessage');
    if (!banner || !msg) return;

    banner.className = `status-banner ${isError ? 'error' : 'info'}`;
    msg.textContent = message;
    banner.style.display = 'flex';
}

function hideStatusBanner() {
    const banner = document.getElementById('statusBanner');
    if (banner) banner.style.display = 'none';
}

/**
 * Render the main Hero Weather card and key parameters
 */
function renderCurrentWeather(forecast, location) {
    const current = forecast.current;
    const daily = forecast.daily;
    const code = current.weather_code;
    const isDay = current.is_day;
    const wmo = WMO_CODES[code] || { desc: 'Scattered Clouds', category: 'clouds', iconDay: '⛅', iconNight: '☁️' };

    // Set Atmospheric Theme on <body>
    if (!isDay) {
        document.body.setAttribute('data-weather', 'night');
    } else {
        document.body.setAttribute('data-weather', wmo.category);
    }

    // Hero Location & Condition
    const cityNameEl = document.getElementById('cityName');
    const locationCoordsEl = document.getElementById('locationCoords');
    const conditionIconMiniEl = document.getElementById('conditionIconMini');
    const conditionTextEl = document.getElementById('conditionText');
    const currentTempEl = document.getElementById('currentTemp');
    const tempUnitEl = document.getElementById('tempUnit');
    const feelsLikeValEl = document.getElementById('feelsLikeVal');
    const tempRangeValEl = document.getElementById('tempRangeVal');
    const weatherIconIllustrationEl = document.getElementById('weatherIconIllustration');
    const lastUpdatedValEl = document.getElementById('lastUpdatedVal');

    if (cityNameEl) cityNameEl.textContent = location.name;
    if (locationCoordsEl) {
        const regionStr = location.region ? `${location.region}, ` : '';
        const countryStr = location.country || '';
        locationCoordsEl.textContent = `${regionStr}${countryStr} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°)`;
    }

    if (conditionIconMiniEl) conditionIconMiniEl.textContent = isDay ? wmo.iconDay : wmo.iconNight;
    if (conditionTextEl) conditionTextEl.textContent = wmo.desc;
    if (currentTempEl) currentTempEl.textContent = formatTemp(current.temperature_2m);
    if (tempUnitEl) tempUnitEl.textContent = `°${AppState.unit}`;

    if (feelsLikeValEl) feelsLikeValEl.textContent = `${formatTemp(current.apparent_temperature)}°`;

    // Today's High and Low
    if (daily && daily.temperature_2m_max && daily.temperature_2m_min) {
        const maxToday = formatTemp(daily.temperature_2m_max[0]);
        const minToday = formatTemp(daily.temperature_2m_min[0]);
        if (tempRangeValEl) tempRangeValEl.textContent = `${maxToday}° / ${minToday}°`;
    }

    // Hero Illustration
    if (weatherIconIllustrationEl) {
        weatherIconIllustrationEl.innerHTML = getHeroSvgIllustration(wmo.category, isDay);
    }

    if (lastUpdatedValEl) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lastUpdatedValEl.textContent = timeStr;
    }

    // Atmospheric Metrics Grid
    const windValEl = document.getElementById('windVal');
    const windDirectionValEl = document.getElementById('windDirectionVal');
    const windProgressEl = document.getElementById('windProgress');
    if (windValEl) windValEl.innerHTML = `${Math.round(current.wind_speed_10m)} <small style="font-size:0.9rem">km/h</small>`;
    if (windDirectionValEl) windDirectionValEl.textContent = `Direction: ${getWindCompass(current.wind_direction_10m)} (${Math.round(current.wind_direction_10m)}°)`;
    if (windProgressEl) {
        const windPct = Math.min(100, (current.wind_speed_10m / 70) * 100);
        windProgressEl.style.width = `${windPct}%`;
    }

    const humidityValEl = document.getElementById('humidityVal');
    const humidityStateEl = document.getElementById('humidityState');
    const humidityProgressEl = document.getElementById('humidityProgress');
    if (humidityValEl) humidityValEl.textContent = `${current.relative_humidity_2m}%`;
    if (humidityStateEl) {
        const h = current.relative_humidity_2m;
        humidityStateEl.textContent = h < 30 ? 'Dry Atmosphere' : h < 60 ? 'Optimal Comfort' : 'High Moisture';
    }
    if (humidityProgressEl) humidityProgressEl.style.width = `${current.relative_humidity_2m}%`;

    const uvValEl = document.getElementById('uvVal');
    const uvCategoryEl = document.getElementById('uvCategory');
    const uvProgressEl = document.getElementById('uvProgress');
    if (daily && daily.uv_index_max && daily.uv_index_max[0] !== undefined) {
        const uv = daily.uv_index_max[0];
        const uvMeta = getUVDescription(uv);
        if (uvValEl) uvValEl.textContent = uv.toFixed(1);
        if (uvCategoryEl) {
            uvCategoryEl.textContent = uvMeta.text;
            uvCategoryEl.style.color = uvMeta.color;
        }
        if (uvProgressEl) {
            const uvPct = Math.min(100, (uv / 12) * 100);
            uvProgressEl.style.width = `${uvPct}%`;
            uvProgressEl.style.background = uvMeta.color;
        }
    }

    const pressureValEl = document.getElementById('pressureVal');
    const pressureProgressEl = document.getElementById('pressureProgress');
    if (pressureValEl) pressureValEl.innerHTML = `${Math.round(current.surface_pressure)} <small style="font-size:0.9rem">hPa</small>`;
    if (pressureProgressEl) {
        // Normal sea level is around 1013 hPa
        const pressurePct = Math.min(100, Math.max(10, ((current.surface_pressure - 960) / 80) * 100));
        pressureProgressEl.style.width = `${pressurePct}%`;
    }

    const precipValEl = document.getElementById('precipVal');
    const precipSubEl = document.getElementById('precipSub');
    const precipProgressEl = document.getElementById('precipProgress');
    if (precipValEl) precipValEl.innerHTML = `${current.precipitation.toFixed(1)} <small style="font-size:0.9rem">mm</small>`;
    if (precipSubEl) precipSubEl.textContent = current.precipitation > 0 ? 'Precipitation detected' : 'Zero precipitation';
    if (precipProgressEl) {
        const precipPct = Math.min(100, (current.precipitation / 15) * 100);
        precipProgressEl.style.width = `${precipPct}%`;
    }

    const cloudValEl = document.getElementById('cloudVal');
    const cloudProgressEl = document.getElementById('cloudProgress');
    if (cloudValEl) cloudValEl.textContent = `${current.cloud_cover}%`;
    if (cloudProgressEl) cloudProgressEl.style.width = `${current.cloud_cover}%`;

    // Sun and Daylight Cycle Arc
    renderSunDaylight(daily);
}

/**
 * Render Solar Arc and calculate daylight remaining
 */
function renderSunDaylight(daily) {
    if (!daily || !daily.sunrise || !daily.sunset) return;

    const sunriseStr = daily.sunrise[0];
    const sunsetStr = daily.sunset[0];

    const sunriseDate = new Date(sunriseStr);
    const sunsetDate = new Date(sunsetStr);
    const now = new Date();

    const formatOpts = { hour: '2-digit', minute: '2-digit', hour12: true };
    const sunriseValEl = document.getElementById('sunriseVal');
    const sunsetValEl = document.getElementById('sunsetVal');
    if (sunriseValEl) sunriseValEl.textContent = sunriseDate.toLocaleTimeString([], formatOpts);
    if (sunsetValEl) sunsetValEl.textContent = sunsetDate.toLocaleTimeString([], formatOpts);

    const sunDot = document.getElementById('sunDot');
    const sunArcFill = document.getElementById('sunArcFill');
    const statusText = document.getElementById('daylightStatusText');

    const totalDaylightMs = sunsetDate.getTime() - sunriseDate.getTime();
    const elapsedMs = now.getTime() - sunriseDate.getTime();

    let progress = elapsedMs / totalDaylightMs;
    progress = Math.max(0, Math.min(1, progress));

    const isDay = now >= sunriseDate && now <= sunsetDate;

    if (sunArcFill) {
        const pct = isDay ? (progress * 100) : 0;
        sunArcFill.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
    }

    if (sunDot) {
        // Position along an inverted semi-ellipse curve: y = 4 * h * x * (1 - x)
        const angle = progress * Math.PI;
        const xPercent = 8 + (progress * 84); // 8% to 92%
        const yPercent = 80 - (Math.sin(angle) * 60);

        sunDot.style.left = `${xPercent}%`;
        sunDot.style.top = isDay ? `${yPercent}%` : '85%';
        sunDot.style.opacity = isDay ? '1' : '0.35';
    }

    if (statusText) {
        if (now < sunriseDate) {
            const minUntil = Math.round((sunriseDate - now) / 60000);
            statusText.textContent = `Dawn approaches. Sunrise in ~${Math.floor(minUntil / 60)}h ${minUntil % 60}m.`;
        } else if (now > sunsetDate) {
            statusText.textContent = `Night mode active. The sun has set below the horizon.`;
        } else {
            const minRemaining = Math.round((sunsetDate - now) / 60000);
            statusText.textContent = `${Math.floor(minRemaining / 60)}h ${minRemaining % 60}m of daylight remaining until sunset.`;
        }
    }
}

/**
 * Render 24-Hour Hourly Forecast
 */
function renderHourlyForecast(hourly) {
    const container = document.getElementById('hourlyList');
    if (!container || !hourly || !hourly.time) return;

    container.innerHTML = '';
    const now = new Date();
    const currentHourISO = now.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

    // Find starting index matching current hour or closest
    let startIndex = hourly.time.findIndex(t => t.startsWith(currentHourISO));
    if (startIndex === -1) startIndex = 0;

    const next24 = hourly.time.slice(startIndex, startIndex + 24);

    next24.forEach((timeStr, idx) => {
        const realIdx = startIndex + idx;
        const hourDate = new Date(timeStr);
        const code = hourly.weather_code[realIdx];
        const wmo = WMO_CODES[code] || { desc: 'Clouds', category: 'clouds', iconDay: '⛅', iconNight: '☁️' };
        const temp = formatTemp(hourly.temperature_2m[realIdx]);
        const isCurrentHour = idx === 0;

        const timeLabel = isCurrentHour 
            ? 'Now' 
            : hourDate.toLocaleTimeString([], { hour: 'numeric', hour12: true });

        const card = document.createElement('div');
        card.className = `hourly-card glass-panel ${isCurrentHour ? 'active' : ''}`;
        card.innerHTML = `
            <span class="hourly-time">${timeLabel}</span>
            <span class="hourly-icon" style="font-size: 1.6rem;">${wmo.iconDay}</span>
            <span class="hourly-temp">${temp}°</span>
        `;
        container.appendChild(card);
    });
}

/**
 * Render 7-Day Extended Forecast
 */
function renderDailyForecast(daily) {
    const container = document.getElementById('dailyList');
    if (!container || !daily || !daily.time) return;

    container.innerHTML = '';

    // Calculate overall min and max across all 7 days for relative temp bars
    const allMax = Math.max(...daily.temperature_2m_max);
    const allMin = Math.min(...daily.temperature_2m_min);
    const range = Math.max(1, allMax - allMin);

    daily.time.forEach((dateStr, i) => {
        const date = new Date(dateStr + 'T00:00:00');
        const isToday = i === 0;
        const dayName = isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
        const code = daily.weather_code[i];
        const wmo = WMO_CODES[code] || { desc: 'Clear', category: 'clear', iconDay: '🌤️' };

        const maxTemp = formatTemp(daily.temperature_2m_max[i]);
        const minTemp = formatTemp(daily.temperature_2m_min[i]);

        // Percentage calculations for visual temp range bar
        const leftPct = Math.round(((daily.temperature_2m_min[i] - allMin) / range) * 100);
        const widthPct = Math.round(((daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / range) * 100);

        const row = document.createElement('div');
        row.className = 'daily-row';
        row.innerHTML = `
            <div class="daily-day-info">
                <span class="daily-icon" style="font-size: 1.3rem;">${wmo.iconDay}</span>
                <span class="daily-day-name">${dayName}</span>
            </div>
            <div class="daily-condition">${wmo.desc}</div>
            <div class="daily-temp-bar-container">
                <span class="daily-min">${minTemp}°</span>
                <div class="temp-bar">
                    <div class="temp-bar-fill" style="left: ${leftPct}%; width: ${Math.max(15, widthPct)}%;"></div>
                </div>
                <span class="daily-max">${maxTemp}°</span>
            </div>
        `;
        container.appendChild(row);
    });
}

/**
 * Render Popular Global Cities Showcase
 */
async function loadPopularCities() {
    const container = document.getElementById('globalCitiesList');
    if (!container) return;

    container.innerHTML = '';

    for (const city of AppState.popularCitiesData) {
        const cityItem = document.createElement('div');
        cityItem.className = 'city-mini-item';
        cityItem.innerHTML = `
            <div class="city-mini-info">
                <h4>${city.name}</h4>
                <span>${city.country}</span>
            </div>
            <div class="city-mini-stats">
                <span class="city-mini-icon" id="mini-icon-${city.name.replace(/\s+/g, '')}">⏳</span>
                <span class="city-mini-temp" id="mini-temp-${city.name.replace(/\s+/g, '')}">--°</span>
            </div>
        `;

        cityItem.addEventListener('click', () => {
            selectCity(city.name, city.lat, city.lon, '', city.country);
        });

        container.appendChild(cityItem);

        // Fetch city mini snapshot asynchronously
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,is_day`)
            .then(res => res.json())
            .then(data => {
                if (data && data.current) {
                    const temp = formatTemp(data.current.temperature_2m);
                    const code = data.current.weather_code;
                    const wmo = WMO_CODES[code] || { iconDay: '🌤️', iconNight: '🌙' };
                    const icon = data.current.is_day ? wmo.iconDay : wmo.iconNight;

                    const iconEl = document.getElementById(`mini-icon-${city.name.replace(/\s+/g, '')}`);
                    const tempEl = document.getElementById(`mini-temp-${city.name.replace(/\s+/g, '')}`);
                    if (iconEl) iconEl.textContent = icon;
                    if (tempEl) tempEl.textContent = `${temp}°`;
                }
            })
            .catch(() => {
                // Silently keep default placeholder
            });
    }
}

// ============================================================================
// Controller & User Actions
// ============================================================================

/**
 * Coordinates fetching, error handling, and visual rendering for a location
 */
async function loadWeatherData(lat, lon, cityName, region = '', country = '') {
    hideStatusBanner();

    // Show loading shimmer
    const heroCard = document.getElementById('heroWeatherCard');
    if (heroCard) heroCard.classList.add('loading-shimmer');

    try {
        const forecast = await fetchFullForecast(lat, lon);
        AppState.currentWeatherData = forecast;
        AppState.currentLocation = { name: cityName, region, country, lat, lon };

        renderCurrentWeather(forecast, AppState.currentLocation);
        renderHourlyForecast(forecast.hourly);
        renderDailyForecast(forecast.daily);
    } catch (err) {
        console.error('Weather load error:', err);
        showStatusBanner(`Could not load weather for "${cityName}": ${err.message}`, true);
    } finally {
        if (heroCard) heroCard.classList.remove('loading-shimmer');
    }
}

/**
 * Search city by name with geocoding
 */
async function searchAndLoadCity(cityName) {
    if (!cityName || !cityName.trim()) return;

    showStatusBanner(`Locating atmospheric data for "${cityName}"...`, false);
    try {
        const geo = await searchCityCoordinates(cityName.trim());
        await loadWeatherData(geo.latitude, geo.longitude, geo.name, geo.admin1 || '', geo.country || '');
        hideStatusBanner();
    } catch (err) {
        showStatusBanner(err.message, true);
    }
}

/**
 * Handle direct city click selection
 */
function selectCity(name, lat, lon, region, country) {
    const input = document.getElementById('cityInput');
    if (input) input.value = name;
    loadWeatherData(lat, lon, name, region, country);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Device GPS Geolocation
 */
function handleUseMyLocation() {
    if (!navigator.geolocation) {
        showStatusBanner('Geolocation is not supported by your browser.', true);
        return;
    }

    showStatusBanner('Locating your current coordinates...', false);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Reverse geocode or display coordinates
            let detectedName = 'My Location';
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${lat.toFixed(2)},${lon.toFixed(2)}&count=1`);
                const data = await res.json();
                if (data.results && data.results[0]) {
                    detectedName = data.results[0].name;
                }
            } catch {
                // Fall back to My Location
            }

            await loadWeatherData(lat, lon, detectedName, '', 'Local Area');
            hideStatusBanner();
        },
        (error) => {
            let msg = 'Unable to retrieve location.';
            if (error.code === error.PERMISSION_DENIED) {
                msg = 'Location permission was denied. You can search any city in the search bar above.';
            }
            showStatusBanner(msg, true);
        },
        { timeout: 10000 }
    );
}

/**
 * Toggle Temperature Units (°C <-> °F)
 */
function toggleTemperatureUnit() {
    AppState.unit = AppState.unit === 'C' ? 'F' : 'C';

    const unitBtnText = document.getElementById('unitBtnText');
    if (unitBtnText) {
        unitBtnText.textContent = `Display: °${AppState.unit}`;
    }

    // Re-render current weather with converted units without refetching
    if (AppState.currentWeatherData) {
        renderCurrentWeather(AppState.currentWeatherData, AppState.currentLocation);
        renderHourlyForecast(AppState.currentWeatherData.hourly);
        renderDailyForecast(AppState.currentWeatherData.daily);
    }
    loadPopularCities();
}

/**
 * Digital Header Clock
 */
function initClock() {
    const clockEl = document.getElementById('headerClock');
    function update() {
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }
    update();
    setInterval(update, 1000);
}

// ============================================================================
// Initialization & Event Listeners
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Start Header Clock
    initClock();

    // Attach Search Form Listener
    const searchForm = document.getElementById('searchForm');
    const cityInput = document.getElementById('cityInput');
    if (searchForm && cityInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            searchAndLoadCity(cityInput.value);
        });
    }

    // Attach GPS Button Listener
    const locateBtn = document.getElementById('locateBtn');
    if (locateBtn) {
        locateBtn.addEventListener('click', handleUseMyLocation);
    }

    // Attach Unit Toggle Listener
    const unitToggleBtn = document.getElementById('unitToggleBtn');
    if (unitToggleBtn) {
        unitToggleBtn.addEventListener('click', toggleTemperatureUnit);
    }

    // Close Status Banner Button
    const closeStatusBtn = document.getElementById('closeStatusBtn');
    if (closeStatusBtn) {
        closeStatusBtn.addEventListener('click', hideStatusBanner);
    }

    // Quick City Filter Chips
    const quickChips = document.querySelectorAll('.quick-chip');
    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cityName = chip.getAttribute('data-city');
            if (cityName) {
                if (cityInput) cityInput.value = cityName;
                searchAndLoadCity(cityName);
            }
        });
    });

    // Populate Global Cities Spotlight
    loadPopularCities();

    // Default Initial Weather Load (New Delhi)
    loadWeatherData(
        AppState.currentLocation.lat,
        AppState.currentLocation.lon,
        AppState.currentLocation.name,
        AppState.currentLocation.region,
        AppState.currentLocation.country
    );
});