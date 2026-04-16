import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:12022004@localhost:5432/tour_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function seedArticles() {
  const articles = [
    {
      slug: 'hidden-courtyards-of-kyoto',
      category: 'GUIDES',
      title: 'The Hidden Courtyards of Kyoto',
      excerpt: 'Journey beyond the cherry blossoms to discover the silent sanctuaries and centuries-old wooden architecture hidden within the ancient capital.',
      content: `
<p>Kyoto, the former imperial capital of Japan, is a city that reveals its beauty in layers. While most visitors flock to the iconic Kinkaku-ji and Fushimi Inari, the true essence of this ancient city lies in its hidden courtyards — intimate spaces of serene beauty that have remained unchanged for centuries.</p>

<h2>The Art of Ma (間) — Negative Space</h2>
<p>In Japanese aesthetics, <em>ma</em> refers to the conscious use of negative space. The courtyard gardens of Kyoto are masterclasses in this philosophy. Each rock, each patch of moss, each carefully raked sand pattern exists in deliberate relationship with the emptiness around it.</p>

<p>At Ryōan-ji, the famous rock garden presents fifteen stones arranged so that no matter where you stand, at least one stone is always hidden from view. It's a meditation on the limits of perception — a reminder that complete understanding is always just beyond our grasp.</p>

<h2>Tsuboniwa: Gardens in Miniature</h2>
<p>The <em>tsuboniwa</em> (坪庭) is a uniquely Kyoto invention — a tiny courtyard garden, sometimes no larger than a few square meters, designed to bring light, air, and nature into the heart of traditional machiya townhouses.</p>

<p>These pocket gardens are masterworks of compression. A single stone lantern, a cluster of bamboo, a carpet of moss — each element chosen with extraordinary care to create a complete world in miniature. Walking through the old merchant districts of Nishijin, you'll catch glimpses of these private Edens through half-open sliding doors.</p>

<h2>Seasonal Revelations</h2>
<p>What makes Kyoto's courtyards truly extraordinary is their transformation through the seasons. The same garden that glows with autumn maples in November will be a study in monochrome under January snow, then burst with the pale pink of plum blossoms in February.</p>

<p>For the discerning traveler, we recommend visiting in late November, when the momiji (maple) season paints the city in shades of crimson and gold. The contrast of fiery leaves against dark wooden architecture and emerald moss is an experience that stays with you forever.</p>

<h2>Planning Your Visit</h2>
<p>Our Azure Horizon Kyoto Heritage Tour includes exclusive access to three private courtyards not open to the general public, guided by a local art historian. The experience concludes with a private tea ceremony in a 400-year-old tea house overlooking one of the city's most beautiful hidden gardens.</p>
`,
      imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2000&auto=format&fit=crop',
      author: 'Elara Vance',
      readTime: 8,
      isFeatured: true,
      publishedAt: new Date('2023-11-01'),
    },
    {
      slug: 'whispers-of-the-highlands-sapa',
      category: 'GUIDES',
      title: 'Whispers of the Highlands: Sa Pa Reimagined',
      excerpt: 'Discover how Vietnam\'s misty mountain town has evolved from a colonial hill station into one of Southeast Asia\'s most compelling luxury destinations.',
      content: `
<p>Sa Pa sits at 1,600 meters above sea level in Vietnam's Hoàng Liên Son mountain range, where terraced rice paddies cascade down impossibly steep valleys like stairways carved by giants. For decades, it was a backpacker's secret. Today, it's being reimagined as a destination worthy of the most discerning travelers.</p>

<h2>A History Written in Mist</h2>
<p>The French established Sa Pa as a hill station in 1922, drawn by the cool mountain air and dramatic landscapes. The colonial legacy lives on in crumbling villas now draped in climbing vines, and in the town's distinctive European-inspired architecture that stands in striking contrast to the surrounding Vietnamese highlands.</p>

<h2>The Terraced Masterpiece</h2>
<p>The rice terraces of Mường Hoa Valley are Sa Pa's crown jewel — a living artwork maintained by the Hmong and Dao communities for over a thousand years. In September, when the rice ripens, the terraces transform into rivers of gold flowing down the mountainsides. It is, without exaggeration, one of the most beautiful agricultural landscapes on Earth.</p>

<h2>Luxury in the Clouds</h2>
<p>A new generation of boutique hotels and luxury lodges has transformed the Sa Pa experience. Properties like the Topas Ecolodge perch on private mountaintops, offering infinity pools that seem to float above the clouds. Private trekking guides lead intimate journeys through ethnic minority villages, where age-old textile traditions continue unchanged.</p>

<h2>When to Visit</h2>
<p>The golden rice season (September-October) offers the most photogenic landscapes. For those who prefer solitude, December and January bring magical frost-covered mornings and the possibility of rare snowfall on Fansipan, Indochina's highest peak.</p>
`,
      imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=800&auto=format&fit=crop',
      author: 'Elara Vance',
      readTime: 6,
      isFeatured: false,
      publishedAt: new Date('2023-10-24'),
    },
    {
      slug: 'amalfi-arc-coastal-masterclass',
      category: 'INSPIRATION',
      title: 'The Amalfi Arc: A Coastal Masterclass',
      excerpt: 'From Positano\'s pastel cliffside to Ravello\'s literary gardens, an intimate portrait of Italy\'s most dramatic coastline.',
      content: `
<p>The Amalfi Coast is not merely a destination — it's a state of mind. This 50-kilometer stretch of Italian coastline, where mountains plunge into an impossibly blue sea, has been inspiring artists, poets, and dreamers for millennia.</p>

<h2>Positano: The Vertical Village</h2>
<p>Positano tumbles down to the sea in a cascade of pink, peach, and terracotta buildings. John Steinbeck wrote that it "bites deep. It is a dream place that isn't quite real when you are there and becomes beckoningly real after you have gone." Nearly seventy years later, his words still ring true.</p>

<h2>Ravello: Music Above the Clouds</h2>
<p>Perched 350 meters above the sea, Ravello feels like a private balcony overlooking the entire Mediterranean. Wagner composed parts of Parsifal here; Gore Vidal made it his home for thirty years. The annual Ravello Festival fills ancient gardens with classical music against the backdrop of the infinite blue.</p>

<h2>Beyond the Guidebook</h2>
<p>The true Amalfi Coast is found in its margins: a fisherman's trattoria in Cetara, where the ancient tradition of colatura di alici (anchovy essence) produces flavors that rival the finest Asian fish sauces. Or the Valle delle Ferriere, a hidden valley behind Amalfi town where primordial ferns grow beside medieval paper mills.</p>

<h2>The Azure Horizon Way</h2>
<p>Our Amalfi Coast experience includes a private vintage Riva boat, a personal guide who has spent forty years mapping the coast's hidden coves, and a sunset dinner at a cliffside restaurant accessible only by foot.</p>
`,
      imageUrl: 'https://images.unsplash.com/photo-1533682800518-48d046f598fe?q=80&w=800&auto=format&fit=crop',
      author: 'Julian Marks',
      readTime: 7,
      isFeatured: false,
      publishedAt: new Date('2023-10-18'),
    },
    {
      slug: 'new-alchemists-mixology-tokyo',
      category: 'GASTRONOMY',
      title: 'The New Alchemists: Mixology in Tokyo',
      excerpt: 'Inside Tokyo\'s hidden speakeasies, where master bartenders are redefining the art of the cocktail with scientific precision and poetic imagination.',
      content: `
<p>Tokyo's cocktail scene operates on a different plane. In a city where sushi chefs train for a decade before touching rice, bartending is elevated to a similar philosophy of mastery. Here, making a drink is not a job — it's a calling.</p>

<h2>The Philosophy of Ichi-go Ichi-e</h2>
<p>The Japanese concept of <em>ichi-go ichi-e</em> — "one time, one meeting" — infuses Tokyo's bar culture. Each cocktail is made for one specific person, in one specific moment, never to be exactly replicated. The bartender reads the guest's mood, the weather, the time of day, and creates accordingly.</p>

<h2>Bar High Five: The Temple</h2>
<p>Hidetsugu Ueno's Bar High Five, consistently ranked among the world's best, is a masterclass in hospitality. There is no menu. Ueno asks a few quiet questions, then creates a drink that feels like it was designed for you alone. His signature hard-shake technique — a precise, rhythmic motion that aerates the cocktail to a silk-like texture — has been studied by bartenders worldwide.</p>

<h2>The Golden Gai Labyrinth</h2>
<p>In Shinjuku's Golden Gai, over 200 tiny bars occupy a space smaller than a tennis court. Each seats perhaps five or six guests. These intimate spaces create conversations between strangers that would never happen in larger venues. The drinks are simple; the human connections are extraordinary.</p>

<h2>A Guided Journey</h2>
<p>Our Tokyo After Dark experience takes guests through five of the city's most exclusive bars over the course of an evening, with a bilingual guide who has personal relationships with each bartender. It concludes with a private whisky tasting featuring bottles unavailable outside Japan.</p>
`,
      imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800&auto=format&fit=crop',
      author: 'Marcus Chen',
      readTime: 5,
      isFeatured: false,
      publishedAt: new Date('2023-10-12'),
    },
    {
      slug: 'neoclassical-dreams-imperial-cities',
      category: 'CULTURE',
      title: 'Neoclassical Dreams: The Grandeur of Imperial Cities',
      excerpt: 'From Vienna to St. Petersburg, exploring Europe\'s imperial capitals where every palace tells a story of power, beauty, and artistic ambition.',
      content: `
<p>The great imperial cities of Europe were conceived as stages for power. Their palaces, opera houses, and boulevards were designed not merely to house rulers but to project an image of civilization at its zenith. Today, stripped of their political function, these architectural marvels stand as pure monuments to human ambition and artistry.</p>

<h2>Vienna: The City of Music and Stone</h2>
<p>Vienna's Ringstraße — the grand boulevard that replaced the medieval city walls — is perhaps the greatest open-air museum of 19th-century architecture in existence. The Opera House, the Parliament, the Hofburg Palace: each building represents a different historical style, yet together they create a harmonious symphony in stone.</p>

<h2>St. Petersburg: Venice of the North</h2>
<p>Peter the Great built his capital on a swamp, consciously creating a "window to Europe" on the Baltic coast. The result — a city of 342 bridges, where Baroque and Neoclassical palaces line granite embankments along canals — is one of the great urban achievements of Western civilization.</p>

<h2>Prague: The City of a Hundred Spires</h2>
<p>Unlike Vienna and St. Petersburg, Prague was never systematically rebuilt. Instead, it accumulated layers: Romanesque foundations beneath Gothic churches beneath Baroque facades. Walking from the Castle to the Old Town Square is a journey through a thousand years of European architecture.</p>

<h2>The Imperial Circuit</h2>
<p>Our Azure Horizon Imperial Cities tour connects Vienna, Prague, and Budapest over twelve days, with private access to palace rooms, opera boxes, and archive collections normally closed to visitors.</p>
`,
      imageUrl: 'https://images.unsplash.com/photo-1513622470522-26c308a371fb?q=80&w=800&auto=format&fit=crop',
      author: 'Sofia Ivanova',
      readTime: 7,
      isFeatured: false,
      publishedAt: new Date('2023-10-05'),
    },
    {
      slug: 'into-the-silence-arctic-archipelago',
      category: 'GUIDES',
      title: 'Into the Silence: Navigating the Arctic Archipelago',
      excerpt: 'A journey to Svalbard, where polar bears outnumber people and the midnight sun illuminates landscapes unchanged since the Ice Age.',
      content: `
<p>At 78 degrees north — closer to the North Pole than to Oslo — the Svalbard archipelago exists at the edge of human habitation. Here, in a landscape of glaciers, tundra, and polar desert, the rules of ordinary life are suspended. The sun doesn't set for four months. It doesn't rise for four months. And in the twilight between, the northern lights paint the sky in curtains of green and violet.</p>

<h2>The Last Wilderness</h2>
<p>Svalbard is home to more polar bears than people. The 2,600 residents of Longyearbyen, the world's northernmost settlement, live alongside Arctic foxes, Svalbard reindeer, and colonies of seabirds numbering in the millions. Outside the settlement, carrying a rifle is mandatory — not as a weapon of aggression, but as a last resort against bear encounters.</p>

<h2>Glacial Cathedrals</h2>
<p>The glaciers of Svalbard are among the most accessible in the Arctic. Kayaking alongside a glacier face — a wall of blue ice rising thirty meters from the water — is an experience that recalibrates your sense of scale. The occasional thunderclap of calving ice, as house-sized chunks break free and crash into the fjord, is a visceral reminder of the forces shaping our planet.</p>

<h2>The Global Seed Vault</h2>
<p>Deep inside a mountain near Longyearbyen airport lies the Svalbard Global Seed Vault, humanity's insurance policy against agricultural catastrophe. Over a million seed samples from every country on Earth are stored here in permafrost conditions. It's a sobering and oddly hopeful monument to human foresight.</p>

<h2>Expedition Details</h2>
<p>Our Svalbard expedition operates in June and September, aboard a former research vessel converted for luxury expedition travel. The ship carries just 12 guests, two naturalist guides, and a chef specializing in New Nordic cuisine prepared with foraged Arctic ingredients.</p>
`,
      imageUrl: 'https://images.unsplash.com/photo-1513553404607-988bf2703777?q=80&w=800&auto=format&fit=crop',
      author: 'Erik Larson',
      readTime: 6,
      isFeatured: false,
      publishedAt: new Date('2023-09-29'),
    },
    {
      slug: 'color-and-clay-atlas-mountains',
      category: 'INSPIRATION',
      title: 'Color and Clay: A Week in the Atlas Mountains',
      excerpt: 'Among the Berber villages of Morocco\'s High Atlas, where ancient building traditions create architecture that seems to grow from the earth itself.',
      content: `
<p>The Atlas Mountains rise like a wall across Morocco, separating the coastal plains from the Sahara. In their folds and valleys, Berber communities have built a civilization in clay — their kasbahs and villages blending so perfectly with the landscape that they seem less constructed than grown.</p>

<h2>The Architecture of Earth</h2>
<p>Berber architecture uses <em>pisé</em> — rammed earth reinforced with straw — a building technique that dates back thousands of years. The resulting structures are naturally insulated, keeping interiors cool in summer and warm in winter. Their warm ochre and pink tones mirror the surrounding mountains, creating a visual harmony that modern architecture rarely achieves.</p>

<h2>The Valley of Roses</h2>
<p>Each May, the Dades Valley — known as the Valley of Roses — erupts in pink. Millions of Damascus roses bloom along the riverbanks, their perfume filling the air for kilometers. The rose harvest is both an industry and a festival, as entire communities gather to pick the blooms that will become rose water, rose oil, and rose-scented everything.</p>

<h2>Trekking the High Atlas</h2>
<p>The trails of the High Atlas wind through walnut groves and terraced fields, past waterfalls and over passes at 3,000 meters. Unlike the Himalayas or Alps, the Atlas trekking experience is intimate — you walk through living communities, stopping for mint tea with families whose hospitality is legendary.</p>

<h2>Our Atlas Experience</h2>
<p>Azure Horizon's Atlas Mountain retreat combines trekking with cultural immersion: cooking classes with Berber women, visits to traditional hammams, and nights in a restored kasbah where the Milky Way blazes overhead in some of the world's darkest skies.</p>
`,
      imageUrl: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=800&auto=format&fit=crop',
      author: 'Amina Jessop',
      readTime: 5,
      isFeatured: false,
      publishedAt: new Date('2023-09-21'),
    },
  ];

  for (const a of articles) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: a,
      create: a,
    });
    console.log(`✓ Article: ${a.title} [${a.category}]`);
  }

  console.log('\n🎉 Seed articles hoàn tất!');
}

seedArticles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
