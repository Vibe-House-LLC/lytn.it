import ShortenUrl from '@/components/shorten-url';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center space-y-8">
          {/* Logo */}
          <h1 
            className="text-6xl md:text-8xl text-[#467291] font-serif font-semibold tracking-wide"
            style={{ fontFamily: 'var(--font-dosis)' }}
          >
            lytn.it
          </h1>
          
          {/* URL Shortener Component */}
          <ShortenUrl />
        </div>
      </div>
      
      {/* Footer docked to bottom */}
      <footer className="pb-6 text-center">
        <p 
          className="text-sm text-gray-400"
          style={{ fontFamily: 'var(--font-ubuntu)' }}
        >
          © {new Date().getFullYear()} Vibe House
        </p>
      </footer>
    </div>
  );
}
