import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; reset: number }>();

const RATE_LIMITS = {
  '/api/admin/users': { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  '/api/admin/users/[id]': { maxRequests: 50, windowMs: 60000 }, // 50 requests per minute
  '/api/admin/users/[id]/make-admin': { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  '/api/admin/users/[id]/reset-password': { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
};

function getRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`;
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.reset) {
    // Reset or create new record
    rateLimitStore.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.reset) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up expired records every 5 minutes
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only apply middleware to admin API routes
  if (!pathname.startsWith('/api/admin/')) {
    return NextResponse.next();
  }

  // Get client IP
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1';

  // Determine rate limit configuration
  let rateLimitConfig = null;
  
  if (pathname.includes('/make-admin')) {
    rateLimitConfig = RATE_LIMITS['/api/admin/users/[id]/make-admin'];
  } else if (pathname.includes('/reset-password')) {
    rateLimitConfig = RATE_LIMITS['/api/admin/users/[id]/reset-password'];
  } else if (pathname.match(/\/api\/admin\/users\/[^\/]+$/)) {
    rateLimitConfig = RATE_LIMITS['/api/admin/users/[id]'];
  } else if (pathname === '/api/admin/users') {
    rateLimitConfig = RATE_LIMITS['/api/admin/users'];
  }

  // Apply rate limiting if configuration exists
  if (rateLimitConfig) {
    const key = getRateLimitKey(ip, pathname);
    const allowed = checkRateLimit(key, rateLimitConfig.maxRequests, rateLimitConfig.windowMs);
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((Date.now() + rateLimitConfig.windowMs) / 1000).toString(),
          }
        }
      );
    }
  }

  // Add security headers
  const response = NextResponse.next();
  
  // Prevent admin APIs from being cached
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  // Add additional security headers for admin routes
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/api/admin/:path*',
  ],
};