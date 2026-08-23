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

export const REFERENCE_PRICES = [
  // ── Protein ────────────────────────────────────────────────────────────
  { key: 'kycklingfile',   displayName: 'Kycklingfilé',   aliases: ['kycklingfilé', 'kycklingfile', 'kyckling', 'kycklinglårfilé', 'kycklinglår', 'kycklingfärs'], packageQuantity: 900,  packageUnit: 'g',  estimatedPackagePrice: 100, purchaseType: 'package' },
  { key: 'kottfars',       displayName: 'Köttfärs',       aliases: ['köttfärs', 'nötfärs', 'blandfärs', 'fläskfärs'],                             packageQuantity: 800,  packageUnit: 'g',  estimatedPackagePrice: 90,  purchaseType: 'package' },
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
  { key: 'brod',           displayName: 'Bröd',        aliases: ['bröd', 'brod', 'limpa', 'formfranska', 'tortilla', 'tortillabröd', 'pitabröd'], packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 25, purchaseType: 'package' },

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
  { key: 'roda-linser',    displayName: 'Röda linser', aliases: ['röda linser', 'linser', 'roda linser'],            packageQuantity: 500, packageUnit: 'g', estimatedPackagePrice: 30, purchaseType: 'package' },
  { key: 'grona-linser',   displayName: 'Gröna linser', aliases: ['gröna linser', 'grona linser'],                   packageQuantity: 500, packageUnit: 'g', estimatedPackagePrice: 32, purchaseType: 'package' },
  { key: 'gula-artor',     displayName: 'Gula ärtor',  aliases: ['gula ärtor', 'gula artor', 'torkade gula ärtor'],  packageQuantity: 500, packageUnit: 'g', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'kokosmjolk',     displayName: 'Kokosmjölk',  aliases: ['kokosmjölk', 'kokosmjolk'],                        packageQuantity: 400, packageUnit: 'ml', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'buljong',        displayName: 'Buljong',     aliases: ['buljong', 'grönsaksbuljong', 'kycklingbuljong', 'köttbuljong', 'fond', 'kycklingfond', 'grönsaksfond', 'buljongtärning'], packageQuantity: 8, packageUnit: 'st', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'krossade-notter', displayName: 'Nötter',     aliases: ['nötter', 'cashewnötter', 'jordnötter', 'mandel'],  packageQuantity: 200, packageUnit: 'g', estimatedPackagePrice: 30, purchaseType: 'package' },

  // ── Skafferi ───────────────────────────────────────────────────────────
  { key: 'rapsolja',       displayName: 'Rapsolja',    aliases: ['rapsolja', 'olja', 'matolja'],                     packageQuantity: 1000, packageUnit: 'ml', estimatedPackagePrice: 35, purchaseType: 'package' },
  { key: 'olivolja',       displayName: 'Olivolja',    aliases: ['olivolja'],                                        packageQuantity: 500,  packageUnit: 'ml', estimatedPackagePrice: 60, purchaseType: 'package' },
  { key: 'soja',           displayName: 'Sojasås',     aliases: ['soja', 'sojasås', 'sojasas'],                      packageQuantity: 250,  packageUnit: 'ml', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'salt',           displayName: 'Salt',        aliases: ['salt', 'havssalt'],                                packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 12, purchaseType: 'package' },
  { key: 'svartpeppar',    displayName: 'Svartpeppar', aliases: ['svartpeppar', 'peppar'],                           packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 25, purchaseType: 'package' },
  { key: 'curry',          displayName: 'Curry',       aliases: ['curry', 'currypulver'],                            packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'paprikapulver',  displayName: 'Paprikapulver', aliases: ['paprikapulver'],                                 packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 20, purchaseType: 'package' },
  { key: 'oregano',        displayName: 'Oregano',     aliases: ['oregano'],                                         packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 18, purchaseType: 'package' },
  { key: 'basilika',       displayName: 'Basilika',    aliases: ['basilika'],                                        packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 18, purchaseType: 'package' },
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
  { key: 'ingefara',       displayName: 'Ingefära',    aliases: ['ingefära', 'ingefara', 'färsk ingefära'],          packageQuantity: 1,    packageUnit: 'st', estimatedPackagePrice: 12, purchaseType: 'package' },
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
