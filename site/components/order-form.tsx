"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle, MapPin, Package, Phone, Truck, X } from "lucide-react";
import { business, services, type Language, type Service } from "@/lib/catalog";

export default function OrderForm({ language, initialService, onClose }: { language: Language; initialService: Service; onClose: () => void }) {
  const t = (kk: string, ru: string) => language === "kk" ? kk : ru;
  const dialog = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState<Service>(initialService);
  const [delivery, setDelivery] = useState(initialService === "event" ? "oral" : "pickup");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const requestId = useRef("");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  useEffect(() => {
    requestId.current = crypto.randomUUID();
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const data: Record<string, string | boolean> = {};
    for (const key of ["name", "phone", "event", "eventDate", "signText", "color", "details", "recipientName", "recipientPhone", "region", "city", "address", "apartment", "postalCode", "website"]) data[key] = String(form.get(key) || "").trim();
    Object.assign(data, { service, deliveryMethod: delivery, consent: form.get("consent") === "on", idempotencyKey: requestId.current });
    if (delivery === "oral") data.city = "Орал";
    setPending(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok || !result.reference) throw new Error(result.error || t("Өтінімді жіберу мүмкін болмады. Қайталап көріңіз.", "Не удалось отправить заявку. Попробуйте ещё раз."));
      setReference(result.reference);
      dialog.current?.scrollTo({ top: 0 });
    } catch (reason) {
      setError(reason instanceof Error && reason.name !== "TimeoutError" && reason.name !== "TypeError" ? reason.message : t("Байланысты тексеріп, қайталап көріңіз. Өтініміңіз қайталанып сақталмайды.", "Проверьте соединение и попробуйте снова. Повторная отправка не создаст дубликат заявки."));
    } finally { setPending(false); }
  }
  const field = (name: string, label: string, options: { required?: boolean; placeholder?: string; type?: string; autoComplete?: string; maxLength?: number } = {}) =>
    <label className="form-field" key={name}><span>{label}{options.required && <span aria-hidden="true"> *</span>}</span><input name={name} {...options} minLength={name === "name" || name === "recipientName" ? 2 : undefined} maxLength={options.maxLength ?? 100} /></label>;

  return <dialog ref={dialog} className="order-dialog" onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={onClose} aria-labelledby="order-title">
    <button className="dialog-close icon-button" type="button" aria-label={t("Жабу", "Закрыть")} disabled={pending} onClick={() => dialog.current?.close()}><X size={21} /></button>
    {reference ? <div className="order-success">
      <span className="success-symbol"><Check size={32} /></span>
      <p className="eyebrow">{t("Бәрі дайын", "Всё готово")}</p>
      <h2 id="order-title">{t("Идеяңыз бізге жетті.", "Ваша идея уже у нас.")}</h2>
      <p>{t("Өтініміңіз сақталды. Мәліметтерді, бағаны және жеткізуді келісу үшін сізге хабарласамыз.", "Заявка сохранена. Мы свяжемся с вами, чтобы согласовать детали, стоимость и доставку.")}</p>
      <div className="reference-box">{t("Өтінім нөмірі", "Номер заявки")} <strong>{reference}</strong></div>
      <a className="button button-primary" href={`${business.whatsapp}?text=${encodeURIComponent(t(`Сәлеметсіз бе! Менің өтінімім: ${reference}`, `Здравствуйте! Моя заявка: ${reference}`))}`} target="_blank" rel="noreferrer">{t("WhatsApp-та жалғастыру", "Продолжить в WhatsApp")}<ArrowUpRight size={17}/></a>
      <button className="text-button" onClick={() => dialog.current?.close()}>{t("Сайтқа оралу", "Вернуться на сайт")}</button>
    </div> : <div className="order-content">
      <p className="eyebrow">{t("Бір әдемі идеядан бастайық", "Начнём с красивой идеи")}</p>
      <h2 id="order-title">{t("Сіздің ерекше сәтіңіз.", "Ваш особенный момент.")}</h2>
      <p className="form-intro">{t("Қалауыңызды жазыңыз. Баға мен мерзімді жеке келісу үшін сізге хабарласамыз. Бұл төлемсіз өтінім.", "Расскажите о вашей идее. Мы свяжемся, чтобы обсудить стоимость и сроки. Заявка без оплаты.")}</p>
      <form onSubmit={submit}>
        <p className="required-note">{t("* Міндетті өрістер", "* Обязательные поля")}</p>
        <fieldset disabled={pending}>
          <legend className="form-legend"><span>01</span>{t("Танысайық", "Познакомимся")}</legend>
          <div className="form-grid">
            {field("name", t("Атыңыз", "Ваше имя"), { required: true, autoComplete: "name", placeholder: t("Есіміңіз", "Как к вам обращаться") })}
            {field("phone", t("Телефон / WhatsApp", "Телефон / WhatsApp"), { required: true, type: "tel", autoComplete: "tel", placeholder: "+7 707 123 45 67", maxLength: 30 })}
          </div>
          <div className="form-legend"><span>02</span>{t("Не жасаймыз?", "Что создадим?")}</div>
          <label className="form-field"><span>{t("Қызмет", "Услуга")} *</span><select name="service" value={service} onChange={(event) => { const next = event.target.value as Service; setService(next); if (next === "event") setDelivery("oral"); }}>{services.map(item => <option key={item.id} value={item.id}>{item[language]}</option>)}</select></label>
          <div className="form-grid">
            {field("event", t("Қандай шараға?", "Для какого события?"), { placeholder: t("Той, туған күн, ашылу…", "Свадьба, день рождения, открытие…"), maxLength: 200 })}
            <label className="form-field"><span>{t("Қажетті күн", "Желаемая дата")}</span><input type="date" name="eventDate" min={today}/></label>
            {field("signText", t("Жазу мәтіні", "Текст надписи"), { placeholder: t("Есім, тілек немесе бренд", "Имя, пожелание или бренд"), maxLength: 500 })}
            {field("color", t("Қалаған түстер", "Желаемые цвета"), { placeholder: t("Ақ, алтын түсті…", "Белый, золотой…") })}
          </div>
          <label className="form-field"><span>{t("Идеяңыз бен қосымша мәліметтер", "Ваша идея и дополнительные детали")}</span><textarea name="details" maxLength={3000} rows={3} placeholder={t("Өлшем, стиль, бюджет немесе ұнаған жұмыс. Фотоны кейін WhatsApp-та жібере аласыз.", "Размер, стиль, бюджет или понравившаяся работа. Фото можно прислать позже в WhatsApp.")}/></label>
          <div className="form-legend"><span>03</span>{t("Қайда жеткіземіз?", "Куда доставить?")}</div>
          {service === "event" ? <div className="delivery-note"><MapPin size={20}/><p>{t("Мерекені безендіру — Орал қаласында. Өтетін орынды төменде көрсетіңіз.", "Оформление мероприятий — в Уральске. Укажите место проведения ниже.")}</p></div> :
            <fieldset className="delivery-options"><legend className="sr-only">{t("Жеткізу тәсілі", "Способ доставки")}</legend>
              {[{ id: "pickup", title: t("Өзім алып кетемін", "Самовывоз"), sub: t("Орал қаласы", "Уральск"), icon: Package }, { id: "oral", title: t("Оралда жеткізу", "Доставка по Уральску"), sub: t("Мекенжайға", "По адресу"), icon: MapPin }, { id: "kazpost", title: t("Қазпошта", "Казпочта"), sub: t("Қазақстан бойынша", "По Казахстану"), icon: Truck }].map(item => <label className={`delivery-option ${delivery === item.id ? "selected" : ""}`} key={item.id}><input type="radio" name="delivery" value={item.id} checked={delivery === item.id} onChange={() => setDelivery(item.id)}/><item.icon size={19}/><span><strong>{item.title}</strong><small>{item.sub}</small></span></label>)}
            </fieldset>}
          {delivery !== "pickup" && <div className="form-grid">
            {field("recipientName", t("Алушының аты-жөні", "ФИО получателя"), { required: true, autoComplete: "shipping name" })}
            {field("recipientPhone", t("Алушының телефоны", "Телефон получателя"), { required: true, type: "tel", autoComplete: "shipping tel", placeholder: "+7 707 123 45 67", maxLength: 30 })}
          </div>}
          {delivery === "kazpost" && <div className="shipping-fields">
            <div className="delivery-note"><Truck size={20}/><p>{t("Бұйымды Қазпошта арқылы қолмен жөнелтуді ұйымдастырамыз. Қаптама, жеткізу мүмкіндігі, құны мен мерзімі менеджермен келісіледі. Фотозона пошта арқылы жіберілмейді.", "Отправку изделия Казпочтой организуем вручную. Упаковку, возможность отправки, стоимость и сроки согласуем с менеджером. Фотозоны почтой не отправляются.")}</p></div>
            <div className="form-grid">
              {field("region", t("Облыс", "Область"), { required: true, autoComplete: "shipping address-level1", placeholder: t("Батыс Қазақстан облысы", "Западно-Казахстанская область") })}
              <label className="form-field"><span>{t("Қала / елді мекен", "Город / населённый пункт")} *</span><input name="city" required maxLength={100} autoComplete="shipping address-level2" list="kazakhstan-cities" placeholder={t("Орал, Астана, Ақтөбе…", "Уральск, Астана, Актобе…")}/><datalist id="kazakhstan-cities">{["Орал / Уральск", "Астана", "Алматы", "Шымкент", "Ақтөбе / Актобе", "Атырау", "Ақтау / Актау", "Қарағанды / Караганда", "Қостанай / Костанай", "Павлодар", "Семей", "Өскемен / Усть-Каменогорск", "Тараз", "Қызылорда / Кызылорда", "Түркістан / Туркестан", "Петропавл / Петропавловск", "Көкшетау / Кокшетау", "Талдықорған / Талдыкорган", "Жезқазған / Жезказган"].map(city => <option key={city} value={city}/>)}</datalist></label>
            </div>
          </div>}
          {delivery !== "pickup" && <div className="form-grid">
            <label className="form-field field-wide"><span>{service === "event" ? t("Өтетін орын / толық мекенжай", "Место проведения / полный адрес") : t("Көше, үй нөмірі / толық мекенжай", "Улица, номер дома / полный адрес")} *</span><input name="address" required maxLength={500} autoComplete="shipping address-line1" placeholder={t("Көше атауы, үй нөмірі", "Название улицы, номер дома")}/></label>
            {field("apartment", t("Пәтер / кеңсе (міндетті емес)", "Квартира / офис (необязательно)"), { autoComplete: "shipping address-line2", maxLength: 50 })}
            {delivery === "kazpost" && field("postalCode", t("Пошта индексі", "Почтовый индекс"), { required: true, autoComplete: "shipping postal-code", placeholder: "090000 / A00A0A0", maxLength: 7 })}
          </div>}
          {delivery === "pickup" && <p className="field-help">{t("Алып кету орны мен уақытын тапсырыс дайын болғанда келісеміз.", "Место и время самовывоза согласуем, когда заказ будет готов.")}</p>}
          {delivery === "oral" && <p className="field-help">{t("Жеткізу және орнату құны мекенжай мен тапсырысқа байланысты жеке келісіледі.", "Стоимость доставки и установки согласуем отдельно с учётом адреса и заказа.")}</p>}
          <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
          <label className="consent-field"><input type="checkbox" name="consent" required/><span>{t("Өтінімімді өңдеу және маған хабарласу үшін деректерімді пайдалануға келісемін.", "Согласен на использование моих данных для обработки заявки и связи со мной.")} <a href="/privacy" target="_blank" rel="noreferrer">{t("Құпиялық туралы", "О конфиденциальности")}</a> *</span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary submit-button" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="spinning" size={18}/>{t("Жіберілуде…", "Отправляем…")}</> : <>{t("Өтінім жіберу", "Отправить заявку")}<ArrowUpRight size={18}/></>}</button>
          <p className="form-reassurance">{t("Онлайн төлем қажет емес. Соңғы бағаны бірге келісеміз.", "Без онлайн-оплаты. Итоговую стоимость согласуем вместе.")}</p>
        </fieldset>
      </form>
      <div className="dialog-contact"><span>{t("Сөйлескен ыңғайлы ма?", "Удобнее поговорить?")}</span><a href={`tel:${business.tel}`}><Phone size={14}/>{business.phone}</a></div>
    </div>}
  </dialog>;
}
