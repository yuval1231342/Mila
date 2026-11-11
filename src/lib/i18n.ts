export type Locale = "he" | "en";
export const dir = (l: Locale) => (l === "he" ? "rtl" : "ltr");
const t = {
  he: { newChat: "שיחה חדשה", send: "שלח", stop: "עצור", placeholder: "כתבו הודעה…", rename: "שנה שם", del: "מחק",
        retry: "נסה שוב", copy: "העתק", aiNotice: "זוהי מערכת בינה מלאכותית. התשובות עלולות להכיל טעויות ואינן תחליף לייעוץ מקצועי.",
        login: "התחברות", register: "הרשמה", email: "אימייל", password: "סיסמה", legal: "מרכז משפטי", cancelSub: "ביטול עסקה / מנוי",
        accessibility: "הצהרת נגישות", cookies: "הגדרות עוגיות", accept: "אשר הכל", reject: "דחה לא הכרחיות", save: "שמור בחירה",
        necessary: "הכרחיות (תמיד פעילות)", analytics: "ניתוח נתונים", marketing: "שיווק",
        cookieText: "אנו משתמשים בעוגיות הכרחיות לתפעול האתר. עוגיות לניתוח ושיווק יופעלו רק באישורכם." },
  en: { newChat: "New chat", send: "Send", stop: "Stop", placeholder: "Write a message…", rename: "Rename", del: "Delete",
        retry: "Retry", copy: "Copy", aiNotice: "This is an AI system. Answers may contain errors and are not a substitute for professional advice.",
        login: "Sign in", register: "Sign up", email: "Email", password: "Password", legal: "Legal center", cancelSub: "Cancel transaction / subscription",
        accessibility: "Accessibility statement", cookies: "Cookie settings", accept: "Accept all", reject: "Reject non-essential", save: "Save choices",
        necessary: "Necessary (always on)", analytics: "Analytics", marketing: "Marketing",
        cookieText: "We use necessary cookies to run the site. Analytics and marketing cookies are only enabled with your consent." }
} as const;
export const tr = (l: Locale) => t[l];
