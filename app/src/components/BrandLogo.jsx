import binhottiLogoWhite from '../assets/binhotti-logo-white.png';
import simploLogoWhite from '../assets/simplo-logo-white.png';

export function BrandLogo() {
  return (
    <div className="brand-mark">
      <img className="binhotti-logo-img" src={binhottiLogoWhite} alt="Binhotti Terraplenagem" />
      <em className="simplo-signature">
        <img src={simploLogoWhite} alt="Simplo" />
      </em>
    </div>
  );
}
