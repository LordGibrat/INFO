"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Download, Upload, RefreshCw, Search, LogOut, Phone, MessageCircle, Package, BookOpen, ExternalLink, Check, X } from "lucide-react";
import styles from "./dashboard.module.css";
import { useLanguage } from "@/lib/language";
import type { Language } from "@/lib/catalog";
import { adminTranslator, adminApiError } from "./translations";

type Order = {
  id: string; reference: string; name: string; phone: string; service: string; event: string;
  eventDate: string; signText: string; color: string; details: string; deliveryMethod: string;
  recipientName: string; recipientPhone: string; region: string; city: string; address: string;
  apartment: string; postalCode: string; status: string; adminNotes: string; shippingCost: number | null;
  trackingNumber: string; createdAt: string; updatedAt: string;
};
type ExcelState = {configured: boolean; connected: boolean; webUrl?: string; lastSyncedAt?: string};
const statuses: Record<string,string> = {
  new: "Жаңа", contacted: "Байланыстық", confirmed: "Келісілді", production: "Дайындалуда",
  ready: "Дайын", shipped: "Жіберілді", completed: "Аяқталды", cancelled: "Бас тартылды"
};
const services: Record<string,string> = {event:"Іс-шара декоры",neon:"Неон жазуы",lettering:"3D жазу",canvas:"Фото-холст"};
const delivery: Record<string,string> = {pickup:"Оралдан алып кету",oral:"Орал ішінде жеткізу",kazpost:"Қазпошта · басқа қала"};
const date = (value: string,language:Language) => value ? new Intl.DateTimeFormat({kk:"kk-KZ",ru:"ru-KZ",en:"en-GB"}[language], {day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Oral"}).format(new Date(value)) : adminTranslator(language)("Көрсетілмеген");

export default function AdminDashboard() {
  const [language] = useLanguage();
  const t = adminTranslator(language);
  const [auth, setAuth] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [guide, setGuide] = useState(false);
  const [excel, setExcel] = useState<ExcelState | null>(null);
  const [switchAccount, setSwitchAccount] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const failure = (e:unknown,fallback:string) => e instanceof TypeError || e instanceof SyntaxError ? t("Желі қатесі. Қайта көріңіз.") : e instanceof Error ? e.message : fallback;
  useEffect(()=>{setMessage("");setError("");},[language]);

  async function load(clearError = true) {
    setBusy(true); if (clearError) setError("");
    try {
      const response = await fetch("/api/admin/orders", {cache:"no-store"});
      const body = await response.json();
      if (response.status === 401) { setAuth(false); return; }
      if (!response.ok) throw new Error(adminApiError(language,response.status,body,t("Тапсырыстар жүктелмеді.")));
      setOrders(body.orders);
      const er = await fetch("/api/admin/excel/status", {cache:"no-store"});
      if (er.ok) setExcel(await er.json());
    } catch(e) { setError(failure(e,t("Желі қатесі. Қайта көріңіз."))); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const excelResult = new URLSearchParams(window.location.search).get("excel");
    if (excelResult === "connected") setMessage(t("Microsoft Excel Online қосылды. Жұмыс кітабын төмендегі сілтемеден ашыңыз."));
    else if (excelResult) setError(t("Microsoft қосылымы аяқталмады. Аккаунт рұқсатын және техникалық баптауларды тексеріп, қайта қосылыңыз."));
    fetch("/api/admin/session", {cache:"no-store"})
      .then(r=>r.json()).then(r=>setAuth(r.authenticated === true))
      .catch(()=>{setAuth(false);setError(t("Серверге қосылу мүмкін болмады."));});
  },[]);
  useEffect(() => { if (auth) void load(false); },[auth]);

  async function login(e: FormEvent) {
    e.preventDefault();setBusy(true);setError("");
    try {
      const response = await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
      const body = await response.json();
      if (!response.ok) throw new Error(adminApiError(language,response.status,body,t("Құпиясөзді тексеріңіз.")));
      setPassword("");setAuth(true);
    } catch(e) {setError(failure(e,t("Кіру мүмкін болмады.")));}
    finally {setBusy(false);}
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selected) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);setError("");setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        status:data.get("status"),adminNotes:data.get("adminNotes"),
        shippingCost:data.get("shippingCost") === "" ? null : Number(data.get("shippingCost")),
        trackingNumber:data.get("trackingNumber"),updatedAt:selected.updatedAt
      })});
      const body=await response.json();
      if(!response.ok) throw new Error(adminApiError(language,response.status,body,t("Сақталмады.")));
      setSelected(null);setMessage(t("Өзгерістер сақталды."));await load();
    }catch(e){setError(failure(e,t("Сақталмады. Қайта көріңіз.")));}
    finally{setBusy(false);}
  }
  async function syncExcel() {
    setBusy(true);setError("");setMessage("");
    try {
      const response=await fetch("/api/admin/excel/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const body=await response.json();
      if(!response.ok)throw new Error(adminApiError(language,response.status,body,t("Excel синхрондалмады.")));
      setMessage(t("Excel және тапсырыстар жаңартылды."));await load();
    }catch(e){setError(failure(e,t("Excel синхрондалмады.")));}
    finally{setBusy(false);}
  }
  async function connectExcel() {
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/admin/excel/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const body=await r.json();
      if(!r.ok)throw new Error(adminApiError(language,r.status,body,t("Microsoft қосылымын бастау мүмкін болмады.")));
      window.location.assign(body.url);
    } catch(e){setError(failure(e,t("Microsoft қосылымы қолжетімсіз.")));setBusy(false);}
  }
  async function importExcel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!importFile) return;
    setBusy(true);setError("");setMessage("");
    try {
      if (!importFile.name.toLowerCase().endsWith(".xlsx") || importFile.size > 4*1024*1024) throw new Error(t("4 МБ-тан аспайтын .xlsx файлын таңдаңыз."));
      const response=await fetch("/api/admin/import",{
        method:"POST",headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        body:importFile,signal:AbortSignal.timeout(60000)
      });
      const body=await response.json().catch(()=>{throw new Error(response.status===413?t("Файл тым үлкен. 4 МБ-тан аспайтын файлды таңдаңыз."):t("Сервер жауабы алынбады. Байланысты тексеріп, қайта көріңіз."));});
      if (!response.ok) throw new Error(adminApiError(language,response.status,body,t("Файл импортталмады.")));
      setImportOpen(false);setImportFile(null);
      setMessage(`${body.imported} ${t("тапсырыс жаңартылды. Жаңа өзгерістер үшін файлды қайта жүктеп алыңыз.")}`);
      await load();
    }catch(e){setError(e instanceof DOMException?t("Жауап күту уақыты аяқталды. Тапсырыстарды жаңартып, нәтижесін тексеріңіз."):e instanceof TypeError?t("Интернет байланысын тексеріп, қайта көріңіз."):e instanceof Error?e.message:t("Файл импортталмады. Қайта көріңіз."));}
    finally{setBusy(false);}
  }
  async function logout() {
    try {
      const r=await fetch("/api/admin/logout",{method:"POST"});
      if(r.ok){setAuth(false);setOrders([]);setSelected(null);}
      else setError(t("Шығу мүмкін болмады. Қайта көріңіз."));
    } catch { setError(t("Интернет байланысын тексеріп, «Шығу» түймесін қайта басыңыз.")); }
  }

  if (auth === null) return <main lang={language} className={styles.loading} aria-live="polite">{t("Кабинет жүктелуде…")}</main>;
  if (!auth) return <main lang={language} className={styles.login}>
    <div className={styles.languageBar}><a href={`/?lang=${language}`} className={styles.back}><ArrowLeft size={18}/> {t("Сайтқа оралу")}</a><LanguageSelect/></div>
    <div className={styles.loginBox}>
      <span className={styles.eyebrow}>{t("MUZA DECORS · ӘКІМШІ")}</span>
      <h1>{t("Бәрі")}<br/><em>{t("өз орнында.")}</em></h1>
      <p>{t("Тапсырыстарды қарап, клиенттермен байланысыңыз.")}</p>
      <form onSubmit={login}>
        <label htmlFor="password">{t("Әкімші құпиясөзі")}</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={200}/>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} disabled={busy}>{busy?t("Кіру…"):t("Кабинетке кіру")} <span>↗</span></button>
      </form>
      <small>{t("Құпиясөзді сайт иесінен алыңыз. Клиенттерге бұл кабинет қажет емес.")}</small>
    </div>
  </main>;
  const shown=orders.filter(o=>(filter==="all"||o.status===filter)&&`${o.reference} ${o.name} ${o.phone} ${o.city} ${o.recipientName}`.toLowerCase().includes(query.toLowerCase()));
  const pending=orders.filter(o=>!["completed","cancelled"].includes(o.status)).length;
  return <main lang={language} className={styles.dashboard}>
    <header className={styles.header}>
      <a href={`/?lang=${language}`} className={styles.brand}>muza<span>{t("decors / кабинет")}</span></a>
      <nav aria-label={t("Әкімші мәзірі")}>
        <LanguageSelect/>
        <button onClick={()=>setGuide(!guide)} aria-expanded={guide}><BookOpen size={17}/> {t("Нұсқаулық")}</button>
        <button onClick={logout}><LogOut size={17}/> {t("Шығу")}</button>
      </nav>
    </header>
    <div className={styles.content}>
      <div className={styles.titleRow}><div><span className={styles.eyebrow}>{t("СТУДИЯНЫҢ ЖҰМЫС КҮНІ")}</span><h1>{t("Тапсырыстар")}</h1><p>{t("Әр әдемі оқиға осы жерден басталады.")}</p></div>
        <button className={styles.outline} onClick={()=>void load()} disabled={busy}><RefreshCw size={17}/> {t("Жаңарту")}</button>
      </div>
      <div className={styles.stats}>
        <div><span>{t("Барлығы")}</span><strong>{orders.length}</strong></div>
        <div><span>{t("Жаңа өтінім")}</span><strong>{orders.filter(o=>o.status==="new").length}</strong></div>
        <div><span>{t("Жұмыста")}</span><strong>{pending}</strong></div>
        <div><span>{t("Қазпошта")}</span><strong>{orders.filter(o=>o.deliveryMethod==="kazpost"&&!["completed","cancelled"].includes(o.status)).length}</strong></div>
      </div>
      {guide && <Guide/>}
      <section className={styles.excel} aria-label={t("Excel файлдары")}>
        <div><span className={styles.excelMark}>X</span><div><h2>{t("Excel файлдары")}</h2><p>{excel?.connected ? `${t("OneDrive қосылған")}${excel.lastSyncedAt ? " · "+date(excel.lastSyncedAt,language):""}`:t("Компьютерде де, телефонда да. Microsoft аккаунты қажет емес.")}</p></div></div>
        <div className={styles.excelActions}>
          <a href="/api/admin/export" className={styles.outline}><Download size={16}/> {t(".xlsx жүктеу")}</a>
          <button className={styles.outline} onClick={()=>{setImportOpen(!importOpen);setImportFile(null);}} disabled={busy} aria-expanded={importOpen}><Upload size={16}/> {t("Excel-ден импорттау")}</button>
          {excel?.connected ? <>
            {excel.webUrl && <a href={excel.webUrl} target="_blank" rel="noreferrer" className={styles.outline}>Excel Online <ExternalLink size={16}/></a>}
            <button className={styles.primary} onClick={syncExcel} disabled={busy}><RefreshCw size={16}/> {t("Синхрондау")}</button>
            <button className={styles.outline} onClick={()=>setSwitchAccount(!switchAccount)} disabled={busy} aria-expanded={switchAccount}>{t("Аккаунтты ауыстыру")}</button>
          </>:excel?.configured?<button onClick={connectExcel} disabled={busy} className={styles.primary}>{t("Microsoft арқылы қосылу ↗")}</button>:null}
        </div>
      </section>
      {importOpen && <form className={styles.guide} onSubmit={importExcel}>
        <h2>{t("Excel-дегі өзгерістерді сақтау")}</h2>
        <p>{t("Осы кабинеттен жүктелген файлды таңдаңыз. Тек күй, ішкі жазба, жеткізу құны және трек-нөмірі жаңартылады. Клиент деректерін, жолдарды, ID мен уақытты өзгертпеңіз.")}</p>
        <label htmlFor="excel-file">{t("Өңделген .xlsx файлы · 4 МБ-қа дейін")}</label>
        <input id="excel-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required disabled={busy} onChange={e=>setImportFile(e.target.files?.[0] || null)}/>
        <p>{t("Сайтта кейін өзгерген тапсырыс болса, импорт тоқтайды. Жаңа файлды жүктеп алып, өзгерісті қайта енгізіңіз. Сайтқа жаңа жол қосу немесе жол жою мүмкін емес.")}</p>
        <button className={styles.primary} disabled={busy||!importFile}>{busy?t("Тексерілуде…"):t("Өзгерістерді импорттау")} <Upload size={16}/></button>{" "}
        <button className={styles.outline} type="button" disabled={busy} onClick={()=>{setImportOpen(false);setImportFile(null);}}>{t("Бас тарту")}</button>
      </form>}
      {switchAccount && excel?.connected && <section className={styles.guide} aria-label={t("Microsoft аккаунтын ауыстыру")}>
        <h2>{t("Басқа Microsoft аккаунты")}</h2>
        <p>{t("Алдымен Excel-дегі өзгерістерді сақтап, «Синхрондау» түймесін басыңыз. Жаңа аккаунттың OneDrive қоймасында сайттағы тапсырыстардан жаңа файл жасалады. Бұрынғы файл өз орнында қалады, бірақ сайтпен байланысы тоқтайды.")}</p>
        <p>{t("Microsoft 365 жұмыс немесе оқу аккаунтын таңдаңыз. Ұйым рұқсаты қажет болуы мүмкін.")}</p>
        <button className={styles.primary} onClick={connectExcel} disabled={busy}>{t("Басқа аккаунтпен кіру ↗")}</button>{" "}
        <button className={styles.outline} onClick={()=>setSwitchAccount(false)} disabled={busy}>{t("Бас тарту")}</button>
      </section>}
      {message && <p className={styles.success} role="status"><Check size={18}/>{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.filters}>
        <label className={styles.search}><Search size={18}/><input aria-label={t("Тапсырысты іздеу")} placeholder={t("Аты, телефон, қала немесе нөмір…")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <select aria-label={t("Күйі бойынша сүзу")} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t("Барлық күй")}</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{t(v)}</option>)}</select>
      </div>
      <p className={styles.count} aria-live="polite">{t("Тапсырыстар")}: {shown.length}</p>
      <div className={styles.orderList}>
        {shown.map(order=><article key={order.id} className={styles.order}>
          <div className={styles.orderHead}><span>{order.reference}</span><span className={styles.badge} data-status={order.status}>{t(statuses[order.status])}</span></div>
          <h2>{order.name}</h2><p>{t(services[order.service])}{order.event?` · ${order.event}`:""}</p>
          <div className={styles.orderMeta}><span><Package size={15}/>{t(delivery[order.deliveryMethod])}</span><span>{order.city || t("Орал")} · {date(order.createdAt,language)}</span></div>
          {order.eventDate && <p>{t("Іс-шара күні:")} {date(order.eventDate,language)}</p>}
          <div className={styles.orderActions}><a href={`tel:${order.phone}`} aria-label={`${order.name}: ${t("қоңырау шалу")}`}><Phone size={17}/>{order.phone}</a><button onClick={()=>{setSelected(order);setError("");setMessage("");}}>{t("Ашу ↗")}</button></div>
        </article>)}
        {!shown.length && <div className={styles.empty}><Package size={36}/><h2>{orders.length?t("Тапсырыс табылмады"):t("Алғашқы тапсырысты күтеміз")}</h2><p>{orders.length?t("Іздеу сөзін немесе сүзгіні өзгертіңіз."):t("Сайттан келген өтінімдер осында пайда болады.")}</p></div>}
      </div>
    </div>
    {selected && <OrderPanel order={selected} busy={busy} error={error} onClose={()=>setSelected(null)} onSave={save}/>}
  </main>;
}

