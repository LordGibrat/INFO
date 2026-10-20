"use client";

import { business, type Language } from "@/lib/catalog";
import { useLanguage } from "@/lib/language";

const content = {
  kk: {
    language:"Тіл",back:"Сайтқа оралу",title:"Құпиялық туралы",
    intro:"Muza Decors өтініміңізді қабылдау, сізбен байланысу, бұйымды дайындау және келісілген жеткізуді ұйымдастыру үшін берген деректеріңізді пайдаланады.",
    sections:[
      {title:"Қандай мәліметтерді сұраймыз?",text:"Атыңыз, телефон нөміріңіз, таңдаған қызметіңіз, іс-шара немесе бұйым туралы мәліметтер. Жеткізу қажет болса, алушының аты-жөні, телефоны, облыс, қала, толық мекенжай, пәтер және пошта индексі сұралады. Міндетті өрістер өтінімде жұлдызшамен белгіленген. Төлем картасының мәліметтері сұралмайды."},
      {title:"Деректер қалай қолданылады?",text:"Өтінім қорғалған тапсырыстар жүйесінде сақталады және оған тапсырысты өңдейтін әкімші қол жеткізе алады. Әкімші тапсырыстарды Excel файлына экспорттап, рұқсат етілген өзгерістерді қайта импорттай алады. Microsoft Excel Online байланысы іске қосылса, тапсырыс мәліметтері бизнестің сол жұмыс кітабымен синхрондалады. Жеткізуді келіскен кезде, оған қажетті алушы мәліметтері тасымалдаушыға беріледі."},
      {title:"Үшінші тарап сілтемелері",text:"Instagram және WhatsApp сілтемелерін ашқанда, сол қызметтердің ережелері қолданылады. Сайттағы жұмыстардың фотосуреттері Muza Decors Instagram парақшасынан алынған."},
    ],
    rightsTitle:"Түзету немесе жою",rightsBefore:"Өз деректеріңізді түзету немесе жою туралы сұрауды",rightsMiddle:"нөмірі арқылы не",rightsLink:"WhatsApp-та",rightsAfter:"жіберіңіз. Өтінім нөмірін көрсетсеңіз, оны тезірек табамыз.",
    cookiesTitle:"Cookie және тіл таңдауы",cookies:"Әкімші бетінде қауіпсіз кіру сессиясына арналған қызметтік cookie пайдаланылады. Microsoft қосылымын бастағанда, кіруді растау үшін уақытша cookie қолданылуы мүмкін. Клиентке өтінім жіберу үшін тіркелу қажет емес. Таңдалған тіл келесі беттерде сақталуы үшін браузердің жергілікті жадында сақталады; браузер жадын тазалау арқылы бұл таңдауды өшіре аласыз.",
  },
  ru: {
    language:"Язык",back:"Вернуться на сайт",title:"О конфиденциальности",
    intro:"Muza Decors использует предоставленные вами данные для приёма заявки, связи с вами, изготовления изделия и организации согласованной доставки.",
    sections:[
      {title:"Какие данные мы запрашиваем?",text:"Ваше имя, номер телефона, выбранную услугу и сведения о событии или изделии. Если нужна доставка, мы запрашиваем ФИО и телефон получателя, область, город, полный адрес, квартиру и почтовый индекс. Обязательные поля отмечены звёздочкой в форме. Данные банковской карты не запрашиваются."},
      {title:"Как используются данные?",text:"Заявка хранится в защищённой системе заказов и доступна администратору, который её обрабатывает. Администратор может экспортировать заказы в Excel и импортировать разрешённые изменения. Если подключён Microsoft Excel Online, данные заказов синхронизируются с рабочей книгой бизнеса. После согласования доставки необходимые сведения о получателе передаются перевозчику."},
      {title:"Ссылки на сторонние сервисы",text:"При переходе по ссылкам Instagram и WhatsApp действуют правила этих сервисов. Фотографии работ на сайте взяты из аккаунта Muza Decors в Instagram."},
    ],
    rightsTitle:"Исправление или удаление",rightsBefore:"Чтобы запросить исправление или удаление своих данных, свяжитесь с нами по номеру",rightsMiddle:"или через",rightsLink:"WhatsApp",rightsAfter:". Укажите номер заявки, чтобы мы быстрее нашли ваше обращение.",
    cookiesTitle:"Cookie и выбор языка",cookies:"В кабинете администратора используется служебный cookie для защищённой сессии входа. При подключении Microsoft может использоваться временный cookie для подтверждения входа. Клиентам не нужно регистрироваться для отправки заявки. Выбранный язык сохраняется в локальном хранилище браузера, чтобы применяться на следующих страницах; этот выбор можно удалить, очистив хранилище браузера.",
  },
  en: {
    language:"Language",back:"Back to website",title:"Privacy notice",
    intro:"Muza Decors uses the details you provide to receive your request, contact you, prepare your item and arrange the agreed delivery.",
    sections:[
      {title:"What information do we request?",text:"Your name, phone number, selected service and details about the event or item. If delivery is required, we request the recipient’s full name and phone number, region, city, full address, apartment and postcode. Required fields are marked with an asterisk in the form. We do not request payment card details."},
      {title:"How is your information used?",text:"Your request is stored in a protected order system and can be accessed by the administrator processing it. The administrator can export orders to Excel and import permitted changes. If Microsoft Excel Online is connected, order details are synchronized with the business’s workbook. Once delivery is agreed, the recipient details needed for shipping are shared with the carrier."},
      {title:"Links to third-party services",text:"When you open Instagram or WhatsApp links, the terms of those services apply. Photographs of work shown on this website come from the Muza Decors Instagram account."},
    ],
    rightsTitle:"Correction or deletion",rightsBefore:"To request correction or deletion of your information, contact us at",rightsMiddle:"or through",rightsLink:"WhatsApp",rightsAfter:". Include your request reference so we can find it more quickly.",
    cookiesTitle:"Cookies and language preference",cookies:"The administrator dashboard uses an essential cookie for a secure sign-in session. Connecting Microsoft may use a temporary cookie to verify the sign-in process. Customers do not need to register to submit a request. Your chosen language is saved in your browser’s local storage so it carries across pages; you can remove this preference by clearing your browser storage.",
  },
} satisfies Record<Language,unknown>;

export default function PrivacyContent() {
  const [language,setLanguage]=useLanguage();
  const copy=content[language];
  return <main className="privacy-page" lang={language}>
    <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:20,marginBottom:36}}>
      <a href={`/?lang=${language}`}>← {copy.back}</a>
      <label style={{display:"flex",gap:10,alignItems:"center"}}>{copy.language}
        <select value={language} onChange={e=>setLanguage(e.target.value as Language)} style={{minHeight:44,fontSize:16,padding:"8px 12px",border:"1px solid var(--line)",background:"var(--paper)",color:"inherit"}}>
          <option value="kk">Қазақша</option><option value="ru">Русский</option><option value="en">English</option>
        </select>
      </label>
    </div>
    <h1>{copy.title}</h1><p>{copy.intro}</p>
    {copy.sections.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
    <section><h2>{copy.rightsTitle}</h2><p>{copy.rightsBefore} <a href={`tel:${business.tel}`}>{business.phone}</a> {copy.rightsMiddle} <a href={business.whatsapp} target="_blank" rel="noreferrer">{copy.rightsLink}</a>{language==="kk"?" ":""}{copy.rightsAfter}</p></section>
    <section><h2>{copy.cookiesTitle}</h2><p>{copy.cookies}</p></section>
  </main>;
}
