# Magmafy X (CRM-X)
كل عميل محادثة. React + Vite + TS، عربي RTL مصري، فاتح افتراضيًا، بدون WebGL.
- تجريبي: `npm i && npm run dev` (كود الدخول 123456، أي إيميل)
- بناء تجريبي: `npm run build:mock` (يطلع dist بـ base ./)
- لايف: `VITE_API_URL=<exec url> VITE_ROUTER=hash VITE_MOCK=0 npx vite build --base ./` (نفس عقد Apps Script بتاع KILLerbood/CRM-)
- فحوصات: `npm run typecheck && npm run lint && npm test`
