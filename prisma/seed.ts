import 'dotenv/config'

import { auth } from '@/lib/auth'
import { env } from '@/lib/env'
import { catalogService } from '@/modules/catalog/service'
import { PERMISSIONS } from '@/modules/staff/permissions'
import { db } from '@/server/db'

const img = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`

const DAY = 24 * 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────
// Reference data
// ─────────────────────────────────────────────────────────────

const OPTIONS: { name: string; isSwatch: boolean; values: { value: string; hex?: string }[] }[] = [
  {
    name: 'Size',
    isSwatch: false,
    values: [
      { value: 'XS' },
      { value: 'S' },
      { value: 'M' },
      { value: 'L' },
      { value: 'XL' },
      { value: 'XXL' },
    ],
  },
  {
    name: 'Colour',
    isSwatch: true,
    values: [
      { value: 'Espresso', hex: '#4A3728' },
      { value: 'Sand', hex: '#C6B09A' },
      { value: 'Ivory', hex: '#F5EFE7' },
      { value: 'Noir', hex: '#1F1D1B' },
      { value: 'Olive', hex: '#6B705C' },
      { value: 'Rose', hex: '#C08A82' },
    ],
  },
  {
    name: 'Metal',
    isSwatch: false,
    values: [{ value: 'Gold' }, { value: 'Rose Gold' }, { value: 'Silver' }, { value: 'Oxidised' }],
  },
  {
    name: 'Stone',
    isSwatch: false,
    values: [{ value: 'Kundan' }, { value: 'Pearl' }, { value: 'Emerald' }, { value: 'None' }],
  },
]

interface CategorySeed {
  slug: string
  name: string
  description: string
  seoTitle: string
  seoDescription: string
  imageUrl?: string
  children: { slug: string; name: string; description: string }[]
}

const CATEGORIES: CategorySeed[] = [
  {
    slug: 'womens-clothing',
    name: "Women's Clothing",
    description:
      'Everyday and occasion wear cut from breathable natural fabrics — kurtas, dresses and drapes designed to be worn far beyond a single season.',
    seoTitle: "Women's Clothing Online in India",
    seoDescription:
      "Shop women's kurtas, dresses and sarees in natural fabrics. Considered design, honest quality, delivered across India.",
    imageUrl: img('photo-1551232864-3f0890e580d9'),
    children: [
      {
        slug: 'kurtas-suits',
        name: 'Kurtas & Suits',
        description:
          'Hand-finished kurtas and coordinated suit sets for work, festivals and everything between.',
      },
      {
        slug: 'dresses',
        name: 'Dresses',
        description: 'Fluid silhouettes in satin, linen and cotton, cut to move with you.',
      },
      {
        slug: 'sarees',
        name: 'Sarees',
        description: 'Contemporary drapes in tissue, linen and handloom weaves.',
      },
    ],
  },
  {
    slug: 'jewellery',
    name: 'Jewellery',
    description:
      'Imitation and fashion jewellery finished by hand — kundan, pearl and antique-gold pieces made to layer, stack and pass around.',
    seoTitle: 'Fashion & Imitation Jewellery Online in India',
    seoDescription:
      'Kundan earrings, pearl necklaces and gold filigree bangles. Hand-finished fashion jewellery with secure delivery across India.',
    imageUrl: img('photo-1602173574767-37ac01994b2a'),
    children: [
      { slug: 'earrings', name: 'Earrings', description: 'Studs, jhumkas and statement drops.' },
      {
        slug: 'necklaces',
        name: 'Necklaces',
        description: 'Layered chains, chokers and temple-inspired sets.',
      },
      {
        slug: 'bangles',
        name: 'Bangles',
        description: 'Stackable bangles and cuffs in gold and rose gold finishes.',
      },
    ],
  },
  {
    slug: 'fashion-accessories',
    name: 'Fashion Accessories',
    description:
      'The finishing pieces — structured bags, soft scarves and woven belts in a warm, wearable palette.',
    seoTitle: 'Fashion Accessories for Women Online in India',
    seoDescription:
      'Totes, sling bags, scarves and belts in a warm neutral palette. Premium fashion accessories delivered across India.',
    imageUrl: img('photo-1479064555552-3ef4979f8908'),
    children: [
      {
        slug: 'bags',
        name: 'Bags',
        description: 'Totes, slings and pouches built for daily carry.',
      },
      {
        slug: 'scarves',
        name: 'Scarves',
        description: 'Lightweight modal and cotton scarves in seasonless shades.',
      },
      {
        slug: 'belts',
        name: 'Belts',
        description: 'Woven and smooth-finish belts that hold a silhouette.',
      },
    ],
  },
]

interface VariantSeed {
  sku: string
  price: number
  compareAtPrice?: number
  stock: number
  lowStockThreshold?: number
  options: [string, string][]
}

interface ProductSeed {
  slug: string
  name: string
  categorySlug: string
  shortDescription: string
  description: string
  hsnCode: string
  gstRatePercent: number
  brand: string
  careInstructions?: string
  seoTitle: string
  seoDescription: string
  isFeatured: boolean
  optionNames: string[]
  images: readonly [string, string]
  variants: VariantSeed[]
}

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'ivory-chikankari-kurta',
    name: 'Ivory Chikankari Kurta',
    categorySlug: 'kurtas-suits',
    shortDescription: 'Hand-embroidered chikankari on breathable cotton mul.',
    description:
      'A straight-cut kurta in soft cotton mul, hand-embroidered in Lucknow with traditional chikankari. The needlework is deliberately restrained — fine white-on-white detailing across the yoke and cuffs that reads as texture rather than ornament. Side slits and a relaxed fall make it as easy over trousers as it is with a churidar.',
    hsnCode: '6204',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions: 'Hand wash cold with mild detergent. Dry in shade. Warm iron on reverse.',
    seoTitle: 'Ivory Chikankari Cotton Kurta',
    seoDescription:
      'Hand-embroidered chikankari kurta in breathable cotton mul. Sizes XS–XXL, delivered across India.',
    isFeatured: true,
    optionNames: ['Size', 'Colour'],
    images: [img('photo-1571513722275-4b41940f54b8'), img('photo-1509319117193-57bab727e09d')],
    variants: [
      {
        sku: 'VZ-KUR-IVR-S',
        price: 1899,
        compareAtPrice: 2399,
        stock: 14,
        options: [
          ['Size', 'S'],
          ['Colour', 'Ivory'],
        ],
      },
      {
        sku: 'VZ-KUR-IVR-M',
        price: 1899,
        compareAtPrice: 2399,
        stock: 2,
        options: [
          ['Size', 'M'],
          ['Colour', 'Ivory'],
        ],
      },
      {
        sku: 'VZ-KUR-IVR-L',
        price: 1899,
        compareAtPrice: 2399,
        stock: 9,
        options: [
          ['Size', 'L'],
          ['Colour', 'Ivory'],
        ],
      },
      {
        sku: 'VZ-KUR-SND-M',
        price: 1899,
        stock: 11,
        options: [
          ['Size', 'M'],
          ['Colour', 'Sand'],
        ],
      },
    ],
  },
  {
    slug: 'espresso-satin-midi-dress',
    name: 'Espresso Satin Midi Dress',
    categorySlug: 'dresses',
    shortDescription: 'Bias-cut satin with a fluid drape and covered buttons.',
    description:
      'Cut on the bias so it skims rather than clings, this midi dress is made from a heavyweight satin with a low-sheen finish. Covered buttons run the length of the placket and a self-tie belt lets you set the waist where you want it. It photographs as well under evening light as it wears through a long day.',
    hsnCode: '6204',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions: 'Dry clean recommended. Cool iron on reverse. Store on a padded hanger.',
    seoTitle: 'Espresso Satin Bias-Cut Midi Dress',
    seoDescription:
      'Bias-cut satin midi dress in deep espresso. Fluid drape, covered buttons, sizes XS–XL.',
    isFeatured: true,
    optionNames: ['Size', 'Colour'],
    images: [img('photo-1581044777550-4cfa60707c03'), img('photo-1594633312681-425c7b97ccd1')],
    variants: [
      {
        sku: 'VZ-DRS-ESP-S',
        price: 2499,
        compareAtPrice: 3199,
        stock: 8,
        options: [
          ['Size', 'S'],
          ['Colour', 'Espresso'],
        ],
      },
      {
        sku: 'VZ-DRS-ESP-M',
        price: 2499,
        compareAtPrice: 3199,
        stock: 12,
        options: [
          ['Size', 'M'],
          ['Colour', 'Espresso'],
        ],
      },
      {
        sku: 'VZ-DRS-NOI-M',
        price: 2499,
        stock: 6,
        options: [
          ['Size', 'M'],
          ['Colour', 'Noir'],
        ],
      },
      {
        sku: 'VZ-DRS-NOI-L',
        price: 2499,
        stock: 4,
        options: [
          ['Size', 'L'],
          ['Colour', 'Noir'],
        ],
      },
    ],
  },
  {
    slug: 'sand-tissue-linen-saree',
    name: 'Sand Tissue Linen Saree',
    categorySlug: 'sarees',
    shortDescription: 'Featherweight tissue linen with a fine zari border.',
    description:
      'A six-and-a-half metre drape in tissue linen, light enough to wear through a summer afternoon and structured enough to hold a pleat. A single fine zari line runs the length of the border, catching light without shouting. Comes with an unstitched blouse piece in matching sand.',
    hsnCode: '6204',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions:
      'Dry clean only. Store folded in muslin, refold along different lines each season.',
    seoTitle: 'Sand Tissue Linen Saree with Zari Border',
    seoDescription:
      'Featherweight tissue linen saree in sand with a fine zari border and unstitched blouse piece.',
    isFeatured: false,
    optionNames: ['Colour'],
    images: [img('photo-1445205170230-053b83016050'), img('photo-1490481651871-ab68de25d43d')],
    variants: [
      {
        sku: 'VZ-SAR-SND-OS',
        price: 3499,
        compareAtPrice: 4299,
        stock: 0,
        options: [['Colour', 'Sand']],
      },
      { sku: 'VZ-SAR-IVR-OS', price: 3499, stock: 0, options: [['Colour', 'Ivory']] },
    ],
  },
  {
    slug: 'olive-linen-coord-set',
    name: 'Olive Linen Co-ord Set',
    categorySlug: 'kurtas-suits',
    shortDescription: 'Relaxed linen shirt and wide-leg trousers, sold as a set.',
    description:
      'A two-piece set in washed European linen — a boxy camp-collar shirt with a single patch pocket, and wide-leg trousers with a partly elasticated waist. Linen softens with every wash rather than wearing out, so the set gets better through the season. Wear it together or split it across your wardrobe.',
    hsnCode: '6204',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions:
      'Machine wash cold on gentle cycle. Line dry. Steam or press while slightly damp.',
    seoTitle: 'Olive Washed Linen Co-ord Set',
    seoDescription:
      'Washed linen co-ord set in olive — camp-collar shirt and wide-leg trousers. Sizes S–XL.',
    isFeatured: false,
    optionNames: ['Size', 'Colour'],
    images: [img('photo-1523381210434-271e8be1f52b'), img('photo-1551232864-3f0890e580d9')],
    variants: [
      {
        sku: 'VZ-COR-OLV-S',
        price: 2799,
        stock: 7,
        options: [
          ['Size', 'S'],
          ['Colour', 'Olive'],
        ],
      },
      {
        sku: 'VZ-COR-OLV-M',
        price: 2799,
        stock: 10,
        options: [
          ['Size', 'M'],
          ['Colour', 'Olive'],
        ],
      },
      {
        sku: 'VZ-COR-OLV-L',
        price: 2799,
        stock: 5,
        options: [
          ['Size', 'L'],
          ['Colour', 'Olive'],
        ],
      },
      {
        sku: 'VZ-COR-SND-M',
        price: 2799,
        stock: 3,
        options: [
          ['Size', 'M'],
          ['Colour', 'Sand'],
        ],
      },
    ],
  },
  {
    slug: 'cream-cotton-wrap-top',
    name: 'Cream Cotton Wrap Top',
    categorySlug: 'dresses',
    shortDescription: 'A softly gathered wrap top in mercerised cotton.',
    description:
      'A wrap top in mercerised cotton with a subtle lustre, gathered at the side seam so it falls cleanly without pulling. The tie fastens inside and out, which means the wrap stays put through the day. An easy anchor piece for linen trousers or denim.',
    hsnCode: '6104',
    gstRatePercent: 5,
    brand: 'Vennzya',
    careInstructions: 'Machine wash cold. Tumble dry low or line dry. Warm iron.',
    seoTitle: 'Cream Mercerised Cotton Wrap Top',
    seoDescription:
      'Softly gathered cotton wrap top in cream. Everyday layering piece, sizes XS–XL.',
    isFeatured: false,
    optionNames: ['Size', 'Colour'],
    images: [img('photo-1620799140408-edc6dcb6d633'), img('photo-1441984904996-e0b6ba687e04')],
    variants: [
      {
        sku: 'VZ-TOP-IVR-XS',
        price: 899,
        stock: 15,
        options: [
          ['Size', 'XS'],
          ['Colour', 'Ivory'],
        ],
      },
      {
        sku: 'VZ-TOP-IVR-S',
        price: 899,
        stock: 18,
        options: [
          ['Size', 'S'],
          ['Colour', 'Ivory'],
        ],
      },
      {
        sku: 'VZ-TOP-ROS-M',
        price: 899,
        stock: 12,
        options: [
          ['Size', 'M'],
          ['Colour', 'Rose'],
        ],
      },
    ],
  },
  {
    slug: 'kundan-statement-earrings',
    name: 'Kundan Statement Earrings',
    categorySlug: 'earrings',
    shortDescription: 'Uncut-style kundan drops on a gold-finish base.',
    description:
      'Statement drops set with uncut-style kundan on a gold-finished brass base, strung with a fringe of cultured-look pearls. They are lighter than they look — the backs are hollowed so the weight sits on the lobe rather than dragging it. Secure screw-back fittings.',
    hsnCode: '7117',
    gstRatePercent: 3,
    brand: 'Vennzya',
    careInstructions:
      'Keep away from perfume and moisture. Wipe with a dry cloth and store in the pouch provided.',
    seoTitle: 'Kundan Statement Drop Earrings',
    seoDescription:
      'Gold-finish kundan statement earrings with pearl fringe. Lightweight with screw-back fittings.',
    isFeatured: true,
    optionNames: ['Metal', 'Stone'],
    images: [img('photo-1617038220319-276d3cfab638'), img('photo-1608042314453-ae338d80c427')],
    variants: [
      {
        sku: 'VZ-EAR-GLD-KUN',
        price: 1299,
        compareAtPrice: 1699,
        stock: 22,
        options: [
          ['Metal', 'Gold'],
          ['Stone', 'Kundan'],
        ],
      },
      {
        sku: 'VZ-EAR-GLD-EMR',
        price: 1499,
        stock: 9,
        options: [
          ['Metal', 'Gold'],
          ['Stone', 'Emerald'],
        ],
      },
      {
        sku: 'VZ-EAR-RSG-KUN',
        price: 1199,
        stock: 4,
        options: [
          ['Metal', 'Rose Gold'],
          ['Stone', 'Kundan'],
        ],
      },
    ],
  },
  {
    slug: 'pearl-drop-layered-necklace',
    name: 'Pearl Drop Layered Necklace',
    categorySlug: 'necklaces',
    shortDescription: 'Two-strand necklace with a single pearl drop.',
    description:
      'A two-strand necklace that sits at collarbone and just below, finished with one baroque-shaped pearl drop at the centre. The strands are joined at the clasp so they never twist against each other. An adjustable extender chain takes it from choker to classic length.',
    hsnCode: '7117',
    gstRatePercent: 3,
    brand: 'Vennzya',
    careInstructions:
      'Put on after perfume, remove before bathing. Store flat to prevent tangling.',
    seoTitle: 'Layered Pearl Drop Necklace',
    seoDescription:
      'Two-strand layered necklace with a baroque pearl drop and adjustable extender chain.',
    isFeatured: true,
    optionNames: ['Metal', 'Stone'],
    images: [img('photo-1611085583191-a3b181a88401'), img('photo-1599643478518-a784e5dc4c8f')],
    variants: [
      {
        sku: 'VZ-NEC-GLD-PRL',
        price: 1799,
        compareAtPrice: 2299,
        stock: 16,
        options: [
          ['Metal', 'Gold'],
          ['Stone', 'Pearl'],
        ],
      },
      {
        sku: 'VZ-NEC-RSG-PRL',
        price: 1899,
        stock: 7,
        options: [
          ['Metal', 'Rose Gold'],
          ['Stone', 'Pearl'],
        ],
      },
      {
        sku: 'VZ-NEC-SLV-PRL',
        price: 1699,
        stock: 11,
        options: [
          ['Metal', 'Silver'],
          ['Stone', 'Pearl'],
        ],
      },
    ],
  },
  {
    slug: 'gold-filigree-bangle-set',
    name: 'Gold Filigree Bangle Set',
    categorySlug: 'bangles',
    shortDescription: 'A set of four hand-finished filigree bangles.',
    description:
      'Four bangles in a warm gold finish, each with a different hand-worked texture — beaten, ridged, plain and filigree. Worn together they read as one considered stack; worn apart each holds its own. The finish is sealed so it keeps its warmth through daily wear.',
    hsnCode: '7117',
    gstRatePercent: 3,
    brand: 'Vennzya',
    careInstructions: 'Wipe with a soft dry cloth. Keep away from perfume and polishing compounds.',
    seoTitle: 'Gold Filigree Bangle Set of Four',
    seoDescription:
      'Hand-finished gold filigree bangle set of four with varied textures. Available in two finishes.',
    isFeatured: false,
    optionNames: ['Metal', 'Stone'],
    images: [img('photo-1611591437281-460bfbe1220a'), img('photo-1584302179602-e4c3d3fd629d')],
    variants: [
      {
        sku: 'VZ-BNG-GLD-NON',
        price: 999,
        stock: 20,
        options: [
          ['Metal', 'Gold'],
          ['Stone', 'None'],
        ],
      },
      {
        sku: 'VZ-BNG-RSG-NON',
        price: 1099,
        stock: 13,
        options: [
          ['Metal', 'Rose Gold'],
          ['Stone', 'None'],
        ],
      },
    ],
  },
  {
    slug: 'espresso-leather-tote',
    name: 'Espresso Leather Tote',
    categorySlug: 'bags',
    shortDescription: 'Full-grain leather tote that fits a 14" laptop.',
    description:
      'A structured tote in full-grain leather with a natural pebble texture, unlined at the sides so the material can soften into its own shape. The main compartment takes a 14-inch laptop flat, with a slip pocket for a phone and a zip pocket for everything that would otherwise disappear. Edges are hand-painted and burnished.',
    hsnCode: '4202',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions:
      'Condition with a neutral leather balm twice a year. Keep away from prolonged direct sun.',
    seoTitle: 'Espresso Full-Grain Leather Tote Bag',
    seoDescription:
      'Structured full-grain leather tote in espresso. Fits a 14-inch laptop, hand-burnished edges.',
    isFeatured: true,
    optionNames: ['Colour'],
    images: [img('photo-1600857062241-98e5dba7f214'), img('photo-1479064555552-3ef4979f8908')],
    variants: [
      {
        sku: 'VZ-BAG-TOT-ESP',
        price: 3999,
        compareAtPrice: 4999,
        stock: 9,
        options: [['Colour', 'Espresso']],
      },
      { sku: 'VZ-BAG-TOT-NOI', price: 3999, stock: 6, options: [['Colour', 'Noir']] },
    ],
  },
  {
    slug: 'sand-quilted-sling-bag',
    name: 'Sand Quilted Sling Bag',
    categorySlug: 'bags',
    shortDescription: 'Quilted sling with an adjustable webbing strap.',
    description:
      'A compact quilted sling in a soft sand finish, sized for a phone, cardholder and the small things you actually carry. The webbing strap adjusts from shoulder to crossbody without a buckle showing at the front. A magnetic flap opens one-handed.',
    hsnCode: '4202',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions: 'Spot clean with a damp cloth. Air dry away from direct heat.',
    seoTitle: 'Sand Quilted Crossbody Sling Bag',
    seoDescription:
      'Compact quilted sling bag in sand with an adjustable webbing strap and magnetic flap.',
    isFeatured: false,
    optionNames: ['Colour'],
    images: [img('photo-1606522754091-a3bbf9ad4cb3'), img('photo-1600857062241-98e5dba7f214')],
    variants: [
      { sku: 'VZ-BAG-SLG-SND', price: 2199, stock: 14, options: [['Colour', 'Sand']] },
      { sku: 'VZ-BAG-SLG-ESP', price: 2199, stock: 8, options: [['Colour', 'Espresso']] },
      { sku: 'VZ-BAG-SLG-ROS', price: 2199, stock: 3, options: [['Colour', 'Rose']] },
    ],
  },
  {
    slug: 'ivory-modal-scarf',
    name: 'Ivory Modal Scarf',
    categorySlug: 'scarves',
    shortDescription: 'Featherweight modal with hand-knotted fringe.',
    description:
      'A generously sized scarf in modal — cooler than wool, softer than cotton, and light enough to pack into a bag without creasing badly. The fringe is hand-knotted rather than cut, so it holds together through repeated washing. Works as a shoulder cover through an over-cooled office and a wrap on a night flight.',
    hsnCode: '6217',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions: 'Hand wash cold or machine wash in a mesh bag. Dry flat in shade.',
    seoTitle: 'Ivory Modal Scarf with Hand-Knotted Fringe',
    seoDescription:
      'Featherweight modal scarf in ivory with hand-knotted fringe. Seasonless everyday wrap.',
    isFeatured: true,
    optionNames: ['Colour'],
    images: [img('photo-1434389677669-e08b4cac3105'), img('photo-1620799140408-edc6dcb6d633')],
    variants: [
      {
        sku: 'VZ-SCF-IVR-OS',
        price: 799,
        compareAtPrice: 999,
        stock: 25,
        options: [['Colour', 'Ivory']],
      },
      { sku: 'VZ-SCF-OLV-OS', price: 799, stock: 17, options: [['Colour', 'Olive']] },
      { sku: 'VZ-SCF-ROS-OS', price: 799, stock: 2, options: [['Colour', 'Rose']] },
    ],
  },
  {
    slug: 'tan-woven-belt',
    name: 'Tan Woven Belt',
    categorySlug: 'belts',
    shortDescription: 'Elasticated woven belt with a brushed brass buckle.',
    description:
      'A woven belt with just enough stretch to sit comfortably through a long meal, finished with a brushed brass buckle that will not catch the light awkwardly in photographs. Because the weave grips anywhere along its length, it fastens at any point rather than at fixed holes.',
    hsnCode: '6217',
    gstRatePercent: 12,
    brand: 'Vennzya',
    careInstructions: 'Wipe the buckle with a dry cloth. Store rolled rather than folded.',
    seoTitle: 'Tan Woven Stretch Belt with Brass Buckle',
    seoDescription:
      'Elasticated woven belt in tan with a brushed brass buckle. Fastens at any point along the weave.',
    isFeatured: false,
    optionNames: ['Colour'],
    images: [img('photo-1479064555552-3ef4979f8908'), img('photo-1600857062241-98e5dba7f214')],
    variants: [
      { sku: 'VZ-BLT-SND-OS', price: 1099, stock: 12, options: [['Colour', 'Sand']] },
      { sku: 'VZ-BLT-ESP-OS', price: 1099, stock: 10, options: [['Colour', 'Espresso']] },
    ],
  },
]

const COLLECTIONS: {
  slug: string
  title: string
  description: string
  imageUrl: string
  productSlugs: string[]
}[] = [
  {
    slug: 'new-arrivals',
    title: 'New Arrivals',
    description: 'The most recent additions to the edit — fresh cuts, fresh colourways.',
    imageUrl: img('photo-1490481651871-ab68de25d43d'),
    productSlugs: [
      'ivory-chikankari-kurta',
      'espresso-satin-midi-dress',
      'olive-linen-coord-set',
      'pearl-drop-layered-necklace',
      'espresso-leather-tote',
      'ivory-modal-scarf',
    ],
  },
  {
    slug: 'festive-edit',
    title: 'Festive Edit',
    description:
      'Pieces chosen for the season of long evenings, longer dinners and family photographs.',
    imageUrl: img('photo-1445205170230-053b83016050'),
    productSlugs: [
      'sand-tissue-linen-saree',
      'kundan-statement-earrings',
      'pearl-drop-layered-necklace',
      'gold-filigree-bangle-set',
      'ivory-chikankari-kurta',
    ],
  },
]

const TESTIMONIALS = [
  {
    id: 'seed-testimonial-1',
    authorName: 'Aishwarya Menon',
    location: 'Kochi, Kerala',
    body: 'The chikankari kurta is the first online buy in ages where the fabric felt better in person than on screen. The embroidery is genuinely hand-done — you can see the slight variation in the stitches.',
    rating: 5,
    isFeatured: true,
  },
  {
    id: 'seed-testimonial-2',
    authorName: 'Ritika Bansal',
    location: 'Gurugram, Haryana',
    body: 'Ordered the satin midi for a wedding reception with four days to spare and it arrived in two. Fit was true to the size chart, which almost never happens.',
    rating: 5,
    isFeatured: true,
  },
  {
    id: 'seed-testimonial-3',
    authorName: 'Sneha Deshpande',
    location: 'Pune, Maharashtra',
    body: 'I wear the filigree bangles almost daily and the finish has held up beautifully over four months. They have warmed a little with wear, which I actually prefer.',
    rating: 5,
    isFeatured: true,
  },
  {
    id: 'seed-testimonial-4',
    authorName: 'Farida Qureshi',
    location: 'Hyderabad, Telangana',
    body: 'Had to exchange the co-ord for a larger size and the WhatsApp support sorted it without making me repeat myself three times. Refreshing.',
    rating: 4,
    isFeatured: false,
  },
  {
    id: 'seed-testimonial-5',
    authorName: 'Lakshmi Raghavan',
    location: 'Chennai, Tamil Nadu',
    body: 'The leather tote takes my laptop and a change of clothes and still looks presentable walking into a client meeting. Worth what I paid.',
    rating: 5,
    isFeatured: false,
  },
]

const FAQS = [
  {
    id: 'seed-faq-1',
    question: 'How long will my order take to arrive?',
    answer:
      'Orders are dispatched within 1–2 business days. Metro cities usually receive delivery in 2–4 business days, and the rest of India in 4–7 business days. You will receive a tracking link by email and WhatsApp as soon as your parcel is handed to the courier.',
    category: 'Shipping',
    sortOrder: 1,
  },
  {
    id: 'seed-faq-2',
    question: 'What is your return window?',
    answer:
      'You may request a return or exchange within 7 days of delivery, provided the item is unworn, unwashed and still has its original tags attached. Raise the request from your order page or message us on WhatsApp and we will arrange a pickup wherever our courier partners service your PIN code.',
    category: 'Returns',
    sortOrder: 2,
  },
  {
    id: 'seed-faq-3',
    question: 'Do you offer Cash on Delivery?',
    answer:
      'Yes. Cash on Delivery is available on most serviceable PIN codes for orders up to ₹5,000. If COD is unavailable for your address, the option will simply not appear at checkout.',
    category: 'Payments',
    sortOrder: 3,
  },
  {
    id: 'seed-faq-4',
    question: 'How do I choose the right size?',
    answer:
      'Every product page lists garment measurements in inches rather than generic size labels, because cuts differ between styles. Measure a garment you already own and compare. If you are between sizes on a structured piece, size up; on a relaxed piece, stay with the smaller size.',
    category: 'Sizing',
    sortOrder: 4,
  },
  {
    id: 'seed-faq-5',
    question: 'How should I care for my jewellery?',
    answer:
      'Our jewellery is imitation and hand-finished. Put pieces on after perfume and moisturiser, remove them before bathing or swimming, wipe with a dry cloth after wear, and store them in the pouch provided. Avoid metal polish, which strips the hand-applied finish.',
    category: 'Product Care',
    sortOrder: 5,
  },
  {
    id: 'seed-faq-6',
    question: 'How do I track my order?',
    answer:
      'Every order gets a tracking link by email and WhatsApp at dispatch. You can also open your order confirmation page at any time using the link in your confirmation email — no account required.',
    category: 'Orders',
    sortOrder: 6,
  },
  {
    id: 'seed-faq-7',
    question: 'Which payment methods do you accept?',
    answer:
      'We accept UPI, credit and debit cards, net banking and popular wallets through our secure payment gateway, plus Cash on Delivery on eligible orders. Your card details are never stored on our servers.',
    category: 'Payments',
    sortOrder: 7,
  },
  {
    id: 'seed-faq-8',
    question: 'How do I get in touch?',
    answer:
      'WhatsApp is the fastest route and is usually answered within a few hours during business hours. You can also use the contact form, or email us directly — we reply to every message within one business day.',
    category: 'Support',
    sortOrder: 8,
  },
]

const PLACEHOLDER_NOTICE =
  '> **Placeholder copy.** This policy is a working draft and has not yet been reviewed. It must be checked and approved by the business owner, and where appropriate by a legal professional, before the site goes live.'

const CONTENT_PAGES = [
  {
    pageKey: 'privacy',
    title: 'Privacy Policy',
    seoTitle: 'Privacy Policy',
    seoDescription:
      'How Vennzya Fashion Hub collects, uses and protects your personal information.',
    bodyMarkdown: `${PLACEHOLDER_NOTICE}

