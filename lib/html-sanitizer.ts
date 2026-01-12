const BLOCKED_TAGS = ["script", "iframe", "object", "embed"]

function stripBlockedTags(html: string) {
  const tagPattern = new RegExp(
    `<\\s*(${BLOCKED_TAGS.join("|")})[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`,
    "gi",
  )
  const selfClosingPattern = new RegExp(
    `<\\s*(${BLOCKED_TAGS.join("|")})[^>]*\\/\\s*>`,
    "gi",
  )

  return html.replace(tagPattern, "").replace(selfClosingPattern, "")
}

function stripEventHandlers(html: string) {
  return html
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
}

function neutralizeJavascriptUrls(html: string) {
  return html
    .replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1='#'")
    .replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, "$1=#")
}

export function sanitizeHtml(html: string) {
  if (!html) return ""

  const withoutBlocked = stripBlockedTags(html)
  const withoutHandlers = stripEventHandlers(withoutBlocked)
  return neutralizeJavascriptUrls(withoutHandlers)
}
