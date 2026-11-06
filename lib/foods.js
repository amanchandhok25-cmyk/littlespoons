// Food library, allergen order, recipes and tips.
// Serving guidance follows mainstream NHS "Start for Life" / AAP-style advice.
// It is general information, not medical advice.

const F = [];
function f(id, name, cat, opts = {}) {
  F.push({
    id, name, cat,
    iron: !!opts.iron,
    allergen: opts.allergen || null,
    choke: opts.choke || null,        // choking-hazard prep warning
    staple: opts.staple || 0,         // 0-3: how useful to introduce early
    minMonths: opts.min || 6,
    serve: opts.serve || '',          // how to serve at 6-12 months
    ahead: opts.ahead || null,        // prep the night before
    roles: opts.roles || defaultRoles(cat),
  });
}
function defaultRoles(cat) {
  return {
    veg: ['veg'], fruit: ['fruit'], protein: ['protein'], legume: ['protein', 'carb'],
    grain: ['carb'], dairy: ['dairy'], nut_seed: ['extra'], fat: ['extra'], herb: ['extra'],
    starch: ['carb', 'veg'],
  }[cat] || ['extra'];
}

// ---------- Vegetables ----------
f('broccoli', 'Broccoli', 'veg', { iron: true, staple: 3, serve: 'Steam large florets until soft; leave the stalk as a handle.', ahead: 'Steam broccoli florets (keeps 2 days in fridge).' });
f('carrot', 'Carrot', 'veg', { staple: 3, choke: 'Never serve raw. Steam or roast until squishable.', serve: 'Steam or roast thick sticks until soft enough to squash between finger and thumb.', ahead: 'Roast or steam carrot sticks.' });
f('cauliflower', 'Cauliflower', 'veg', { staple: 2, serve: 'Steam large florets until soft, or mash.', ahead: 'Steam cauliflower florets.' });
f('courgette', 'Courgette', 'veg', { staple: 2, serve: 'Steam or roast thick batons, skin on for grip.', ahead: 'Roast courgette batons.' });
f('peas', 'Peas', 'veg', { staple: 2, serve: 'Flatten or mash (whole peas are fine from about 9 months when pincer grip develops).' });
f('green_beans', 'Green beans', 'veg', { staple: 2, serve: 'Steam until very soft; serve whole.' });
f('spinach', 'Spinach', 'veg', { iron: true, staple: 2, serve: 'Wilt and chop finely into eggs, sauces or mash.' });
f('kale', 'Kale', 'veg', { iron: true, serve: 'Chop very finely and mix into sauces, eggs or mash.' });
f('butternut_squash', 'Butternut squash', 'starch', { staple: 3, serve: 'Roast wedges until very soft, or mash.', ahead: 'Roast butternut squash wedges.' });
f('sweet_potato', 'Sweet potato', 'starch', { staple: 3, serve: 'Roast wedges skin-on until soft, or mash.', ahead: 'Roast sweet potato wedges.' });
f('potato', 'Potato', 'starch', { staple: 2, serve: 'Roast wedges or mash with a little butter or milk.', ahead: 'Boil or roast potato.' });
f('parsnip', 'Parsnip', 'starch', { serve: 'Roast batons until very soft.', ahead: 'Roast parsnip batons.' });
f('beetroot', 'Beetroot', 'veg', { serve: 'Roast and cut into wedges, or grate cooked beetroot into yoghurt. (It will turn nappies pink!)', ahead: 'Roast beetroot.' });
f('tomato', 'Tomatoes', 'veg', { serve: 'Quarter cherry tomatoes lengthways; large tomatoes in wedges.', choke: 'Quarter cherry tomatoes lengthways.' });
f('cucumber', 'Cucumber', 'veg', { serve: 'Thick finger-length sticks, skin on or off. Lovely chilled for teething.' });
f('pepper', 'Red pepper', 'veg', { serve: 'Roast strips until soft and peel; raw strips only once he can bite well.', ahead: 'Roast red pepper strips.' });
f('aubergine', 'Aubergine', 'veg', { serve: 'Roast wedges until very soft, or blend into a dip.' });
f('mushroom', 'Mushroom', 'veg', { serve: 'Cook and slice thinly or chop finely into sauces.' });
f('corn', 'Sweetcorn', 'veg', { choke: 'Flatten loose kernels or serve on the cob.', serve: 'Serve a whole cob section to gnaw, or flattened kernels.' });
f('asparagus', 'Asparagus', 'veg', { serve: 'Steam whole spears until soft.' });
f('leek', 'Leek', 'veg', { serve: 'Soften slowly in butter and mix into mash or sauces.' });
f('onion', 'Onion', 'veg', { serve: 'Cook gently and use in sauces and casseroles.' });
f('cabbage', 'Cabbage', 'veg', { serve: 'Shred and steam until soft; mix into mash.' });
f('pumpkin', 'Pumpkin', 'starch', { serve: 'Roast wedges or mash.' });
f('swede', 'Swede', 'starch', { serve: 'Boil and mash, or roast batons.' });
f('celery', 'Celery', 'veg', { allergen: 'celery', choke: 'Cook until soft; raw celery is stringy and hard.', serve: 'Cook soft and use in sauces, soups and casseroles.' });

