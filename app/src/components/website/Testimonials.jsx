import { useState } from 'react';

export function Testimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      id: 1,
      text: "Whiteboard dinâmico de modelos pontuais por meio de e-services bricks-and-clicks. Predomina holisticamente a maximização de recursos do usuário através de habilidades de liderança no backend. Engaja continuamente o desenvolvimento de equipes em áreas temáticas estratégicas.",
      author: "Ava Cook",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    },
    {
      id: 2,
      text: "Adota intrinsecamente competências essenciais de top-line com métricas em tempo real. Reinventa convenientemente a colaboração funcionalizada para maximizar o impacto.",
      author: "Louisa Mitchell",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
    },
    {
      id: 3,
      text: "Visualiza com credibilidade conteúdo corporativo abrangente antes de habilidades de liderança que maximizam recursos. Visualiza progressivamente o valor profissional via valor distribuído.",
      author: "James Carter",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
    },
    {
      id: 4,
      text: "Capacita de forma convincente entregáveis distribuídos, enquanto vortais direcionados ao cliente. Defende objetivamente a colaboração alavancada e o compartilhamento de ideias sem recursos de ponta.",
      author: "Sofia Almeida",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    },
    {
      id: 5,
      text: "Sindica entusiasticamente serviços de baixo custo e largura de banda 24/7. Desenvolve cooperativamente conteúdo vis-à-vis alinhamentos de melhor categoria.",
      author: "Daniel Souza",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
    },
    {
      id: 6,
      text: "Integra rapidamente recursos baseados em multimídia, enquanto tecnologias de baixo risco e alto rendimento. Inova proativamente posicionamento de mercado sem produtos B2B.",
      author: "Marina Costa",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80",
    },
  ];

  return (
    <section className="py-[120px] bg-white">
      <div className="max-w-[1170px] mx-auto px-5">
        <p className="font-poppins text-xs font-semibold tracking-[3px] uppercase text-sanok-text text-center mb-4 reveal-on-scroll">
          CLIENTES
        </p>
        <h2 className="font-poppins font-light text-[38px] leading-[1.15] text-center mb-6 tracking-tight reveal-on-scroll">
          FEEDBACK DOS NOSSOS CLIENTES
        </h2>
        <div className="w-[50px] h-px bg-sanok-cream mx-auto mb-6 reveal-on-scroll" />

        <div className="max-w-[760px] mx-auto text-center relative min-h-[240px] reveal-on-scroll">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
                index === activeTestimonial ? 'opacity-100 relative pointer-events-auto' : 'opacity-0'
              }`}
            >
              <p className="font-poppins text-lg font-light leading-[1.65] text-gray-700 mb-6">
                "{testimonial.text}"
              </p>
              <span className="font-poppins text-base font-medium text-sanok-text tracking-widest">
                {testimonial.author}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3.5 mt-12.5 reveal-on-scroll">
          {testimonials.map((testimonial, index) => (
            <button
              key={testimonial.id}
              onClick={() => setActiveTestimonial(index)}
              onMouseEnter={() => setActiveTestimonial(index)}
              className={`w-15 h-15 rounded-full overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                index === activeTestimonial 
                  ? 'opacity-100 border-sanok-text scale-105' 
                  : 'opacity-55 border-transparent hover:opacity-100'
              }`}
            >
              <img
                src={testimonial.image}
                alt={testimonial.author}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
