#!/usr/bin/env node
/**
 * Populate phone and email contact data for existing people.
 * Generates realistic-looking contact info based on person names.
 *
 * Usage:
 *   node scripts/populate-contacts.mjs
 *   node scripts/populate-contacts.mjs --dry-run
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, isNull } from "drizzle-orm";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { people } from "../drizzle/schema.ts";

config();

const dryRun = process.argv.includes("--dry-run");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Generate a realistic US phone number
function generatePhone(seed) {
  // Use seed to deterministically generate area codes from common US ones
  const areaCodes = [
    "202",
    "212",
    "213",
    "214",
    "254",
    "281",
    "303",
    "305",
    "312",
    "313",
    "314",
    "315",
    "317",
    "318",
    "319",
    "320",
    "321",
    "323",
    "325",
    "330",
    "334",
    "336",
    "337",
    "339",
    "346",
    "347",
    "351",
    "352",
    "360",
    "361",
    "385",
    "386",
    "401",
    "402",
    "404",
    "405",
    "406",
    "407",
    "408",
    "409",
    "410",
    "412",
    "414",
    "415",
    "417",
    "419",
    "423",
    "424",
    "425",
    "430",
    "432",
    "434",
    "435",
    "440",
    "442",
    "443",
    "469",
    "470",
    "475",
    "478",
    "479",
    "480",
    "484",
    "501",
    "502",
    "503",
    "504",
    "505",
    "507",
    "508",
    "509",
    "510",
    "512",
    "513",
    "515",
    "516",
    "517",
    "518",
    "520",
    "530",
    "531",
    "534",
    "539",
    "540",
    "541",
    "551",
    "559",
    "561",
    "562",
    "563",
    "567",
    "570",
    "571",
    "573",
    "574",
    "575",
    "580",
    "585",
    "586",
    "601",
    "602",
    "603",
    "605",
    "606",
    "607",
    "608",
    "609",
    "610",
    "612",
    "614",
    "615",
    "616",
    "617",
    "618",
    "619",
    "620",
    "623",
    "626",
    "628",
    "629",
    "630",
    "631",
    "636",
    "641",
    "646",
    "650",
    "651",
    "657",
    "660",
    "661",
    "662",
    "667",
    "669",
    "678",
    "681",
    "682",
    "689",
    "701",
    "702",
    "703",
    "704",
    "706",
    "707",
    "708",
    "712",
    "713",
    "714",
    "715",
    "716",
    "717",
    "718",
    "719",
    "720",
    "724",
    "725",
    "727",
    "731",
    "732",
    "734",
    "737",
    "740",
    "743",
    "747",
    "754",
    "757",
    "760",
    "762",
    "763",
    "765",
    "769",
    "770",
    "772",
    "773",
    "774",
    "775",
    "779",
    "781",
    "785",
    "786",
    "801",
    "802",
    "803",
    "804",
    "805",
    "806",
    "808",
    "810",
    "812",
    "813",
    "814",
    "815",
    "816",
    "817",
    "818",
    "828",
    "830",
    "831",
    "832",
    "843",
    "845",
    "847",
    "848",
    "850",
    "856",
    "857",
    "858",
    "859",
    "860",
    "862",
    "863",
    "864",
    "865",
    "870",
    "872",
    "878",
    "901",
    "903",
    "904",
    "906",
    "907",
    "908",
    "909",
    "910",
    "912",
    "913",
    "914",
    "915",
    "916",
    "917",
    "918",
    "919",
    "920",
    "925",
    "928",
    "929",
    "931",
    "936",
    "937",
    "938",
    "940",
    "941",
    "947",
    "949",
    "951",
    "952",
    "954",
    "956",
    "959",
    "970",
    "971",
    "972",
    "973",
    "978",
    "979",
    "980",
    "984",
    "985",
    "989",
  ];

  const areaCode = areaCodes[seed % areaCodes.length];
  const exchange = String(200 + ((seed * 7 + 13) % 800)).padStart(3, "0");
  const subscriber = String(1000 + ((seed * 31 + 17) % 9000)).padStart(4, "0");
  return `(${areaCode}) ${exchange}-${subscriber}`;
}

// Generate an email from a person's name
function generateEmail(name, seed) {
  const domains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "protonmail.com",
    "aol.com",
    "mail.com",
  ];
  const parts = name.toLowerCase().split(/\s+/);
  const first = parts[0] || "user";
  const last = parts[parts.length - 1] || "name";

  // Different email patterns
  const patterns = [
    `${first}.${last}`,
    `${first}${last}`,
    `${first}.${last}${(seed % 99) + 1}`,
    `${first[0]}${last}`,
    `${first}_${last}`,
    `${first}${last[0]}`,
  ];

  const pattern = patterns[seed % patterns.length];
  const domain = domains[seed % domains.length];
  return `${pattern}@${domain}`;
}

async function main() {
  console.log(dryRun ? "🔍 DRY RUN — no changes will be made\n" : "");
  console.log("🔌 Connecting to database...");

  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection);

  console.log("✅ Connected\n");

  // Get all people who are missing phone or email
  const allPeople = await db.select().from(people);
  const needsUpdate = allPeople.filter(p => !p.phone || !p.email);

  console.log(`📊 Total people: ${allPeople.length}`);
  console.log(`📝 Need contact data: ${needsUpdate.length}\n`);

  if (needsUpdate.length === 0) {
    console.log("✅ All people already have contact data!");
    await connection.end();
    return;
  }

  let updated = 0;
  for (const person of needsUpdate) {
    const seed = person.id;
    const phone = person.phone || generatePhone(seed);
    const email = person.email || generateEmail(person.name, seed);

    if (dryRun) {
      console.log(`  ${person.name}: ${phone} | ${email}`);
    } else {
      await db
        .update(people)
        .set({ phone, email })
        .where(eq(people.id, person.id));
      updated++;
      if (updated % 50 === 0) {
        console.log(`  Updated ${updated}/${needsUpdate.length}...`);
      }
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Updated ${updated} people with contact data`);
  } else {
    console.log(`\n🔍 Would update ${needsUpdate.length} people (dry run)`);
  }

  await connection.end();
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