// ---------- Fruit ----------
f('banana', 'Banana', 'fruit', { staple: 3, serve: 'Half a banana with some peel left on as a handle, or mash.' });
f('avocado', 'Avocado', 'fruit', { staple: 3, roles: ['fruit', 'extra'], serve: 'Thick ripe wedges (roll in ground oats for grip) or mashed on toast.' });
f('apple', 'Apple', 'fruit', { staple: 3, choke: 'Never raw chunks. Cook until soft, or grate raw.', serve: 'Steam or bake wedges until soft, or grate raw.', ahead: 'Steam or bake apple wedges.' });
f('pear', 'Pear', 'fruit', { staple: 2, serve: 'Very ripe pear wedges, or steamed if firm.' });
f('mango', 'Mango', 'fruit', { staple: 2, serve: 'Ripe slices, or a large pit to gnaw on with most flesh left on.' });
f('blueberries', 'Blueberries', 'fruit', { choke: 'Squash flat or halve.', serve: 'Squash each berry flat between your fingers.' });
f('strawberries', 'Strawberries', 'fruit', { serve: 'Large whole strawberries or mashed. (Can cause a harmless contact rash round the mouth.)' });
f('raspberries', 'Raspberries', 'fruit', { serve: 'Squash slightly or serve whole; mash into yoghurt.' });
f('grapes', 'Grapes', 'fruit', { choke: 'Always quarter lengthways.', serve: 'Quarter every grape lengthways.' });
f('melon', 'Melon', 'fruit', { serve: 'Thick finger-length slices, rind removed.' });
f('watermelon', 'Watermelon', 'fruit', { serve: 'Thick seedless sticks.' });
f('peach', 'Peach', 'fruit', { serve: 'Ripe wedges, skin on for grip.' });
f('plum', 'Plum', 'fruit', { serve: 'Ripe wedges, stone removed.' });
f('kiwi', 'Kiwi', 'fruit', { serve: 'Peeled wedges.' });
f('orange', 'Orange', 'fruit', { serve: 'Segments with membrane removed, cut into pieces. Vitamin C helps iron absorption.' });
f('papaya', 'Papaya', 'fruit', { serve: 'Ripe wedges.' });
f('cherries', 'Cherries', 'fruit', { choke: 'Stone and quarter.', serve: 'Stone removed, quartered.' });
f('dates', 'Dates', 'fruit', { iron: true, choke: 'Stone and chop finely, or blend.', serve: 'Blend or finely chop into porridge as a sweetener.' });
f('prunes', 'Prunes', 'fruit', { iron: true, choke: 'Chop finely or purée.', serve: 'Purée and swirl into porridge or yoghurt. Helpful for constipation.' });
f('raisins', 'Raisins', 'fruit', { min: 9, iron: true, choke: 'Soak and chop until 12 months.', serve: 'Soak and chop into porridge or baking.' });
f('pineapple', 'Pineapple', 'fruit', { serve: 'Ripe thin spears or finely chopped.' });

