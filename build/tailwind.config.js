// Konfigurácia pre vygenerovanie styles.css (spúšťa sa z hlavného priečinka projektu):
//   npx tailwindcss@3 -c build/tailwind.config.js -i build/site-in.css -o styles.css --minify
module.exports = {
  content: ['./index.html', './pridat-doucovatela.html', './sukromie.html'],
  theme: { extend: {
    colors: { primary: '#3B82F6', secondary: '#FBBF24', accent: '#10B981', dark: '#1F2937' },
    fontFamily: { heading: ['Nunito', 'sans-serif'], sans: ['Inter', 'sans-serif'] }
  } }
};
