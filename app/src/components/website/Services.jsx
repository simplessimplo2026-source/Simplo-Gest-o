import { Tv, Globe, Palette, Award, Archive, Feather } from 'lucide-react';

export function Services() {
  const services = [
    {
      icon: Tv,
      title: 'CONSTRUTOR DE PÁGINA',
      description: 'Construa páginas elegantes com facilidade e flexibilidade total.',
    },
    {
      icon: Globe,
      title: 'PRONTO PARA TRADUÇÃO',
      description: 'Suporte completo para múltiplos idiomas e localização.',
    },
    {
      icon: Palette,
      title: 'CORES ILIMITADAS',
      description: 'Personalize cada detalhe da paleta sem nenhuma restrição.',
    },
    {
      icon: Award,
      title: 'RECURSOS ÚTEIS',
      description: 'Ferramentas pensadas para acelerar seu fluxo de trabalho.',
    },
    {
      icon: Archive,
      title: 'DEMONSTRAÇÕES INCLUÍDAS',
      description: 'Vários demos prontos para você importar e começar.',
    },
    {
      icon: Feather,
      title: 'DESIGN MINIMALISTA',
      description: 'Estética limpa que coloca o conteúdo em primeiro plano.',
    },
  ];

  return (
    <section id="servicos" className="bg-sanok-dark text-white py-[140px_0_120px]">
      <div className="max-w-[1170px] mx-auto px-5">
        <h3 className="font-poppins font-normal text-[35px] text-center mb-0 reveal-on-scroll">
          POR QUE NOS ESCOLHER?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7.5 mt-15">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="p-10 text-center bg-white/3 border border-white/6 rounded-md transition-all duration-350 hover:bg-white/6 hover:-translate-y-1 reveal-on-scroll"
              >
                <div className="text-4xl mb-4.5 text-white">
                  <Icon size={40} />
                </div>
                <h3 className="font-openSans text-xs font-semibold tracking-[2.5px] uppercase mb-3 text-white">
                  {service.title}
                </h3>
                <p className="text-sm leading-[1.7] text-gray-300 m-0">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