// ---------- Protein ----------
f('chicken', 'Chicken', 'protein', { iron: true, staple: 3, serve: 'Thigh meat in finger strips or shredded; moist and tender.', ahead: 'Cook chicken thighs; shred or cut into strips.' });
f('beef', 'Beef', 'protein', { iron: true, staple: 3, serve: 'Slow-cooked strips, or mince in meatballs/bolognese.', ahead: 'Make beef meatballs or bolognese (freezes well).' });
f('lamb', 'Lamb', 'protein', { iron: true, staple: 2, serve: 'Slow-cooked shredded lamb or lamb mince koftas.', ahead: 'Slow-cook lamb or make koftas.' });
f('turkey', 'Turkey', 'protein', { iron: true, serve: 'Turkey mince meatballs or shredded thigh.' });
f('pork', 'Pork', 'protein', { iron: true, serve: 'Slow-cooked shredded pork. Avoid ham, bacon and sausages (too salty).' });
f('liver', 'Liver', 'protein', { iron: true, min: 7, serve: 'A small amount (once a week maximum - very high in vitamin A) blended into bolognese or pate.' });
f('egg', 'Egg', 'protein', { iron: true, allergen: 'egg', staple: 3, serve: 'Well-cooked: omelette strips, hard-boiled quarters, or scrambled. British Lion eggs can be served soft.' });
f('salmon', 'Salmon', 'protein', { allergen: 'fish', staple: 3, serve: 'Flaked, bones removed; or salmon fishcakes. Oily fish up to twice a week.', ahead: 'Bake salmon fillet; flake and check for bones.' });
f('cod', 'Cod', 'protein', { allergen: 'fish', serve: 'Flaked white fish, bones removed.' });
f('mackerel', 'Mackerel', 'protein', { allergen: 'fish', iron: true, serve: 'Flaked, carefully deboned. Oily fish max twice a week.' });
f('sardines', 'Sardines', 'protein', { allergen: 'fish', iron: true, serve: 'Tinned in water or oil (not brine), mashed on toast.' });
f('tuna', 'Tuna', 'protein', { allergen: 'fish', serve: 'Tinned in spring water; max 2 tins a week because of mercury.' });
f('prawns', 'Prawns', 'protein', { allergen: 'shellfish', serve: 'Cooked thoroughly, chopped finely.' });
f('tofu', 'Tofu', 'protein', { allergen: 'soy', iron: true, staple: 1, serve: 'Firm tofu fingers, pan-fried or baked.' });

// ---------- Legumes ----------
f('lentils', 'Red lentils', 'legume', { iron: true, staple: 3, serve: 'Cook into a soft dahl; thick enough to scoop.', ahead: 'Cook a pot of red lentil dahl (freezes well).' });
f('chickpeas', 'Chickpeas', 'legume', { iron: true, staple: 2, choke: 'Flatten each one or blend into hummus.', serve: 'Hummus on toast or flattened chickpeas.' });
f('hummus', 'Hummus', 'legume', { iron: true, allergen: 'sesame', staple: 2, serve: 'Spread thinly on toast fingers or as a dip for veg sticks. Contains tahini (sesame).' });
f('black_beans', 'Black beans', 'legume', { iron: true, choke: 'Flatten or mash.', serve: 'Mashed into a dip or flattened.' });
f('kidney_beans', 'Kidney beans', 'legume', { iron: true, choke: 'Flatten or mash.', serve: 'Flattened, in chilli or stews (tinned, rinsed, no-salt).' });
f('butter_beans', 'Butter beans', 'legume', { iron: true, choke: 'Flatten or mash.', serve: 'Mashed on toast or flattened.' });
f('edamame', 'Edamame', 'legume', { allergen: 'soy', iron: true, choke: 'Blend or flatten.', serve: 'Blended into a dip or flattened.' });

