import { useState } from 'react';

export function Portfolio() {
  const [activeFilter, setActiveFilter] = useState('*');

  const filters = [
    { id: '*', label: 'Todos' },
    { id: 'slider', label: 'Slider' },
    { id: 'video', label: 'Vídeo' },
    { id: 'gallery', label: 'Galeria' },
    { id: 'image', label: 'Imagem' },
  ];

  const portfolioItems = [
    { id: 1, title: 'livros incríveis', desc: 'Illustrator / Photoshop', category: ['slider', 'image'], image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80' },
    { id: 2, title: 'apple iwatch', desc: 'Cliente Simplo', category: ['video'], image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80' },
    { id: 3, title: 'torre de toronto', desc: 'Photoshop / Illustrator', category: ['gallery'], image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80' },
    { id: 4, title: 'apple iphone', desc: 'Fotografia / Photoshop', category: ['image'], image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80' },
    { id: 5, title: 'simplo tree', desc: 'Fotografia', category: ['gallery', 'image'], image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80' },
    { id: 6, title: 'apple ipad', desc: 'por LS Graphics', category: ['slider'], image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80' },
    { id: 7, title: 'Simplo iPad Pro', desc: 'Mockups', category: ['image'], image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&q=80' },
    { id: 8, title: 'apple iMac', desc: 'Mockup / Photoshop', category: ['video'], image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80' },
    { id: 9, title: 'Brochura Dobrada', desc: 'Por Mr Mockup', category: ['slider'], image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80' },
    { id: 10, title: 'cais monocromático', desc: 'Fotografia / Photoshop', category: ['gallery'], image: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=600&q=80' },
    { id: 11, title: 'mockup de garrafa', desc: 'DATA: 15/05/2021', category: ['image'], image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80' },
    { id: 12, title: 'floresta escura', desc: 'Illustrator / Photoshop', category: ['video'], image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80' },
  ];

  const filteredItems = activeFilter === '*' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category.includes(activeFilter));

  return (
    <section id="trabalhos" className="py-[120px]">
      <div className="max-w-[1170px] mx-auto px-5">
        <p className="font-poppins text-xs font-semibold tracking-[3px] uppercase text-sanok-text text-center mb-4 reveal-on-scroll">
          CONSTRUÍMOS COISAS BOAS
        </p>
        <h2 className="font-poppins font-light text-[50px] leading-[1.15] text-center mb-6 tracking-tight reveal-on-scroll">
          NOSSO PORTFÓLIO
        </h2>
        <p className="max-w-[780px] mx-auto mb-10 text-center text-gray-600 text-[17px] leading-[1.7] reveal-on-scroll">
          Impactamos com determinação a terceirização integrada após um ROI de missão crítica. 
          De forma monotônica enfraquecemos a convergência custo-eficaz sem alinhamentos granulares. 
          Criamos progressivamente plataformas baseadas no cliente.
        </p>

        {/* Filter */}
        <div className="flex justify-center gap-7.5 mb-12 flex-wrap reveal-on-scroll">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`text-xs font-semibold tracking-widest uppercase cursor-pointer py-1.5 px-1 border-b-2 transition-all duration-250 ${
                activeFilter === filter.id 
                  ? 'text-sanok-text border-sanok-text' 
                  : 'text-gray-500 border-transparent hover:text-sanok-text'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mx-[-10px] reveal-on-scroll">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative overflow-hidden aspect-square group">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-800 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-sanok-dark/85 text-white flex flex-col justify-center items-center p-6 text-center opacity-0 transition-opacity duration-350 group-hover:opacity-100">
                <p className="font-poppins text-lg font-medium mb-1.5 capitalize m-0">
                  {item.title}
                </p>
                <p className="text-xs tracking-widest uppercase text-sanok-cream m-0">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
