import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_#d4d4d4_1px,_transparent_0)] bg-[size:24px_24px]" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container-base py-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="text-heading-2 font-display text-neutral-900 hover:text-gradient-primary transition-all duration-300">
              Arcane Dominion
            </div>
            <div className="flex items-center gap-4">
              <button className="btn-ghost text-sm hover:scale-105 transition-transform duration-200">
                About
              </button>
              <button className="btn-ghost text-sm hover:scale-105 transition-transform duration-200">
                Features
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="section-padding-lg">
          <div className="container-narrow text-center">
            <h1 className="text-heading-1 font-display text-neutral-900 mb-6 animate-slide-up">
              Build Your
              <span className="text-gradient-primary block">
                Mystical Empire
              </span>
            </h1>
            <p className="text-body-large text-neutral-600 mb-8 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{animationDelay: '0.2s'}}>
              Master the art of strategic resource management in a world where ancient leylines 
              power civilizations and mystical forces shape the fate of kingdoms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-slide-up" style={{animationDelay: '0.4s'}}>
              <Link 
                href="/play" 
                className="btn-primary text-lg px-8 py-4 hover:transform hover:scale-105 hover:shadow-xl transition-transform duration-200 will-change-transform"
              >
                Start Playing
              </Link>
              <button className="btn-secondary text-lg px-8 py-4 hover:transform hover:scale-105 hover:shadow-xl transition-transform duration-200 will-change-transform">
                Watch Demo
              </button>
            </div>

            {/* Feature Preview */}
            <div className="card-elevated p-8 animate-fade-in" style={{animationDelay: '0.6s'}}>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-heading-3 text-neutral-900 mb-2">Leyline Networks</h3>
                  <p className="text-body-small text-neutral-600">
                    Harness ancient energy flows to power your civilization
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-heading-3 text-neutral-900 mb-2">Strategic Building</h3>
                  <p className="text-body-small text-neutral-600">
                    Construct and optimize your empire&apos;s infrastructure
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-heading-3 text-neutral-900 mb-2">Arcane Research</h3>
                  <p className="text-body-small text-neutral-600">
                    Unlock powerful technologies and magical abilities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container-base section-padding-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in" style={{animationDelay: '1s'}}>
            <div className="text-center">
              <div className="text-display-3 text-neutral-900 font-bold mb-1">50K+</div>
              <div className="text-body-small text-neutral-600">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-display-3 text-neutral-900 font-bold mb-1">100+</div>
              <div className="text-body-small text-neutral-600">Unique Buildings</div>
            </div>
            <div className="text-center">
              <div className="text-display-3 text-neutral-900 font-bold mb-1">25+</div>
              <div className="text-body-small text-neutral-600">Research Trees</div>
            </div>
            <div className="text-center">
              <div className="text-display-3 text-neutral-900 font-bold mb-1">∞</div>
              <div className="text-body-small text-neutral-600">Possibilities</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