// ---------- Grains ----------
f('oats', 'Oats / porridge', 'grain', { iron: true, staple: 3, serve: 'Porridge made with his usual milk, thick enough to load on a spoon; or baked oat fingers.' });
f('rice', 'Rice', 'grain', { staple: 2, serve: 'Sticky rice balls or rice mixed into sauces. Avoid rice milk/cakes as a staple (arsenic).' });
f('bread', 'Toast (wheat)', 'grain', { allergen: 'wheat', staple: 3, serve: 'Lightly toasted fingers with a spread (low-salt bread).' });
f('pasta', 'Pasta (wheat)', 'grain', { allergen: 'wheat', staple: 3, serve: 'Large shapes like fusilli or penne, well cooked, with sauce.' });
f('couscous', 'Couscous (wheat)', 'grain', { allergen: 'wheat', serve: 'Mix into sauces or press into balls.' });
f('quinoa', 'Quinoa', 'grain', { iron: true, serve: 'Mixed into sauces, patties or porridge.' });
f('weetabix', 'Wheat biscuit cereal', 'grain', { allergen: 'wheat', iron: true, staple: 2, serve: 'Soaked in milk, or as a "spread" mashed with banana.' });
f('pancake', 'Pancakes', 'grain', { allergen: 'wheat', staple: 1, serve: 'Banana-oat or simple pancakes, cut into strips.', roles: ['carb'] });
f('barley', 'Barley', 'grain', { serve: 'Cooked soft in soups and stews.' });
f('polenta', 'Polenta', 'grain', { serve: 'Set and cut into fingers.' });
f('millet', 'Millet', 'grain', { serve: 'Porridge or mixed into sauces.' });

// ---------- Dairy ----------
f('yoghurt', 'Yoghurt', 'dairy', { allergen: 'milk', staple: 3, serve: 'Full-fat plain/Greek yoghurt, unsweetened. Pre-load a spoon for him.' });
f('cheese', 'Cheese', 'dairy', { allergen: 'milk', staple: 2, serve: 'Grated or thin strips of pasteurised full-fat hard cheese (e.g. mild cheddar).' });
f('cottage_cheese', 'Cottage cheese', 'dairy', { allergen: 'milk', serve: 'Spoonfuls, or on toast.' });
f('cows_milk_cooking', 'Cow\'s milk (in cooking)', 'dairy', { allergen: 'milk', serve: 'In porridge, sauces and mash. Not as a main drink until 12 months.' });
f('butter', 'Butter', 'fat', { allergen: 'milk', serve: 'Unsalted, in mash or on toast.' });
f('ricotta', 'Ricotta', 'dairy', { allergen: 'milk', serve: 'Spread on toast or stirred into pasta.' });