## What we collect

To process an order we collect your name, delivery address, phone number and email address. If you choose to create an account, we store your phone number as your login identity. Payment details are handled entirely by our payment gateway and never reach our servers.

## Why we collect it

We use your information to process and deliver orders, send order updates over email and WhatsApp, handle returns and refunds, respond to support requests, and meet our tax and accounting obligations under Indian law.

## Who we share it with

We share the minimum necessary information with our courier partners (to deliver your order), our payment gateway (to process payment), and our email and messaging providers (to send order updates). We do not sell your personal information to anyone.

## How long we keep it

Order records are retained for as long as required under applicable tax and company law. You may ask us to delete your account and any information we are not legally required to retain.

## Your choices

You can ask us to correct or delete your information, or opt out of marketing messages at any time, by contacting us using the details on our Contact page.`,
  },
  {
    pageKey: 'terms',
    title: 'Terms & Conditions',
    seoTitle: 'Terms & Conditions',
    seoDescription: 'The terms that apply when you shop with Vennzya Fashion Hub.',
    bodyMarkdown: `${PLACEHOLDER_NOTICE}

## Using this website

By placing an order you confirm that you are at least 18 years old, or that you have permission from a parent or guardian, and that the information you provide is accurate.

## Products and pricing

All prices are listed in Indian Rupees and are inclusive of GST. We work hard to display colours and details accurately, but screens vary and hand-finished pieces carry natural variation — this is a characteristic of the product, not a defect.