function OrderPanel({order,busy,error,onClose,onSave}:{order:Order;busy:boolean;error:string;onClose:()=>void;onSave:(e:FormEvent<HTMLFormElement>)=>void}) {
  const [language] = useLanguage();
  const t = adminTranslator(language);
  useEffect(()=>{
    const original=document.activeElement as HTMLElement;
    const panel=document.getElementById("order-panel");
    panel?.focus();
    const handle=(e:KeyboardEvent)=>{
      if(e.key==="Escape"&&!busy)onClose();
      if(e.key==="Tab"&&panel){
        const focusable=Array.from(panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea')).filter(n=>n.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1);
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener("keydown",handle);
    const prior=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",handle);document.body.style.overflow=prior;original?.focus();};
  },[busy,onClose]);
  return <div className={styles.overlay}>
    <section id="order-panel" className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="order-title" tabIndex={-1}>
      <header><span className={styles.eyebrow}>{order.reference}</span><button aria-label={t("Жабу")} onClick={onClose} disabled={busy}><X/></button></header>
      <h2 id="order-title">{order.name}</h2>
      <div className={styles.contactActions}>
        <a href={`tel:${order.phone}`}><Phone size={17}/> {t("Қоңырау")}</a>
        <a href={`https://wa.me/${order.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`${t("Сәлеметсіз бе,")} ${order.name}! Muza Decors. ${order.reference} — ${t("тапсырысыңыз бойынша хабарласып тұрмыз.")}`)}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a>
      </div>
      <dl className={styles.details}>
        <dt>{t("Телефон")}</dt><dd>{order.phone}</dd><dt>{t("Қызмет")}</dt><dd>{t(services[order.service])}</dd>
        <dt>{t("Іс-шара")}</dt><dd>{order.event || "—"}</dd><dt>{t("Күні")}</dt><dd>{date(order.eventDate,language)}</dd>
        <dt>{t("Жазу мәтіні")}</dt><dd>{order.signText || "—"}</dd><dt>{t("Түсі")}</dt><dd>{order.color || "—"}</dd>
        <dt>{t("Тілектер")}</dt><dd>{order.details || "—"}</dd><dt>{t("Жеткізу")}</dt><dd>{t(delivery[order.deliveryMethod])}</dd>
        {order.deliveryMethod!=="pickup"&&<><dt>{t("Алушы")}</dt><dd>{order.recipientName} · {order.recipientPhone}</dd><dt>{t("Мекенжай")}</dt><dd>{[order.region,order.city,order.address,order.apartment && `${t("пәтер")} ${order.apartment}`,order.postalCode].filter(Boolean).join(", ")}</dd></>}
      </dl>
      <form onSubmit={onSave}>
        <label htmlFor="status">{t("Тапсырыс күйі")}</label>
        <select id="status" name="status" defaultValue={order.status}>{Object.entries(statuses).map(([k,v])=><option value={k} key={k}>{t(v)}</option>)}</select>
        <label htmlFor="shippingCost">{t("Келісілген жеткізу құны, ₸")}</label>
        <input id="shippingCost" name="shippingCost" type="number" min="0" max="1000000" step="1" defaultValue={order.shippingCost ?? ""} placeholder={t("Әзірге келісілмеген")}/>
        <label htmlFor="trackingNumber">{t("Қазпошта трек-нөмірі")}</label>
        <input id="trackingNumber" name="trackingNumber" maxLength={80} defaultValue={order.trackingNumber || ""} placeholder={t("Жібергеннен кейін енгізіңіз")}/>
        <label htmlFor="adminNotes">{t("Ішкі жазба")}</label>
        <textarea id="adminNotes" name="adminNotes" rows={4} maxLength={3000} defaultValue={order.adminNotes || ""} placeholder={t("Құны, өлшемдері, мерзімі, клиентпен келісім…")}/>
        <small>{t("Ішкі жазба клиентке көрсетілмейді. Қазпоштаға тапсыру мен клиентке хабарлау қолмен орындалады.")}</small>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} disabled={busy}>{busy?t("Сақталуда…"):t("Өзгерістерді сақтау")}<Check size={18}/></button>
      </form>
    </section>
  </div>;
}

function Guide() {
  const [language] = useLanguage();
  const t = adminTranslator(language);
  return <section className={styles.guide} aria-label={t("Қазақша нұсқаулық")}>
    <span className={styles.eyebrow}>{t("ӘКІМШІГЕ АРНАЛҒАН НҰСҚАУЛЫҚ")}</span>
    <h2>{t("Күнделікті жұмыстың 5 қадамы")}</h2>
    <ol>
      <li><strong>{t("Өтінімді ашыңыз.")}</strong> {t("«Жаңа» күйін таңдаңыз. Клиенттің тілегін, іс-шара күнін және жеткізу мекенжайын тексеріңіз.")}</li>
      <li><strong>{t("Клиентпен келісіңіз.")}</strong> {t("WhatsApp немесе қоңырау түймесін басыңыз. Дизайн, өлшем, толық баға, дайындау мерзімі және жеткізу құнын нақтылаңыз. «Байланыстық», кейін «Келісілді» күйін қойыңыз.")}</li>
      <li><strong>{t("Жұмысты жүргізіңіз.")}</strong> {t("«Дайындалуда» → «Дайын» күйлерін таңдаңыз. Әр өзгерістен кейін «Өзгерістерді сақтау» түймесін басыңыз.")}</li>
      <li><strong>{t("Қазпоштамен жіберіңіз.")}</strong> {t("Алушының аты-жөнін, телефон нөмірін, облыс/қала, көше/үй, пәтер және индексін қайта растаңыз. Тауарды қаптап, бөлімшеде қолмен жөнелтіңіз. Төленген жеткізу құны мен берілген трек-нөмірді енгізіп, «Жіберілді» күйін таңдаңыз. Трек-нөмірді клиентке WhatsApp арқылы өзіңіз жіберіңіз.")}</li>
      <li><strong>{t("Аяқтаңыз.")}</strong> {t("Тауар алынғанын немесе іс-шараның аяқталғанын тексеріп, «Аяқталды» күйін қойыңыз. Бас тартылған өтінімге «Бас тартылды» таңдаңыз.")}</li>
    </ol>
    <h3>{t("Компьютер мен телефон: Microsoft аккаунтынсыз")}</h3>
    <p>{t("Тапсырысты осы кабинетте ашып, бірден өңдеуге болады. Компьютерде үлкен экранды, телефонда ықшам карталарды пайдаланыңыз.")}</p>
    <p>{t("Кестемен жұмыс істеу үшін «.xlsx жүктеу» түймесін басыңыз. Файлды Excel немесе .xlsx қолдайтын редакторда ашыңыз. Тек күй, ішкі жазба, жеткізу құны және трек-нөмірін өзгертіп, .xlsx түрінде сақтаңыз. «Excel-ден импорттау» арқылы файлды таңдап, «Өзгерістерді импорттау» түймесін басыңыз. Әр жаңа жұмыс алдында соңғы файлды қайта жүктеңіз.")}</p>
    <p>{t("Ескі файлдағы тапсырыс сайтта өзгертілген болса, импорт тоқтайды. Соңғы файлды жүктеп, қажетті өзгерістерді соған енгізіңіз. Клиент деректерін, жасырын ID/уақытты, баған атауларын және жолдарды өзгертпеңіз.")}</p>
    <h3>{t("Қосымша мүмкіндік: Excel Online")}</h3>
    <p>{t("Microsoft қосылымы бапталғаннан кейін «Microsoft арқылы қосылу» түймесін басып, жұмыс аккаунтымен кіріңіз. «Синхрондау» арқылы жаңа тапсырыстарды Excel-ге жіберіңіз. «Excel Online» түймесі жеке жұмыс кітабын ашады.")}</p>
    <p>{t("Excel-де тек күй, ішкі жазба, жеткізу құны және трек-нөмірін өзгертіңіз. Содан кейін осы кабинетке оралып «Синхрондау» түймесін басыңыз. Қайшылық туралы хабар шықса, сол тапсырысты кабинетте тексеріңіз. Файлдағы ID және уақыт бағандарын өзгертпеңіз.")}</p>
    <p>{t("Басқа Microsoft 365 аккаунтын қосу үшін алдымен синхрондап, «Аккаунтты ауыстыру» түймесін басыңыз. Microsoft терезесінде жаңа аккаунтты таңдаңыз. Жаңа жеке файл жасалады; бұрынғы файл жаңартылмайды.")}</p>
    <p>{t("Excel Online міндетті емес. Оны іске қосу үшін техникалық иесіне Microsoft баптау нұсқаулығын беріңіз. Жүктелген файлдағы өзгерістер «Excel-ден импорттау» арқылы, ал қосылған OneDrive файлы «Синхрондау» арқылы сақталады.")}</p>
    <h3>{t("Маңызды")}</h3><p>{t("Құпиясөз бен тапсырыс файлын тек жауапты қызметкерлерге беріңіз. Excel файлына жалпыға ашық сілтеме жасамаңыз. Клиент деректерін қажет болмаған кезде сайттың техникалық иесі арқылы жойыңыз. Өтінім броньды, төлемді немесе жеткізуді автоматты растамайды.")}</p>
  </section>;
}

function LanguageSelect() {
  const [language,setLanguage]=useLanguage();
  const t=adminTranslator(language);
  return <select className={styles.languageSelect} aria-label={t("Тіл")} value={language} onChange={event=>setLanguage(event.target.value as Language)}><option value="kk">Қазақша</option><option value="ru">Русский</option><option value="en">English</option></select>;
}