// ---------- Fats, nuts, seeds ----------
f('olive_oil', 'Olive oil', 'fat', { serve: 'Drizzle on veg, use in cooking.' });
f('peanut', 'Peanut (smooth butter / powder)', 'nut_seed', { allergen: 'peanut', choke: 'Never whole nuts or thick blobs of nut butter under 5.', serve: 'Start with 1/4 tsp smooth peanut butter or peanut powder stirred into porridge/yoghurt; build up to 1-2 tsp over a few days.' });
f('almond', 'Almond (ground)', 'nut_seed', { allergen: 'almond', choke: 'Ground only, never whole.', serve: 'Stir 1/4 tsp ground almonds into porridge or yoghurt; build up over a few days.' });
f('cashew', 'Cashew (ground / butter)', 'nut_seed', { allergen: 'cashew', choke: 'Ground or smooth butter only.', serve: 'Stir 1/4 tsp ground cashew or smooth cashew butter into porridge or yoghurt.' });
f('hazelnut', 'Hazelnut (ground)', 'nut_seed', { allergen: 'hazelnut', choke: 'Ground only.', serve: 'Stir 1/4 tsp ground hazelnut into porridge or yoghurt.' });
f('walnut', 'Walnut (ground)', 'nut_seed', { allergen: 'walnut', choke: 'Ground only.', serve: 'Stir 1/4 tsp finely ground walnut into porridge or yoghurt.' });
f('pistachio', 'Pistachio (ground)', 'nut_seed', { allergen: 'pistachio', choke: 'Ground only.', serve: 'Stir 1/4 tsp ground pistachio into yoghurt.' });
f('pecan', 'Pecan (ground)', 'nut_seed', { allergen: 'pecan', choke: 'Ground only.', serve: 'Stir 1/4 tsp ground pecan into porridge.' });
f('brazil', 'Brazil nut (ground)', 'nut_seed', { allergen: 'brazil', choke: 'Ground only.', serve: 'A pinch of ground brazil nut in porridge (high in selenium, so small amounts).' });
f('macadamia', 'Macadamia (ground)', 'nut_seed', { allergen: 'macadamia', choke: 'Ground only.', serve: 'Stir 1/4 tsp ground macadamia into yoghurt.' });
f('tahini', 'Tahini (sesame)', 'nut_seed', { allergen: 'sesame', iron: true, serve: 'Start with 1/4 tsp stirred into yoghurt, porridge or hummus.' });
f('chia', 'Chia seeds (ground)', 'nut_seed', { serve: 'Ground, stirred into porridge.' });
f('flax', 'Ground flaxseed', 'nut_seed', { serve: 'Stirred into porridge or yoghurt.' });
f('soy_yoghurt', 'Soya yoghurt', 'dairy', { allergen: 'soy', serve: 'Unsweetened, fortified soya yoghurt.' });

// ---------- Herbs / spices ----------
f('cinnamon', 'Cinnamon', 'herb', { serve: 'A pinch in porridge or with apple.' });
f('cumin', 'Cumin', 'herb', { serve: 'A pinch in dahl, stews or roasted veg.' });
f('garlic', 'Garlic', 'herb', { serve: 'Cooked into sauces.' });
f('mild_curry', 'Mild curry spices', 'herb', { serve: 'Turmeric, coriander, garam masala in small amounts. Avoid chilli heat to start.' });
f('mustard', 'Mustard', 'herb', { allergen: 'mustard', serve: 'A tiny amount in a sauce or dressing.' });
f('herbs', 'Fresh herbs', 'herb', { serve: 'Basil, parsley, coriander, mint chopped into dishes.' });

const FOODS = F;
const FOOD_BY_ID = Object.fromEntries(F.map(x => [x.id, x]));

// Allergen introduction order (UK top allergens). Nuts are introduced one at a time.
const ALLERGENS = [
  { group: 'milk', label: 'Milk', food: 'yoghurt' },
  { group: 'egg', label: 'Egg', food: 'egg' },
  { group: 'wheat', label: 'Wheat / gluten', food: 'bread' },
  { group: 'fish', label: 'Fish', food: 'salmon' },
  { group: 'soy', label: 'Soya', food: 'tofu' },
  { group: 'sesame', label: 'Sesame', food: 'tahini' },
  { group: 'peanut', label: 'Peanut', food: 'peanut', nut: true },
  { group: 'almond', label: 'Almond', food: 'almond', nut: true },
  { group: 'cashew', label: 'Cashew', food: 'cashew', nut: true },
  { group: 'hazelnut', label: 'Hazelnut', food: 'hazelnut', nut: true },
  { group: 'walnut', label: 'Walnut', food: 'walnut', nut: true },
  { group: 'pistachio', label: 'Pistachio', food: 'pistachio', nut: true },
  { group: 'pecan', label: 'Pecan', food: 'pecan', nut: true },
  { group: 'macadamia', label: 'Macadamia', food: 'macadamia', nut: true },
  { group: 'brazil', label: 'Brazil nut', food: 'brazil', nut: true },
  { group: 'shellfish', label: 'Shellfish', food: 'prawns' },
  { group: 'mustard', label: 'Mustard', food: 'mustard' },
  { group: 'celery', label: 'Celery', food: 'celery' },
];

