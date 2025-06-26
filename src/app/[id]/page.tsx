import Link from 'next/link';
import { headers } from 'next/headers';
import LinkPreview from '@/components/link-preview';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

async function getDestination(id: string): Promise<string | null> {
    try {
        console.log('Fetching destination for ID:', id);
        
        // Use the API route instead of direct database access
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/fetch-url?id=${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            console.error('API route error:', response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        console.log('API route result:', data);
        
        return data.destination || null;
    } catch (error) {
        console.error('Error fetching destination for ID:', id);
        console.error('Error details:', error);
        return null;
    }
}

export default async function ForwardPage({ params }: PageProps) {
    const { id } = await params;
    
    // Get the current host for display purposes
    const headersList = await headers();
    const host = headersList.get('host') || 'this domain';
    
    if (!id) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full text-center">
                    <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                        Invalid Link
                    </h2>
                    <p className="text-gray-600 mb-8">
                        No link ID was provided.
                    </p>
                    <Link 
                        href="/" 
                        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Create a New Short Link
                    </Link>
                </div>
            </div>
        );
    }

    const destination = await getDestination(id);
    
    if (destination) {
        // Get headers for tracking (headersList already defined above)
        const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
        const referer = headersList.get('referer') || '';
        
        // Pass tracking data to the preview component
        return (
            <LinkPreview 
                id={id}
                destination={destination}
                trackingData={{
                    ip,
                    referer
                }}
                host={host}
            />
        );
    } else {
        // Return 404 page for non-existent IDs
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full text-center">
                    <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                        Link Not Found
                    </h2>
                    <p className="text-gray-600 mb-8">
                        The shortened URL <code className="bg-gray-100 px-2 py-1 rounded text-sm">{host}/{id}</code> doesn&apos;t exist or has expired.
                    </p>
                    <Link 
                        href="/" 
                        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Create a New Short Link
                    </Link>
                </div>
            </div>
        );
    }
} 