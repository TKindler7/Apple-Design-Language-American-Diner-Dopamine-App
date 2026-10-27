// All prices are fictional amounts in integer cents.
export const CATEGORIES = Object.freeze([
  { id: "burgers", label: "Burgers & Sandwiches" },
  { id: "breakfast", label: "All-Day Breakfast" },
  { id: "sides", label: "Sides & Appetizers" },
  { id: "drinks", label: "Milkshakes & Drinks" },
  { id: "desserts", label: "Desserts" },
]);

const choice = (id, label, price = 0, selected = false, ingredient) => ({
  id, label, price, default: selected, ...(ingredient ? { ingredient } : {}),
});
const single = (id, label, choices) => ({ id, label, type: "single", choices });
const multiple = (id, label, choices) => ({ id, label, type: "multiple", choices });
const cheese = (preferred = "cheddar") => single("cheese", "Cheese", [
  choice("cheddar", "Cheddar", 0, preferred === "cheddar", "cheese"),
  choice("swiss", "Swiss", 0, preferred === "swiss", "swiss"),
  choice("none", "No cheese", 0, preferred === "none"),
]);
const sauce = () => single("sauce", "Sauce", [
  choice("house", "House sauce", 0, true, "sauce"),
  choice("smoky", "Smoky sauce", 0, false, "sauce"),
  choice("none", "No sauce"),
]);
const burgerToppings = (defaults = ["lettuce", "tomato", "pickle"], baconIncluded = false) => multiple("toppings", "Toppings", [
  choice("lettuce", "Lettuce", 0, defaults.includes("lettuce"), "lettuce"),
  choice("tomato", "Tomato", 0, defaults.includes("tomato"), "tomato"),
  choice("pickle", "Pickles", 0, defaults.includes("pickle"), "pickle"),
  choice("onion", "Onion", 0, defaults.includes("onion"), "onion"),
  choice("bacon", "Bacon", baconIncluded ? 0 : 200, defaults.includes("bacon"), "bacon"),
  choice("extra-patty", "Extra patty", 400, false, "extra-patty"),
]);
const burgerOptions = (defaults, baconIncluded) => [cheese(), burgerToppings(defaults, baconIncluded), sauce()];
const size = (upcharge = 200) => single("size", "Size", [
  choice("regular", "Regular", 0, true), choice("large", "Large", upcharge),
]);
const pancakeOptions = (blueberries = false) => [
  single("stack", "Stack", [choice("short", "Three pancakes", 0, true), choice("tall", "Five pancakes", 300)]),
  multiple("toppings", "Toppings", [
    choice("butter", "Butter", 0, true, "butter"),
    choice("syrup", "Maple syrup", 0, true, "syrup"),
    choice("blueberry", "Blueberries", blueberries ? 0 : 150, blueberries, "blueberry"),
    choice("chocolate", "Chocolate chips", 100, false, "chocolate"),
    choice("whipped-cream", "Whipped cream", 100, false, "whipped-cream"),
  ]),
];
const shakeOptions = () => [size(), multiple("toppings", "Finish", [
  choice("whipped-cream", "Whipped cream", 0, true, "whipped-cream"),
  choice("cherry", "Cherry", 0, true, "cherry"),
  choice("chocolate", "Chocolate drizzle", 100, false, "chocolate"),
])];
const dessertOptions = (iceCreamIncluded = false) => [multiple("toppings", "Finish", [
  choice("vanilla", "Vanilla ice cream", iceCreamIncluded ? 0 : 200, iceCreamIncluded, "vanilla"),
  choice("whipped-cream", "Whipped cream", 100, false, "whipped-cream"),
  choice("chocolate", "Chocolate drizzle", 100, false, "chocolate"),
])];
const item = (id, name, description, category, price, model, options = []) => ({
  id, name, description, category, price, model, options,
  image: `./assets/food/${id}.webp`,
});

