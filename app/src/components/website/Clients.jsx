export function Clients() {
  const clients = [
    { id: 1, name: 'Cliente 1', logo: 'https://via.placeholder.com/140x60/ddd/666?text=Logo+1' },
    { id: 2, name: 'Cliente 2', logo: 'https://via.placeholder.com/140x60/ddd/666?text=Logo+2' },
    { id: 3, name: 'Cliente 3', logo: 'https://via.placeholder.com/140x60/ddd/666?text=Logo+3' },
    { id: 4, name: 'Cliente 4', logo: 'https://via.placeholder.com/140x60/ddd/666?text=Logo+4' },
    { id: 5, name: 'Cliente 5', logo: 'https://via.placeholder.com/140x60/ddd/666?text=Logo+5' },
  ];

  return (
    <section id="clientes" className="py-20 bg-white">
      <div className="max-w-[1170px] mx-auto px-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 items-center gap-5 reveal-on-scroll">
          {clients.map((client) => (
            <div
              key={client.id}
              className="text-center transition-all duration-300 hover:grayscale-0 hover:opacity-100 grayscale opacity-55"
            >
              <img
                src={client.logo}
                alt={client.name}
                className="max-w-[140px] mx-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
