/**
 * SSRF guard for server-side fetches of user-supplied URLs.
 *
 * The website auditor and business detector both fetch arbitrary URLs that
 * originate from user input. Without a guard, an attacker can point them at
 * internal services (localhost, RFC1918 ranges) or the cloud metadata
 * endpoint (169.254.169.254). This rejects non-public targets before any
 * request is made.
 *
 * Note: this validates URL/IP literals. It does not resolve DNS, so a public
 * hostname that resolves to a private address (DNS rebinding) is not fully
 * mitigated here — that requires pinning the resolved IP at connect time.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', 'ip6-localhost', 'ip6-loopback'])

export function assertPublicHttpUrl(rawUrl: string): URL {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`

  let url: URL
  try {
    url = new URL(withProtocol)
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`)
  }

  const host = url.hostname.toLowerCase()

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error(`Refusing to fetch non-public host: ${host}`)
  }

  if (isPrivateIp(host)) {
    throw new Error(`Refusing to fetch private/reserved address: ${host}`)
  }

  return url
}

function isPrivateIp(host: string): boolean {
  if (host.includes(':')) {
    const h = host.replace(/^\[|\]$/g, '').toLowerCase()
    if (h === '::1' || h === '::') return true
    // Unique-local (fc00::/7) and link-local (fe80::/10)
    if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8') ||
        h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true
    // IPv4-mapped IPv6, e.g. ::ffff:169.254.169.254
    const mapped = h.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/)
    if (mapped) return isPrivateIpv4(mapped[1])
    return false
  }
  return isPrivateIpv4(host)
}

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false

  const octets = m.slice(1, 5).map(Number)
  // Malformed octet → treat as unsafe rather than fetch it.
  if (octets.some((n) => n > 255)) return true

  const [a, b] = octets
  if (a === 0) return true                          // 0.0.0.0/8
  if (a === 10) return true                         // 10.0.0.0/8
  if (a === 127) return true                        // loopback
  if (a === 169 && b === 254) return true           // link-local incl. metadata
  if (a === 172 && b >= 16 && b <= 31) return true  // 172.16.0.0/12
  if (a === 192 && b === 168) return true           // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a >= 224) return true                         // multicast / reserved
  return false
}