## Orders

Your order is confirmed only once payment is successfully received, or once a Cash on Delivery order is verified. We may cancel an order and issue a full refund if an item turns out to be unavailable, if pricing was displayed in error, or if we cannot deliver to your address.

## Intellectual property

All content on this website, including photographs, product descriptions and designs, belongs to Vennzya Fashion Hub and may not be reproduced without written permission.

## Governing law

These terms are governed by the laws of India, and any dispute is subject to the exclusive jurisdiction of the courts in our registered place of business.`,
  },
  {
    pageKey: 'shipping',
    title: 'Shipping & Delivery',
    seoTitle: 'Shipping & Delivery Policy',
    seoDescription: 'Delivery timelines, charges and tracking for orders across India.',
    bodyMarkdown: `${PLACEHOLDER_NOTICE}

## Where we deliver

We currently deliver across India. Serviceability is confirmed by PIN code at checkout.

## Timelines

Orders are dispatched within 1–2 business days of confirmation. Expected delivery is 2–4 business days for metro cities and 4–7 business days elsewhere. Festive periods and weather disruptions can add a little time.

## Charges

Delivery is free on prepaid orders above ₹1,499. Below that a flat delivery fee applies and is shown clearly at checkout before you pay. Cash on Delivery orders may carry a small additional handling fee.

