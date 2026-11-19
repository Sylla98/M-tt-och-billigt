// ─── Intern referensprislista ────────────────────────────────────────────────
// Ungefärliga svenska NORMALPRISER (inte kampanj/extrempris) för vanliga
// livsmedel. Alla priser samlade här så de enkelt kan granskas och justeras.
//
// purchaseType:
//  - "package": säljs i förpackning → hela förpackningar köps
//  - "weight":  lösviktsvara → exakt vikt köps, pris per priceUnit (kg)
//
// generiska kategoripriser (GENERIC_CATEGORY_PRICES) används som reservlösning
// för okända ingredienser – konservativa, avrundade uppskattningar.
//
// Uttrycklig koppling: en ingrediens i recipes.js kan ha ett fält `priceKey` som pekar på en produkts
// `key` här. Det har alltid företräde framför namnmatchning och faller ALDRIG tillbaka på den: finns ingen
// produkt med nyckeln används ett generiskt kategoripris (flaggas som saknat prisunderlag). Använd priceKey
// när två varor har samma normaliserade namn men olika produkt (t.ex. färsk och torkad basilika).
//
// Inköpsenhet i inköpslistan: en förpackad produkt kan ha ett valfritt `packageLabel: { singular, plural }`
// (t.ex. { singular: 'kruka', plural: 'krukor' }). Inköpslistan visar då antal förpackningar med den enheten
// ("Färsk basilika – 1 kruka", "Färsk basilika – 2 krukor") i stället för bara namnet eller en vikt.
// packageQuantity/packageUnit anger då vad EN sådan förpackning motsvarar (t.ex. gram per kruka).
//
// Produkter får ett valfritt `source`-fält ({ store, url, retrieved, note }) för verifierade referenspriser.
// Priserna är referenspriser från en viss butik och ett visst datum, inte universella butikspriser.

