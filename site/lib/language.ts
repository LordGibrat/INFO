"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Language } from "./catalog";

const storageKey = "muza-language";
const languageEvent = "muza-language-change";
const isLanguage = (value: unknown): value is Language => value === "kk" || value === "ru" || value === "en";
const pageMetadata = {
  storefront: {
    kk: { title: "Muza Decors — Оралдағы мереке декоры, неон және ерекше сыйлықтар", description: "Оралда фотозона мен мерекені безендіру, неон, көлемді жазулар және фото-холст. Қазақстан қалаларына бұйымдарды Қазпошта арқылы жіберуді келісіңіз." },
    ru: { title: "Muza Decors — Оформление праздников, неон и подарки в Уральске", description: "Фотозоны и оформление мероприятий в Уральске. Неоновые вывески, объёмные надписи и фото на холсте. Согласуйте отправку изделий Казпочтой по Казахстану." },
    en: { title: "Muza Decors — Event Styling, Neon Signs & Gifts in Oral", description: "Event styling and photo backdrops in Oral (Uralsk), Kazakhstan. Custom neon signs, 3D lettering and canvas prints, with Kazpost shipping arranged on request." },
  },
  privacy: {
    kk: { title: "Құпиялық туралы — Muza Decors", description: "Muza Decors өтінім, байланыс және жеткізу деректерін қалай пайдаланатынын, деректеріңізді түзету не жою туралы сұрау жолын біліңіз." },
    ru: { title: "Конфиденциальность — Muza Decors", description: "Как Muza Decors использует данные заявки, контактные сведения и адрес доставки. Как запросить исправление или удаление своих данных." },
    en: { title: "Privacy — Muza Decors", description: "Learn how Muza Decors uses your order request, contact and delivery details, and how to request a correction or deletion of your data." },
  },
  admin: {
    kk: { title: "Тапсырыстар мен жеткізу — Muza Decors", description: "Muza Decors әкімшісінің қорғалған жұмыс орны: тапсырыстар, жеткізу, клиенттермен байланыс және Excel." },
    ru: { title: "Заказы и доставка — Muza Decors", description: "Защищённая панель администратора Muza Decors: заказы, доставка, связь с клиентами и Excel." },
    en: { title: "Orders & Delivery — Muza Decors", description: "The secure Muza Decors admin workspace for orders, delivery, customer contact and Excel." },
  },
} satisfies Record<string, Record<Language, { title: string; description: string }>>;

export function useLanguage(): [Language, (language: Language) => void] {
  const [language, updateLanguage] = useState<Language>("kk");
  const pathname = usePathname();

  useEffect(() => {
    const page = pathname?.startsWith("/admin") ? "admin" : pathname?.startsWith("/privacy") ? "privacy" : "storefront";
    const metadata = pageMetadata[page][language];
    document.documentElement.lang = language;
    document.title = metadata.title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = metadata.description;
  }, [language, pathname]);

  useEffect(() => {
    let initial: Language = "kk";
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (isLanguage(requested)) {
      initial = requested;
      try { localStorage.setItem(storageKey, requested); } catch { /* Storage is optional. */ }
    } else {
      try {
        const stored = localStorage.getItem(storageKey);
        if (isLanguage(stored)) initial = stored;
      } catch { /* Keep Kazakh when storage is unavailable. */ }
    }
    updateLanguage(initial);
    document.documentElement.lang = initial;
    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<unknown>).detail;
      if (isLanguage(next)) {
        updateLanguage(next);
        document.documentElement.lang = next;
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && isLanguage(event.newValue)) {
        updateLanguage(event.newValue);
        document.documentElement.lang = event.newValue;
      }
    };
    window.addEventListener(languageEvent, onLanguageChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(languageEvent, onLanguageChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    document.documentElement.lang = next;
    try { localStorage.setItem(storageKey, next); } catch { /* Language selection works without storage. */ }
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", next);
      window.history.replaceState(window.history.state, "", url);
    }
    window.dispatchEvent(new CustomEvent(languageEvent, { detail: next }));
  }, []);

  return [language, setLanguage];
}
