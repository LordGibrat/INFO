import ExcelJS from "exceljs";
import type { Order } from "./orders";
import { statuses } from "./validation";

/** Explicit strings plus apostrophe protection survive future CSV copy/export. */
export function safeExcelText(value: unknown): string {
  const text = String(value ?? "").replace(/\0/g,"");
  return /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
}
export async function buildWorkbook(orders: Order[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Muza Decors";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Тапсырыстар",{views:[{state:"frozen",ySplit:1}]});
  const columns: {header:string;key:keyof Order;width:number}[] = [
    {header:"Тапсырыс ID",key:"id",width:38},{header:"Нөмірі",key:"reference",width:25},
    {header:"Құрылған уақыты",key:"createdAt",width:25},{header:"Жаңартылған уақыты",key:"updatedAt",width:25},
    {header:"Күйі",key:"status",width:18},{header:"Аты",key:"name",width:24},{header:"Телефон",key:"phone",width:21},
    {header:"Қызмет",key:"service",width:18},{header:"Іс-шара",key:"event",width:24},{header:"Іс-шара күні",key:"eventDate",width:18},
    {header:"Жазу мәтіні",key:"signText",width:35},{header:"Түс",key:"color",width:20},{header:"Тілектер",key:"details",width:45},
    {header:"Жеткізу тәсілі",key:"deliveryMethod",width:20},{header:"Алушы",key:"recipientName",width:25},
    {header:"Алушы телефоны",key:"recipientPhone",width:21},{header:"Облыс",key:"region",width:25},
    {header:"Қала",key:"city",width:22},{header:"Мекенжай",key:"address",width:38},{header:"Пәтер",key:"apartment",width:12},
    {header:"Индекс",key:"postalCode",width:12},{header:"Жеткізу құны (₸)",key:"shippingCost",width:20},
    {header:"Трек-нөмір",key:"trackingNumber",width:25},{header:"Әкімші ескертпесі",key:"adminNotes",width:45},
  ];
  sheet.columns = columns;
  sheet.getColumn("id").hidden = true;
  sheet.getColumn("updatedAt").hidden = true;
  for (const order of orders) {
    const row: Record<string,string|number|null> = {};
    for (const column of columns) row[column.key] = column.key === "shippingCost" ? order.shippingCost : safeExcelText(order[column.key]);
    sheet.addRow(row);
  }
  for (let row=2;row<=Math.max(orders.length+1,2);row++) {
    sheet.getCell(row,5).dataValidation = {
      type:"list",allowBlank:false,formulae:[`"${statuses.join(",")}"`],
      showErrorMessage:true,errorStyle:"stop",errorTitle:"Күйді тізімнен таңдаңыз",
      error:"Тек тізімдегі күй кодтарын пайдаланыңыз.",
      showInputMessage:true,promptTitle:"Тапсырыс күйі",prompt:"Қазақша түсіндірме «Нұсқаулық» парағында.",
    };
  }
  sheet.autoFilter = {from:{row:1,column:1},to:{row:Math.max(1,orders.length+1),column:columns.length}};
  sheet.getRow(1).font = {bold:true,color:{argb:"FFFFFFFF"}};
  sheet.getRow(1).fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF3B2233"}};
  sheet.getRow(1).height = 28;
  sheet.getColumn("shippingCost").numFmt = '#,##0.00 "₸"';
  sheet.eachRow(row => { row.alignment = {vertical:"top",wrapText:true}; });
  const guide = workbook.addWorksheet("Нұсқаулық");
  guide.columns = [{header:"Код / бөлім",key:"code",width:26},{header:"Қазақша түсіндірме",key:"description",width:90}];
  const labels: Record<(typeof statuses)[number],string> = {
    new:"Жаңа өтінім",contacted:"Клиентпен байланыстық",confirmed:"Тапсырыс келісілді",
    production:"Дайындалуда",ready:"Дайын",shipped:"Жіберілді",completed:"Аяқталды",cancelled:"Бас тартылды",
  };
  for (const status of statuses) guide.addRow({code:status,description:labels[status]});
  guide.addRow({code:"Күйді өзгерту",description:"«Тапсырыстар» парағындағы «Күйі» ұяшығының тізімінен кодты таңдаңыз. Қазақша атауды қолмен жазбаңыз."});
  guide.addRow({code:"Өзгертуге болады",description:"Тек «Күйі», «Әкімші ескертпесі», «Жеткізу құны (₸)» және «Трек-нөмір» бағандарын өзгертіңіз."});
  guide.addRow({code:"Жеткізу құны",description:"Теңгемен 0 немесе одан үлкен сан жазыңыз. Құны келісілмесе, ұяшықты бос қалдырыңыз."});
  guide.addRow({code:"Қазпошта",description:"Клиентпен алушыны және толық мекенжайды растаңыз. Жөнелту қолмен орындалады. Берілген трек-нөмірді енгізіп, клиентке хабарлаңыз."});
  guide.addRow({code:"Аккаунтсыз өңдеу",description:"«.xlsx жүктеу» файлын құрылғыдағы .xlsx өңдейтін қолданбада ашыңыз. Төрт рұқсат етілген бағанды өзгертіп, .xlsx ретінде сақтаңыз. Сайтта файлды таңдап «Өзгерістерді импорттау» түймесін басыңыз. Microsoft аккаунты қажет емес; сайттың әкімші құпиясөзі қажет."});
  guide.addRow({code:"Excel Online сақтау",description:"Егер Microsoft қосылымы бапталған болса, қосылған жұмыс кітабын сақтап, жабыңыз және кабинетте «Синхрондау» түймесін басыңыз. Автоматты синхрондау жоқ."});
  guide.addRow({code:"Қайшылық",description:"Сайт пен Excel бір өрісті қатар өзгертсе, синхрондау тоқтайды. Кабинеттен соңғы мәнді тексеріп, Excel-дегі мәнді соған сәйкестендіріңіз."});
  guide.addRow({code:"Жолдар мен парақтар",description:"Жолдарды, клиент деректерін, баған атауларын және жасырын ID/уақытты өзгертпеңіз. Жаңа парақ қоспаңыз. Бұл нұсқаулық синхрондалғанда қайта жасалады."});
  guide.addRow({code:"Импорт қайшылығы",description:"Файл жүктелгеннен кейін өзгертілетін тапсырыс сайтта жаңартылса, бүкіл импорт тоқтайды. Жаңа .xlsx жүктеп, қажетті өзгерістерді соған көшіріңіз. Импорттан кейін келесі өңдеу үшін жаңа көшірме жүктеңіз. Шегі: 4 МБ."});
  guide.addRow({code:"Құпиялық",description:"Файлда клиенттердің деректері бар. Оны тек жауапты қызметкерлерге беріңіз; жалпыға ашық сілтеме жасамаңыз."});
  guide.getRow(1).font = {bold:true,color:{argb:"FFFFFFFF"}};
  guide.getRow(1).fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF3B2233"}};
  guide.eachRow(row=>{row.alignment={vertical:"top",wrapText:true};row.height=44;});
  return workbook;
}
