import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Check the standard 'host' AND the proxy 'x-forwarded-host'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''

  console.log('DEBUG - Final Host used for logic:', host)

  const lowerHost = host.toLowerCase()

  // 1. Identify YCW specifically (Higher priority)
  const isYcw = lowerHost.includes('ycw.')

  // 2. Identify Main Site (cc360 or the bare domain)
  const isMainSite = lowerHost.includes('cc360') || 
                     lowerHost.includes('carecrew360') || 
                     lowerHost === 'loginpinch.com'

  if (pathname === '/') {
    // Priority 1: If it's YCW, go to /ycw
    if (isYcw) {
      console.log('MATCH: YCW Subdomain -> /ycw')
      return NextResponse.redirect(new URL('/ycw', req.url))
    }

    // Priority 2: If it's the main site or localhost, go to /login
    if (isMainSite || lowerHost.includes('localhost')) {
      console.log('MATCH: Main Site -> /login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Fallback
    return NextResponse.redirect(new URL('/ycw', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}