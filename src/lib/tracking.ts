/**
 * Event tracking utility similar to the Python track_event function
 */

interface TrackingEvent {
    [key: string]: string | number | boolean | undefined;
}

export async function trackEvent(eventType: string, eventData: TrackingEvent): Promise<void> {
    try {
        // Add timestamp to event data
        const enrichedEventData = {
            ...eventData,
            event_time: new Date().toISOString(),
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server-side',
        };

        // For now, just log to console
        // In production, you could send this to your analytics service
        console.log(`Event: ${eventType}`, enrichedEventData);

        // TODO: Implement actual tracking service
        // This could be sent to:
        // - AWS S3 (like in the Python version)
        // - Google Analytics
        // - Custom analytics endpoint
        // - etc.
        
    } catch (error) {
        console.error('Error tracking event:', error);
        // Don't throw - tracking failures shouldn't break the app
    }
}

/**
 * Track URL shortening event
 */
export function trackShorten(data: {
    id: string;
    originalUrl: string;
    shortenedUrl: string;
    ip?: string;
}): void {
    trackEvent('shorten', data);
}

/**
 * Track URL forwarding event
 */
export function trackForward(data: {
    id: string;
    destination: string;
    ip?: string;
    referer?: string;
}): void {
    trackEvent('forward', data);
} 