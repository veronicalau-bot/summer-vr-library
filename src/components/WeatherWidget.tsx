import { useEffect, useState } from 'react'

interface WeatherData {
  temp: number
  tempStation: string
  humidity: number
  humidityStation: string
  uv: string
  uvStation: string
  icon: number
  desc: string
  updateTime: string
}

const HKO_API = '/hko-weather/weather.php?dataType=rhrread&lang=tc'
const UPDATE_INTERVAL = 12 * 60 * 1000 // 12 minutes

const HKO_ATTRIBUTION = '資料來源：香港天文台'

// Simple weather icon mapping (HKO icon code → emoji)
// HKO icon codes: 50-59 cloudy, 60-69 rain, 70-79 thunderstorm, 80-89 fog, 50-90+ others
const getWeatherEmoji = (code: number): string => {
  if (code >= 50 && code <= 59) return '☁️'
  if (code >= 60 && code <= 69) return '🌧️'
  if (code >= 70 && code <= 79) return '⛈️'
  if (code >= 80 && code <= 89) return '🌫️'
  if (code >= 90) return '🌬️'
  return '☀️'
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [visible, setVisible] = useState(true)

  const fetchWeather = async () => {
    try {
      const res = await fetch(HKO_API)
      if (!res.ok) throw new Error('Weather fetch failed')

      const data = await res.json()

      const tempData = data.temperature?.data?.find((d: any) =>
        d.place?.includes('香港天文台') || d.place?.includes('Observatory')
      )
      const humidData = data.humidity?.data?.find((d: any) =>
        d.place?.includes('香港天文台') || d.place?.includes('Observatory')
      )
      const uvData = data.uvindex?.data?.[0]

      const temp = tempData?.value ?? 0
      const tempStation = tempData?.place ?? '—'
      const humidity = humidData?.value ?? 0
      const humidityStation = humidData?.place ?? '—'
      const uv = uvData?.value ?? '-'
      const uvStation = uvData?.place ?? '—'
      const icon = Array.isArray(data.icon) ? data.icon[0] : (data.icon ?? 60)
      const desc = Array.isArray(data.iconDescription) ? data.iconDescription[0] : (data.iconDescription ?? '晴朗')
      const updateTime = data.updateTime ?? new Date().toISOString()

      setWeather({ temp, tempStation, humidity, humidityStation, uv, uvStation, icon, desc, updateTime })
    } catch (err) {
      console.warn('[WeatherWidget] Failed to fetch HKO weather:', err)
    }
  }

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, UPDATE_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (!visible || !weather) return null

  return (
    <div className={`weather-widget${expanded ? ' expanded' : ''}`}>
      <button
        className="weather-main"
        onClick={() => setExpanded(!expanded)}
        aria-label="切換天氣詳情"
      >
        <span className="weather-icon">{getWeatherEmoji(weather.icon)}</span>
        <span className="weather-temp">{weather.temp}°C</span>
        <span className="weather-desc">{weather.desc}</span>
      </button>

      {expanded && (
        <div className="weather-details">
          <div className="weather-row">
            <span>💧 濕度</span>
            <span>{weather.humidity}% <span className="station">（{weather.humidityStation}）</span></span>
          </div>
          <div className="weather-row">
            <span>☀️ UV 指數</span>
            <span>{weather.uv} <span className="station">（{weather.uvStation}）</span></span>
          </div>
          <div className="weather-row">
            <span>🕒 更新</span>
            <span>{new Date(weather.updateTime).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="weather-attribution">{HKO_ATTRIBUTION}</div>
        </div>
      )}

      <button
        className="weather-close"
        onClick={() => setVisible(false)}
        aria-label="關閉天氣小工具"
      >
        ✕
      </button>
    </div>
  )
}
