import { redirect } from 'next/navigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { trackForward } from "../../lib/tracking";
import { cookiesClient } from '@/utilities/amplify-utils';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

async function getDestination(id: string): Promise<string | null> {
    try {
        const response = await cookiesClient.models.shortenedUrl.get({ id });
        return response.data?.destination || null;
    } catch (error) {
        console.error('Error fetching destination:', error);
        return null;
    }
}

export default async function ForwardPage({ params }: PageProps) {
    const { id } = await params;
    
    if (!id) {
        redirect('/');
        return null;
    }

    const destination = await getDestination(id);
    
    if (destination) {
        // Track the forward event (similar to Python version)
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
        const referer = headersList.get('referer') || '';
        
        trackForward({
            id,
            destination,
            ip,
            referer
        });
        
        redirect(destination);
        return null;
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
                        The shortened URL <code className="bg-gray-100 px-2 py-1 rounded text-sm">lytn.it/{id}</code> doesn&apos;t exist or has expired.
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