## Tracking

You will receive a tracking link by email and WhatsApp when your parcel is handed to the courier. You can also open your order page at any time using the link in your confirmation email.

## If something goes wrong

If your parcel appears delayed, damaged in transit, or is marked delivered but has not reached you, contact us within 48 hours and we will take it up with the courier on your behalf.`,
  },
  {
    pageKey: 'returns',
    title: 'Returns & Refunds',
    seoTitle: 'Returns & Refund Policy',
    seoDescription: 'How to return or exchange an item, and how refunds are processed.',
    bodyMarkdown: `${PLACEHOLDER_NOTICE}

## Return window

Returns and exchanges can be requested within 7 days of delivery.

## Condition

Items must be unworn, unwashed and returned with original tags and packaging intact. For hygiene reasons, earrings cannot be returned unless they arrive damaged or incorrect.

## How to start a return

Raise the request from your order page or message us on WhatsApp with your order number. Where our courier partners service your PIN code we will arrange a pickup; otherwise we will share a self-ship address and reimburse reasonable courier charges.

## Refunds

Once your return reaches us and passes a quick quality check, refunds are issued to the original payment method within 5–7 business days. For Cash on Delivery orders we refund by bank transfer to the account details you provide.

## Exchanges

Size exchanges are subject to availability. If your size is out of stock we will issue a full refund instead.

