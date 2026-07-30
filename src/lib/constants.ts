
export const NICA_BANKS = [
  "Banpro",
  "BAC Credomatic",
  "Ficohsa",
  "Banco LAFISE BANCENTRO",
  "Banco Avanz",
  "Banco de Finanzas (BDF)",
] as const;

export type NicaBank = typeof NICA_BANKS[number];

export const PRODUCT_TYPES = [
  "Digital",
  "Físico"
] as const;

export type ProductType = typeof PRODUCT_TYPES[number];

export const PRODUCT_CATEGORIES = [
  "Curso",
  "Servicio",
  "Infoproducto",
  "E-book",
  "Software",
  "Hardware",
  "Ropa / Accesorios",
  "Otros"
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

export const COUNTRY_CODES = [
  { code: "+505", name: "Nicaragua", flag: "🇳🇮" },
  { code: "+506", name: "Costa Rica", flag: "🇨🇷" },
  { code: "+504", name: "Honduras", flag: "🇭🇳" },
  { code: "+503", name: "El Salvador", flag: "🇸🇻" },
  { code: "+502", name: "Guatemala", flag: "🇬🇹" },
  { code: "+507", name: "Panamá", flag: "🇵🇦" },
  { code: "+1", name: "USA / Canada", flag: "🇺🇸" },
  { code: "+52", name: "México", flag: "🇲🇽" },
  { code: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "+34", name: "España", flag: "🇪🇸" },
  { code: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "+51", name: "Perú", flag: "🇵🇪" },
  { code: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "+598", name: "Uruguay", flag: "🇺🇾" },
] as const;
