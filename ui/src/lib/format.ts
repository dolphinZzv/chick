const MINUTE = 60
const HOUR = 3600
const DAY = 86400

export function relativeTime(dateStr: string): string {
  if (!dateStr) return ""
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return dateStr

  const diff = Math.floor((now - then) / 1000)
  if (diff < 0) return "刚刚"

  if (diff < MINUTE) return "刚刚"
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`

  return dateStr.slice(0, 10)
}
