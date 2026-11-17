import type { StoreData } from '../types/store';

export const LOOKBOOK_IMAGES = [
  {
    src: '/src/assets/images/lookbook_monochrome_1794940770283.jpg',
    caption: '01. MONOCHROME ARCHIVE',
  },
  {
    src: '/src/assets/images/hero_streetwear_campaign_1794940767269.jpg',
    caption: '02. BRUTALIST CAIRO',
  },
  {
    src: '/src/assets/images/product_cargo_pants_1794940768899.jpg',
    caption: '03. UTILITY SILHOUETTE',
  },
];

export const DEFAULT_STORE_DATA: StoreData = {
  adminPassword: '0000',
  whatsappNumber: '201000000000',
  siteContent: {
    announcement: 'DROP 01: "CREATE YOUR OWN DIRECTION" — شحن مجاني للطلبات فوق 2500 EGP',
    heroTitle: 'CREATE YOUR OWN DIRECTION.',
    heroSubtitle:
      'تصميمات استثنائية مستوحاة من العمارة الحديثة والرموز الرقمية. خامات ثقيلة وقصّات Oversized صُممت خصيصاً لمن يرفض القوالب الجاهزة.',
    heroImage: '/src/assets/images/hero_streetwear_campaign_1794940767269.jpg',
    manifestoHeadline: 'NOT MADE TO FIT IN.',
    manifestoSub: 'DIFFERENT MINDS. ONE IDENTITY. AN IDENTITY WITHOUT LIMITS.',
    manifestoBody:
      'في ∅ ONE نؤمن أن الملابس ليست مجرد قماش، بل هي موقف وهوية بصرية. كل قطعة يتم تصميمها بعناية فائقة لتجمع بين البساطة المعمارية والجرأة.',
    footerContact: 'Instagram: @0one.eg | WhatsApp: +20 100 000 0000',
  },
  generalSizeGuide: [
    { size: 'S', chest: '58', length: '69', shoulder: '56' },
    { size: 'M', chest: '61', length: '72', shoulder: '59' },
    { size: 'L', chest: '64', length: '75', shoulder: '62' },
    { size: 'XL', chest: '67', length: '78', shoulder: '65' },
  ],
  governorates: [
    { name: 'القاهرة / الجيزة', price: 60 },
    { name: 'الإسكندرية', price: 75 },
    { name: 'الدلتا (المنصورة، طنطا، الزقازيق، إلخ)', price: 80 },
    { name: 'القنال (السويس، الإسماعيلية، بورسعيد)', price: 85 },
    { name: 'الصعيد (أسيوط، سوهاج، قنا، أسوان، إلخ)', price: 100 },
  ],
  products: [
    {
      id: 'p1',
      name: '01 BINARY CODE HEAVY HOODIE',
      price: 1550,
      category: 'hoodies',
      badge: 'BEST SELLER',
      image: '/src/assets/images/product_binary_hoodie_1794940767464.jpg',
      sizes: ['S', 'M', 'L', 'XL'],
      description: 'هودي أسود فاحم بوزن 450 GSM مع طباعة رقمية بتصميم 01 Binary Code.',
      extraDetails:
        '- قطن مصري 100% ثقيل الوزن 450 GSM\n- معالج ضد الانكماش والوبر\n- طباعة رقمية بارزة عالية الثبات',
      sizeChart:
        'S: الصدر 58 سم | الطول 69 سم\nM: الصدر 61 سم | الطول 72 سم\nL: الصدر 64 سم | الطول 75 سم\nXL: الصدر 67 سم | الطول 78 سم',
      stock: 15,
    },
    {
      id: 'p2',
      name: 'LOST BETWEEN SPACES OVERSIZED TEE',
      price: 890,
      category: 'tees',
      badge: 'LIMITED DROP',
      image: '/src/assets/images/product_oversized_tee_1794940767637.jpg',
      sizes: ['S', 'M', 'L', 'XL'],
      description: 'تيشيرت أوفر سايز بوزن 280 GSM قطن مصري 100% مع جرافيك معماري.',
      extraDetails: '- قطن مسامي ممتاز للطقس المعتدل\n- قصّة Boxy Fit واسعة مريحة',
      sizeChart:
        'S: الصدر 54 سم | الطول 70 سم\nM: الصدر 57 سم | الطول 73 سم\nL: الصدر 60 سم | الطول 76 سم\nXL: الصدر 63 سم | الطول 79 سم',
      stock: 20,
    },
    {
      id: 'p3',
      name: '01 VARSITY ARCHIVE HOODIE',
      price: 1600,
      category: 'hoodies',
      badge: 'NEW DROP',
      image: '/src/assets/images/product_varsity_hoodie_1794940768393.jpg',
      sizes: ['M', 'L', 'XL'],
      description: 'تصميم جريء برقم 01 بارز بلون أوف وايت ناصع وخامة فليس ثقيلة.',
      extraDetails: '- بطانة داخلية ناعمة Fleece 450 GSM\n- ياقة وأساور متينة عالية المرونة',
      sizeChart:
        'M: الصدر 61 سم | الطول 72 سم\nL: الصدر 64 سم | الطول 75 سم\nXL: الصدر 67 سم | الطول 78 سم',
      stock: 10,
    },
    {
      id: 'p4',
      name: 'ARCHITECTURAL CARGO SWEATPANTS',
      price: 1350,
      category: 'pants',
      badge: 'UTILITY SERIES',
      image: '/src/assets/images/product_cargo_pants_1794940768899.jpg',
      sizes: ['S', 'M', 'L', 'XL'],
      description: 'بنطلون كارجو أسود بجيوب جانبية عملية وقصّة واسعة Wide-Leg مريحة.',
      extraDetails: '- خامة قطن ثقيل مع تفاصيل خياطة معمارية\n- جيوب جانبية بسحّاب معدني',
      sizeChart:
        'S: الخصر 30-32 | الطول 100 سم\nM: الخصر 32-34 | الطول 102 سم\nL: الخصر 34-36 | الطول 104 سم\nXL: الخصر 36-38 | الطول 106 سم',
      stock: 12,
    },
  ],
  paymentSettings: {
    freeShippingThreshold: 2500,
    instapayHandle: '0one.eg@instapay',
    walletNumber: '01000000000',
    enabledMethods: {
      card: true,
      wallet: true,
      instapay: true,
      cod: true,
    },
  },
  promoCodes: [
    { code: 'ONE10', discountPercent: 10, active: true },
    { code: 'DROP01', discountPercent: 15, active: true },
  ],
  shippingIntegration: {
    provider: 'none',
    webhookUrl: '',
    apiKeyHeader: '',
    autoDispatch: false,
  },
  orders: [],
  paymentAttempts: [],
};
