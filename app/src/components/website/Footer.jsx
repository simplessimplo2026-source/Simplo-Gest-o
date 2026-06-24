import { useEffect, useState } from 'react';
import { ArrowUp, Phone, MapPin, Mail, Facebook, Linkedin, Twitter } from 'lucide-react';

export function Footer() {
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="bg-white text-sanok-text">
        {/* Footer Info */}
        <div className="py-20 border-b border-gray-200">
          <div className="max-w-[1170px] mx-auto px-5">
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div className="flex-1 min-w-[240px] px-5">
                <Phone className="inline-block text-3xl mb-3.5" />
                <p className="m-0 text-sm leading-[1.7] text-gray-600">
                  (+44) 239 121 332
                </p>
              </div>
              <div className="flex-1 min-w-[240px] px-5">
                <MapPin className="inline-block text-3xl mb-3.5" />
                <p className="m-0 text-sm leading-[1.7] text-gray-600">
                  Caixa Postal 16122, Collins Street West<br />
                  Victoria 8007, Austrália
                </p>
              </div>
              <div className="flex-1 min-w-[240px] px-5">
                <Mail className="inline-block text-3xl mb-3.5" />
                <p className="m-0 text-sm leading-[1.7] text-gray-600">
                  <a href="mailto:hello@example.com" className="hover:text-sanok-text">hello@example.com</a><br />
                  <a href="mailto:job@example.com" className="hover:text-sanok-text">job@example.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Footer */}
        <div className="py-12 text-center">
          <div className="max-w-[1170px] mx-auto px-5">
            <a href="#home" className="inline-block mb-5.5">
              <img 
                src="/src/assets/simplo-logo.jpeg" 
                alt="Simplo" 
                className="h-10 mx-auto"
              />
            </a>
            
            <div className="flex justify-center gap-3 flex-wrap my-4.5 mb-6.5">
              <a href="#" className="inline-flex items-center justify-center w-9.5 h-9.5 rounded-full border border-gray-300 text-gray-500 hover:border-sanok-text hover:text-sanok-text hover:-translate-y-0.5 transition-all duration-300" title="Facebook">
                <Facebook size={14} />
              </a>
              <a href="#" className="inline-flex items-center justify-center w-9.5 h-9.5 rounded-full border border-gray-300 text-gray-500 hover:border-sanok-text hover:text-sanok-text hover:-translate-y-0.5 transition-all duration-300" title="LinkedIn">
                <Linkedin size={14} />
              </a>
              <a href="#" className="inline-flex items-center justify-center w-9.5 h-9.5 rounded-full border border-gray-300 text-gray-500 hover:border-sanok-text hover:text-sanok-text hover:-translate-y-0.5 transition-all duration-300" title="Twitter">
                <Twitter size={14} />
              </a>
              <a href="mailto:hello@example.com" className="inline-flex items-center justify-center w-9.5 h-9.5 rounded-full border border-gray-300 text-gray-500 hover:border-sanok-text hover:text-sanok-text hover:-translate-y-0.5 transition-all duration-300" title="E-mail">
                <Mail size={14} />
              </a>
            </div>
            
            <p className="text-sm text-gray-500 m-0">
              Simplo © <a href="#" className="hover:text-sanok-text">2026</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Back to Top */}
      <a
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          scrollToTop();
        }}
        className={`fixed right-6 bottom-6 w-11 h-11 rounded-full bg-sanok-dark2 text-white flex items-center justify-center text-lg no-underline transition-all duration-300 z-40 ${
          showBackTop ? 'opacity-100 visible' : 'opacity-0 invisible'
        } hover:-translate-y-0.75`}
        title="Voltar ao topo"
      >
        <ArrowUp size={18} />
      </a>
    </>
  );
}
