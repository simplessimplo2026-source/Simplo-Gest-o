import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  const slides = [
    {
      id: 1,
      headline: 'nós criamos',
      subheadline: 'mantendo as boas partes e refinando o resto.',
      cta: 'Entre em Contato',
      ctaLink: '#contato',
      bgImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80',
      light: true,
    },
    {
      id: 2,
      headline: 'Explore a Simplo',
      subheadline: 'A Simplo vem com muitos recursos premium e exclusivos.',
      cta: 'Ver Serviços',
      ctaLink: '#servicos',
      bgImage: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1920&q=80',
      light: false,
    },
    {
      id: 3,
      headline: 'por que não',
      subheadline: 'este e muitos outros modelos estão incluídos no seu projeto.',
      cta: 'Começar Agora',
      ctaLink: '#contato',
      bgImage: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&q=80',
      light: false,
    },
  ];

  const controls = [
    { num: '01', label: 'SOLUÇÕES' },
    { num: '02', label: 'EXPLORAR' },
    { num: '03', label: 'COMECE AGORA' },
  ];

  useEffect(() => {
    const slideDuration = 6000;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setProgress(0);
    }, slideDuration);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (slideDuration / 100);
        return next >= 100 ? 0 : next;
      });
    }, 100);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setProgress(0);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  };

  const scrollToSection = (link) => {
    const element = document.querySelector(link);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="home" className="relative h-screen min-h-[680px] overflow-hidden bg-white">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 flex items-center justify-start px-[8%] bg-cover bg-center transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          } ${slide.light ? 'text-[#07001c]' : 'text-white'}`}
          style={{ backgroundImage: `url(${slide.bgImage})` }}
        >
          <div className="absolute inset-0 bg-cover bg-center z-0">
            <div className={`absolute inset-0 ${slide.light ? 'bg-white/5' : 'bg-black/15'}`} />
          </div>
          <div className="relative z-10 max-w-[780px]">
            <h1
              className={`font-poppins text-[110px] leading-[0.95] font-normal mb-7.5 tracking-tight ${
                slide.light ? 'bg-sanok-gradient bg-clip-text text-transparent' : ''
              }`}
            >
              {slide.headline}
            </h1>
            <p className="font-poppins text-2xl font-light leading-[1.35] mb-10 max-w-[640px]">
              {slide.subheadline}
            </p>
            <button
              onClick={() => scrollToSection(slide.ctaLink)}
              className="inline-flex items-center px-9.5 py-3.5 border border-current rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-300 hover:bg-current hover:text-white"
            >
              {slide.cta}
            </button>
          </div>
        </div>
      ))}

      {/* Controls */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3.5 text-white">
        {controls.map((control, index) => (
          <button
            key={control.num}
            onClick={() => goToSlide(index)}
            className={`flex items-center gap-3.5 text-xs font-medium tracking-widest cursor-pointer transition-opacity ${
              index === currentSlide ? 'opacity-100' : 'opacity-55 hover:opacity-100'
            }`}
          >
            <span className="inline-block w-[22px]">{control.num}</span>
            <span>{control.label}</span>
          </button>
        ))}
      </div>

      {/* Arrows */}
      <div className="absolute left-0 right-0 bottom-9 flex justify-between px-10 z-10 text-white text-2xl">
        <button
          onClick={prevSlide}
          className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft size={32} />
        </button>
        <button
          onClick={nextSlide}
          className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute left-0 bottom-0 h-[3px] bg-white/60 z-10 transition-all duration-200" style={{ width: `${progress}%` }} />
    </section>
  );
}
