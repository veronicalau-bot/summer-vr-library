import { useEffect, useState } from 'react'

interface NewsItem {
  title: string
  link: string
}

const RSS_PROXY_URL =
  import.meta.env.DEV
    ? '/rthk-rss/c_expressnews_clocal.xml'
    : '/api/rthk-rss?path=c_expressnews_clocal.xml'
const UPDATE_INTERVAL = 10 * 60 * 1000 // 10 minutes

const RTHK_ATTRIBUTION = '來源：香港電台 RTHK'

export default function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [visible, setVisible] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchNews = async () => {
    try {
      const res = await fetch(RSS_PROXY_URL)
      if (!res.ok) throw new Error('RSS fetch failed')

      const xmlText = await res.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlText, 'text/xml')

      const items = Array.from(xml.querySelectorAll('item')).slice(0, 12)
      const parsed: NewsItem[] = items
        .map((item) => ({
          title: item.querySelector('title')?.textContent?.trim() || '',
          link: item.querySelector('link')?.textContent?.trim() || '',
        }))
        .filter((n) => n.title && n.link)

      if (parsed.length > 0) {
        setNews(parsed)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.warn('[NewsTicker] Failed to fetch RTHK RSS:', err)
    }
  }

  useEffect(() => {
    fetchNews()
    const interval = setInterval(fetchNews, UPDATE_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (!visible || news.length === 0) return null

  return (
    <div className="news-ticker">
      <div className="ticker-header">
        <span className="ticker-source">📰 {RTHK_ATTRIBUTION}</span>
        <button
          className="ticker-close"
          onClick={() => setVisible(false)}
          aria-label="關閉新聞走馬燈"
        >
          ✕
        </button>
      </div>

      <div className="ticker-marquee">
        <div className="ticker-track">
          {[...news, ...news].map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ticker-item"
            >
              {item.title}
            </a>
          ))}
        </div>
      </div>

      {lastUpdated && (
        <div className="ticker-updated">
          最後更新：{lastUpdated.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
