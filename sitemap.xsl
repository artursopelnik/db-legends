<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <title>XML Sitemap – dblqr.org</title>
        <style>
          :root {
            --bg: #0a0e1c;
            --panel: #151c33;
            --line: #2c3760;
            --text: #f2f4fb;
            --dim: #9aa4c2;
            --orange: #ff9424;
          }
          * { box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 32px 20px;
            line-height: 1.5;
          }
          .wrap { max-width: 1080px; margin: 0 auto; }
          h1 { font-size: 1.6rem; margin: 0 0 6px; color: var(--orange); }
          p.meta { color: var(--dim); margin: 0 0 24px; font-size: 0.92rem; }
          table {
            width: 100%;
            border-collapse: collapse;
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 12px;
            overflow: hidden;
          }
          th, td {
            text-align: left;
            padding: 10px 14px;
            border-bottom: 1px solid var(--line);
            font-size: 0.92rem;
            vertical-align: top;
          }
          th {
            background: rgba(255,148,36,0.08);
            color: var(--orange);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 0.78rem;
          }
          tr:last-child td { border-bottom: none; }
          a { color: var(--orange); text-decoration: none; }
          a:hover { text-decoration: underline; }
          .lang {
            display: inline-block;
            background: rgba(255,148,36,0.14);
            color: var(--orange);
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 0.72rem;
            margin: 2px 4px 2px 0;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>XML Sitemap</h1>
          <p class="meta">
            <xsl:value-of select="count(s:urlset/s:url)"/> URLs. Served for search engines (Google, Bing).
            This human view is a browser stylesheet — the XML underneath is what crawlers read.
          </p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Change</th>
                <th>Priority</th>
                <th>Alternate languages</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td>
                    <a href="{s:loc}">
                      <xsl:value-of select="s:loc"/>
                    </a>
                  </td>
                  <td><xsl:value-of select="s:changefreq"/></td>
                  <td><xsl:value-of select="s:priority"/></td>
                  <td>
                    <xsl:for-each select="xhtml:link">
                      <span class="lang">
                        <xsl:value-of select="@hreflang"/>
                      </span>
                    </xsl:for-each>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
