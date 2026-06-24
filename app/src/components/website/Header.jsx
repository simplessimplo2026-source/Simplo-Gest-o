import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { id: 'home', label: 'Início' },
    { id: 'sobre', label: 'Sobre' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'trabalhos', label: 'Trabalhos' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'contato', label: 'Contato' },
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-350 ${
      scrolled ? 'bg-sanok-dark2 text-white py-3.5 px-10 shadow-lg' : 'bg-transparent text-sanok-text py-6 px-10'
    }`}>
      <div className="max-w-[1170px] mx-auto flex items-center justify-between gap-6">
        <a 
          href="#home" 
          onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}
          className="flex-shrink-0"
        >
          <img 
            src="/src/assets/simplo-logo.jpeg" 
            alt="Simplo" 
            className="h-12"
          />
        </a>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-7.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="font-poppins text-xs font-medium tracking-widest uppercase relative py-1.5 hover:text-sanok-text transition-colors"
            >
              {item.label}
              <span className="absolute left-0 bottom-0 h-px bg-current w-0 hover:w-full transition-all duration-300" />
            </button>
          ))}
        </nav>

        <a
          href="#contato"
          onClick={(e) => { e.preventDefault(); scrollToSection('contato'); }}
          className="hidden md:inline-flex items-center justify-center px-6.5 py-2.5 text-xs font-semibold tracking-widest uppercase border rounded-full transition-all duration-300 hover:bg-sanok-text hover:text-white"
        >
          Entre em Contato
        </a>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-sanok-dark2 text-white py-6 px-6 shadow-lg">
          <div className="flex flex-col gap-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="font-poppins text-sm font-medium tracking-widest uppercase text-left py-2"
              >
                {item.label}
              </button>
            ))}
            <a
              href="#contato"
              onClick={(e) => { e.preventDefault(); scrollToSection('contato'); }}
              className="inline-flex items-center justify-center px-6.5 py-2.5 text-xs font-semibold tracking-widest uppercase border rounded-full mt-4"
            >
              Entre em Contato
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