// Recipes: slots b=breakfast l=lunch d=dinner s=snack
const RECIPES = [
  { id: 'porridge_banana', name: 'Porridge with mashed banana', slots: 'b', foods: ['oats', 'banana'], how: 'Cook oats in his usual milk, stir in mashed banana. Pre-load spoons.' },
  { id: 'porridge_berries', name: 'Porridge with squashed blueberries', slots: 'b', foods: ['oats', 'blueberries'], how: 'Cook oats in his usual milk, top with flattened blueberries.' },
  { id: 'porridge_apple', name: 'Apple and cinnamon porridge', slots: 'b', foods: ['oats', 'apple', 'cinnamon'], how: 'Stir grated or stewed apple and a pinch of cinnamon into porridge.' },
  { id: 'porridge_prune', name: 'Porridge with prune swirl', slots: 'b', foods: ['oats', 'prunes'], how: 'Swirl puréed prunes into porridge.' },
  { id: 'oat_fingers', name: 'Banana oat fingers', slots: 'bs', foods: ['oats', 'banana'], how: 'Mash banana with oats, press into a tin, bake 20 min at 180C, slice into fingers.', ahead: 'Bake banana oat fingers (keep 3 days).' },
  { id: 'egg_toast', name: 'Scrambled egg with toast fingers', slots: 'bl', foods: ['egg', 'bread', 'butter'], how: 'Well-cooked scrambled egg, toast fingers with unsalted butter.' },
  { id: 'omelette_spinach', name: 'Spinach and tomato omelette strips', slots: 'bl', foods: ['egg', 'spinach', 'tomato'], how: 'Whisk egg with chopped wilted spinach, cook through, slice into strips; quartered cherry tomatoes on the side.' },
  { id: 'omelette_sweetpotato', name: 'Sweet potato and spinach frittata fingers', slots: 'bld', foods: ['egg', 'sweet_potato', 'spinach'], how: 'Bake egg with mashed sweet potato and spinach; cut into fingers.', ahead: 'Bake a frittata tonight; slice into fingers.' },
  { id: 'avo_toast', name: 'Avocado toast fingers', slots: 'bls', foods: ['bread', 'avocado'], how: 'Mash avocado thickly onto toast fingers.' },
  { id: 'yoghurt_fruit', name: 'Yoghurt with mashed fruit', slots: 'bs', foods: ['yoghurt', 'banana'], how: 'Full-fat plain yoghurt with mashed banana stirred through.' },
  { id: 'yoghurt_mango', name: 'Yoghurt with mango', slots: 'bs', foods: ['yoghurt', 'mango'], how: 'Yoghurt on a pre-loaded spoon, ripe mango slices on the side.' },
  { id: 'yoghurt_pear', name: 'Yoghurt with ripe pear', slots: 'bs', foods: ['yoghurt', 'pear'], how: 'Yoghurt with very ripe pear wedges.' },
  { id: 'weetabix_banana', name: 'Wheat biscuits with milk and banana', slots: 'b', foods: ['weetabix', 'cows_milk_cooking', 'banana'], how: 'Soak in milk until soft, banana on the side.' },
  { id: 'pancakes_banana', name: 'Banana pancakes', slots: 'b', foods: ['pancake', 'egg', 'banana'], how: 'Mash banana with egg (and flour if needed); cook small pancakes, cut into strips.' },
  { id: 'chicken_sp_beans', name: 'Chicken strips, sweet potato wedges and green beans', slots: 'ld', foods: ['chicken', 'sweet_potato', 'green_beans'], how: 'Tender chicken thigh strips with roasted sweet potato wedges and soft green beans.', ahead: 'Cook chicken thighs and roast sweet potato.' },
  { id: 'chicken_tomato_sauce', name: 'Chicken in tomato and spinach sauce', slots: 'ld', foods: ['chicken', 'tomato', 'spinach'], how: 'Shredded chicken in a no-salt tomato sauce with wilted spinach.', ahead: 'Make the tomato and chicken sauce (freezes well).' },
  { id: 'chicken_curry', name: 'Mild chicken and sweet potato curry with rice', slots: 'ld', foods: ['chicken', 'sweet_potato', 'rice', 'mild_curry'], how: 'Mild curry with no salt or chilli; sticky rice balls.', ahead: 'Cook the curry (freezes well).' },
  { id: 'chicken_broccoli_pasta', name: 'Chicken and broccoli pasta', slots: 'ld', foods: ['chicken', 'broccoli', 'pasta', 'cheese'], how: 'Big pasta shapes with chopped chicken, broccoli and a little grated cheese.' },
  { id: 'dahl_rice', name: 'Red lentil dahl with rice', slots: 'ld', foods: ['lentils', 'rice', 'spinach'], how: 'Thick dahl with spinach stirred in; rice balls on the side.', ahead: 'Cook dahl (freezes well).' },
  { id: 'dahl_sp', name: 'Lentil and sweet potato mash', slots: 'ld', foods: ['lentils', 'sweet_potato'], how: 'Mix cooked red lentils into mashed sweet potato.' },
  { id: 'bolognese', name: 'Beef bolognese with pasta', slots: 'ld', foods: ['beef', 'tomato', 'carrot', 'pasta'], how: 'No-salt bolognese with grated carrot; large pasta shapes.', ahead: 'Make bolognese (freezes well).' },
  { id: 'meatballs', name: 'Beef meatballs with tomato sauce and courgette', slots: 'ld', foods: ['beef', 'tomato', 'courgette'], how: 'Soft meatballs (about finger size) in tomato sauce, courgette batons.', ahead: 'Make and freeze meatballs.' },
  { id: 'lamb_kofta', name: 'Lamb koftas with cucumber yoghurt dip', slots: 'ld', foods: ['lamb', 'yoghurt', 'cucumber'], how: 'Lamb mince koftas (finger shaped), yoghurt and grated cucumber dip, cucumber sticks.', ahead: 'Shape lamb koftas.' },
  { id: 'salmon_potato', name: 'Flaked salmon, potato wedges and peas', slots: 'ld', foods: ['salmon', 'potato', 'peas'], how: 'Flaked boneless salmon, soft potato wedges, flattened peas.', ahead: 'Bake salmon and potato wedges.' },
  { id: 'salmon_fishcakes', name: 'Salmon and sweet potato fishcakes', slots: 'ld', foods: ['salmon', 'sweet_potato'], how: 'Mash flaked salmon with sweet potato, shape into patties, bake.', ahead: 'Make fishcakes (freeze well).' },
  { id: 'cod_broccoli', name: 'Cod with mash and broccoli', slots: 'ld', foods: ['cod', 'potato', 'broccoli'], how: 'Flaked cod, buttery mash, broccoli trees.' },
  { id: 'tofu_veg', name: 'Tofu fingers with roasted veg', slots: 'ld', foods: ['tofu', 'courgette', 'pepper'], how: 'Baked firm tofu fingers with soft roasted courgette and pepper.' },
  { id: 'hummus_veg', name: 'Hummus toast with cucumber sticks', slots: 'ls', foods: ['hummus', 'bread', 'cucumber'], how: 'Thin hummus on toast fingers, cucumber sticks.' },
  { id: 'egg_veg_muffins', name: 'Egg and veg muffins', slots: 'bls', foods: ['egg', 'spinach', 'tomato', 'cheese'], how: 'Bake whisked egg with chopped veg and cheese in a muffin tin.', ahead: 'Bake egg muffins (keep 2 days).' },
  { id: 'sp_beans_egg', name: 'Sweet potato wedges, hard-boiled egg and green beans', slots: 'l', foods: ['sweet_potato', 'egg', 'green_beans'], how: 'Egg in quarters, sweet potato wedges, soft green beans.' },
  { id: 'chicken_cucumber_yog', name: 'Chicken strips with yoghurt dip and cucumber', slots: 'l', foods: ['chicken', 'yoghurt', 'cucumber'], how: 'Chicken strips to dip in yoghurt, cucumber sticks.' },
  { id: 'veg_mac', name: 'Cauliflower and broccoli cheese', slots: 'ld', foods: ['cauliflower', 'broccoli', 'cheese', 'cows_milk_cooking'], how: 'Soft florets in a simple cheese sauce.' },
  { id: 'risotto', name: 'Squash and pea risotto', slots: 'ld', foods: ['rice', 'butternut_squash', 'peas'], how: 'Soft no-salt risotto with mashed squash and flattened peas.' },
  { id: 'beef_stew', name: 'Slow-cooked beef stew with mash', slots: 'd', foods: ['beef', 'carrot', 'potato'], how: 'Tender beef pieces, soft carrot, mash.', ahead: 'Slow-cook beef stew.' },
  { id: 'turkey_meatballs', name: 'Turkey meatballs with squash', slots: 'ld', foods: ['turkey', 'butternut_squash'], how: 'Soft turkey meatballs with roasted squash wedges.' },
  { id: 'sardine_toast', name: 'Mashed sardines on toast', slots: 'l', foods: ['sardines', 'bread', 'tomato'], how: 'Mash sardines with a little tomato onto toast fingers.' },
  { id: 'peanut_porridge', name: 'Porridge with peanut stirred in', slots: 'b', foods: ['oats', 'peanut', 'banana'], how: 'Stir smooth peanut butter/powder into porridge with banana.' },
  { id: 'fruit_plate', name: 'Fruit plate', slots: 's', foods: ['banana', 'pear'], how: 'Soft fruit fingers.' },
  { id: 'cucumber_yog', name: 'Cucumber sticks with yoghurt dip', slots: 's', foods: ['cucumber', 'yoghurt'], how: 'Cold cucumber sticks with a yoghurt dip (great for teething).' },
];

