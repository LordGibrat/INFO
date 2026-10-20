"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle, MapPin, Package, Phone, Truck, X } from "lucide-react";
import { business, services, type Language, type Service } from "@/lib/catalog";

export default function OrderForm({ language, initialService, onClose }: { language: Language; initialService: Service; onClose: () => void }) {
  const t = (kk: string, ru: string, en: string) => language === "kk" ? kk : language === "ru" ? ru : en;
  const dialog = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState<Service>(initialService);
  const [delivery, setDelivery] = useState(initialService === "event" ? "oral" : "pickup");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"" | "validation" | "duplicate" | "limited" | "unavailable" | "network">("");
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
      if (!response.ok) {
        setError(response.status === 400 ? "validation" : response.status === 409 ? "duplicate" : response.status === 429 ? "limited" : "unavailable");
        return;
      }
      if (typeof result.reference !== "string" || !result.reference.trim() || result.reference.length > 100) {
        setError("unavailable");
        return;
      }
      setReference(result.reference);
      dialog.current?.scrollTo({ top: 0 });
    } catch {
      setError("network");
    } finally { setPending(false); }
  }
  const field = (name: string, label: string, options: { required?: boolean; placeholder?: string; type?: string; autoComplete?: string; maxLength?: number } = {}) =>
    <label className="form-field" key={name}><span>{label}{options.required && <span aria-hidden="true"> *</span>}</span><input name={name} {...options} minLength={name === "name" || name === "recipientName" ? 2 : undefined} maxLength={options.maxLength ?? 100} /></label>;

  const errors = {
    validation: t("Міндетті өрістерді, телефон нөмірін және жеткізу мекенжайын тексеріңіз.", "Проверьте обязательные поля, номер телефона и адрес доставки.", "Check the required fields, phone number and delivery address."),
    duplicate: t("Алдыңғы өтініміңіз басқа мәліметтермен сақталған. Өзгерістерді келісу үшін бізге хабарласыңыз.", "Предыдущая заявка сохранена с другими данными. Свяжитесь с нами, чтобы согласовать изменения.", "An earlier request was saved with different details. Contact us to arrange any changes."),
    limited: t("Өтінімдер тым жиі жіберілді. Біраз күтіп, қайта көріңіз немесе бізге хабарласыңыз.", "Слишком много отправок. Подождите немного и попробуйте снова или свяжитесь с нами.", "Too many requests. Wait a little and try again, or contact us."),
    unavailable: t("Өтінімнің сақталғанын растай алмадық. Қайталап көріңіз немесе бізге хабарласыңыз.", "Не удалось подтвердить сохранение заявки. Попробуйте снова или свяжитесь с нами.", "We could not confirm that your request was saved. Try again or contact us."),
    network: t("Байланысты тексеріп, сол мәліметтермен қайталап көріңіз. Қайта жіберу өтінімнің көшірмесін жасамайды.", "Проверьте соединение и повторите отправку с теми же данными. Повторная отправка не создаст дубликат заявки.", "Check your connection and try again with the same details. Retrying will not create a duplicate request."),
  };
  const citySuggestions = [
    t("Орал", "Уральск", "Oral (Uralsk)"), t("Астана", "Астана", "Astana"), t("Алматы", "Алматы", "Almaty"),
    t("Шымкент", "Шымкент", "Shymkent"), t("Ақтөбе", "Актобе", "Aktobe"), t("Атырау", "Атырау", "Atyrau"),
    t("Ақтау", "Актау", "Aktau"), t("Қарағанды", "Караганда", "Karaganda"), t("Қостанай", "Костанай", "Kostanay"),
    t("Павлодар", "Павлодар", "Pavlodar"), t("Семей", "Семей", "Semey"), t("Өскемен", "Усть-Каменогорск", "Oskemen"),
    t("Тараз", "Тараз", "Taraz"), t("Қызылорда", "Кызылорда", "Kyzylorda"), t("Түркістан", "Туркестан", "Turkistan"),
    t("Петропавл", "Петропавловск", "Petropavl"), t("Көкшетау", "Кокшетау", "Kokshetau"),
    t("Талдықорған", "Талдыкорган", "Taldykorgan"), t("Жезқазған", "Жезказган", "Zhezkazgan"),
  ];

  return <dialog ref={dialog} className="order-dialog" lang={language} onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={onClose} aria-labelledby="order-title">
    <button className="dialog-close icon-button" type="button" aria-label={t("Жабу", "Закрыть", "Close")} disabled={pending} onClick={() => dialog.current?.close()}><X size={21} /></button>
    {reference ? <div className="order-success">
      <span className="success-symbol"><Check size={32} /></span>
      <p className="eyebrow">{t("Бәрі дайын", "Всё готово", "Request received")}</p>
      <h2 id="order-title">{t("Идеяңыз бізге жетті.", "Ваша идея уже у нас.", "Your idea is with us.")}</h2>
      <p>{t("Өтініміңіз сақталды. Мәліметтерді, бағаны және жеткізуді келісу үшін сізге хабарласамыз.", "Заявка сохранена. Мы свяжемся с вами, чтобы согласовать детали, стоимость и доставку.", "Your request has been saved. We will contact you to confirm the details, price and delivery.")}</p>
      <div className="reference-box">{t("Өтінім нөмірі", "Номер заявки", "Request reference")} <strong>{reference}</strong></div>
      <a className="button button-primary" href={`${business.whatsapp}?text=${encodeURIComponent(t(`Сәлеметсіз бе! Менің өтінімім: ${reference}`, `Здравствуйте! Моя заявка: ${reference}`, `Hello! My order request reference is ${reference}.`))}`} target="_blank" rel="noreferrer">{t("WhatsApp-та жалғастыру", "Продолжить в WhatsApp", "Continue on WhatsApp")}<ArrowUpRight size={17}/></a>
      <button className="text-button" onClick={() => dialog.current?.close()}>{t("Сайтқа оралу", "Вернуться на сайт", "Back to the website")}</button>
    </div> : <div className="order-content">
      <p className="eyebrow">{t("Бір әдемі идеядан бастайық", "Начнём с красивой идеи", "Let’s start with a beautiful idea")}</p>
      <h2 id="order-title">{t("Сіздің ерекше сәтіңіз.", "Ваш особенный момент.", "Your special moment.")}</h2>
      <p className="form-intro">{t("Қалауыңызды жазыңыз. Баға мен мерзімді жеке келісу үшін сізге хабарласамыз. Бұл төлемсіз өтінім.", "Расскажите о вашей идее. Мы свяжемся, чтобы обсудить стоимость и сроки. Заявка без оплаты.", "Tell us what you have in mind. We will contact you to discuss pricing and timing. No payment is required to send a request.")}</p>
      <form onSubmit={submit}>
        <p className="required-note">{t("* Міндетті өрістер", "* Обязательные поля", "* Required fields")}</p>
        <fieldset disabled={pending}>
          <legend className="form-legend"><span>01</span>{t("Танысайық", "Познакомимся", "Let’s get acquainted")}</legend>
          <div className="form-grid">
            {field("name", t("Атыңыз", "Ваше имя", "Your name"), { required: true, autoComplete: "name", placeholder: t("Есіміңіз", "Как к вам обращаться", "How should we address you?") })}
            {field("phone", t("Телефон / WhatsApp", "Телефон / WhatsApp", "Phone / WhatsApp"), { required: true, type: "tel", autoComplete: "tel", placeholder: "+7 707 123 45 67", maxLength: 30 })}
          </div>
          <div className="form-legend"><span>02</span>{t("Не жасаймыз?", "Что создадим?", "What shall we create?")}</div>
          <label className="form-field"><span>{t("Қызмет", "Услуга", "Service")} *</span><select name="service" value={service} onChange={(event) => { const next = event.target.value as Service; setService(next); if (next === "event") setDelivery("oral"); }}>{services.map(item => <option key={item.id} value={item.id}>{item[language]}</option>)}</select></label>
          <div className="form-grid">
            {field("event", t("Қандай шараға?", "Для какого события?", "What is the occasion?"), { placeholder: t("Той, туған күн, ашылу…", "Свадьба, день рождения, открытие…", "Wedding, birthday, opening…"), maxLength: 200 })}
            <label className="form-field"><span>{t("Қажетті күн", "Желаемая дата", "Preferred date")}</span><input type="date" name="eventDate" min={today}/></label>
            {field("signText", t("Жазу мәтіні", "Текст надписи", "Text for your design"), { placeholder: t("Есім, тілек немесе бренд", "Имя, пожелание или бренд", "A name, message or brand"), maxLength: 500 })}
            {field("color", t("Қалаған түстер", "Желаемые цвета", "Preferred colours"), { placeholder: t("Ақ, алтын түсті…", "Белый, золотой…", "White, gold…") })}
          </div>
          <label className="form-field"><span>{t("Идеяңыз бен қосымша мәліметтер", "Ваша идея и дополнительные детали", "Your idea and additional details")}</span><textarea name="details" maxLength={3000} rows={3} placeholder={t("Өлшем, стиль, бюджет немесе ұнаған жұмыс. Фотоны кейін WhatsApp-та жібере аласыз.", "Размер, стиль, бюджет или понравившаяся работа. Фото можно прислать позже в WhatsApp.", "Size, style, budget or an example you like. You can send photos on WhatsApp later.")}/></label>
          <div className="form-legend"><span>03</span>{t("Қайда жеткіземіз?", "Куда доставить?", "Where should we deliver?")}</div>
          {service === "event" ? <div className="delivery-note"><MapPin size={20}/><p>{t("Мерекені безендіру — Орал қаласында. Өтетін орынды төменде көрсетіңіз.", "Оформление мероприятий — в Уральске. Укажите место проведения ниже.", "Event decoration is available in Oral (Uralsk). Enter the venue address below.")}</p></div> :
            <fieldset className="delivery-options"><legend className="sr-only">{t("Жеткізу тәсілі", "Способ доставки", "Delivery method")}</legend>
              {[{ id: "pickup", title: t("Өзім алып кетемін", "Самовывоз", "Collect in person"), sub: t("Орал қаласы", "Уральск", "Oral (Uralsk)"), icon: Package }, { id: "oral", title: t("Оралда жеткізу", "Доставка по Уральску", "Local delivery"), sub: t("Мекенжайға", "По адресу", "In Oral (Uralsk)"), icon: MapPin }, { id: "kazpost", title: t("Қазпошта", "Казпочта", "Kazpost"), sub: t("Қазақстан бойынша", "По Казахстану", "Across Kazakhstan"), icon: Truck }].map(item => <label className={`delivery-option ${delivery === item.id ? "selected" : ""}`} key={item.id}><input type="radio" name="delivery" value={item.id} checked={delivery === item.id} onChange={() => setDelivery(item.id)}/><item.icon size={19}/><span><strong>{item.title}</strong><small>{item.sub}</small></span></label>)}
            </fieldset>}
          {delivery !== "pickup" && <div className="form-grid">
            {field("recipientName", t("Алушының аты-жөні", "ФИО получателя", "Recipient’s full name"), { required: true, autoComplete: "shipping name" })}
            {field("recipientPhone", t("Алушының телефоны", "Телефон получателя", "Recipient’s phone number"), { required: true, type: "tel", autoComplete: "shipping tel", placeholder: "+7 707 123 45 67", maxLength: 30 })}
          </div>}
          {delivery === "kazpost" && <div className="shipping-fields">
            <div className="delivery-note"><Truck size={20}/><p>{t("Бұйымды Қазпошта арқылы қолмен жөнелтуді ұйымдастырамыз. Қаптама, жеткізу мүмкіндігі, құны мен мерзімі менеджермен келісіледі. Фотозона пошта арқылы жіберілмейді.", "Отправку изделия Казпочтой организуем вручную. Упаковку, возможность отправки, стоимость и сроки согласуем с менеджером. Фотозоны почтой не отправляются.", "We arrange shipment of physical items through Kazpost manually. Our team will confirm packaging, whether the item can be shipped, cost and timing. Event backdrops cannot be sent by post.")}</p></div>
            <div className="form-grid">
              {field("region", t("Облыс", "Область", "Region"), { required: true, autoComplete: "shipping address-level1", placeholder: t("Батыс Қазақстан облысы", "Западно-Казахстанская область", "West Kazakhstan Region") })}
              <label className="form-field"><span>{t("Қала / елді мекен", "Город / населённый пункт", "City / town / village")} *</span><input name="city" required maxLength={100} autoComplete="shipping address-level2" list="kazakhstan-cities" placeholder={t("Орал, Астана, Ақтөбе…", "Уральск, Астана, Актобе…", "Oral, Astana, Aktobe…")}/><datalist id="kazakhstan-cities">{citySuggestions.map(city => <option key={city} value={city}/>)}</datalist></label>
            </div>
          </div>}
          {delivery !== "pickup" && <div className="form-grid">
            <label className="form-field field-wide"><span>{service === "event" ? t("Өтетін орын / толық мекенжай", "Место проведения / полный адрес", "Venue / full address") : t("Көше, үй нөмірі / толық мекенжай", "Улица, номер дома / полный адрес", "Street, building number / full address")} *</span><input name="address" required maxLength={500} autoComplete="shipping address-line1" placeholder={t("Көше атауы, үй нөмірі", "Название улицы, номер дома", "Street name and building number")}/></label>
            {field("apartment", t("Пәтер / кеңсе (міндетті емес)", "Квартира / офис (необязательно)", "Apartment / office (optional)"), { autoComplete: "shipping address-line2", maxLength: 50 })}
            {delivery === "kazpost" && field("postalCode", t("Пошта индексі", "Почтовый индекс", "Postal code"), { required: true, autoComplete: "shipping postal-code", placeholder: "090000 / A00A0A0", maxLength: 7 })}
          </div>}
          {delivery === "pickup" && <p className="field-help">{t("Алып кету орны мен уақытын тапсырыс дайын болғанда келісеміз.", "Место и время самовывоза согласуем, когда заказ будет готов.", "We will arrange the collection location and time when your order is ready.")}</p>}
          {delivery === "oral" && <p className="field-help">{t("Жеткізу және орнату құны мекенжай мен тапсырысқа байланысты жеке келісіледі.", "Стоимость доставки и установки согласуем отдельно с учётом адреса и заказа.", "Delivery and installation costs are agreed separately based on your address and order.")}</p>}
          <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
          <label className="consent-field"><input type="checkbox" name="consent" required/><span>{t("Өтінімімді өңдеу және маған хабарласу үшін деректерімді пайдалануға келісемін.", "Согласен на использование моих данных для обработки заявки и связи со мной.", "I agree to the use of my personal data to process this request and contact me.")} <a href={`/privacy?lang=${language}`} target="_blank" rel="noreferrer">{t("Құпиялық туралы", "О конфиденциальности", "Privacy policy")}</a> *</span></label>
          {error && <p className="form-error" role="alert">{errors[error]}</p>}
          <button className="button button-primary submit-button" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="spinning" size={18}/>{t("Жіберілуде…", "Отправляем…", "Sending…")}</> : <>{t("Тапсырыс беру", "Отправить заказ", "Send order request")}<ArrowUpRight size={18}/></>}</button>
          <p className="form-reassurance">{t("Онлайн төлем қажет емес. Соңғы бағаны бірге келісеміз.", "Без онлайн-оплаты. Итоговую стоимость согласуем вместе.", "No online payment is required. We will agree the final price with you.")}</p>
        </fieldset>
      </form>
      <div className="dialog-contact"><span>{t("Сөйлескен ыңғайлы ма?", "Удобнее поговорить?", "Prefer to talk?")}</span><a href={`tel:${business.tel}`}><Phone size={14}/>{business.phone}</a></div>
    </div>}
  </dialog>;
}
