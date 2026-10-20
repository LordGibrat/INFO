"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Download, Upload, RefreshCw, Search, LogOut, Phone, MessageCircle, Package, BookOpen, ExternalLink, Check, X } from "lucide-react";
import styles from "./dashboard.module.css";

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
const date = (value: string) => value ? new Intl.DateTimeFormat("kk-KZ", {day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Oral"}).format(new Date(value)) : "Көрсетілмеген";

export default function AdminDashboard() {
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

  async function load(clearError = true) {
    setBusy(true); if (clearError) setError("");
    try {
      const response = await fetch("/api/admin/orders", {cache:"no-store"});
      const body = await response.json();
      if (response.status === 401) { setAuth(false); return; }
      if (!response.ok) throw new Error(body.error || "Тапсырыстар жүктелмеді.");
      setOrders(body.orders);
      const er = await fetch("/api/admin/excel/status", {cache:"no-store"});
      if (er.ok) setExcel(await er.json());
    } catch(e) { setError(e instanceof Error ? e.message : "Желі қатесі. Қайта көріңіз."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const excelResult = new URLSearchParams(window.location.search).get("excel");
    if (excelResult === "connected") setMessage("Microsoft Excel Online қосылды. Жұмыс кітабын төмендегі сілтемеден ашыңыз.");
    else if (excelResult) setError("Microsoft қосылымы аяқталмады. Аккаунт рұқсатын және техникалық баптауларды тексеріп, қайта қосылыңыз.");
    fetch("/api/admin/session", {cache:"no-store"})
      .then(r=>r.json()).then(r=>setAuth(r.authenticated === true))
      .catch(()=>{setAuth(false);setError("Серверге қосылу мүмкін болмады.");});
  },[]);
  useEffect(() => { if (auth) void load(false); },[auth]);

  async function login(e: FormEvent) {
    e.preventDefault();setBusy(true);setError("");
    try {
      const response = await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Құпиясөзді тексеріңіз.");
      setPassword("");setAuth(true);
    } catch(e) {setError(e instanceof Error?e.message:"Кіру мүмкін болмады.");}
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
      if(!response.ok) throw new Error(body.error || "Сақталмады.");
      setSelected(null);setMessage("Өзгерістер сақталды.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Сақталмады. Қайта көріңіз.");}
    finally{setBusy(false);}
  }
  async function syncExcel() {
    setBusy(true);setError("");setMessage("");
    try {
      const response=await fetch("/api/admin/excel/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error || "Excel синхрондалмады.");
      setMessage("Excel және тапсырыстар жаңартылды.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Excel синхрондалмады.");}
    finally{setBusy(false);}
  }
  async function connectExcel() {
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/admin/excel/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const body=await r.json();
      if(!r.ok)throw new Error(body.error || "Microsoft қосылымын бастау мүмкін болмады.");
      window.location.assign(body.url);
    } catch(e){setError(e instanceof Error?e.message:"Microsoft қосылымы қолжетімсіз.");setBusy(false);}
  }
  async function importExcel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!importFile) return;
    setBusy(true);setError("");setMessage("");
    try {
      if (!importFile.name.toLowerCase().endsWith(".xlsx") || importFile.size > 4*1024*1024) throw new Error("4 МБ-тан аспайтын .xlsx файлын таңдаңыз.");
      const response=await fetch("/api/admin/import",{
        method:"POST",headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        body:importFile,signal:AbortSignal.timeout(60000)
      });
      const body=await response.json().catch(()=>{throw new Error(response.status===413?"Файл тым үлкен. 4 МБ-тан аспайтын файлды таңдаңыз.":"Сервер жауабы алынбады. Байланысты тексеріп, қайта көріңіз.");});
      if (!response.ok) throw new Error(body.error || "Файл импортталмады.");
      setImportOpen(false);setImportFile(null);
      setMessage(`${body.imported} тапсырыс жаңартылды. Жаңа өзгерістер үшін файлды қайта жүктеп алыңыз.`);
      await load();
    }catch(e){setError(e instanceof DOMException?"Жауап күту уақыты аяқталды. Тапсырыстарды жаңартып, нәтижесін тексеріңіз.":e instanceof TypeError?"Интернет байланысын тексеріп, қайта көріңіз.":e instanceof Error?e.message:"Файл импортталмады. Қайта көріңіз.");}
    finally{setBusy(false);}
  }
  async function logout() {
    try {
      const r=await fetch("/api/admin/logout",{method:"POST"});
      if(r.ok){setAuth(false);setOrders([]);setSelected(null);}
      else setError("Шығу мүмкін болмады. Қайта көріңіз.");
    } catch { setError("Интернет байланысын тексеріп, «Шығу» түймесін қайта басыңыз."); }
  }

  if (auth === null) return <main className={styles.loading} aria-live="polite">Кабинет жүктелуде…</main>;
  if (!auth) return <main className={styles.login}>
    <a href="/" className={styles.back}><ArrowLeft size={18}/> Сайтқа оралу</a>
    <div className={styles.loginBox}>
      <span className={styles.eyebrow}>MUZA DECORS · ӘКІМШІ</span>
      <h1>Барлығы<br/><em>өз орнында.</em></h1>
      <p>Тапсырыстарды қарап, клиенттермен байланысыңыз.</p>
      <form onSubmit={login}>
        <label htmlFor="password">Әкімші құпиясөзі</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={200}/>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} disabled={busy}>{busy?"Кіру…":"Кабинетке кіру"} <span>↗</span></button>
      </form>
      <small>Құпиясөзді сайт иесінен алыңыз. Клиенттерге бұл кабинет қажет емес.</small>
    </div>
  </main>;
  const shown=orders.filter(o=>(filter==="all"||o.status===filter)&&`${o.reference} ${o.name} ${o.phone} ${o.city} ${o.recipientName}`.toLowerCase().includes(query.toLowerCase()));
  const pending=orders.filter(o=>!["completed","cancelled"].includes(o.status)).length;
  return <main className={styles.dashboard}>
    <header className={styles.header}>
      <a href="/" className={styles.brand}>muza<span>decors / кабинет</span></a>
      <nav aria-label="Әкімші мәзірі">
        <button onClick={()=>setGuide(!guide)} aria-expanded={guide}><BookOpen size={17}/> Нұсқаулық</button>
        <button onClick={logout}><LogOut size={17}/> Шығу</button>
      </nav>
    </header>
    <div className={styles.content}>
      <div className={styles.titleRow}><div><span className={styles.eyebrow}>СТУДИЯНЫҢ ЖҰМЫС КҮНІ</span><h1>Тапсырыстар</h1><p>Әр әдемі оқиға осы жерден басталады.</p></div>
        <button className={styles.outline} onClick={()=>void load()} disabled={busy}><RefreshCw size={17}/> Жаңарту</button>
      </div>
      <div className={styles.stats}>
        <div><span>Барлығы</span><strong>{orders.length}</strong></div>
        <div><span>Жаңа өтінім</span><strong>{orders.filter(o=>o.status==="new").length}</strong></div>
        <div><span>Жұмыста</span><strong>{pending}</strong></div>
        <div><span>Қазпошта</span><strong>{orders.filter(o=>o.deliveryMethod==="kazpost"&&!["completed","cancelled"].includes(o.status)).length}</strong></div>
      </div>
      {guide && <Guide/>}
      <section className={styles.excel} aria-label="Excel файлдары">
        <div><span className={styles.excelMark}>X</span><div><h2>Excel файлдары</h2><p>{excel?.connected ? `OneDrive қосылған${excel.lastSyncedAt ? " · "+date(excel.lastSyncedAt):""}`:"Компьютерде де, телефонда да. Microsoft аккаунты қажет емес."}</p></div></div>
        <div className={styles.excelActions}>
          <a href="/api/admin/export" className={styles.outline}><Download size={16}/> .xlsx жүктеу</a>
          <button className={styles.outline} onClick={()=>{setImportOpen(!importOpen);setImportFile(null);}} disabled={busy} aria-expanded={importOpen}><Upload size={16}/> Excel-ден импорттау</button>
          {excel?.connected ? <>
            {excel.webUrl && <a href={excel.webUrl} target="_blank" rel="noreferrer" className={styles.outline}>Excel Online <ExternalLink size={16}/></a>}
            <button className={styles.primary} onClick={syncExcel} disabled={busy}><RefreshCw size={16}/> Синхрондау</button>
            <button className={styles.outline} onClick={()=>setSwitchAccount(!switchAccount)} disabled={busy} aria-expanded={switchAccount}>Аккаунтты ауыстыру</button>
          </>:excel?.configured?<button onClick={connectExcel} disabled={busy} className={styles.primary}>Microsoft арқылы қосылу ↗</button>:null}
        </div>
      </section>
      {importOpen && <form className={styles.guide} onSubmit={importExcel}>
        <h2>Excel-дегі өзгерістерді сақтау</h2>
        <p>Осы кабинеттен жүктелген файлды таңдаңыз. Тек күй, ішкі жазба, жеткізу құны және трек-нөмірі жаңартылады. Клиент деректерін, жолдарды, ID мен уақытты өзгертпеңіз.</p>
        <label htmlFor="excel-file">Өңделген .xlsx файлы · 4 МБ-қа дейін</label>
        <input id="excel-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required disabled={busy} onChange={e=>setImportFile(e.target.files?.[0] || null)}/>
        <p>Сайтта кейін өзгерген тапсырыс болса, импорт тоқтайды. Жаңа файлды жүктеп алып, өзгерісті қайта енгізіңіз. Сайтқа жаңа жол қосу немесе жол жою мүмкін емес.</p>
        <button className={styles.primary} disabled={busy||!importFile}>{busy?"Тексерілуде…":"Өзгерістерді импорттау"} <Upload size={16}/></button>{" "}
        <button className={styles.outline} type="button" disabled={busy} onClick={()=>{setImportOpen(false);setImportFile(null);}}>Бас тарту</button>
      </form>}
      {switchAccount && excel?.connected && <section className={styles.guide} aria-label="Microsoft аккаунтын ауыстыру">
        <h2>Басқа Microsoft аккаунты</h2>
        <p>Алдымен Excel-дегі өзгерістерді сақтап, «Синхрондау» түймесін басыңыз. Жаңа аккаунттың OneDrive қоймасында сайттағы тапсырыстардан жаңа файл жасалады. Бұрынғы файл өз орнында қалады, бірақ сайтпен байланысы тоқтайды.</p>
        <p>Microsoft 365 жұмыс немесе оқу аккаунтын таңдаңыз. Ұйым рұқсаты қажет болуы мүмкін.</p>
        <button className={styles.primary} onClick={connectExcel} disabled={busy}>Басқа аккаунтпен кіру ↗</button>{" "}
        <button className={styles.outline} onClick={()=>setSwitchAccount(false)} disabled={busy}>Бас тарту</button>
      </section>}
      {message && <p className={styles.success} role="status"><Check size={18}/>{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.filters}>
        <label className={styles.search}><Search size={18}/><input aria-label="Тапсырысты іздеу" placeholder="Аты, телефон, қала немесе нөмір…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <select aria-label="Күйі бойынша сүзу" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Барлық күй</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      </div>
      <p className={styles.count} aria-live="polite">{shown.length} тапсырыс</p>
      <div className={styles.orderList}>
        {shown.map(order=><article key={order.id} className={styles.order}>
          <div className={styles.orderHead}><span>{order.reference}</span><span className={styles.badge} data-status={order.status}>{statuses[order.status]}</span></div>
          <h2>{order.name}</h2><p>{services[order.service]}{order.event?` · ${order.event}`:""}</p>
          <div className={styles.orderMeta}><span><Package size={15}/>{delivery[order.deliveryMethod]}</span><span>{order.city || "Орал"} · {date(order.createdAt)}</span></div>
          {order.eventDate && <p>Іс-шара күні: {date(order.eventDate)}</p>}
          <div className={styles.orderActions}><a href={`tel:${order.phone}`} aria-label={`${order.name}: қоңырау шалу`}><Phone size={17}/>{order.phone}</a><button onClick={()=>{setSelected(order);setError("");setMessage("");}}>Ашу ↗</button></div>
        </article>)}
        {!shown.length && <div className={styles.empty}><Package size={36}/><h2>{orders.length?"Тапсырыс табылмады":"Алғашқы тапсырысты күтеміз"}</h2><p>{orders.length?"Іздеу сөзін немесе сүзгіні өзгертіңіз.":"Сайттан келген өтінімдер осында пайда болады."}</p></div>}
      </div>
    </div>
    {selected && <OrderPanel order={selected} busy={busy} error={error} onClose={()=>setSelected(null)} onSave={save}/>}
  </main>;
}

