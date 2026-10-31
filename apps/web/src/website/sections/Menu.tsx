import { useState } from 'react';
import { ALLERGENS, CATEGORIES, dishById, dishesIn, euro, FAQ, ISKENDER_SUPPLEMENT, MEATS, SAUCES, type Allergen, type Dish } from '@ninja/shared';

import { photo } from '../live';
import { Film, Kicker } from '../ui/ui';

const SHORT: Record<Allergen, string> = { gluten: 'GL', melk: 'ML', sesam: 'SE', noten: 'NO', selder: 'SL', sulfiet: 'SU', mosterd: 'MO', ei: 'EI' };

export function MenuSection() {
  const menu = dishById('ninja-menu');
  const food = CATEGORIES.filter((c) => !c.drinks && c.id !== 'menu');
  const drinks = CATEGORIES.filter((c) => c.drinks);
  const [shown, setShown] = useState<Dish>(dishById('iskender'));
  const takeaway = FAQ.find((f) => f.question.startsWith('Afhalen'));
  const sauces = FAQ.find((f) => f.question.startsWith('Welke sauzen'));

  return (
    <section className="w-sec menu" id="menu">
      <div className="w-wrap">
        <Kicker n="03">Menu</Kicker>
        <div className="menu-head">
          <h2 className="w-d1" data-reveal>
            Klein menu
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            de hele dag vers
          </p>
        </div>
        <p className="w-lede" data-reveal>
          Alles wat we serveren wordt de hele dag door vers gemaakt of gebakken in ons restaurant.
        </p>

        <article className="signature nj-leather" data-reveal>
          <Film src={photo(menu.photo ?? 'menu-platter')} alt="De Ninja Menu: soep, dips, de platter en rijstpudding" className="signature-photo" />
          <div className="signature-body">
            <span className="nj-label signature-k">Alles van het huis</span>
            <h3 className="signature-name">{menu.name}</h3>
            <p className="signature-price">
              <span className="nj-mono">{euro(menu.price)}</span>
              <span className="nj-label">per persoon</span>
            </p>
            <p className="signature-desc">{menu.desc}</p>
            <ul className="signature-steps">
              <li>Soep van de dag</li>
              <li>Twee dips naar keuze</li>
              <li>Een platter per persoon</li>
              <li>Turkse rijstpudding</li>
            </ul>
            <p className="signature-note">{`Iskender in plaats van de platter: + ${euro(ISKENDER_SUPPLEMENT)}`}</p>
          </div>
        </article>

        <div className="carte">
          <div className="carte-list">
            {food.map((cat) => (
              <div className="course" key={cat.id}>
                <div className="course-head" data-reveal>
                  <h3 className="course-title">{cat.title}</h3>
                  <span className="nj-label">{cat.kicker}</span>
                </div>
                <ul>
                  {dishesIn(cat.id).map((d) => (
                    <DishRow key={d.id} dish={d} onShow={setShown} active={shown.id === d.id} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <aside className="carte-preview" aria-hidden>
            <div className="preview-frame">
              {shown.photo && <img key={shown.id} src={photo(shown.photo)} alt="" className="preview-img" />}
              <div className="preview-cap">
                <span className="nj-label">{shown.name}</span>
                <span className="nj-mono">{euro(shown.price)}</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="bar-list" data-reveal>
          {drinks.map((cat) => (
            <div className="bar-col" key={cat.id}>
              <h3 className="nj-label">{cat.title}</h3>
              <ul>
                {dishesIn(cat.id).map((d) => (
                  <li key={d.id}>
                    <span className="bar-name">
                      {d.name}
                      {d.size ? <span className="bar-size">{d.size}</span> : null}
                    </span>
                    <span className="bar-price nj-mono">{euro(d.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="menu-notes" data-reveal>
          <div className="note-card">
            <span className="nj-label">Afhalen of cadeaubon?</span>
            <p className="note-big">{takeaway?.answer ?? 'Kan helaas niet!'}</p>
            <p>Ninja is er om aan tafel te eten: alles komt van het vuur, uit de oven of de pot, recht naar je bord.</p>
          </div>
          <div className="note-card">
            <span className="nj-label">Halal</span>
            <p className="note-big">Ja.</p>
            <p className="note-sub nj-label">Sauzen bij je kebab</p>
            <p>{sauces?.answer ?? SAUCES.join(', ')}</p>
          </div>
          <div className="note-card legend">
            <span className="nj-label">Allergenen</span>
            <ul className="legend-list">
              {(Object.keys(SHORT) as Allergen[]).map((a) => (
                <li key={a}>
                  <abbr className="alg" title={ALLERGENS[a]}>
                    {SHORT[a]}
                  </abbr>
                  <span>{ALLERGENS[a]}</span>
                </li>
              ))}
            </ul>
            <p className="legend-note">Een aanduiding op basis van de beschrijving op de kaart. Vraag het altijd aan de keuken.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DishRow({ dish, onShow, active }: { dish: Dish; onShow: (d: Dish) => void; active: boolean }) {
  const meats = dish.meats?.map((m) => MEATS[m].short).join(' · ');
  return (
    <li className={`dish${active ? ' is-active' : ''}`} onPointerEnter={() => onShow(dish)} onFocus={() => onShow(dish)} tabIndex={0} data-reveal>
      {dish.photo && <img className="dish-thumb" src={photo(dish.photo)} alt="" loading="lazy" />}
      <div className="dish-main">
        <div className="dish-top">
          <h4 className="dish-name">{dish.name}</h4>
          {dish.signature && <span className="tag sig">Signatuur</span>}
          {dish.isNew && <span className="tag">Nieuw</span>}
          {dish.veg && <span className="tag veg">Vegetarisch</span>}
          {dish.meats?.includes('falafel') && <span className="tag veg">Ook met falafel</span>}
        </div>
        {dish.desc && <p className="dish-desc">{dish.desc}</p>}
        <div className="dish-meta">
          {meats && <span className="dish-meats">{meats}</span>}
          {dish.allergens.length > 0 && (
            <span className="dish-alg">
              {dish.allergens.map((a) => (
                <abbr key={a} className="alg" title={ALLERGENS[a]}>
                  {SHORT[a]}
                </abbr>
              ))}
            </span>
          )}
          {dish.note && <span className="dish-note">{dish.note}</span>}
        </div>
      </div>
      <div className="dish-price">
        <span className="nj-mono">{euro(dish.price)}</span>
        {dish.price15 && <span className="dish-15 nj-mono">{`1,5× ${euro(dish.price15)}`}</span>}
      </div>
    </li>
  );
}
