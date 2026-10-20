import { ArrowUpRight, Instagram } from "lucide-react";
import type { Language } from "@/lib/catalog";
import styles from "./instagram-highlights.module.css";

const highlights = [
  { id: "17878159200385352", kk: "Қыз ұзату", ru: "Қыз ұзату", en: "Qyz uzatu" },
  { id: "18066979457266683", kk: "Үйлену тойы", ru: "Свадьба", en: "Weddings" },
  { id: "18153360547401322", kk: "Балалар мерекесі", ru: "Детские праздники", en: "Children’s parties" },
  { id: "18313430872203078", kk: "Сырғалым", ru: "Сырғалым", en: "Syrgalym" },
  { id: "18074381300275953", kk: "Мерейтой", ru: "Юбилей", en: "Milestone birthdays" },
  { id: "17847313278330818", kk: "Фото-холст", ru: "Фото на холсте", en: "Canvas prints" },
  { id: "17927145389794640", kk: "Көлемді жазулар", ru: "3D-надписи", en: "3D lettering" },
] as const;

export default function InstagramHighlights({ language }: { language: Language }) {
  const t = (kk: string, ru: string, en: string) => ({ kk, ru, en })[language];
  return <section className={`section-shell ${styles.section}`} aria-labelledby="highlights-title">
    <div className={styles.heading}>
      <div>
        <p className="eyebrow"><Instagram size={15}/>{t("Instagram жинақтары", "Подборки Instagram", "Instagram highlights")}</p>
        <h2 id="highlights-title">{t("Тағы да шабыт.", "Ещё больше вдохновения.", "More to inspire you.")}</h2>
      </div>
      <p className={styles.description}>{t(
        "Жұмыстарымызды тақырып бойынша қараңыз. Әр жинақ Instagram-да ашылады.",
        "Смотрите наши работы по темам. Каждая подборка открывается в Instagram.",
        "Explore our work by occasion. Each collection opens on Instagram.",
      )}</p>
    </div>
    <ul className={styles.grid}>
      {highlights.map((item, index) => <li key={item.id}>
        <a className={styles.card} href={`https://www.instagram.com/stories/highlights/${item.id}/`} target="_blank" rel="noopener noreferrer" aria-label={`${item[language]} — ${t("Instagram-да ашу, жаңа бет", "открыть в Instagram, новая вкладка", "open on Instagram, new tab")}`}>
          <span className={styles.cover}><img src={`/images/highlight-${index}.jpg`} width={150} height={150} alt="" loading="lazy"/></span>
          <span className={styles.label}>{item[language]}<ArrowUpRight size={14}/></span>
        </a>
      </li>)}
    </ul>
    <p className={styles.note}>{t(
      "Толық stories-ті көру үшін Instagram аккаунтына кіру қажет болуы мүмкін.",
      "Для просмотра полных историй может потребоваться вход в Instagram.",
      "Instagram may ask you to sign in to view the full stories.",
    )}</p>
  </section>;
}
