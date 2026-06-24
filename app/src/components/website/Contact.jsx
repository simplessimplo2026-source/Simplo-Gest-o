import { useState } from 'react';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    alert('Mensagem enviada com sucesso!');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section id="contato" className="py-[120px] bg-sanok-dark2 text-white">
      <div className="max-w-[1170px] mx-auto px-5">
        <h2 className="font-poppins font-light text-[38px] leading-[1.15] text-center mb-0 text-gray-100 reveal-on-scroll">
          ENTRE EM CONTATO CONOSCO
        </h2>
        <form onSubmit={handleSubmit} className="max-w-[780px] mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-4.5 reveal-on-scroll">
          <div>
            <input
              type="text"
              name="name"
              placeholder="Nome *"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-transparent border-none border-b border-gray-600 text-white font-poppins text-sm py-3.5 outline-none transition-colors duration-300 focus:border-white placeholder:tracking-widest placeholder:text-gray-500"
              aria-label="Nome"
            />
          </div>
          <div>
            <input
              type="email"
              name="email"
              placeholder="E-mail *"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-transparent border-none border-b border-gray-600 text-white font-poppins text-sm py-3.5 outline-none transition-colors duration-300 focus:border-white placeholder:tracking-widest placeholder:text-gray-500"
              aria-label="Email"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="text"
              name="subject"
              placeholder="Assunto"
              value={formData.subject}
              onChange={handleChange}
              className="w-full bg-transparent border-none border-b border-gray-600 text-white font-poppins text-sm py-3.5 outline-none transition-colors duration-300 focus:border-white placeholder:tracking-widest placeholder:text-gray-500"
              aria-label="Assunto"
            />
          </div>
          <div className="md:col-span-2">
            <textarea
              name="message"
              placeholder="Mensagem *"
              required
              value={formData.message}
              onChange={handleChange}
              className="w-full bg-transparent border-none border-b border-gray-600 text-white font-poppins text-sm py-3.5 outline-none transition-colors duration-300 focus:border-white placeholder:tracking-widest placeholder:text-gray-500 min-h-[140px] resize-y"
              aria-label="Mensagem"
            />
          </div>
          <div className="md:col-span-2 text-center mt-7.5">
            <button
              type="submit"
              className="inline-block px-11 py-3.5 bg-white text-sanok-text text-xs font-semibold tracking-widest uppercase border-none cursor-pointer transition-all duration-300 hover:bg-sanok-cream"
            >
              ENVIAR E-MAIL
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
