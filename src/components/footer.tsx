import React from 'react';

export default function Footer() {
  return (
    <footer className="py-4 text-xs w-full text-center text-muted-foreground" style={{ fontFamily: 'var(--font-ubuntu)' }}>
      <div className="text-[11px] w-full text-center text-muted-foreground">
        © {new Date().getFullYear()} <a href="https://vibehouse.net" className="no-underline text-muted-foreground hover:text-foreground cursor-pointer">Vibe House LLC</a>
      </div>
    </footer>
  );
}