const TIPS = [
  'Offer water in an open or free-flow cup with meals. Little sips are all he needs.',
  'Babies may need 10 to 15 tries of a food before accepting it. Keep re-offering dislikes without pressure.',
  'Try to include an iron-rich food at every meal from 6 months (meat, fish, egg, lentils, beans, fortified cereals).',
  'Pair iron-rich foods with vitamin C (tomato, pepper, broccoli, orange) to help absorption.',
  'No added salt, sugar or honey before 12 months. Watch stock cubes, gravy and processed foods.',
  'Milk is still his main nutrition. Around 7 to 9 months most babies still have breast milk or 500-600ml formula a day.',
  'From about 7 months, move from smooth to mashed, lumpy and finger foods. Exposure to lumps by 9 months helps avoid fussiness later.',
  'Gagging is normal and protective; choking is silent. Stay with him, keep him upright, and consider a baby first-aid course.',
  'Eat together when you can. Babies learn by copying you.',
  'Let him lead: offer, don\'t force. It\'s his job to decide how much, your job to decide what and when.',
  'Once an allergen is introduced and tolerated, keep it in his diet regularly (around twice a week) to help maintain tolerance.',
  'With eczema, look for patterns: a flare 6 to 48 hours after a new food is worth noting and mentioning to the GP.',
  'Vitamin drops containing vitamin D (and A and C) are recommended for babies from 6 months unless having over 500ml formula a day.',
  'Batch cook and freeze in ice-cube trays or small pots. Label with the date; most keep about 3 months.',
  'Cut round foods (grapes, cherry tomatoes, blueberries) lengthways into quarters, and never serve whole nuts.',
  'Avoid rice milk, raw or lightly cooked shellfish, shark/swordfish/marlin, and unpasteurised cheese for babies.',
];

module.exports = { FOODS, FOOD_BY_ID, ALLERGENS, RECIPES, TIPS };
