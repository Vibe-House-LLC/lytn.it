import ShortenUrl from '@/components/shorten-url';
import AuthButton from '@/components/auth-button';

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-hidden relative" style={{ minWidth: '400px' }}>
      {/* Header with Auth Button */}
      <header className="absolute top-0 right-0 z-10 p-4">
        <AuthButton />
      </header>
      
      <div id="gradient" className="h-full w-full">
        <div className="flex flex-col items-center justify-center h-full pb-20">
          <div id="main" className="text-[#6e6e6e] w-full min-h-[550px] h-full">
            {/* Vertical centered content */}
            <div 
              className="absolute w-full transform -translate-y-1/2"
              style={{ 
                top: '37%',
                height: '300px'
              }}
            >
              <div id="top" className="w-full">
                <div id="content" className="mt-[15px] relative max-w-[1200px] w-full mx-auto">
                  {/* Logo */}
                  <div 
                    id="logo" 
                    className="relative mb-0 mx-auto bg-no-repeat bg-center bg-bottom animate-[fadeInDown_1s_ease-out]"
                    style={{
                      width: '371px',
                      height: '207px'
                    }}
                  >
                    <h1 
                      className="absolute w-full bottom-0 m-0 text-[#467291] text-center leading-none"
                      style={{ 
                        fontFamily: 'var(--font-dosis)', 
                        fontSize: '150px',
                        fontWeight: 600,
                        bottom: '15px'
                      }}
                    >
                      lytn.it
                    </h1>
                  </div>
                </div>
              </div>

              {/* URL Shortener Component */}
              <div id="content" className="mt-[15px] relative max-w-[1200px] w-full mx-auto">
                <ShortenUrl />
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed to bottom */}
        <div 
          id="footer" 
          className="fixed bottom-0 left-0 right-0 pb-[15px] text-xs w-full text-center text-[#d4d4d4] animate-[fadeInUp_1s_ease-out]"
          style={{ fontFamily: 'var(--font-ubuntu)' }}
        >
          <div id="copyright" className="text-[11px] w-full text-center text-[#d4d4d4]">
            © {new Date().getFullYear()} <a href="https://vibehouse.net" className="no-underline text-[#d4d4d4] hover:text-black">Vibe House LLC</a>
          </div>
        </div>
      </div>
    </div>
  );
}