## Damaged or incorrect items

If an item arrives damaged or is not what you ordered, contact us within 48 hours with photographs and we will replace it or refund you in full, including any delivery charges.`,
  },
]

const BANNERS = [
  {
    id: 'seed-banner-hero',
    title: 'Timeless pieces, thoughtfully chosen',
    subtitle:
      'A considered edit of women’s clothing, jewellery and accessories in a warm, wearable palette.',
    imageUrl: img('photo-1539533018447-63fcce2678e3'),
    linkUrl: '/shop',
    ctaLabel: 'Shop the edit',
    placement: 'HOMEPAGE_HERO' as const,
    sortOrder: 0,
  },
  {
    id: 'seed-banner-announcement',
    title: 'Free delivery on prepaid orders above ₹1,499',
    subtitle: null,
    imageUrl: null,
    linkUrl: '/shop',
    ctaLabel: null,
    placement: 'ANNOUNCEMENT_BAR' as const,
    sortOrder: 0,
  },
]

// ─────────────────────────────────────────────────────────────
// Seeding
// ─────────────────────────────────────────────────────────────

async function seedPermissions(): Promise<number> {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    })
  }
  return Object.keys(PERMISSIONS).length
}

async function seedOwner(): Promise<string> {
  const email = env.OWNER_EMAIL

  try {
    await auth.api.signUpEmail({
      body: { email, password: env.OWNER_PASSWORD, name: 'Vennzya Owner' },
    })
  } catch {
    // Already exists from a previous run — the role update below still applies.
  }

  const owner = await db.user.update({
    where: { email },
    data: { role: 'OWNER', emailVerified: true, name: 'Vennzya Owner' },
    select: { id: true },
  })

  return owner.id
}

async function seedOptions(): Promise<Map<string, string>> {
  const valueIds = new Map<string, string>()

  for (const [optionIndex, option] of OPTIONS.entries()) {
    const saved = await db.option.upsert({
      where: { name: option.name },
      update: { isSwatch: option.isSwatch, sortOrder: optionIndex },
      create: { name: option.name, isSwatch: option.isSwatch, sortOrder: optionIndex },
    })

    for (const [valueIndex, value] of option.values.entries()) {
      const savedValue = await db.optionValue.upsert({
        where: { optionId_value: { optionId: saved.id, value: value.value } },
        update: { swatchHex: value.hex ?? null, sortOrder: valueIndex },
        create: {
          optionId: saved.id,
          value: value.value,
          swatchHex: value.hex ?? null,
          sortOrder: valueIndex,
        },
      })
      valueIds.set(`${option.name}:${value.value}`, savedValue.id)
    }
  }

  return valueIds
}

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>()

  for (const [index, parent] of CATEGORIES.entries()) {
    const saved = await db.category.upsert({
      where: { slug: parent.slug },
      update: {
        name: parent.name,
        description: parent.description,
        imageUrl: parent.imageUrl ?? null,
        seoTitle: parent.seoTitle,
        seoDescription: parent.seoDescription,
        isActive: true,
        sortOrder: index,
      },
      create: {
        slug: parent.slug,
        name: parent.name,
        description: parent.description,
        imageUrl: parent.imageUrl ?? null,
        seoTitle: parent.seoTitle,
        seoDescription: parent.seoDescription,
        sortOrder: index,
      },
    })
    ids.set(parent.slug, saved.id)

    for (const [childIndex, child] of parent.children.entries()) {
      const savedChild = await db.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          description: child.description,
          parentId: saved.id,
          isActive: true,
          sortOrder: childIndex,
        },
        create: {
          slug: child.slug,
          name: child.name,
          description: child.description,
          parentId: saved.id,
          sortOrder: childIndex,
        },
      })
      ids.set(child.slug, savedChild.id)
    }
  }

  return ids
}

function requireId(map: Map<string, string>, key: string, label: string): string {
  const id = map.get(key)
  if (!id) throw new Error(`Seed data references an unknown ${label}: ${key}`)
  return id
}

async function seedProducts(
  categoryIds: Map<string, string>,
  optionValueIds: Map<string, string>,
): Promise<Map<string, string>> {
  const optionIds = new Map(
    (await db.option.findMany({ select: { id: true, name: true } })).map((o) => [o.name, o.id]),
  )
  const productIds = new Map<string, string>()

  for (const seed of PRODUCTS) {
    const publishedAt = new Date(Date.now() - 7 * DAY)

    const shared = {
      name: seed.name,
      description: seed.description,
      shortDescription: seed.shortDescription,
      status: 'ACTIVE' as const,
      hsnCode: seed.hsnCode,
      gstRatePercent: seed.gstRatePercent,
      brand: seed.brand,
      careInstructions: seed.careInstructions ?? null,
      seoTitle: seed.seoTitle,
      seoDescription: seed.seoDescription,
      isFeatured: seed.isFeatured,
      publishedAt,
    }

    const product = await db.product.upsert({
      where: { slug: seed.slug },
      update: shared,
      create: { slug: seed.slug, ...shared },
      select: { id: true },
    })
    productIds.set(seed.slug, product.id)

    const categoryId = requireId(categoryIds, seed.categorySlug, 'category')
    await db.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId } },
      update: {},
      create: { productId: product.id, categoryId },
    })

    for (const [index, optionName] of seed.optionNames.entries()) {
      const optionId = requireId(optionIds, optionName, 'option')
      await db.productOption.upsert({
        where: { productId_optionId: { productId: product.id, optionId } },
        update: { sortOrder: index },
        create: { productId: product.id, optionId, sortOrder: index },
      })
    }

    for (const variant of seed.variants) {
      const variantData = {
        productId: product.id,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice ?? null,
        stockQuantity: variant.stock,
        lowStockThreshold: variant.lowStockThreshold ?? 5,
        isActive: true,
      }

      const savedVariant = await db.productVariant.upsert({
        where: { sku: variant.sku },
        update: variantData,
        create: { sku: variant.sku, ...variantData },
        select: { id: true },
      })

      for (const [optionName, value] of variant.options) {
        const optionValueId = requireId(optionValueIds, `${optionName}:${value}`, 'option value')
        await db.variantOptionValue.upsert({
          where: {
            variantId_optionValueId: { variantId: savedVariant.id, optionValueId },
          },
          update: {},
          create: { variantId: savedVariant.id, optionValueId },
        })
      }
    }

    const [primaryImage, secondaryImage] = seed.images
    const images = [
      { id: `${seed.slug}-img-1`, url: primaryImage, sortOrder: 0, isPrimary: true },
      { id: `${seed.slug}-img-2`, url: secondaryImage, sortOrder: 1, isPrimary: false },
    ]

    for (const image of images) {
      const imageData = {
        productId: product.id,
        url: image.url,
        altText: seed.name,
        width: 1200,
        height: 1500,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      }
      await db.productImage.upsert({
        where: { id: image.id },
        update: imageData,
        create: { id: image.id, ...imageData },
      })
    }

    await catalogService.syncProductAggregates(product.id)
  }

  return productIds
}

async function seedCollections(productIds: Map<string, string>): Promise<number> {
  for (const [index, collection] of COLLECTIONS.entries()) {
    const saved = await db.collection.upsert({
      where: { slug: collection.slug },
      update: {
        title: collection.title,
        description: collection.description,
        imageUrl: collection.imageUrl,
        isActive: true,
        sortOrder: index,
      },
      create: {
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        imageUrl: collection.imageUrl,
        sortOrder: index,
      },
    })

    for (const [productIndex, productSlug] of collection.productSlugs.entries()) {
      const productId = requireId(productIds, productSlug, 'product')
      await db.collectionProduct.upsert({
        where: { collectionId_productId: { collectionId: saved.id, productId } },
        update: { sortOrder: productIndex },
        create: { collectionId: saved.id, productId, sortOrder: productIndex },
      })
    }
  }

  return COLLECTIONS.length
}

async function seedCoupons(ownerId: string): Promise<number> {
  await db.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {
      description: '10% off your first order',
      type: 'PERCENTAGE',
      value: 10,
      minOrderValue: 999,
      maxDiscountAmount: 500,
      isActive: true,
    },
    create: {
      code: 'WELCOME10',
      description: '10% off your first order',
      type: 'PERCENTAGE',
      value: 10,
      minOrderValue: 999,
      maxDiscountAmount: 500,
      usageLimitPerCustomer: 1,
      createdById: ownerId,
    },
  })

  await db.coupon.upsert({
    where: { code: 'FLAT300' },
    update: {
      description: '₹300 off orders above ₹1,999',
      type: 'FLAT',
      value: 300,
      minOrderValue: 1999,
      expiresAt: new Date(Date.now() + 30 * DAY),
      isActive: true,
    },
    create: {
      code: 'FLAT300',
      description: '₹300 off orders above ₹1,999',
      type: 'FLAT',
      value: 300,
      minOrderValue: 1999,
      expiresAt: new Date(Date.now() + 30 * DAY),
      createdById: ownerId,
    },
  })

  return 2
}

async function seedTestimonials(): Promise<number> {
  for (const [index, testimonial] of TESTIMONIALS.entries()) {
    const data = {
      authorName: testimonial.authorName,
      location: testimonial.location,
      body: testimonial.body,
      rating: testimonial.rating,
      isApproved: true,
      isFeatured: testimonial.isFeatured,
      sortOrder: index,
    }
    await db.testimonial.upsert({
      where: { id: testimonial.id },
      update: data,
      create: { id: testimonial.id, ...data },
    })
  }
  return TESTIMONIALS.length
}

async function seedFaqs(): Promise<number> {
  for (const faq of FAQS) {
    const data = {
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      sortOrder: faq.sortOrder,
      isActive: true,
    }
    await db.faqItem.upsert({
      where: { id: faq.id },
      update: data,
      create: { id: faq.id, ...data },
    })
  }
  return FAQS.length
}

async function seedContentPages(ownerId: string): Promise<number> {
  for (const page of CONTENT_PAGES) {
    const data = {
      title: page.title,
      bodyMarkdown: page.bodyMarkdown,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      updatedById: ownerId,
    }
    await db.contentPage.upsert({
      where: { pageKey: page.pageKey },
      update: data,
      create: { pageKey: page.pageKey, ...data },
    })
  }
  return CONTENT_PAGES.length
}

async function seedBanners(): Promise<number> {
  for (const banner of BANNERS) {
    const data = {
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      ctaLabel: banner.ctaLabel,
      placement: banner.placement,
      sortOrder: banner.sortOrder,
      isActive: true,
    }
    await db.promoBanner.upsert({
      where: { id: banner.id },
      update: data,
      create: { id: banner.id, ...data },
    })
  }
  return BANNERS.length
}

async function main() {
  console.log('Seeding Vennzya Fashion Hub…\n')

  const permissionCount = await seedPermissions()
  console.log(`  permissions      ${permissionCount}`)

  const ownerId = await seedOwner()
  console.log('  owner account    1')

  const optionValueIds = await seedOptions()
  console.log(`  option values    ${optionValueIds.size}`)

  const categoryIds = await seedCategories()
  console.log(`  categories       ${categoryIds.size}`)

  const productIds = await seedProducts(categoryIds, optionValueIds)
  const variantCount = PRODUCTS.reduce((total, p) => total + p.variants.length, 0)
  console.log(`  products         ${productIds.size} (${variantCount} variants)`)

  const collectionCount = await seedCollections(productIds)
  console.log(`  collections      ${collectionCount}`)

  const couponCount = await seedCoupons(ownerId)
  console.log(`  coupons          ${couponCount}`)

  const testimonialCount = await seedTestimonials()
  console.log(`  testimonials     ${testimonialCount}`)

  const faqCount = await seedFaqs()
  console.log(`  faq items        ${faqCount}`)

  const contentCount = await seedContentPages(ownerId)
  console.log(`  content pages    ${contentCount}`)

  const bannerCount = await seedBanners()
  console.log(`  promo banners    ${bannerCount}`)

  console.log(`\nAdmin sign-in: ${env.NEXT_PUBLIC_APP_URL}/admin/login`)
  console.log(`Owner email:   ${env.OWNER_EMAIL}`)
  console.log('Password:      as configured in OWNER_PASSWORD\n')
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
