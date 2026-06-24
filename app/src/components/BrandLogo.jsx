import simploLogoWhite from '../assets/simplo-logo-white.png';

export function BrandLogo() {
  return (
    <div className="brand-mark" aria-label="Binhotti Terraplenagem">
      <strong>BINHOTTI</strong>
      <span aria-hidden="true">
        <i />
        <b>TERRAPLENAGEM</b>
        <i />
      </span>
      <em className="simplo-signature">
        <img src={simploLogoWhite} alt="Simplo" />
      </em>
    </div>
  );
}
