/**
 * Static catalogs for marketplace: currencies, countries, vehicle brands/models, years.
 * Users can type custom brand/model values; new values are remembered in localStorage.
 */

export const CURRENCIES: { code: string; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼" },
  { code: "BHD", label: "Bahraini Dinar", symbol: ".د.ب" },
  { code: "KWD", label: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "QAR", label: "Qatari Riyal", symbol: "﷼" },
  { code: "OMR", label: "Omani Rial", symbol: "﷼" },
  { code: "EGP", label: "Egyptian Pound", symbol: "£" },
  { code: "JOD", label: "Jordanian Dinar", symbol: "د.ا" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "PKR", label: "Pakistani Rupee", symbol: "₨" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "KRW", label: "Korean Won", symbol: "₩" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "MXN", label: "Mexican Peso", symbol: "$" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { code: "CHF", label: "Swiss Franc", symbol: "Fr" },
  { code: "SEK", label: "Swedish Krona", symbol: "kr" },
  { code: "NOK", label: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", label: "Danish Krone", symbol: "kr" },
  { code: "PLN", label: "Polish Zloty", symbol: "zł" },
  { code: "RUB", label: "Russian Ruble", symbol: "₽" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "MYR", label: "Malaysian Ringgit", symbol: "RM" },
  { code: "THB", label: "Thai Baht", symbol: "฿" },
  { code: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PHP", label: "Philippine Peso", symbol: "₱" },
  { code: "VND", label: "Vietnamese Dong", symbol: "₫" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
];

export const COUNTRIES: string[] = [
  "United States","United Kingdom","Canada","Australia","New Zealand",
  "United Arab Emirates","Saudi Arabia","Bahrain","Kuwait","Qatar","Oman","Jordan","Lebanon","Iraq","Egypt","Morocco","Tunisia","Algeria",
  "Germany","France","Italy","Spain","Portugal","Netherlands","Belgium","Switzerland","Austria","Sweden","Norway","Denmark","Finland","Ireland","Iceland",
  "Poland","Czech Republic","Slovakia","Hungary","Romania","Bulgaria","Greece","Turkey","Ukraine","Russia",
  "Japan","South Korea","China","Hong Kong","Taiwan","Singapore","Malaysia","Thailand","Indonesia","Philippines","Vietnam","India","Pakistan","Bangladesh","Sri Lanka","Nepal",
  "South Africa","Nigeria","Kenya","Ghana","Ethiopia",
  "Mexico","Brazil","Argentina","Chile","Colombia","Peru","Venezuela","Uruguay",
  "Israel","Palestine","Iran","Afghanistan","Kazakhstan","Uzbekistan","Azerbaijan","Georgia","Armenia",
];

/** A seed of common cities per country. Users can still type any city (datalist). */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  "United States": ["New York","Los Angeles","Chicago","Houston","Phoenix","Miami","Dallas","San Francisco","Seattle","Austin","Boston","Denver","Las Vegas","Atlanta"],
  "United Kingdom": ["London","Manchester","Birmingham","Liverpool","Leeds","Glasgow","Edinburgh","Bristol","Cardiff","Belfast"],
  "Canada": ["Toronto","Vancouver","Montreal","Calgary","Ottawa","Edmonton","Quebec City","Winnipeg"],
  "Australia": ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Canberra"],
  "United Arab Emirates": ["Dubai","Abu Dhabi","Sharjah","Ajman","Al Ain","Ras Al Khaimah","Fujairah"],
  "Saudi Arabia": ["Riyadh","Jeddah","Mecca","Medina","Dammam","Khobar","Taif","Tabuk"],
  "Bahrain": ["Manama","Muharraq","Riffa","Isa Town","Hamad Town","Jid Ali","Sitra","Budaiya"],
  "Kuwait": ["Kuwait City","Hawally","Salmiya","Farwaniya","Jahra"],
  "Qatar": ["Doha","Al Rayyan","Al Wakrah","Umm Salal","Al Khor"],
  "Oman": ["Muscat","Salalah","Sohar","Nizwa","Sur"],
  "Jordan": ["Amman","Zarqa","Irbid","Aqaba"],
  "Egypt": ["Cairo","Alexandria","Giza","Luxor","Aswan","Sharm El Sheikh"],
  "Germany": ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Düsseldorf"],
  "France": ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Bordeaux"],
  "Italy": ["Rome","Milan","Naples","Turin","Palermo","Florence","Venice","Bologna"],
  "Spain": ["Madrid","Barcelona","Valencia","Seville","Málaga","Bilbao"],
  "Netherlands": ["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven"],
  "Japan": ["Tokyo","Osaka","Yokohama","Nagoya","Sapporo","Fukuoka","Kyoto","Kobe"],
  "South Korea": ["Seoul","Busan","Incheon","Daegu","Daejeon"],
  "China": ["Beijing","Shanghai","Guangzhou","Shenzhen","Chengdu","Hangzhou","Chongqing"],
  "India": ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad"],
  "Pakistan": ["Karachi","Lahore","Islamabad","Rawalpindi","Faisalabad","Peshawar"],
  "Singapore": ["Singapore"],
  "Malaysia": ["Kuala Lumpur","George Town","Johor Bahru","Ipoh","Malacca"],
  "Thailand": ["Bangkok","Chiang Mai","Phuket","Pattaya"],
  "Indonesia": ["Jakarta","Surabaya","Bandung","Medan","Bali (Denpasar)"],
  "Philippines": ["Manila","Quezon City","Cebu City","Davao"],
  "Turkey": ["Istanbul","Ankara","Izmir","Bursa","Antalya"],
  "Brazil": ["São Paulo","Rio de Janeiro","Brasília","Salvador","Belo Horizonte"],
  "Mexico": ["Mexico City","Guadalajara","Monterrey","Puebla","Cancún"],
  "South Africa": ["Johannesburg","Cape Town","Durban","Pretoria"],
};

/** Motorcycle + car brands with popular models. Users can add custom via input. */
export const VEHICLE_BRANDS: Record<string, string[]> = {
  // ── Motorcycles ─────────────────────────────────
  "Harley-Davidson": ["Sportster","Softail","Fat Boy","Road King","Street Glide","Road Glide","Iron 883","Forty-Eight","Fat Bob","Heritage Classic","Pan America","LiveWire"],
  "Honda": ["CBR1000RR","CBR600RR","CBR650R","CB500F","CB650R","CB1000R","Africa Twin","Gold Wing","Rebel 500","Rebel 1100","Grom","Monkey","Shadow","Fireblade","NC750X"],
  "Yamaha": ["YZF-R1","YZF-R6","YZF-R7","YZF-R3","MT-07","MT-09","MT-10","MT-03","Ténéré 700","Tracer 9","V-Star","Bolt","XSR900","XSR700","FJR1300"],
  "Kawasaki": ["Ninja ZX-10R","Ninja ZX-6R","Ninja 650","Ninja 400","Ninja H2","Z900","Z650","Z400","Versys 650","Versys 1000","Vulcan S","W800","KLR650"],
  "Suzuki": ["GSX-R1000","GSX-R750","GSX-R600","GSX-S1000","GSX-S750","Hayabusa","V-Strom 650","V-Strom 1050","Boulevard","SV650","Katana"],
  "Ducati": ["Panigale V4","Panigale V2","Streetfighter V4","Monster","Multistrada V4","Diavel","Scrambler","Hypermotard","XDiavel","DesertX"],
  "BMW": ["S1000RR","S1000R","S1000XR","R1250GS","R1250RT","R nineT","F900R","F900XR","F850GS","G310R","M1000RR","CE 04"],
  "KTM": ["Duke 200","Duke 390","Duke 790","Duke 890","Duke 1290","RC 390","RC 8C","Adventure 390","Adventure 890","Adventure 1290","Super Duke"],
  "Triumph": ["Bonneville T100","Bonneville T120","Street Triple","Speed Triple","Tiger 900","Tiger 1200","Rocket 3","Scrambler 1200","Speed Twin","Trident"],
  "Aprilia": ["RSV4","RS 660","Tuono V4","Tuareg 660","Shiver","Dorsoduro"],
  "MV Agusta": ["F3","F4","Brutale","Dragster","Turismo Veloce","Superveloce"],
  "Indian": ["Scout","Chief","Chieftain","Roadmaster","FTR","Challenger","Springfield"],
  "Royal Enfield": ["Classic 350","Meteor 350","Himalayan","Interceptor 650","Continental GT 650","Bullet","Hunter 350","Super Meteor 650"],
  "Zero Motorcycles": ["SR/F","SR/S","DSR/X","FX","FXE"],
  "Husqvarna": ["Svartpilen","Vitpilen","Norden 901","701 Enduro","701 Supermoto"],
  "Vespa": ["Primavera","Sprint","GTS 300","Elettrica"],
  "Piaggio": ["MP3","Beverly","Liberty","Medley"],
  "CFMoto": ["300NK","650NK","700CL-X","800MT","Papio"],

  // ── Cars ────────────────────────────────────────
  "Toyota": ["Corolla","Camry","Supra","GR86","GR Yaris","Land Cruiser","4Runner","Tacoma","Tundra","Prius","Hilux","RAV4","Highlander"],
  "Lexus": ["IS","ES","LS","RC","LC","NX","RX","GX","LX","LFA"],
  "Nissan": ["GT-R","370Z","400Z","Z","Skyline","Silvia","Altima","Maxima","Patrol","Navara"],
  "Mazda": ["MX-5 Miata","RX-7","RX-8","3","6","CX-5","CX-9","CX-30"],
  "Subaru": ["WRX","WRX STI","BRZ","Impreza","Forester","Outback","Ascent"],
  "Mitsubishi": ["Lancer Evolution","3000GT","Eclipse","Outlander","Pajero","Triton"],
  "Ford": ["Mustang","GT","F-150","F-250","Raptor","Ranger","Bronco","Focus","Fiesta ST"],
  "Chevrolet": ["Corvette","Camaro","Silverado","Colorado","Tahoe","Suburban","Trailblazer"],
  "Dodge": ["Charger","Challenger","Durango","Ram 1500","Viper"],
  "Jeep": ["Wrangler","Gladiator","Grand Cherokee","Cherokee","Compass","Renegade"],
  "GMC": ["Sierra","Yukon","Canyon","Hummer EV"],
  "Cadillac": ["CT4","CT5","CT5-V","Escalade","Lyriq"],
  "Tesla": ["Model S","Model 3","Model X","Model Y","Cybertruck","Roadster"],
  "BMW (Cars)": ["M2","M3","M4","M5","M8","X3 M","X5 M","X6 M","i4","iX","1 Series","3 Series","5 Series","7 Series"],
  "Mercedes-Benz": ["A-Class","C-Class","E-Class","S-Class","AMG GT","G-Class","GLE","GLC","EQS","CLA"],
  "Audi": ["A3","A4","A6","A8","RS3","RS6","RS7","R8","Q3","Q5","Q7","Q8","e-tron GT"],
  "Porsche": ["911","718 Cayman","718 Boxster","Panamera","Cayenne","Macan","Taycan"],
  "Volkswagen": ["Golf","Golf GTI","Golf R","Passat","Jetta","Tiguan","Touareg","ID.4"],
  "Ferrari": ["488","F8","296","SF90","Roma","Portofino","812","Purosangue"],
  "Lamborghini": ["Huracán","Aventador","Revuelto","Urus","Gallardo"],
  "McLaren": ["720S","765LT","Artura","GT","Senna","P1"],
  "Bugatti": ["Chiron","Veyron","Divo","Mistral"],
  "Rolls-Royce": ["Ghost","Phantom","Wraith","Cullinan","Spectre"],
  "Bentley": ["Continental GT","Flying Spur","Bentayga","Mulsanne"],
  "Aston Martin": ["Vantage","DB11","DB12","DBX","DBS","Valkyrie"],
  "Jaguar": ["F-Type","XE","XF","XJ","F-Pace","I-Pace"],
  "Land Rover": ["Defender","Discovery","Range Rover","Range Rover Sport","Range Rover Velar","Range Rover Evoque"],
  "Hyundai": ["i20 N","i30 N","Elantra N","Kona N","Sonata","Tucson","Santa Fe","Palisade","IONIQ 5","IONIQ 6"],
  "Kia": ["Stinger","EV6","Sorento","Sportage","Telluride","K5","Forte"],
  "Genesis": ["G70","G80","G90","GV70","GV80"],
  "Volvo": ["S60","S90","XC40","XC60","XC90","EX30","EX90"],
  "Peugeot": ["208","308","2008","3008","5008"],
  "Renault": ["Clio","Megane","Captur","Kadjar"],
  "Fiat": ["500","500X","Panda","Tipo","124 Spider"],
  "Alfa Romeo": ["Giulia","Stelvio","Tonale","4C"],
  "Mini": ["Cooper","Cooper S","JCW","Countryman","Clubman"],
  "Rivian": ["R1T","R1S"],
  "Lucid": ["Air","Gravity"],
};

/** Years from current down to 1970, plus a placeholder for older. */
export const YEARS: number[] = (() => {
  const now = new Date().getFullYear() + 1;
  const arr: number[] = [];
  for (let y = now; y >= 1970; y--) arr.push(y);
  return arr;
})();

/** localStorage helpers so custom entries are remembered per user/device. */
const LS_KEY = "zx.customCatalog.v1";
type CustomStore = { brands: string[]; models: Record<string, string[]>; cities: string[] };

function readStore(): CustomStore {
  if (typeof window === "undefined") return { brands: [], models: {}, cities: [] };
  try {
    return { brands: [], models: {}, cities: [], ...(JSON.parse(localStorage.getItem(LS_KEY) || "{}")) };
  } catch { return { brands: [], models: {}, cities: [] }; }
}
function writeStore(s: CustomStore) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export function getAllBrands(): string[] {
  const custom = readStore().brands;
  return Array.from(new Set([...Object.keys(VEHICLE_BRANDS), ...custom])).sort();
}
export function getAllModels(brand: string): string[] {
  const base = VEHICLE_BRANDS[brand] ?? [];
  const custom = readStore().models[brand] ?? [];
  return Array.from(new Set([...base, ...custom])).sort();
}
export function rememberBrand(brand: string) {
  const b = brand.trim(); if (!b) return;
  if (Object.keys(VEHICLE_BRANDS).includes(b)) return;
  const s = readStore();
  if (!s.brands.includes(b)) { s.brands.push(b); writeStore(s); }
}
export function rememberModel(brand: string, model: string) {
  const b = brand.trim(); const m = model.trim(); if (!b || !m) return;
  if ((VEHICLE_BRANDS[b] ?? []).includes(m)) return;
  const s = readStore();
  s.models[b] = Array.from(new Set([...(s.models[b] ?? []), m]));
  writeStore(s);
}
export function getAllCities(country?: string): string[] {
  const base = country ? (CITIES_BY_COUNTRY[country] ?? []) : Object.values(CITIES_BY_COUNTRY).flat();
  const custom = readStore().cities;
  return Array.from(new Set([...base, ...custom])).sort();
}
export function rememberCity(city: string) {
  const c = city.trim(); if (!c) return;
  const s = readStore();
  if (!s.cities.includes(c)) { s.cities.push(c); writeStore(s); }
}
