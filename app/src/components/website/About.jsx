export function About() {
  return (
    <section id="sobre" className="py-[120px] relative">
      <div className="max-w-[1170px] mx-auto px-5">
        <p className="font-poppins text-xs font-semibold tracking-[3px] uppercase text-sanok-text text-center mb-4 reveal-on-scroll">
          Somos a Simplo
        </p>
        <h2 className="font-poppins font-light text-[50px] leading-[1.15] text-center mb-6 tracking-tight reveal-on-scroll">
          Sobre Nós
        </h2>
        <p className="max-w-[780px] mx-auto mb-10 text-center text-gray-600 text-[17px] leading-[1.7] reveal-on-scroll">
          Impactamos com determinação a terceirização integrada após um ROI de missão crítica. 
          De forma monotônica enfraquecemos a convergência custo-eficaz sem alinhamentos granulares. 
          Criamos progressivamente plataformas baseadas no cliente.
        </p>
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
          alt="Sobre a Simplo"
          className="mx-auto block max-w-[680px] rounded-md mt-15 reveal-on-scroll"
        />
      </div>
    </section>
  );
}
