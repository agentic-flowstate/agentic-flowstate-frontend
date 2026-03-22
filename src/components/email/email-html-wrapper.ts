/**
 * Wraps raw email HTML in a proper document shell for safe iframe rendering.
 *
 * Solves:
 * - Dark mode color inversion (forces light color-scheme so email buttons/links stay visible)
 * - Links not clickable (adds <base target="_blank"> so all links open in new tabs)
 * - Script injection (CSP meta tag blocks all scripts)
 * - Iframe scroll (overflow hidden on html/body)
 *
 * Approach based on Close.com's battle-tested email rendering:
 * https://making.close.com/posts/rendering-untrusted-html-email-safely/
 */
export function wrapEmailHtml(bodyHtml: string): string {
  // If the email already has a full <html> document, extract just the body
  // and preserve any head styles
  const hasFullDoc = /<html[\s>]/i.test(bodyHtml)
  let headContent = ''
  let body = bodyHtml

  if (hasFullDoc) {
    // Extract existing <head> content (styles, meta tags, etc.)
    const headMatch = bodyHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
    if (headMatch) {
      // Keep existing styles but strip any existing meta/base/script tags
      headContent = headMatch[1]
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<base[^>]*>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
    }
    // Extract body content
    const bodyMatch = bodyHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      body = bodyMatch[1]
    }
  }

  return `<!DOCTYPE html>
<html style="color-scheme: light !important;">
<head>
  <meta http-equiv="Content-Security-Policy" content="script-src 'none'" />
  <base target="_blank" />
  <style>
    html, body {
      color-scheme: light !important;
      background-color: #fff !important;
      color: #000 !important;
      overflow: hidden !important;
      margin: 0;
      padding: 0;
      font-family: -apple-system, system-ui, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    /* Preserve email's own background/color if set inline */
    body * { color-scheme: light !important; }
    a[href] { color: #1a73e8; }
    a[href]:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; }
    p:first-child { margin-top: 0; }
    p:last-child { margin-bottom: 0; }
  </style>
  ${headContent}
</head>
<body>
  ${body}
</body>
</html>`
}
