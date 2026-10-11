export const WILAYAS: { code: string; fr: string; ar: string }[] = [
  ["01", "Adrar", "أدرار"], ["02", "Chlef", "الشلف"], ["03", "Laghouat", "الأغواط"], ["04", "Oum El Bouaghi", "أم البواقي"],
  ["05", "Batna", "باتنة"], ["06", "Béjaïa", "بجاية"], ["07", "Biskra", "بسكرة"], ["08", "Béchar", "بشار"],
  ["09", "Blida", "البليدة"], ["10", "Bouira", "البويرة"], ["11", "Tamanrasset", "تمنراست"], ["12", "Tébessa", "تبسة"],
  ["13", "Tlemcen", "تلمسان"], ["14", "Tiaret", "تيارت"], ["15", "Tizi Ouzou", "تيزي وزو"], ["16", "Alger", "الجزائر"],
  ["17", "Djelfa", "الجلفة"], ["18", "Jijel", "جيجل"], ["19", "Sétif", "سطيف"], ["20", "Saïda", "سعيدة"],
  ["21", "Skikda", "سكيكدة"], ["22", "Sidi Bel Abbès", "سيدي بلعباس"], ["23", "Annaba", "عنابة"], ["24", "Guelma", "قالمة"],
  ["25", "Constantine", "قسنطينة"], ["26", "Médéa", "المدية"], ["27", "Mostaganem", "مستغانم"], ["28", "M'Sila", "المسيلة"],
  ["29", "Mascara", "معسكر"], ["30", "Ouargla", "ورقلة"], ["31", "Oran", "وهران"], ["32", "El Bayadh", "البيض"],
  ["33", "Illizi", "إليزي"], ["34", "Bordj Bou Arréridj", "برج بوعريريج"], ["35", "Boumerdès", "بومرداس"], ["36", "El Tarf", "الطارف"],
  ["37", "Tindouf", "تندوف"], ["38", "Tissemsilt", "تيسمسيلت"], ["39", "El Oued", "الوادي"], ["40", "Khenchela", "خنشلة"],
  ["41", "Souk Ahras", "سوق أهراس"], ["42", "Tipaza", "تيبازة"], ["43", "Mila", "ميلة"], ["44", "Aïn Defla", "عين الدفلى"],
  ["45", "Naâma", "النعامة"], ["46", "Aïn Témouchent", "عين تموشنت"], ["47", "Ghardaïa", "غرداية"], ["48", "Relizane", "غليزان"],
  ["49", "Timimoun", "تيميمون"], ["50", "Bordj Badji Mokhtar", "برج باجي مختار"], ["51", "Ouled Djellal", "أولاد جلال"],
  ["52", "Béni Abbès", "بني عباس"], ["53", "In Salah", "عين صالح"], ["54", "In Guezzam", "عين قزام"], ["55", "Touggourt", "تقرت"],
  ["56", "Djanet", "جانت"], ["57", "El M'Ghair", "المغير"], ["58", "El Meniaa", "المنيعة"],
  ["59", "Aflou", "أفلو"], ["60", "Barika", "بريكة"], ["61", "El Kantara", "القنطرة"], ["62", "Bir El Ater", "بئر العاتر"],
  ["63", "El Aricha", "العريشة"], ["64", "Ksar Chellala", "قصر الشلالة"], ["65", "Aïn Ouessara", "عين وسارة"],
  ["66", "Messaad", "مسعد"], ["67", "Ksar El Boukhari", "قصر البخاري"], ["68", "Bou Saâda", "بوسعادة"],
  ["69", "El Abiodh Sidi Cheikh", "الأبيض سيدي الشيخ"],
].map(([code, fr, ar]) => ({ code, fr, ar }));

export const MODULES = [
  "Anatomie", "Biochimie", "Physiologie", "Histologie", "Biophysique", "Cytologie", "Génétique", "Immunologie",
  "Microbiologie", "Parasitologie", "Pharmacologie", "Sémiologie", "Cardiologie", "Pneumologie", "Neurologie",
  "Gastro-entérologie", "Néphrologie", "Endocrinologie", "Pédiatrie", "Gynécologie", "Chirurgie", "Psychiatrie",
  "Dermatologie", "Ophtalmologie", "ORL", "Médecine légale", "Épidémiologie", "Résidanat",
];

export const YEARS = [1, 2, 3, 4, 5, 6, 7];

export const IMAGES = {
  hero: "https://images.unsplash.com/photo-1656701718207-2aa066d02de6?w=1200&q=70",
  empty: "https://images.unsplash.com/photo-1588702547954-4800ead296ef?w=800&q=60",
  courseFallback: "https://images.unsplash.com/photo-1532153470116-e8c2088b8ac1?w=900&q=70",
};

export function wilayaName(code: string | null | undefined, lang: "ar" | "fr") {
  const w = WILAYAS.find((x) => x.code === code);
  return w ? `${w.code} - ${lang === "ar" ? w.ar : w.fr}` : "";
}