function OrderPanel({order,busy,error,onClose,onSave}:{order:Order;busy:boolean;error:string;onClose:()=>void;onSave:(e:FormEvent<HTMLFormElement>)=>void}) {
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
      <header><span className={styles.eyebrow}>{order.reference}</span><button aria-label="Жабу" onClick={onClose} disabled={busy}><X/></button></header>
      <h2 id="order-title">{order.name}</h2>
      <div className={styles.contactActions}>
        <a href={`tel:${order.phone}`}><Phone size={17}/> Қоңырау</a>
        <a href={`https://wa.me/${order.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Сәлеметсіз бе, ${order.name}! Muza Decors. ${order.reference} тапсырысыңыз бойынша хабарласып тұрмыз.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a>
      </div>
      <dl className={styles.details}>
        <dt>Телефон</dt><dd>{order.phone}</dd><dt>Қызмет</dt><dd>{services[order.service]}</dd>
        <dt>Іс-шара</dt><dd>{order.event || "—"}</dd><dt>Күні</dt><dd>{date(order.eventDate)}</dd>
        <dt>Жазу мәтіні</dt><dd>{order.signText || "—"}</dd><dt>Түсі</dt><dd>{order.color || "—"}</dd>
        <dt>Тілектер</dt><dd>{order.details || "—"}</dd><dt>Жеткізу</dt><dd>{delivery[order.deliveryMethod]}</dd>
        {order.deliveryMethod!=="pickup"&&<><dt>Алушы</dt><dd>{order.recipientName} · {order.recipientPhone}</dd><dt>Мекенжай</dt><dd>{[order.region,order.city,order.address,order.apartment && `пәтер ${order.apartment}`,order.postalCode].filter(Boolean).join(", ")}</dd></>}
      </dl>
      <form onSubmit={onSave}>
        <label htmlFor="status">Тапсырыс күйі</label>
        <select id="status" name="status" defaultValue={order.status}>{Object.entries(statuses).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select>
        <label htmlFor="shippingCost">Келісілген жеткізу құны, ₸</label>
        <input id="shippingCost" name="shippingCost" type="number" min="0" max="1000000" step="1" defaultValue={order.shippingCost ?? ""} placeholder="Әзірге келісілмеген"/>
        <label htmlFor="trackingNumber">Қазпошта трек-нөмірі</label>
        <input id="trackingNumber" name="trackingNumber" maxLength={80} defaultValue={order.trackingNumber || ""} placeholder="Жібергеннен кейін енгізіңіз"/>
        <label htmlFor="adminNotes">Ішкі жазба</label>
        <textarea id="adminNotes" name="adminNotes" rows={4} maxLength={3000} defaultValue={order.adminNotes || ""} placeholder="Құны, өлшемдері, мерзімі, клиентпен келісім…"/>
        <small>Ішкі жазба клиентке көрсетілмейді. Қазпоштаға тапсыру мен клиентке хабарлау қолмен орындалады.</small>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} disabled={busy}>{busy?"Сақталуда…":"Өзгерістерді сақтау"}<Check size={18}/></button>
      </form>
    </section>
  </div>;
}

function Guide() {
  return <section className={styles.guide} aria-label="Қазақша нұсқаулық">
    <span className={styles.eyebrow}>ӘКІМШІГЕ АРНАЛҒАН НҰСҚАУЛЫҚ</span>
    <h2>Күнделікті жұмыстың 5 қадамы</h2>
    <ol>
      <li><strong>Өтінімді ашыңыз.</strong> «Жаңа» күйін таңдаңыз. Клиенттің тілегін, іс-шара күнін және жеткізу мекенжайын тексеріңіз.</li>
      <li><strong>Клиентпен келісіңіз.</strong> WhatsApp немесе қоңырау түймесін басыңыз. Дизайн, өлшем, толық баға, дайындау мерзімі және жеткізу құнын нақтылаңыз. «Байланыстық», кейін «Келісілді» күйін қойыңыз.</li>
      <li><strong>Жұмысты жүргізіңіз.</strong> «Дайындалуда» → «Дайын» күйлерін таңдаңыз. Әр өзгерістен кейін «Өзгерістерді сақтау» түймесін басыңыз.</li>
      <li><strong>Қазпоштамен жіберіңіз.</strong> Алушының аты-жөнін, телефон нөмірін, облыс/қала, көше/үй, пәтер және индексін қайта растаңыз. Тауарды қаптап, бөлімшеде қолмен жөнелтіңіз. Төленген жеткізу құны мен берілген трек-нөмірді енгізіп, «Жіберілді» күйін таңдаңыз. Трек-нөмірді клиентке WhatsApp арқылы өзіңіз жіберіңіз.</li>
      <li><strong>Аяқтаңыз.</strong> Тауар алынғанын немесе іс-шараның аяқталғанын тексеріп, «Аяқталды» күйін қойыңыз. Бас тартылған өтінімге «Бас тартылды» таңдаңыз.</li>
    </ol>
    <h3>Компьютер мен телефон: Microsoft аккаунтынсыз</h3>
    <p>Тапсырысты осы кабинетте ашып, бірден өңдеуге болады. Компьютерде үлкен экранды, телефонда ықшам карталарды пайдаланыңыз.</p>
    <p>Кестемен жұмыс істеу үшін «.xlsx жүктеу» түймесін басыңыз. Файлды Excel немесе .xlsx қолдайтын редакторда ашыңыз. Тек күй, ішкі жазба, жеткізу құны және трек-нөмірін өзгертіп, .xlsx түрінде сақтаңыз. «Excel-ден импорттау» арқылы файлды таңдап, «Өзгерістерді импорттау» түймесін басыңыз. Әр жаңа жұмыс алдында соңғы файлды қайта жүктеңіз.</p>
    <p>Ескі файлдағы тапсырыс сайтта өзгертілген болса, импорт тоқтайды. Соңғы файлды жүктеп, қажетті өзгерістерді соған енгізіңіз. Клиент деректерін, жасырын ID/уақытты, баған атауларын және жолдарды өзгертпеңіз.</p>
    <h3>Қосымша мүмкіндік: Excel Online</h3>
    <p>Microsoft қосылымы бапталғаннан кейін «Microsoft арқылы қосылу» түймесін басып, жұмыс аккаунтымен кіріңіз. «Синхрондау» арқылы жаңа тапсырыстарды Excel-ге жіберіңіз. «Excel Online» түймесі жеке жұмыс кітабын ашады.</p>
    <p>Excel-де тек күй, ішкі жазба, жеткізу құны және трек-нөмірін өзгертіңіз. Содан кейін осы кабинетке оралып «Синхрондау» түймесін басыңыз. Қайшылық туралы хабар шықса, сол тапсырысты кабинетте тексеріңіз. Файлдағы ID және уақыт бағандарын өзгертпеңіз.</p>
    <p>Басқа Microsoft 365 аккаунтын қосу үшін алдымен синхрондап, «Аккаунтты ауыстыру» түймесін басыңыз. Microsoft терезесінде жаңа аккаунтты таңдаңыз. Жаңа жеке файл жасалады; бұрынғы файл жаңартылмайды.</p>
    <p>Excel Online міндетті емес. Оны іске қосу үшін техникалық иесіне Microsoft баптау нұсқаулығын беріңіз. Жүктелген файлдағы өзгерістер «Excel-ден импорттау» арқылы, ал қосылған OneDrive файлы «Синхрондау» арқылы сақталады.</p>
    <h3>Маңызды</h3><p>Құпиясөз бен тапсырыс файлын тек жауапты қызметкерлерге беріңіз. Excel файлына жалпыға ашық сілтеме жасамаңыз. Клиент деректерін қажет болмаған кезде сайттың техникалық иесі арқылы жойыңыз. Өтінім броньды, төлемді немесе жеткізуді автоматты растамайды.</p>
  </section>;
}
