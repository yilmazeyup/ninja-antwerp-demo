import { useEffect, useState } from 'react';
import { getLocale, isOpenAt, LOCALE_NAMES, LOCALES, NINJA, tr, clock, dayShort, type Locale } from '@ninja/shared';

import { chooseLocale } from '../i18n/install';
import { useLive, useParallax, useReveal } from './live';
import { Clan } from './sections/Clan';
import { Fire } from './sections/Fire';
import { FlashWall } from './sections/Flash';
import { Hero } from './sections/Hero';
import { Manifest } from './sections/Manifest';
import { MenuSection } from './sections/Menu';
import { Origin } from './sections/Origin';
import { OwnSpit } from './sections/OwnSpit';
import { PassportSection } from './sections/Passport';
import { Visit } from './sections/Visit';

const LOGO = `${import.meta.env.BASE_URL}brand/logo.png`;

const LINKS: [string, string][] = [
  ['#vuur', 'Vuur'],
  ['#menu', 'Menu'],
  ['#herkomst', 'Herkomst'],
  ['#paspoort', 'Paspoort'],
  ['#flash', 'Flash'],
  ['#eigen-spies', 'Eigen spies'],
  ['#clan', 'Clan'],
  ['#bezoek', 'Bezoek'],
];

export function Site() {
  useReveal();
  useParallax();
  return (
    <>
      <a className="skip" href="#manifest">
        Naar de inhoud
      </a>
      <Nav />
      <main>
        <Hero />
        <Manifest />
        <Fire />
        <MenuSection />
        <Origin />
        <PassportSection />
        <FlashWall />
        <OwnSpit />
        <Clan />
        <Visit />
      </main>
      <Footer />
    </>
  );
}

function Nav() {
  const live = useLive();
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState('');
  const open = isOpenAt(live.wall);

  useEffect(() => {
    const onScroll = () => setSolid(scrollY > 40);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const [href] of LINKS) {
      const el = document.querySelector(href);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', menu);
  }, [menu]);

  return (
    <>
    <header className={`nav${solid ? ' is-solid' : ''}${menu ? ' is-menu' : ''}`}>
      <div className="nav-in">
        <a className="nav-logo" href="#top" aria-label="Ninja Antwerp" onClick={() => setMenu(false)}>
          <img src={LOGO} alt="Ninja" />
        </a>
        <nav className="nav-links" aria-label="Secties">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className={active === href ? 'on' : ''}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-right">
          <span className="nav-live" title={live.demo ? tr('Replay van de laatste avond') : tr('Live')}>
            <span className={`nj-live${live.demo ? ' is-replay' : ''}`} aria-hidden />
            <span className="nav-live-k">{live.reason === 'set' ? tr('Demo') : open ? tr('Open') : live.demo ? tr('Replay') : tr('Gesloten')}</span>
            <span className="nav-live-t nj-mono" dir="ltr">
              {live.demo ? `${dayShort(live.now)} ${clock(live.now)}` : clock(live.now)}
            </span>
          </span>
          <a className="nj-btn nav-cta" href="../app/rij">
            Schuif aan
          </a>
          <button className="nav-burger" aria-expanded={menu} aria-label={menu ? 'Menu sluiten' : 'Menu openen'} onClick={() => setMenu((m) => !m)}>
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
      <div className="sheet-menu" hidden={!menu}>
        <nav aria-label="Secties">
          {LINKS.map(([href, label], i) => (
            <a key={href} href={href} onClick={() => setMenu(false)} style={{ transitionDelay: `${i * 30}ms` }}>
              <span className="nj-mono">{String(i + 2).padStart(2, '0')}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="sheet-foot">
          <a className="nj-btn" href="../app/rij">
            Schuif digitaal aan
          </a>
          <Languages />
        </div>
      </div>
    </>
  );
}

function Languages() {
  const current = getLocale();
  return (
    <label className="lang">
      <span className="nj-label">Taal</span>
      <select value={current} onChange={(e) => chooseLocale(e.target.value as Locale)} translate="no">
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="w-wrap">
        <div className="foot-top">
          <img className="foot-logo" src={LOGO} alt="Ninja" />
          <p className="foot-tag" translate="no">
            Authentic Kebab &amp; Grill in Antwerp
          </p>
        </div>
        <div className="foot-grid">
          <div>
            <span className="nj-label">Ninja Antwerp</span>
            <p>
              {NINJA.street}
              <br />
              {`${NINJA.postcode} ${NINJA.city}`}
            </p>
          </div>
          <div>
            <span className="nj-label">Open</span>
            <p>Dinsdag tot zondag, 15:00 – 22:00. Maandag gesloten.</p>
          </div>
          <div>
            <span className="nj-label">Volg</span>
            <p>
              <a href={NINJA.instagramUrl} target="_blank" rel="noreferrer">
                Instagram · @{NINJA.instagram}
              </a>
              <br />
              <a href={NINJA.tiktokUrl} target="_blank" rel="noreferrer">
                TikTok · @{NINJA.tiktok}
              </a>
            </p>
          </div>
          <div>
            <Languages />
          </div>
        </div>
        <div className="foot-demo">
          <span className="demo-badge nj-label">Demo</span>
          <p>
            Een voorstel voor Ninja Antwerp. Echt: het menu en alle prijzen, de huisregels, het adres, de uren, de FAQ, de jobs, het logo en Ninja's eigen foto's. Demo: de sensorwaarden, de gasten en de paspoorten, de snijders, de leveranciers en loten (voorbeelden), de rangen, drops en de eigen spies.
          </p>
        </div>
        <div className="foot-bottom">
          <span className="nj-mono">{`BTW ${NINJA.vat}`}</span>
          <span>Kaarten: Natural Earth, © OpenStreetMap-bijdragers</span>
          <a href="#top">Naar boven</a>
        </div>
      </div>
    </footer>
  );
}
