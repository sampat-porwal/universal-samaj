import Link from 'next/link';

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 🟢 TOP NAVIGATION BAR */}
      <nav className="bg-white border-b border-gray-100 shadow-sm fixed w-full z-10 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-black text-blue-700">Royal Logic ERP</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 font-medium">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 font-medium">Contact Us</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-700 font-medium hover:text-blue-600">
                Sign In
              </Link>
              <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium transition-colors">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <main className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">The Ultimate Dynamic ERP for</span>
            <span className="block text-blue-600 mt-2">Any Business, Anywhere.</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Stop adjusting your business to fit your software. Royal Logic ERP automatically adapts to your industry needs with our AI-powered dynamic schema engine.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register" className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 shadow-lg">
              Get Started for Free
            </Link>
            <Link href="/login" className="px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-blue-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
              Live Demo
            </Link>
          </div>
        </div>
      </main>

      {/* ✨ FEATURES SECTION */}
      <div id="features" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              A Better Way to Manage Your Empire
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              
              {/* Feature 1 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center mb-4">
                  <span className="text-blue-600 text-2xl">⚡</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Dynamic Fields</h3>
                <p className="mt-2 text-base text-gray-500">
                  Add custom fields (like GSM, Size, Color) on the fly without writing a single line of backend code.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center mb-4">
                  <span className="text-blue-600 text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">AI Chatbot Ready</h3>
                <p className="mt-2 text-base text-gray-500">
                  Talk to your data. Ask "Show me pending orders" and our AI will fetch it instantly.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center mb-4">
                  <span className="text-blue-600 text-2xl">🔒</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">100% Data Isolation</h3>
                <p className="mt-2 text-base text-gray-500">
                  Bank-grade Multi-Tenant security ensures your company's data never leaks to others.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
      
      {/* 🦶 FOOTER */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Royal Logic Technologies. Built in Bhilwara, India.</p>
      </footer>
    </div>
  );
}