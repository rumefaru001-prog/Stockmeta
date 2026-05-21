export interface StockEvent {
  name: string;
  month: number; // 1-12
  category: string;
  description: string;
  coreKeywords: string;
}

export const STOCK_EVENTS: StockEvent[] = [
  { name: "New Year's Day", month: 1, category: "holiday", description: "Fresh starts, planners, resolutions, productivity, champagne, and clean minimalist visuals.", coreKeywords: "new year, resolution, fresh start, goal setting, planner" },
  { name: "Martin Luther King Jr. Day", month: 1, category: "awareness", description: "Respectful civic, diversity, education, and equality concepts.", coreKeywords: "martin luther king day, civil rights, equality, unity, diversity" },
  { name: "Valentine's Day", month: 2, category: "retail", description: "Gifts, florals, couple lifestyle, and self-love concepts.", coreKeywords: "valentine's day, love, romance, gift, heart, date night" },
  { name: "Lunar New Year", month: 2, category: "cultural", description: "Family reunion, red-and-gold styling, gifting, food, and zodiac-inspired stock concepts.", coreKeywords: "lunar new year, spring festival, red envelope, family reunion, zodiac" },
  { name: "Ramadan", month: 2, category: "holiday", description: "Lanterns, prayer, generosity, family iftar, Islamic decor, and premium food photography.", coreKeywords: "ramadan, iftar, suhoor, lantern, crescent moon, islamic decor" },
  { name: "International Mother Language Day / Shaheed Dibosh", month: 2, category: "cultural", description: "Bangladesh culture, Bengali language identity, education, flowers at Shaheed Minar.", coreKeywords: "international mother language day, shaheed dibosh, bangla language, bangladesh, 21 february" },
  { name: "Spring Cleaning Campaign", month: 3, category: "seasonal", description: "Home organization, eco cleaners, before-and-after content, and practical service imagery.", coreKeywords: "spring cleaning, home organization, declutter, clean home, storage" },
  { name: "Holi", month: 3, category: "cultural", description: "Color explosion imagery, joy, friendship, and authentic cultural context.", coreKeywords: "holi, festival of colors, gulal, spring festival, india celebration" },
  { name: "International Women's Day", month: 3, category: "awareness", description: "Business leadership, entrepreneurship, healthcare, STEM, and community visuals.", coreKeywords: "international women's day, women leadership, empowerment, female entrepreneur" },
  { name: "Bangabandhu Birthday & National Children's Day", month: 3, category: "cultural", description: "Education, children, remembrance, flowers, portraits, and Bangladesh national tribute.", coreKeywords: "bangabandhu birthday, national children's day, 17 march, bangladesh, tribute" },
  { name: "St. Patrick's Day", month: 3, category: "cultural", description: "Lifestyle, pub, green fashion, and festive food scenes.", coreKeywords: "st patrick's day, irish, green celebration, lucky, shamrock" },
  { name: "Eid al-Fitr", month: 3, category: "holiday", description: "Family celebration, gift exchange, elegant desserts, fashion, and premium Islamic decor.", coreKeywords: "eid al fitr, eid mubarak, family celebration, gift box, traditional sweets" },
  { name: "Bangladesh Genocide Day / Black Night", month: 3, category: "awareness", description: "Respectful remembrance, historical education, memorial flowers.", coreKeywords: "bangladesh genocide day, black night, 25 march, bangladesh remembrance, history" },
  { name: "Bangladesh Independence Day", month: 3, category: "holiday", description: "Bangladesh-themed patriotic visuals, flag concepts, civic remembrance, school programs.", coreKeywords: "bangladesh independence day, 26 march, bangladesh flag, patriotism, national day" },
  { name: "Good Friday & Easter Sunday", month: 4, category: "holiday", description: "Church, prayer, family brunch, eggs, pastel decor, spring florals, and children activities.", coreKeywords: "easter, easter eggs, spring brunch, pastel decor, family tradition, good friday, prayer" },
  { name: "Pohela Boishakh", month: 4, category: "cultural", description: "Bengali new year culture, traditional clothing, fairs, rural crafts, food, red-white styling.", coreKeywords: "pohela boishakh, bangla new year, bengali new year, bangladesh festival, 14 april" },
  { name: "Earth Day", month: 4, category: "awareness", description: "Sustainability, climate action, green products, recycling, and eco lifestyle imagery.", coreKeywords: "earth day, sustainability, eco, green living, recycling" },
  { name: "Graduation Season", month: 5, category: "seasonal", description: "Education, family pride, student milestones, and career transition visuals.", coreKeywords: "graduation, student success, cap and gown, education milestone, campus" },
  { name: "International Workers' Day", month: 5, category: "awareness", description: "Workplace dignity, labor, logistics, construction, and honest productivity scenes.", coreKeywords: "workers day, labor day, worker rights, teamwork, industry" },
  { name: "Mother's Day", month: 5, category: "retail", description: "Family love, flowers, breakfast in bed, beauty gifting, wellness, and multigenerational stories.", coreKeywords: "mother's day, mom gift, family love, flowers, brunch" },
  { name: "International Day of Families", month: 5, category: "awareness", description: "Diverse modern families, home life, caregiving, inclusion, and connection imagery.", coreKeywords: "family day, family together, parenting, home life, care" },
  { name: "Eid al-Adha", month: 5, category: "holiday", description: "Community, family meals, generosity, faith, and elegant festive table settings.", coreKeywords: "eid al adha, eid mubarak, family feast, islamic holiday, celebration" },
  { name: "Memorial Day", month: 5, category: "holiday", description: "Outdoor gatherings and respectful remembrance content.", coreKeywords: "memorial day, remembrance, american flag, barbecue, long weekend" },
  { name: "Summer Travel Season", month: 6, category: "seasonal", description: "Travel, hospitality, beach, family vacation, luggage, and booking concepts.", coreKeywords: "summer travel, vacation, beach holiday, road trip, tourism" },
  { name: "Pride Month", month: 6, category: "awareness", description: "Authentic LGBTQ+ community, identity, workplace inclusion, and celebration scenes.", coreKeywords: "pride month, lgbtq, inclusion, community, identity" },
  { name: "World Environment Day", month: 6, category: "awareness", description: "NGOs, sustainability reports, eco products, and educational campaigns.", coreKeywords: "world environment day, nature, sustainability, green future, climate" },
  { name: "Father's Day", month: 6, category: "retail", description: "Family connection, hobby gifting, mentoring, grilling, and practical masculine lifestyle.", coreKeywords: "father's day, dad gift, family love, father and child, celebration" },
  { name: "International Day of Yoga", month: 6, category: "lifestyle", description: "Wellness, mindfulness, studio classes, outdoor practice, and calm copy-space images.", coreKeywords: "yoga day, wellness, mindfulness, meditation, healthy lifestyle" },
  { name: "US Independence Day", month: 7, category: "holiday", description: "Picnics, fireworks, grilling, flag styling, and patriotic family content.", coreKeywords: "fourth of july, independence day, american flag, fireworks, barbecue" },
  { name: "Back to School Campaign", month: 8, category: "seasonal", description: "Stationery, education, parenting, classroom, online learning, and youth lifestyle content.", coreKeywords: "back to school, school supplies, classroom, student, education" },
  { name: "International Youth Day", month: 8, category: "awareness", description: "Youth culture, education access, teen entrepreneurship, and diverse friendship groups.", coreKeywords: "youth day, young people, student life, teen teamwork, future leaders" },
  { name: "National Mourning Day of Bangladesh", month: 8, category: "awareness", description: "Memorial, tribute, black ribbon, flowers, and educational editorial concepts.", coreKeywords: "national mourning day bangladesh, 15 august, bangladesh remembrance, tribute, black ribbon" },
  { name: "World Photography Day", month: 8, category: "lifestyle", description: "Creator economy, camera gear, behind-the-scenes, image editing, and visual storytelling.", coreKeywords: "world photography day, photographer, camera, creator, visual storytelling" },
  { name: "US Labor Day", month: 9, category: "holiday", description: "Outdoor leisure, end-of-summer sales, work-life balance, and family relaxation content.", coreKeywords: "labor day, long weekend, summer sale, relaxation, family time" },
  { name: "Oktoberfest Season", month: 9, category: "cultural", description: "Beer, Bavarian food, market decoration, travel, and festive social scenes.", coreKeywords: "oktoberfest, bavarian, beer festival, pretzel, germany" },
  { name: "World Tourism Day", month: 9, category: "lifestyle", description: "Travel inspiration, hospitality, maps, suitcase flat lays, and destination planning.", coreKeywords: "world tourism day, travel planning, vacation, hospitality, destination" },
  { name: "Breast Cancer Awareness Month", month: 10, category: "awareness", description: "Compassionate healthcare, solidarity, prevention, and support visuals.", coreKeywords: "breast cancer awareness, pink ribbon, support, screening, healthcare" },
  { name: "World Animal Day", month: 10, category: "awareness", description: "Pet care, wildlife conservation, veterinary care, and animal rescue.", coreKeywords: "world animal day, pet care, animal welfare, veterinary, wildlife" },
  { name: "World Mental Health Day", month: 10, category: "awareness", description: "Wellness, therapy, burnout, support, journaling, and emotional care scenes.", coreKeywords: "mental health day, wellbeing, therapy, stress, self care" },
  { name: "World Food Day", month: 10, category: "awareness", description: "Food systems, nutrition, agriculture, local produce, and community market visuals.", coreKeywords: "world food day, nutrition, agriculture, healthy food, farmer market" },
  { name: "Diwali", month: 10, category: "holiday", description: "Candles, diya lamps, rangoli, sweets, family celebration, gifting, and luxury decor.", coreKeywords: "diwali, festival of lights, diya, rangoli, gift" },
  { name: "Halloween", month: 10, category: "retail", description: "Costumes, kids activities, pumpkins, food, party decor, and horror moodboards.", coreKeywords: "halloween, pumpkin, costume, spooky, trick or treat" },
  { name: "Day of the Dead", month: 11, category: "cultural", description: "Marigolds, candles, respectful altars, food, and family remembrance.", coreKeywords: "day of the dead, dia de los muertos, marigold, altar, mexico" },
  { name: "Singles' Day", month: 11, category: "retail", description: "Ecommerce sales, self-gifting, beauty, tech, fashion, checkout, and discount visuals.", coreKeywords: "singles day, 11.11, shopping festival, online sale, self gift" },
  { name: "Armed Forces Day of Bangladesh", month: 11, category: "awareness", description: "Military tribute, ceremonial, patriotic, and defense-related editorial-style concepts.", coreKeywords: "armed forces day bangladesh, 21 november, bangladesh military, tribute, national observance" },
  { name: "US Thanksgiving", month: 11, category: "holiday", description: "Food, gratitude, family dining, table decor, and autumn hosting scenes.", coreKeywords: "thanksgiving, family dinner, gratitude, turkey, autumn table" },
  { name: "Black Friday & Cyber Monday", month: 11, category: "retail", description: "Ecommerce, product mockups, checkout, discount messaging, and cart visuals.", coreKeywords: "black friday, cyber monday, sale, discount, shopping cart, ecommerce" },
  { name: "Small Business Saturday", month: 11, category: "retail", description: "Local shops, makers, craft products, storefronts, and founder-led commerce storytelling.", coreKeywords: "small business saturday, local shop, shop small, storefront, maker" },
  { name: "Giving Tuesday", month: 11, category: "awareness", description: "Donation, volunteering, nonprofit, fundraising, and generosity stories.", coreKeywords: "giving tuesday, donation, charity, fundraising, volunteer" },
  { name: "Winter Holiday Campaign", month: 12, category: "seasonal", description: "Gifting, packaging, winter decor, hospitality, food, travel, and family celebration.", coreKeywords: "holiday season, winter sale, gift guide, festive decor, year end" },
  { name: "Maitri Dibosh", month: 12, category: "cultural", description: "Friendship, diplomacy, cultural connection, and regional solidarity concepts.", coreKeywords: "maitri dibosh, bangladesh friendship day, 6 december, friendship, cultural ties" },
  { name: "Hanukkah", month: 12, category: "holiday", description: "Candles, family traditions, blue and gold styling, festive table scenes, and symbolic details.", coreKeywords: "hanukkah, menorah, jewish holiday, dreidel, latkes" },
  { name: "Victory Day of Bangladesh", month: 12, category: "holiday", description: "Patriotic concepts, flag visuals, remembrance, and culturally relevant editorial-style stock assets.", coreKeywords: "victory day bangladesh, 16 december, bangladesh victory day, national celebration, bangladesh flag" },
  { name: "Christmas Day", month: 12, category: "holiday", description: "Gifting, food, family, winter interiors, travel, hospitality, and celebration imagery.", coreKeywords: "christmas, gift, family celebration, holiday decor, winter" },
  { name: "Boxing Day", month: 12, category: "retail", description: "Post-Christmas sales, winter leisure, returns, delivery, and shopping concepts.", coreKeywords: "boxing day, holiday sale, winter shopping, discount, gift return" },
  { name: "New Year's Eve", month: 12, category: "holiday", description: "Party, countdown, glitter, nightlife, goal reflection, and year-end luxury visuals.", coreKeywords: "new year's eve, countdown, celebration, party, champagne" }
];

export function getUpcomingEvents(monthName: string): StockEvent[] {
  const monthMap: Record<string, number> = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  
  const targetMonth = monthMap[monthName] || 1;
  return STOCK_EVENTS.filter(event => event.month === targetMonth);
}