export const ITEMS = Object.freeze([
  item("midnight-stack", "The Midnight Stack", "A juicy griddled patty, melted cheddar, crisp lettuce, tomato, and our house sauce.", "burgers", 1400, "burger", burgerOptions()),
  item("classic-chrome", "Classic Chrome Cheeseburger", "The counter classic: a golden bun, cheddar, tangy pickles, and onion.", "burgers", 1200, "burger", burgerOptions(["pickle", "onion"])),
  item("route-66-melt", "Route 66 Patty Melt", "Griddled rye, Swiss, a beef patty, and sweet caramelized onions.", "burgers", 1450, "sandwich", [cheese("swiss"), multiple("toppings", "Toppings", [
    choice("onion", "Caramelized onions", 0, true, "onion"), choice("mushroom", "Mushrooms", 100, false, "mushroom"), choice("bacon", "Bacon", 200, false, "bacon"),
  ]), single("bread", "Bread", [choice("rye", "Rye", 0, true), choice("sourdough", "Sourdough")])]),
  item("maple-bacon", "Maple Bacon Burger", "Smoky bacon, a glossy maple finish, melted cheddar, and a toasted bun.", "burgers", 1600, "burger", burgerOptions(["bacon"], true)),
  item("crispy-chicken-club", "Crispy Chicken Club", "Crunchy chicken, bacon, lettuce, and tomato between slices of golden toast.", "burgers", 1500, "sandwich", [multiple("toppings", "Toppings", [
    choice("lettuce", "Lettuce", 0, true, "lettuce"), choice("tomato", "Tomato", 0, true, "tomato"), choice("bacon", "Bacon", 0, true, "bacon"), choice("avocado", "Avocado", 200, false, "avocado"),
  ]), sauce()]),
  item("garden-state-melt", "Garden State Melt", "Roasted peppers, zucchini, mushrooms, and Swiss on crisp sourdough.", "burgers", 1350, "sandwich", [cheese("swiss"), multiple("toppings", "Vegetables", [
    choice("pepper", "Roasted peppers", 0, true, "pepper"), choice("zucchini", "Zucchini", 0, true, "zucchini"), choice("mushroom", "Mushrooms", 0, true, "mushroom"), choice("onion", "Caramelized onions", 100, false, "onion"),
  ])]),

  item("sunrise-flapjacks", "Sunrise Flapjacks", "Fluffy golden pancakes, a pat of butter, and a generous pour of maple syrup.", "breakfast", 1100, "pancakes", pancakeOptions()),
  item("blueberry-griddle", "Blueberry Griddle Cakes", "Golden pancakes filled with blueberries and finished with warm maple syrup.", "breakfast", 1250, "pancakes", pancakeOptions(true)),
  item("all-day-breakfast", "All-Day Breakfast Plate", "Eggs your way, crisp bacon, golden breakfast potatoes, and buttered toast.", "breakfast", 1450, "breakfast", [
    single("eggs", "Eggs", [choice("sunny", "Sunny-side up", 0, true, "egg"), choice("scrambled", "Scrambled", 0, false, "egg")]),
    single("protein", "On the side", [choice("bacon", "Bacon", 0, true, "bacon"), choice("sausage", "Sausage", 0, false, "sausage"), choice("veggie", "Roasted mushrooms", 0, false, "mushroom")]),
    multiple("toppings", "Complete the plate", [choice("toast", "Buttered toast", 0, true, "toast"), choice("potato", "Breakfast potatoes", 0, true, "potato"), choice("avocado", "Avocado", 200, false, "avocado")]),
  ]),
  item("cinnamon-french-toast", "Cinnamon French Toast", "Thick golden toast with cinnamon, syrup, and a dusting of powdered sugar.", "breakfast", 1200, "toast", [
    single("portion", "Portion", [choice("two", "Two slices", 0, true), choice("three", "Three slices", 250)]),
    multiple("toppings", "Toppings", [choice("cinnamon", "Cinnamon", 0, true, "cinnamon"), choice("syrup", "Maple syrup", 0, true, "syrup"), choice("blueberry", "Fresh berries", 150, false, "blueberry"), choice("whipped-cream", "Whipped cream", 100, false, "whipped-cream")]),
  ]),

  item("golden-fries", "Golden Fries", "Hot, crisp shoestring fries with a little sea salt and a lot of crunch.", "sides", 500, "fries", [size(200), multiple("toppings", "Extras", [choice("cheese", "Melted cheddar", 100, false, "cheese"), choice("chili", "Diner chili", 200, false, "chili")])]),
  item("chili-cheese-fries", "Chili Cheese Fries", "Golden fries under slow-simmered diner chili and melted cheddar.", "sides", 750, "fries", [size(200), multiple("toppings", "Toppings", [choice("chili", "Diner chili", 0, true, "chili"), choice("cheese", "Cheddar", 0, true, "cheese"), choice("onion", "Onions", 0, false, "onion")])]),
  item("pickle-spears", "Pickle Spears", "Crunchy, golden fried pickles with a cool ranch dip.", "sides", 650, "pickles", [size(200), single("dip", "Dip", [choice("ranch", "Ranch", 0, true), choice("house", "House sauce"), choice("none", "No dip")])]),
  item("mac-cheese", "Mac & Cheese", "Creamy cheddar macaroni with a crisp, toasted breadcrumb finish.", "sides", 700, "mac", [size(200), multiple("toppings", "Finish", [choice("crumbs", "Toasted breadcrumbs", 0, true, "crumbs"), choice("bacon", "Bacon", 200, false, "bacon")])]),

  item("cherry-cloud-shake", "Cherry Cloud Shake", "A cherry-pink shake with whipped cream and one bright cherry on top.", "drinks", 800, "shake", shakeOptions()),
  item("vanilla-malt", "Vanilla Malt", "Creamy vanilla with the old-fashioned malt-shop finish.", "drinks", 750, "shake", shakeOptions()),
  item("chocolate-shake", "Chocolate Shake", "A thick chocolate shake made for the slowest, happiest sip.", "drinks", 800, "shake", shakeOptions()),
  item("strawberry-soda", "Strawberry Soda", "Bright strawberry fizz, ice, and a little sparkle.", "drinks", 500, "soda", [size(150), single("ice", "Ice", [choice("regular", "Regular ice", 0, true, "ice"), choice("light", "Light ice", 0, false, "ice"), choice("none", "No ice")])]),
  item("cold-brew-float", "Cold Brew Float", "Smooth cold brew with a scoop of vanilla ice cream slowly melting in.", "drinks", 750, "float", [size(200), single("scoop", "Ice cream", [choice("vanilla", "Vanilla", 0, true, "vanilla"), choice("chocolate", "Chocolate", 0, false, "chocolate")]), multiple("toppings", "Finish", [choice("whipped-cream", "Whipped cream", 100, false, "whipped-cream")])]),

  item("apple-pie", "Apple Pie à la Mode", "A flaky slice of cinnamon apple pie with a scoop of vanilla ice cream.", "desserts", 850, "pie", dessertOptions(true)),
  item("hot-fudge-sundae", "Hot Fudge Sundae", "Vanilla ice cream, warm chocolate fudge, whipped cream, and a cherry.", "desserts", 800, "sundae", [multiple("toppings", "Finish", [choice("chocolate", "Hot fudge", 0, true, "chocolate"), choice("whipped-cream", "Whipped cream", 0, true, "whipped-cream"), choice("cherry", "Cherry", 0, true, "cherry"), choice("nuts", "Chopped nuts", 100, false, "nuts")])]),
  item("cherry-cheesecake", "Cherry Cheesecake", "A creamy cheesecake slice under a glossy spoonful of cherries.", "desserts", 900, "cheesecake", [multiple("toppings", "Finish", [choice("cherry", "Cherry topping", 0, true, "cherry"), choice("whipped-cream", "Whipped cream", 100, false, "whipped-cream")])]),
  item("brownie-skillet", "Brownie Skillet", "A warm chocolate brownie, vanilla ice cream, and a drizzle of chocolate.", "desserts", 1000, "brownie", [multiple("toppings", "Finish", [choice("vanilla", "Vanilla ice cream", 0, true, "vanilla"), choice("chocolate", "Chocolate drizzle", 0, true, "chocolate"), choice("whipped-cream", "Whipped cream", 100, false, "whipped-cream")])]),
].map((entry) => Object.freeze(entry)));

