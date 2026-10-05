// One-off seed of real Church Street, Brighton VIC businesses for demo
// purposes — see racyeit.md's "Research Church Street Brighton businesses"
// decision log entry. Re-runnable: skips anything already present.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const MERCHANTS = [
  {
    slug: "pantry-brighton",
    ownerEmail: "seed-pantry@example.com",
    ownerName: "Pantry Brighton (seed)",
    businessName: "Pantry",
    category: "Cafe",
    address: "1 Church St, Brighton VIC 3186",
    lat: -37.9134,
    lng: 144.9951,
    logoUrl:
      "https://images.squarespace-cdn.com/content/v1/66309ef3d256de52259e8364/2de357a5-f459-4a30-9102-e71567b5c34a/Pantry+logo+RGB_RGB+Pantry+logo+red.png?format=1500w",
    products: [
      {
        name: "Avocado Breakfast",
        description:
          "Avocado, warm soft boiled eggs, chilli crunch, slow roasted tomatoes, goats curd, green sauce, sourdough",
        price: 31.5,
        prepTimeMinutes: 14,
      },
      {
        name: "Eggs Benedict",
        description: "Poached eggs, sauerkraut, hollandaise, sourdough, leg ham",
        price: 32.5,
        prepTimeMinutes: 14,
      },
      {
        name: "Kabir Eggs",
        description:
          "Scrambled eggs, chilli, garlic, onion, potato, tomato, avocado, turmeric, fried shallots, sriracha, toasted naan",
        price: 33.5,
        prepTimeMinutes: 15,
      },
      {
        name: "Banana Bread",
        description: "Almond butter, caramelized banana, mascarpone, chocolate granola, burnt honey",
        price: 25.3,
        prepTimeMinutes: 6,
      },
      {
        name: "Toasted Croissant (Ham & Cheese)",
        description: "Leg ham, tomato, cheese",
        price: 18.2,
        prepTimeMinutes: 7,
      },
      {
        name: "Burger Deluxe",
        description: "160g beef, bacon, cheese, tomato, onion, pickles, mayo, mustard, homemade chips",
        price: 35.4,
        prepTimeMinutes: 16,
      },
      {
        name: "Caesar Salad",
        description: "Cos, aged parmesan, white anchovies, croutons, egg, honey bacon, white anchovy dressing",
        price: 29.5,
        prepTimeMinutes: 10,
      },
      {
        name: "Flat White",
        description: "Coffee by Lavazza",
        price: 6.6,
        prepTimeMinutes: 4,
      },
      {
        name: "Iced Latte",
        description: "Coffee by Lavazza, served iced",
        price: 6.6,
        prepTimeMinutes: 4,
      },
      {
        name: "Babycino",
        description: "Steamed milk with a dust of chocolate",
        price: 2.1,
        prepTimeMinutes: 3,
      },
    ],
  },
  {
    slug: "laundry-box-brighton",
    ownerEmail: "seed-laundrybox@example.com",
    ownerName: "Laundry Box Brighton (seed)",
    businessName: "Laundry Box Dry Cleaners",
    category: "Dry cleaner",
    address: "109 Church St, Brighton VIC 3186",
    lat: -37.9151,
    lng: 144.9931,
    logoUrl: "https://laundrybox.com.au/wp-content/uploads/2017/11/lb-grey-new2.png",
    products: [
      {
        name: "Business Shirt",
        description: "Professional dry clean & press for one business shirt",
        price: 7.5,
        prepTimeMinutes: 10,
      },
      {
        name: "Trousers / Skirt",
        description: "Dry clean & press",
        price: 20.5,
        prepTimeMinutes: 12,
      },
      {
        name: "Blouse",
        description: "Dry clean & press, regular fabric",
        price: 21.0,
        prepTimeMinutes: 12,
      },
      {
        name: "Dress",
        description: "Dry clean & press, regular fabric",
        price: 37.5,
        prepTimeMinutes: 15,
      },
      {
        name: "Suit (2-piece)",
        description: "Dry clean & press",
        price: 39.0,
        prepTimeMinutes: 15,
      },
      {
        name: "Doona / Duvet Clean",
        description: "Organic dry clean, price from — single size",
        price: 55.0,
        prepTimeMinutes: 20,
      },
      {
        name: "Wash, Dry & Fold (per kg)",
        description: "On-demand serviced laundry, priced per kilogram",
        price: 9.9,
        prepTimeMinutes: 10,
      },
      {
        name: "Shoe Cleaning",
        description: "Professional shoe clean, price from",
        price: 85.0,
        prepTimeMinutes: 20,
      },
    ],
  },
  {
    slug: "national-pharmacies-brighton",
    ownerEmail: "seed-nationalpharmacies@example.com",
    ownerName: "National Pharmacies Brighton (seed)",
    businessName: "National Pharmacies",
    category: "Chemist",
    address: "2 Church St, Brighton VIC 3186",
    lat: -37.9129,
    lng: 144.9953,
    logoUrl: null,
    products: [
      {
        name: "Swisse Ultiboost Vitamin B12 1000mcg (60 tabs)",
        description: "Activated vitamin B12 supplement, 60 tablets",
        price: 12.49,
        prepTimeMinutes: 3,
      },
      {
        name: "Nutra-Life Rapid-C 100mg (60 tabs)",
        description: "Vitamin C supplement, 60 tablets",
        price: 19.79,
        prepTimeMinutes: 3,
      },
      {
        name: "Nutra-Life Deep Sleep + Relaxation (60 caps)",
        description: "Sleep support capsules, 60 count",
        price: 25.19,
        prepTimeMinutes: 3,
      },
      {
        name: "fitforme Support-1 Multivitamin",
        description: "Daily multivitamin",
        price: 33.99,
        prepTimeMinutes: 3,
      },
      {
        name: "Nutra-Life Magnesium Glycinate Powder 180g",
        description: "Magnesium supplement powder, 180g",
        price: 35.39,
        prepTimeMinutes: 3,
      },
    ],
  },
];

for (const m of MERCHANTS) {
  let user = await prisma.user.findUnique({ where: { clerkUserId: `seed_${m.slug}` } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkUserId: `seed_${m.slug}`,
        name: m.ownerName,
        email: m.ownerEmail,
        authProvider: "seed",
      },
    });
  }

  let merchant = await prisma.merchant.findFirst({ where: { ownerId: user.id } });
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        ownerId: user.id,
        businessName: m.businessName,
        category: m.category,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        logoUrl: m.logoUrl,
      },
    });
    console.log(`Created merchant: ${m.businessName}`);
  } else {
    console.log(`Merchant already exists, skipping: ${m.businessName}`);
    continue;
  }

  for (const p of m.products) {
    await prisma.product.create({
      data: {
        merchantId: merchant.id,
        name: p.name,
        description: p.description,
        price: p.price,
        prepTimeMinutes: p.prepTimeMinutes,
      },
    });
  }
  console.log(`  + ${m.products.length} products`);
}

await prisma.$disconnect();
console.log("Done.");