export const REFERENCE_PRICES = [
  // ── Protein ────────────────────────────────────────────────────────────
  { key: 'kycklingfile',   displayName: 'Kycklingfilé',   aliases: ['kycklingfilé', 'kycklingfile', 'kyckling', 'kycklinglårfilé', 'kycklinglår', 'kycklingfärs'], packageQuantity: 900,  packageUnit: 'g',  estimatedPackagePrice: 100, purchaseType: 'package' },
  { key: 'kottfars',       displayName: 'Köttfärs',       aliases: ['köttfärs', 'nötfärs', 'blandfärs', 'fläskfärs'],                             packageQuantity: 800,  packageUnit: 'g',  estimatedPackagePrice: 90,  purchaseType: 'package' },
  { key: 'hogrev',         displayName: 'Högrev',         aliases: ['högrev', 'hogrev', 'grytbitar av nöt', 'grytbitar nöt', 'biff av nöt'],      estimatedPricePerUnit: 140, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'flaskytterfile', displayName: 'Fläskytterfilé', aliases: ['fläskytterfilé', 'flaskytterfile', 'fläskfilé', 'ytterfilé av fläsk'],       packageQuantity: 500,  packageUnit: 'g',  estimatedPackagePrice: 55,  purchaseType: 'package' },
  { key: 'sej',            displayName: 'Sej',            aliases: ['sej', 'sejfilé'],                                                            packageQuantity: 400,  packageUnit: 'g',  estimatedPackagePrice: 55,  purchaseType: 'package' },
  { key: 'rakor',          displayName: 'Räkor',          aliases: ['räkor', 'rakor', 'handskalade räkor'],                                       packageQuantity: 300,  packageUnit: 'g',  estimatedPackagePrice: 100, purchaseType: 'package' },
  { key: 'falukorv',       displayName: 'Falukorv',       aliases: ['falukorv'],                                                                  packageQuantity: 800,  packageUnit: 'g',  estimatedPackagePrice: 45,  purchaseType: 'package' },
  { key: 'korv',           displayName: 'Korv',           aliases: ['korv', 'prinskorv', 'chorizo', 'grillkorv'],                                 packageQuantity: 300,  packageUnit: 'g',  estimatedPackagePrice: 35,  purchaseType: 'package' },
  { key: 'lax',            displayName: 'Lax',            aliases: ['lax', 'laxfilé', 'laxfile'],                                                 packageQuantity: 500,  packageUnit: 'g',  estimatedPackagePrice: 90,  purchaseType: 'package' },
  { key: 'torsk',          displayName: 'Torsk',          aliases: ['torsk', 'torskfilé', 'torskfile', 'vit fisk', 'fisk'],                       packageQuantity: 400,  packageUnit: 'g',  estimatedPackagePrice: 80,  purchaseType: 'package' },
  { key: 'agg',            displayName: 'Ägg',            aliases: ['ägg', 'agg'],                                                                packageQuantity: 6,    packageUnit: 'st', estimatedPackagePrice: 25,  purchaseType: 'package' },
  { key: 'tofu',           displayName: 'Tofu',           aliases: ['tofu'],                                                                      packageQuantity: 400,  packageUnit: 'g',  estimatedPackagePrice: 30,  purchaseType: 'package' },
  { key: 'halloumi',       displayName: 'Halloumi',       aliases: ['halloumi'],                                                                  packageQuantity: 200,  packageUnit: 'g',  estimatedPackagePrice: 35,  purchaseType: 'package' },
  { key: 'bacon',          displayName: 'Bacon',          aliases: ['bacon'],                                                                     packageQuantity: 140,  packageUnit: 'g',  estimatedPackagePrice: 25,  purchaseType: 'package' },

  // ── Mejeri ─────────────────────────────────────────────────────────────
  { key: 'mjolk',          displayName: 'Mjölk',            aliases: ['mjölk', 'mjolk', 'standardmjölk', 'mellanmjölk'],           packageQuantity: 1000, packageUnit: 'ml', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'gradde',         displayName: 'Grädde',           aliases: ['grädde', 'vispgrädde'],                                     packageQuantity: 500,  packageUnit: 'ml', estimatedPackagePrice: 28, purchaseType: 'package' },
  { key: 'matlagningsgradde', displayName: 'Matlagningsgrädde', aliases: ['matlagningsgrädde', 'matlagningsgradde'],               packageQuantity: 500,  packageUnit: 'ml', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'creme-fraiche',  displayName: 'Crème fraiche',    aliases: ['crème fraiche', 'creme fraiche', 'cremefraiche'],           packageQuantity: 300,  packageUnit: 'g',  estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'yoghurt',        displayName: 'Yoghurt',          aliases: ['yoghurt', 'naturell yoghurt', 'turkisk yoghurt'],           packageQuantity: 1000, packageUnit: 'g',  estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'smor',           displayName: 'Smör',             aliases: ['smör', 'smor'],                                             packageQuantity: 500,  packageUnit: 'g',  estimatedPackagePrice: 55, purchaseType: 'package' },
  { key: 'ost',            displayName: 'Ost',              aliases: ['ost', 'riven ost', 'hushållsost', 'lagrad ost', 'parmesan', 'mozzarella'], packageQuantity: 500, packageUnit: 'g',  estimatedPackagePrice: 60, purchaseType: 'package' },
  { key: 'fetaost',        displayName: 'Fetaost',          aliases: ['fetaost', 'feta'],                                          packageQuantity: 150,  packageUnit: 'g',  estimatedPackagePrice: 25, purchaseType: 'package' },

  // ── Kolhydrater ────────────────────────────────────────────────────────
  { key: 'pasta',          displayName: 'Pasta',       aliases: ['pasta', 'spaghetti', 'makaroner', 'penne', 'fusilli', 'tagliatelle', 'lasagneplattor', 'gnocchi'], packageQuantity: 1000, packageUnit: 'g', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'ris',            displayName: 'Ris',         aliases: ['ris', 'jasminris', 'basmatiris', 'långkornigt ris'],       packageQuantity: 1000, packageUnit: 'g', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'potatis',        displayName: 'Potatis',     aliases: ['potatis', 'fast potatis', 'mjölig potatis', 'färskpotatis'], estimatedPricePerUnit: 15, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'nudlar',         displayName: 'Nudlar',      aliases: ['nudlar', 'äggnudlar', 'risnudlar'],                        packageQuantity: 250,  packageUnit: 'g', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'couscous',       displayName: 'Couscous',    aliases: ['couscous'],                                                packageQuantity: 500,  packageUnit: 'g', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'bulgur',         displayName: 'Bulgur',      aliases: ['bulgur'],                                                  packageQuantity: 500,  packageUnit: 'g', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'havregryn',      displayName: 'Havregryn',   aliases: ['havregryn'],                                               packageQuantity: 750,  packageUnit: 'g', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'mjol',           displayName: 'Vetemjöl',    aliases: ['mjöl', 'vetemjöl', 'mjol'],                                packageQuantity: 2000, packageUnit: 'g', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'brod',           displayName: 'Bröd',        aliases: ['bröd', 'brod', 'limpa', 'formfranska', 'pitabröd'], packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'hamburgerbrod',  displayName: 'Hamburgerbröd', aliases: ['hamburgerbröd', 'hamburgerbrod', 'burgerbröd'], packageQuantity: 4, packageUnit: 'st', estimatedPackagePrice: 22, purchaseType: 'package' },

  // ── Grönsaker & frukt ──────────────────────────────────────────────────
  { key: 'gul-lok',        displayName: 'Gul lök',     aliases: ['gul lök', 'lök', 'gul lok', 'lok'],                estimatedPricePerUnit: 25, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'rodlok',         displayName: 'Rödlök',      aliases: ['rödlök', 'rodlok'],                                estimatedPricePerUnit: 30, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'vitlok',         displayName: 'Vitlök',      aliases: ['vitlök', 'vitlok', 'vitlöksklyfta', 'vitlöksklyftor'], packageQuantity: 8, packageUnit: 'st', estimatedPackagePrice: 10, purchaseType: 'package' },
  { key: 'morotter',       displayName: 'Morötter',    aliases: ['morötter', 'morot', 'morotter'],                   estimatedPricePerUnit: 15, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'rodbetor',       displayName: 'Rödbetor',    aliases: ['rödbetor', 'rodbetor', 'beta'],                    estimatedPricePerUnit: 25, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'paprika',        displayName: 'Paprika',     aliases: ['paprika', 'röd paprika', 'gul paprika', 'grön paprika'], packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 15, purchaseType: 'package' },
  { key: 'tomat',          displayName: 'Tomater',     aliases: ['tomat', 'tomater', 'körsbärstomater', 'cocktailtomater'], estimatedPricePerUnit: 35, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'gurka',          displayName: 'Gurka',       aliases: ['gurka'],                                           packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'vitkal',         displayName: 'Vitkål',      aliases: ['vitkål', 'vitkal', 'kål'],                         estimatedPricePerUnit: 15, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'broccoli',       displayName: 'Broccoli',    aliases: ['broccoli'],                                        packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'blomkal',        displayName: 'Blomkål',     aliases: ['blomkål', 'blomkal'],                              packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'banan',          displayName: 'Bananer',     aliases: ['banan', 'bananer'],                                estimatedPricePerUnit: 25, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'apple',          displayName: 'Äpplen',      aliases: ['äpple', 'äpplen', 'apple'],                        estimatedPricePerUnit: 30, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'citron',         displayName: 'Citron',      aliases: ['citron', 'lime'],                                  packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 6,  purchaseType: 'package' },
  { key: 'zucchini',       displayName: 'Zucchini',    aliases: ['zucchini', 'squash'],                              packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 15, purchaseType: 'package' },
  { key: 'champinjoner',   displayName: 'Champinjoner', aliases: ['champinjoner', 'svamp', 'champinjon'],            packageQuantity: 250, packageUnit: 'g', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'spenat',         displayName: 'Spenat',      aliases: ['spenat', 'bladspenat', 'babyspenat'],              packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'frysta-gronsaker', displayName: 'Frysta grönsaker', aliases: ['frysta grönsaker', 'grönsaksmix', 'wokgrönsaker', 'frysta ärtor', 'gröna ärtor', 'ärtor', 'majs fryst'], packageQuantity: 500, packageUnit: 'g', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'purjolok',       displayName: 'Purjolök',    aliases: ['purjolök', 'purjolok'],                            packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 15, purchaseType: 'package' },

  // ── Konserver & torrvaror ──────────────────────────────────────────────
  { key: 'krossade-tomater', displayName: 'Krossade tomater', aliases: ['krossade tomater', 'krossad tomat', 'passerade tomater', 'tomatsås'], packageQuantity: 400, packageUnit: 'g', estimatedPackagePrice: 12, purchaseType: 'package' },
  { key: 'tomatpure',      displayName: 'Tomatpuré',   aliases: ['tomatpuré', 'tomatpure'],                          packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'kikartor',       displayName: 'Kikärtor',    aliases: ['kikärtor', 'kikärtor på burk', 'kikartor'],        packageQuantity: 400, packageUnit: 'g', estimatedPackagePrice: 12, purchaseType: 'package' },
  { key: 'bonor',          displayName: 'Bönor',       aliases: ['bönor', 'vita bönor', 'svarta bönor', 'kidneybönor', 'bonor'], packageQuantity: 400, packageUnit: 'g', estimatedPackagePrice: 12, purchaseType: 'package' },
  { key: 'majs',           displayName: 'Majs',        aliases: ['majs', 'majskorn'],                                packageQuantity: 340, packageUnit: 'g', estimatedPackagePrice: 15, purchaseType: 'package' },
  { key: 'gronaoliver',    displayName: 'Gröna oliver', aliases: ['gröna oliver', 'svarta oliver', 'oliver'],         packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'roda-linser',    displayName: 'Röda linser', aliases: ['röda linser', 'linser', 'roda linser'],            packageQuantity: 500, packageUnit: 'g', estimatedPackagePrice: 30, purchaseType: 'package' },
  { key: 'grona-linser',   displayName: 'Gröna linser', aliases: ['gröna linser', 'grona linser'],                   packageQuantity: 500, packageUnit: 'g', estimatedPackagePrice: 32, purchaseType: 'package' },
  { key: 'gula-artor',     displayName: 'Gula ärtor',  aliases: ['gula ärtor', 'gula artor', 'torkade gula ärtor'],  packageQuantity: 500, packageUnit: 'g', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'kokosmjolk',     displayName: 'Kokosmjölk',  aliases: ['kokosmjölk', 'kokosmjolk'],                        packageQuantity: 400, packageUnit: 'ml', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'buljong',        displayName: 'Buljong',     aliases: ['buljong', 'grönsaksbuljong', 'kycklingbuljong', 'köttbuljong', 'fond', 'kycklingfond', 'grönsaksfond', 'buljongtärning'], packageQuantity: 8, packageUnit: 'st', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'krossade-notter', displayName: 'Nötter',     aliases: ['nötter', 'cashewnötter', 'jordnötter', 'mandel'],  packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 30, purchaseType: 'package' },
  { key: 'jordnotssmor',    displayName: 'Jordnötssmör', aliases: ['jordnötssmör', 'jordnotssmor', 'peanut butter'], packageQuantity: 400, packageUnit: 'g', estimatedPackagePrice: 35, purchaseType: 'package' },

  // ── Skafferi ───────────────────────────────────────────────────────────
  { key: 'rapsolja',       displayName: 'Rapsolja',    aliases: ['rapsolja', 'olja', 'matolja'],                     packageQuantity: 1000, packageUnit: 'ml', estimatedPackagePrice: 35, purchaseType: 'package' },
  { key: 'olivolja',       displayName: 'Olivolja',    aliases: ['olivolja'],                                        packageQuantity: 500,  packageUnit: 'ml', estimatedPackagePrice: 60, purchaseType: 'package' },
  { key: 'soja',           displayName: 'Sojasås',     aliases: ['soja', 'sojasås', 'sojasas'],                      packageQuantity: 250,  packageUnit: 'ml', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'salt',           displayName: 'Salt',        aliases: ['salt', 'havssalt'],                                packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 12, purchaseType: 'package' },
  { key: 'svartpeppar',    displayName: 'Svartpeppar', aliases: ['svartpeppar', 'peppar'],                           packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'curry',          displayName: 'Curry',       aliases: ['curry', 'currypulver'],                            packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'paprikapulver',  displayName: 'Paprikapulver', aliases: ['paprikapulver'],                                 packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'oregano',        displayName: 'Oregano',     aliases: ['oregano'],                                         packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 18, purchaseType: 'package' },
  // Torkad basilika (kryddburk). Receptens ingredienser kopplas hit uttryckligt med priceKey: 'torkad-basilika'.
  // Aliaset 'basilika' finns kvar för ingredienser utan priceKey (namnnormaliseringen tar bort "torkad"/"färsk").
  // FÄRSK basilika är en annan vara och har priceKey: 'farsk-basilika'. Någon produkt med den nyckeln finns
  // INTE än: verifierad förpackningsstorlek och pris saknas (se RECEPTFLÖDE.md, avsnitt 1.3). Tills dess prissätts
  // färsk basilika med ett generiskt kategoripris som redovisas som saknat prisunderlag, aldrig som torkad basilika.
  { key: 'torkad-basilika', displayName: 'Torkad basilika', aliases: ['basilika'],                                      packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'kanel',          displayName: 'Kanel',       aliases: ['kanel'],                                           packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'spiskummin',     displayName: 'Spiskummin',  aliases: ['spiskummin', 'kummin'],                            packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'gurkmeja',       displayName: 'Gurkmeja',    aliases: ['gurkmeja'],                                        packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'garam-masala',   displayName: 'Garam masala', aliases: ['garam masala', 'masala'],                         packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'chili',          displayName: 'Chilipulver', aliases: ['chili', 'chilipulver', 'chiliflakes', 'cayennepeppar'], packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'socker',         displayName: 'Socker',      aliases: ['socker', 'strösocker'],                            packageQuantity: 1000, packageUnit: 'g',  estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'honung',         displayName: 'Honung',      aliases: ['honung'],                                          packageQuantity: 350,  packageUnit: 'g',  estimatedPackagePrice: 40, purchaseType: 'package' },
  { key: 'vinager',        displayName: 'Vinäger',     aliases: ['vinäger', 'vitvinsvinäger', 'balsamvinäger', 'ättika'], packageQuantity: 500, packageUnit: 'ml', estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'senap',          displayName: 'Senap',       aliases: ['senap', 'dijonsenap'],                             packageQuantity: 250,  packageUnit: 'g',  estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'ketchup',        displayName: 'Ketchup',     aliases: ['ketchup'],                                         packageQuantity: 500,  packageUnit: 'g',  estimatedPackagePrice: 22, purchaseType: 'package' },
  { key: 'ingefara',       displayName: 'Ingefära',    aliases: ['ingefära', 'ingefara', 'färsk ingefära'],          estimatedPricePerUnit: 90, priceUnit: 'kg', purchaseType: 'weight' },
  { key: 'dill',           displayName: 'Dill',        aliases: ['dill', 'färsk dill'],                              packageQuantity: 1,   packageUnit: 'st', estimatedPackagePrice: 15, purchaseType: 'package' },
  { key: 'rodcurrypasta',  displayName: 'Röd currypasta', aliases: ['röd currypasta', 'red curry paste', 'currypasta'], packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 30, purchaseType: 'package' },
  { key: 'fisksas',        displayName: 'Fisksås',     aliases: ['fisksås', 'fisksas', 'nam pla'],                   packageQuantity: 250, packageUnit: 'ml', estimatedPackagePrice: 28, purchaseType: 'package' },

  // ── Referenspriser 2026-11-19 (receptomgång: wok, köttfärslimpa, harissakyckling, nya recept) ──
  // Ordinarie hyllpris (inte kampanj) i Willys e-handel, butik "Willys Kungsbacka Hede" (sajtens
  // förvalda butik), läst från produktsidan 2026-11-19. Priset är avrundat till hela kronor. Det är ett
  // butiksspecifikt referenspris, inte ett universellt butikspris. Exakt pris och produkt står i source.
  { key: 'ostronsas',      displayName: 'Ostronsås',   aliases: ['ostronsås', 'ostronsas'], packageQuantity: 200, packageUnit: 'ml', estimatedPackagePrice: 25, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101386140_ST', retrieved: '2026-11-19', note: 'Santa Maria Oyster Sauce 200 ml, 24,90 kr.' } },
  { key: 'majsstarkelse',  displayName: 'Majsstärkelse', aliases: ['majsstärkelse', 'majsstarkelse', 'maizena'], packageQuantity: 400, packageUnit: 'g', estimatedPackagePrice: 15, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/100181152_ST', retrieved: '2026-11-19', note: 'Maizena Majsstärkelse 400 g, 14,90 kr.' } },
  { key: 'harissapasta',   displayName: 'Harissapasta', aliases: ['harissapasta'], packageQuantity: 120, packageUnit: 'g', estimatedPackagePrice: 19, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101308107_ST', retrieved: '2026-11-19', note: 'Dea Harissa 120 g (Willys produktnamn "Harissa Hot Sauce"), 18,83 kr. Kryddpasta enligt ingredienslistan: rehydrerad chili 52 %, vatten, majsstärkelse, salt, vitlök, koriander, kummin.' } },
  { key: 'kalvfond',       displayName: 'Kalvfond',    aliases: ['kalvfond'], packageQuantity: 180, packageUnit: 'ml', estimatedPackagePrice: 27, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101726390_ST', retrieved: '2026-11-19', note: 'Garant Kalvfond, koncentrerad, 180 ml (räcker till 4 l), 26,90 kr.' } },
  // Hela kycklinglår med skinn och ben. Prissätts ALDRIG som Kycklingfilé (benfritt): recept kopplar hit med
  // priceKey. Prisunderlaget är en fryst vara; färska hela lår fanns inte i Willys e-handel och ICA:s e-handel
  // gick inte att söka utan vald butik.
  { key: 'kycklinglar-med-ben', displayName: 'Kycklinglår med skinn och ben', aliases: [], packageQuantity: 1000, packageUnit: 'g', estimatedPackagePrice: 40, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101273580_ST', retrieved: '2026-11-19', note: 'Garant Kycklinglår fryst 1 kg, 39,90 kr. Hela lår med del av ryggben, 87 % kyckling och saltlake (svensk kyckling).' } },
  { key: 'soltorkade-tomater', displayName: 'Soltorkade tomater', aliases: ['soltorkade tomater'], packageQuantity: 150, packageUnit: 'g', estimatedPackagePrice: 25, purchaseType: 'package',
    packageLabel: { singular: 'burk', plural: 'burkar' },
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101705529_ST', retrieved: '2026-11-19', note: 'Monte Castello Soltorkade tomater i olja 280 g, avrunnen vikt 150 g, 24,90 kr. packageQuantity är avrunnen vikt; receptmängden anges som avrunna tomater.' } },
  // Vanlig grönsallad (plocksallad i kruka) som tillbehör. Ersätter 2026-11-19 en "Blandsallad" med vitkål,
  // morot och escarole, som inte motsvarade receptets grönsallad.
  { key: 'gronsallad',     displayName: 'Grönsallad',  aliases: ['grönsallad', 'gronsallad', 'kruksallad', 'kruksallat'], packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 17, purchaseType: 'package',
    packageLabel: { singular: 'kruka', plural: 'krukor' },
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/100297064_ST', retrieved: '2026-11-19', note: 'Kruksallat Klass 1 ("En plocksallad i kruka"), ca 200 g, 16,90 kr. Vikten är ungefärlig enligt produktsidan, och om den avser hela plantan eller bara bladen anges inte.' } },
  { key: 'romansallad',    displayName: 'Romansallad', aliases: ['romansallad'], packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 17, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/100391265_ST', retrieved: '2026-11-19', note: 'Romansallad Klass 1 200 g, 16,90 kr.' } },
  { key: 'salladslok',     displayName: 'Salladslök',  aliases: ['salladslök', 'salladslok'], packageQuantity: 100, packageUnit: 'g', estimatedPackagePrice: 15, purchaseType: 'package',
    packageLabel: { singular: 'knippe', plural: 'knippen' },
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101361485_ST', retrieved: '2026-11-19', note: 'Salladslök knippe 100 g, ordinarie pris 14,90 kr (kampanjpris 9,90 kr används inte).' } },
  { key: 'koriander',      displayName: 'Koriander',   aliases: ['koriander', 'färsk koriander'], packageQuantity: 25, packageUnit: 'g', estimatedPackagePrice: 14, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101599943_ST', retrieved: '2026-11-19', note: 'Garant Koriander Klass 1 (färsk) 25 g, ordinarie pris 13,90 kr (kampanjpris 9,90 kr används inte).' } },
  { key: 'salta-jordnotter', displayName: 'Salta jordnötter', aliases: ['salta jordnötter'], packageQuantity: 300, packageUnit: 'g', estimatedPackagePrice: 20, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/100069195_ST', retrieved: '2026-11-19', note: 'OLW Jordnötter Salta 300 g, 19,90 kr.' } },
  { key: 'sambal-oelek',   displayName: 'Sambal oelek', aliases: ['sambal oelek'], packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 20, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101844247_ST', retrieved: '2026-11-19', note: 'Garant Sambal Oelek 200 g, 19,90 kr.' } },
  { key: 'mango-chutney',  displayName: 'Mango chutney', aliases: ['mango chutney'], packageQuantity: 350, packageUnit: 'g', estimatedPackagePrice: 29, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/100260539_ST', retrieved: '2026-11-19', note: 'Santa Maria Mango Chutney Original 350 g, 28,90 kr.' } },
  { key: 'lagerblad',      displayName: 'Lagerblad',   aliases: ['lagerblad'], packageQuantity: 4, packageUnit: 'g', estimatedPackagePrice: 12, purchaseType: 'package',
    packageLabel: { singular: 'påse', plural: 'påsar' },
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101678531_ST', retrieved: '2026-11-19', note: 'Kockens Lagerblad 4 g, 12,20 kr. Recept anger lagerblad i st (annan enhetsfamilj), så en påse köps.' } },
  { key: 'kryddpepparkorn', displayName: 'Hel kryddpeppar', aliases: ['hel kryddpeppar', 'kryddpepparkorn', 'kryddpeppar'], packageQuantity: 13, packageUnit: 'g', estimatedPackagePrice: 12, purchaseType: 'package',
    packageLabel: { singular: 'påse', plural: 'påsar' },
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/100256429_ST', retrieved: '2026-11-19', note: 'Kockens Kryddpeppar hel påse 13 g, 12,20 kr. Recept anger hel kryddpeppar i tsk (annan enhetsfamilj än g), så en påse köps.' } },
  { key: 'vitpeppar',      displayName: 'Vitpeppar',   aliases: ['vitpeppar', 'malen vitpeppar'], packageQuantity: 24, packageUnit: 'g', estimatedPackagePrice: 12, purchaseType: 'package',
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/100696123_ST', retrieved: '2026-11-19', note: 'Kockens Vitpeppar malen påse 24 g, 12,20 kr.' } },
  // Tortillabröd: recepten anger antal bröd (st). Inköpslistan visar hela förpackningar med antal bröd per
  // förpackning ("Tortillabröd – 1 förpackning (8 st)"), och kostnaden räknas på samma antal förpackningar.
  // Ersätter aliasen 'tortilla'/'tortillabröd' på Bröd, där "1 st" i recepten betydde en hel förpackning.
  { key: 'tortillabrod',   displayName: 'Tortillabröd', aliases: ['tortillabröd', 'tortilla'], packageQuantity: 8, packageUnit: 'st', estimatedPackagePrice: 15, purchaseType: 'package',
    packageLabel: { singular: 'förpackning (8 st)', plural: 'förpackningar (à 8 st)' },
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101295571_ST', retrieved: '2026-11-19', note: 'Santa Maria Tortilla Original Medium 8-pack 320 g, 14,90 kr. Produktsidan: "En förpackning innehåller 8 st tortillabröd, storlek Medium".' } },
  // Inlagda (skivade) rödbetor på burk. Skiljs från färska rödbetor (key 'rodbetor', kilopris) med priceKey.
  { key: 'inlagda-rodbetor', displayName: 'Inlagda rödbetor', aliases: ['inlagda rödbetor'], packageQuantity: 380, packageUnit: 'g', estimatedPackagePrice: 23, purchaseType: 'package',
    packageLabel: { singular: 'burk', plural: 'burkar' },
    source: { store: 'Willys (e-handel, Willys Kungsbacka Hede)', url: 'https://www.willys.se/produkt/101203812_ST', retrieved: '2026-11-19', note: 'Garant Rödbeta skivad 560 g, avrunnen vikt 380 g, 22,90 kr. packageQuantity är avrunnen vikt.' } },
]

// ── Generiska kategoripriser (reservlösning för okända varor) ──────────────
// Konservativa, avrundade uppskattningar per typisk "köpenhet".
export const GENERIC_CATEGORY_PRICES = {
  protein:  { estimatedPrice: 80, label: 'proteinvara' },
  mejeri:   { estimatedPrice: 25, label: 'mejerivara' },
  gronsak:  { estimatedPrice: 25, label: 'grönsak' },
  frukt:    { estimatedPrice: 25, label: 'frukt' },
  torrvara: { estimatedPrice: 25, label: 'torrvara' },
  konserv:  { estimatedPrice: 15, label: 'konserv' },
  krydda:   { estimatedPrice: 20, label: 'krydda' },
  sas:      { estimatedPrice: 25, label: 'sås' },
  olja:     { estimatedPrice: 40, label: 'olja' },
  brod:     { estimatedPrice: 25, label: 'bröd' },
  fryst:    { estimatedPrice: 25, label: 'fryst vara' },
  ovrigt:   { estimatedPrice: 25, label: 'övrig vara' },
}
