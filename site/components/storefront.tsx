"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Instagram, MapPin, Menu, Phone, Plus, Sparkles, Truck, X } from "lucide-react";
import { business, portfolio, services, type Language, type Service } from "@/lib/catalog";
import OrderForm from "./order-form";

export default function Storefront() {
  const [language, setLanguage] = useState<Language>("kk");
  const [menu, setMenu] = useState(false);
  const [order, setOrder] = useState<Service | null>(null);
  const [filter, setFilter] = useState("all");
  const t = (kk: string, ru: string) => language === "kk" ? kk : ru;
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const openOrder = (service: Service = "event") => { setOrder(service); setMenu(false); };
  const works = portfolio.filter(item => filter === "all" || item.category === filter);
  const filters = [
    { id: "all", text: t("Барлық жұмыстар", "Все работы") },
    { id: "celebration", text: t("Мерекелер", "События") },
    { id: "tradition", text: t("Ұлттық нақыш", "Национальный стиль") },
    { id: "light", text: t("Жарық пен жазулар", "Свет и надписи") },
  ];
  const faq = [
    [t("Тапсырыс бағасы қалай есептеледі?", "Как рассчитывается стоимость?"), t("Баға жұмыс түріне, өлшеміне, материалдарына, безендіру көлеміне және жеткізуге байланысты. Өтінімде қалауыңызды көрсетіңіз — мәліметтерді талқылап, нақты ұсыныс дайындаймыз. Сайтта өтінім беру тегін.", "Стоимость зависит от вида работы, размера, материалов, объёма оформления и доставки. Укажите пожелания в заявке — обсудим детали и подготовим предложение. Отправка заявки на сайте бесплатна.")],
    [t("Қанша уақыт бұрын хабарласу керек?", "За сколько времени нужно обратиться?"), t("Күніңіз белгілі болғанда хабарласқан дұрыс. Бос күнді, дайындау мен орнату мерзімін тапсырыстың күрделілігіне қарай бірге келісеміз.", "Лучше обратиться, как только известна дата. Свободную дату, сроки изготовления и монтажа согласуем в зависимости от сложности заказа.")],
    [t("Басқа қалаға жібересіздер ме?", "Отправляете в другие города?"), t("Неон, көлемді жазу және фото-холст сияқты бұйымдарды Қазақстан қалаларына Қазпошта арқылы жіберуді келісуге болады. Өтінімде алушының аты-жөнін, телефонын, облысын, қаласын, толық мекенжайы мен индексін көрсетіңіз. Жөнелту мүмкіндігі мен құнын жеке растаймыз. Мерекені безендіру Оралда орындалады.", "Отправку неона, объёмных надписей и фото на холсте в города Казахстана можно согласовать через Казпочту. В заявке укажите ФИО и телефон получателя, область, город, полный адрес и индекс. Возможность отправки и стоимость подтвердим отдельно. Мероприятия оформляем в Уральске.")],
    [t("Өз идеямды немесе суретімді жібере аламын ба?", "Можно прислать свою идею или фотографию?"), t("Әрине. Өтінімде идеяңызды сипаттаңыз, ал референс пен фотосуретті WhatsApp арқылы жіберіңіз. Эскиз, түс, өлшем және жазуды дайындауға дейін келісеміз.", "Конечно. Опишите идею в заявке, а референсы и фотографии пришлите в WhatsApp. Эскиз, цвет, размер и текст согласуем до изготовления.")],
    [t("Өтінімнен кейін не болады?", "Что будет после отправки заявки?"), t("Өтінім нөмірін аласыз. Командамыз көрсетілген телефон арқылы хабарласып, идеяны, қолжетімді күнді, бағаны және жеткізу тәсілін нақтылайды. Өтінім жіберу төлем жасауды білдірмейді.", "Вы получите номер заявки. Наша команда свяжется по указанному телефону, чтобы уточнить идею, доступную дату, стоимость и доставку. Отправка заявки не означает оплату.")],
  ];

  return <>
    <a className="skip-link" href="#main">{t("Негізгі мазмұнға өту", "Перейти к содержимому")}</a>
    <div className="announcement"><span>{t("Оралда жасалған. Сіз үшін ойластырылған.", "Создано в Уральске. Продумано для вас.")}</span><span><MapPin size={12}/>{t("Орал, Қазақстан", "Уральск, Казахстан")}</span></div>
    <header className="site-header">
      <a className="wordmark" href="#" aria-label="Muza Decors"><span>muza<span className="logo-star">✳</span></span><small>DECORS STUDIO</small></a>
      <nav className="desktop-nav" aria-label={t("Негізгі мәзір", "Основное меню")}><a href="#work">{t("Жұмыстар", "Работы")}</a><a href="#services">{t("Қызметтер", "Услуги")}</a><a href="#process">{t("Қалай жұмыс істейміз", "Как мы работаем")}</a><a href="#contact">{t("Байланыс", "Контакты")}</a></nav>
      <div className="header-actions"><div className="language-switch" aria-label={t("Тіл таңдау", "Выбор языка")}><button aria-pressed={language === "kk"} onClick={() => setLanguage("kk")}>ҚАЗ</button><span>/</span><button aria-pressed={language === "ru"} onClick={() => setLanguage("ru")}>РУС</button></div><button className="header-order" onClick={() => openOrder()}>{t("Идеяны талқылау", "Обсудить идею")}<ArrowUpRight size={16}/></button><button className="icon-button menu-toggle" aria-expanded={menu} aria-controls="mobile-nav" aria-label={menu ? t("Мәзірді жабу", "Закрыть меню") : t("Мәзірді ашу", "Открыть меню")} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div>
      {menu && <nav id="mobile-nav" className="mobile-nav" aria-label={t("Мобильді мәзір", "Мобильное меню")}>{[["#work", t("Жұмыстар", "Работы")], ["#services", t("Қызметтер", "Услуги")], ["#process", t("Қалай жұмыс істейміз", "Как мы работаем")], ["#contact", t("Байланыс", "Контакты")]].map(([href, label]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}<ArrowUpRight size={20}/></a>)}<a href={`tel:${business.tel}`}>{business.phone}<Phone size={18}/></a></nav>}
    </header>
    <main id="main">
      <section className="hero section-shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="tiny-star">✳</span>{t("Мереке декоры және ерекше бұйымдар", "Декор событий и особенные детали")}</p>
          <h1 id="hero-title">{t("Әр сәттің", "У каждого")}<br/>{t("өз ", "момента — ")}<em>{t("музасы", "своя")}</em><br/>{t("бар.", "муза.")}</h1>
          <p className="hero-description">{t("Үлкен қуаныштан ең нәзік детальға дейін. Мерекеңіздің мінезін ашып, естелікке айналатын әсемдік жасаймыз.", "От большого праздника до самой нежной детали. Раскрываем характер вашего события и создаём красоту, которая становится воспоминанием.")}</p>
          <div className="hero-buttons"><button className="button button-primary" onClick={() => openOrder()}>{t("Идеяны талқылау", "Обсудить идею")}<ArrowUpRight size={18}/></button><a className="text-link" href="#work">{t("Жұмыстар", "Работы")}<ArrowDown size={15}/></a></div>
          <div className="hero-bottom"><span className="hero-note-line"/><span>{t("Сіздің идеяңыз. Біздің қолтаңбамыз.", "Ваша идея. Наш почерк.")}</span></div>
        </div>
        <div className="hero-art">
          <div className="hero-image-main"><img src="/images/muza-0.jpg" alt={t("Muza Decors жұмысы: жасыл маталар, ақ гүлдер мен хрусталь шамнан жасалған декор", "Работа Muza Decors: изумрудные драпировки, белые цветы и хрустальная люстра")} width={360} height={640} fetchPriority="high"/><div className="image-caption"><span>MUZA / SELECTED WORK</span><span>01 — 2026</span></div></div>
          <div className="hero-image-detail"><img src="/images/muza-10.jpg" width={480} height={640} alt={t("Күміс шарлар мен ақ гүлдердің үйлесімі", "Сочетание серебристых шаров и белых цветов")}/><span>{t("Әсемдік — әр детальда", "Красота — в деталях")}</span></div>
          <div className="hero-seal" aria-label={t("Оралда сүйіспеншілікпен жасалған", "Создано с любовью в Уральске")}><span>MADE WITH</span><Sparkles size={25} strokeWidth={1}/><span>LOVE · ORAL</span></div>
          <span className="hero-vertical">EVENTS · NEON · LETTERING · CANVAS</span>
        </div>
      </section>
      <div className="studio-strip"><span>{t("Мерекелер", "События")}</span><span aria-hidden="true">✳</span><span>{t("Неон", "Неон")}</span><span aria-hidden="true">✳</span><span>{t("Көлемді жазулар", "Объёмные надписи")}</span><span aria-hidden="true">✳</span><span>{t("Фото-холст", "Фото на холсте")}</span><span aria-hidden="true">✳</span><span>{t("Ерекше естеліктер", "Особенные воспоминания")}</span></div>

      <section className="work-section section-shell section-space" id="work" aria-labelledby="work-title">
        <div className="section-top"><div><p className="eyebrow">01 / {t("Біздің қолтаңбамыз", "Наш почерк")}</p><h2 id="work-title">{t("Идеядан — ", "Из идеи — ")}<em>{t("әсемдікке.", "в красоту.")}</em></h2></div><p className="section-description">{t("Өз мерекеңізге шабыт іздеңіз. Әр жұмыстың артында біреудің ерекше күні бар.", "Найдите вдохновение для своего праздника. За каждой работой — чей-то особенный день.")}</p></div>
        <div className="portfolio-toolbar"><div className="filter-list" role="group" aria-label={t("Жұмыстар санаты", "Категория работ")}>{filters.map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.text}{filter === item.id && <span aria-hidden="true">↗</span>}</button>)}</div><a className="instagram-label" href={business.instagram} target="_blank" rel="noreferrer"><Instagram size={15}/>@muza_decors<ArrowUpRight size={14}/></a></div>
        <div className="portfolio-grid" aria-live="polite">{works.map((item, index) => <a className="work-card" href={item.source} target="_blank" rel="noreferrer" key={item.image} aria-label={`${item[language]} — Instagram`}>
          <div className="work-image"><img src={`/images/muza-${item.image}.jpg`} alt={language === "kk" ? item.altKk : item.altRu} width={360} height={640} loading="lazy"/><span className="work-number">{String(portfolio.indexOf(item) + 1).padStart(2, "0")}</span><span className="work-open"><ArrowUpRight size={21}/></span><span className="work-image-label">{t("Instagram-да көру", "Смотреть в Instagram")}</span></div>
          <div className="work-caption"><div><h3>{item[language]}</h3><p>{language === "kk" ? item.typeKk : item.typeRu}</p></div><ArrowUpRight size={20} strokeWidth={1}/></div>
        </a>)}</div>
        <div className="portfolio-bottom"><p>{t("Барлық фотосуреттер — Muza Decors Instagram парақшасынан.", "Все фотографии — из Instagram Muza Decors.")}</p><a className="text-link" href={business.instagram} target="_blank" rel="noreferrer">{t("Instagram-да көбірек шабыт", "Больше вдохновения в Instagram")}<ArrowUpRight size={16}/></a></div>
      </section>

      <section className="services-section" id="services" aria-labelledby="services-title">
        <div className="section-shell section-space">
          <div className="section-top"><div><p className="eyebrow">02 / {t("Не жасаймыз", "Что мы создаём")}</p><h2 id="services-title">{t("Бір идея.", "Одна идея.")}<br/><em>{t("Түрлі мүмкіндіктер.", "Много возможностей.")}</em></h2></div><div className="service-intro"><span className="decor-flower" aria-hidden="true">✳</span><p>{t("Кеңістікті безендіру немесе шағын, бірақ маңызды деталь. Сізге керегін бірге табамыз.", "Оформление пространства или небольшая, но важная деталь. Вместе найдём то, что нужно вам.")}</p></div></div>
          <div className="service-list">{services.map((service, index) => <button className="service-row" key={service.id} onClick={() => openOrder(service.id)}><span className="service-number">0{index + 1}</span><h3>{service[language]}</h3><div><p>{service.description[language]}</p><span className="service-detail">{service.detail[language]}</span></div><span className="service-arrow"><ArrowUpRight strokeWidth={1} size={27}/></span></button>)}</div>
        </div>
      </section>

      <section className="process-section section-shell section-space" id="process" aria-labelledby="process-title">
        <div className="section-top"><div><p className="eyebrow">03 / {t("Бәрі қарапайым", "Всё просто")}</p><h2 id="process-title">{t("Сіз армандайсыз.", "Вы мечтаете.")}<br/><em>{t("Біз іске асырамыз.", "Мы воплощаем.")}</em></h2></div><p className="section-description">{t("Алғашқы хабарламадан дайын жұмысқа дейін — әр қадамды бірге келісеміз.", "От первого сообщения до готовой работы — согласуем с вами каждый шаг.")}</p></div>
        <div className="process-grid">{[
          [t("Ойыңызды бөлісіңіз", "Поделитесь идеей"), t("Қызметті таңдап, қалауыңызды жазыңыз. Не жай ғана WhatsApp-та сәлемдесіңіз.", "Выберите услугу и расскажите о пожеланиях. Или просто напишите нам в WhatsApp.")],
          [t("Детальдарды келісеміз", "Согласуем детали"), t("Стиль, түс, өлшем, мерзім мен бағаны нақтылап, сізге сай шешім табамыз.", "Уточним стиль, цвет, размер, сроки и стоимость. Найдём решение для вас.")],
          [t("Әсемдікке айналдырамыз", "Превратим в красоту"), t("Келісілген идеяны дайындап, орнату, алып кету не жөнелту уақытын белгілейміз.", "Создадим согласованную работу и договоримся об установке, самовывозе или отправке.")],
        ].map(([title, description], index) => <article className="process-step" key={title}><div className="step-heading"><span>0{index + 1}</span>{index < 2 ? <ArrowRight size={23} strokeWidth={1}/> : <Check size={23} strokeWidth={1}/>}</div><h3>{title}</h3><p>{description}</p></article>)}</div>
        <div className="shipping-banner"><div className="shipping-icon"><Truck size={27} strokeWidth={1.2}/></div><div><p className="eyebrow">{t("Әсемдік шекара талғамайды", "Красота путешествует")}</p><h3>{t("Оралдан — Қазақстанның басқа қалаларына.", "Из Уральска — в другие города Казахстана.")}</h3><p>{t("Неон, жазулар мен фото-холстты Қазпошта арқылы жіберуді ұйымдастырамыз. Мекенжайыңызды қалдырыңыз — жеткізу мүмкіндігі мен құнын жеке келісеміз.", "Организуем отправку неона, надписей и фото на холсте Казпочтой. Оставьте адрес — возможность и стоимость доставки согласуем отдельно.")}</p></div><button className="text-link" onClick={() => openOrder("lettering")}>{t("Бұйымға тапсырыс беру", "Заказать изделие")}<ArrowUpRight size={18}/></button></div>
      </section>

      <section className="faq-section section-shell" id="faq" aria-labelledby="faq-title"><div><p className="eyebrow">04 / {t("Сұрақтарыңызға жауап", "Ответы на ваши вопросы")}</p><h2 id="faq-title">{t("Білгіңіз ", "Возможно,")}<br/><em>{t("келгені.", "вам интересно.")}</em></h2><a className="text-link" href={business.whatsapp} target="_blank" rel="noreferrer">{t("Өз сұрағымды қою", "Задать свой вопрос")}<ArrowUpRight size={16}/></a></div><div className="faq-list">{faq.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={19}/></summary><p>{answer}</p></details>)}</div></section>

      <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="contact-pattern" aria-hidden="true">✳</div><div className="section-shell contact-content"><p className="eyebrow">{t("Әдемі оқиға осы жерден басталады", "Красивая история начинается здесь")}</p><h2 id="contact-title">{t("Бірге ерекше", "Создадим что-то")}<br/><em>{t("дүние жасайық.", "особенное вместе.")}</em></h2><p>{t("Идеяңыз дайын болмаса да, әңгімеден бастаймыз.", "Даже если идея ещё не сложилась, начнём с разговора.")}</p><div className="contact-buttons"><button className="button button-cream" onClick={() => openOrder()}>{t("Өтінім қалдыру", "Оставить заявку")}<ArrowUpRight size={19}/></button><a className="button button-outline-light" href={business.whatsapp} target="_blank" rel="noreferrer">WhatsApp<ArrowUpRight size={18}/></a></div><a className="contact-phone" href={`tel:${business.tel}`}><Phone size={15}/>{business.phone}</a></div></section>
    </main>
    <footer className="site-footer section-shell"><div className="footer-top"><a className="wordmark" href="#" aria-label="Muza Decors"><span>muza<span className="logo-star">✳</span></span><small>DECORS STUDIO</small></a><p>{t("Сіздің сәттеріңізге мән береміз.", "Придаём значение вашим моментам.")}</p><a href={business.instagram} target="_blank" rel="noreferrer"><Instagram size={19}/>@muza_decors<ArrowUpRight size={15}/></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Muza Decors · {t("Орал, Қазақстан", "Уральск, Казахстан")}</span><div><a href="/privacy">{t("Құпиялық", "Конфиденциальность")}</a><a href="/admin">{t("Әкімшіге", "Администратору")}</a></div><span>{t("Сүйіспеншілікпен жасалған", "Создано с любовью")} ✳</span></div></footer>
    <div className="mobile-order-bar"><a href={`tel:${business.tel}`} aria-label={t("Қоңырау шалу", "Позвонить")}><Phone size={19}/></a><button onClick={() => openOrder()}>{t("Идеяны талқылайық", "Обсудим вашу идею")}<ArrowUpRight size={18}/></button></div>
    {order && <OrderForm language={language} initialService={order} onClose={() => setOrder(null)}/>}
  </>;
}