export const ITEM_BY_ID = Object.freeze(Object.fromEntries(ITEMS.map((entry) => [entry.id, entry])));

function getItem(itemId) {
  return typeof itemId === "string" && Object.hasOwn(ITEM_BY_ID, itemId) ? ITEM_BY_ID[itemId] : null;
}

export function defaultOptions(itemId) {
  const entry = getItem(itemId);
  if (!entry) return {};
  return Object.fromEntries(entry.options.map((group) => [group.id,
    group.type === "multiple"
      ? group.choices.filter((option) => option.default).map((option) => option.id)
      : (group.choices.find((option) => option.default) ?? group.choices[0]).id,
  ]));
}

export function normalizeOptions(itemId, value) {
  const entry = getItem(itemId);
  if (!entry) return {};
  const defaults = defaultOptions(itemId);
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(entry.options.map((group) => {
    const selected = Object.hasOwn(input, group.id) ? input[group.id] : defaults[group.id];
    if (group.type === "multiple") {
      return [group.id, Array.isArray(selected)
        ? group.choices.filter((option) => selected.includes(option.id)).map((option) => option.id)
        : defaults[group.id]];
    }
    return [group.id, group.choices.some((option) => option.id === selected) ? selected : defaults[group.id]];
  }));
}

export function itemPrice(itemId, value) {
  const entry = getItem(itemId);
  if (!entry) return 0;
  const options = normalizeOptions(itemId, value);
  return entry.price + entry.options.reduce((total, group) => {
    const selected = Array.isArray(options[group.id]) ? options[group.id] : [options[group.id]];
    return total + group.choices.filter((option) => selected.includes(option.id)).reduce((sum, option) => sum + option.price, 0);
  }, 0);
}

export function optionSummary(itemId, value) {
  const entry = getItem(itemId);
  if (!entry) return [];
  const options = normalizeOptions(itemId, value);
  return entry.options.map((group) => {
    const selected = Array.isArray(options[group.id]) ? options[group.id] : [options[group.id]];
    const labels = group.choices.filter((option) => selected.includes(option.id)).map((option) => option.label);
    return `${group.label}: ${labels.length ? labels.join(", ") : "None"}`;
  });
}
