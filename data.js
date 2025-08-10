/* ---------------- Base Data ---------------- */

/* Local AL produce & pantry price estimates (USD) */
const priceTable = {
  // Fruit
  orange: { unit: "each", price: 0.89 },
  lemon: { unit: "each", price: 0.79 },
  lime: { unit: "each", price: 0.45 },
  peach: { unit: "each", price: 1.10 },
  melon: { unit: "each", price: 3.50 },
  grapes: { unit: "lb", price: 2.49 },
  apple: { unit: "each", price: 0.95 },
  pineapple: { unit: "lb", price: 2.99 },

  // Veg & greens
  cucumber: { unit: "each", price: 0.79 },
  celery: { unit: "bunch", price: 1.99 },
  spinach: { unit: "lb", price: 3.50 },
  romaine: { unit: "head", price: 1.99 },
  carrot: { unit: "lb", price: 0.99 },
  zucchini: { unit: "each", price: 0.89 },
  broccoli: { unit: "head", price: 2.49 },
  tomato: { unit: "each", price: 1.00 },
  onion: { unit: "each", price: 0.89 },

  // Herbs
  mint: { unit: "bunch", price: 1.50 },
  parsley: { unit: "bunch", price: 1.75 },
  ginger: { unit: "lb", price: 3.99 },

  // Pantry
  chia: { unit: "lb", price: 5.99 },
  almondMilk: { unit: "qt", price: 3.50 },
  lentils: { unit: "lb", price: 1.99 },
  quinoa: { unit: "lb", price: 4.99 },
  oliveOil: { unit: "cup", price: 2.00 },
  cinnamon: { unit: "oz", price: 1.20 },
  yogurt: { unit: "cup", price: 1.50 },
  oats: { unit: "lb", price: 1.89 },
  hummus: { unit: "oz", price: 0.40 },
  pepper: { unit: "oz", price: 0.50 },

  // Protein
  salmon: { unit: "lb", price: 11.99 },
  chicken: { unit: "lb", price: 5.49 }
};

/* Unit conversions for display & toggling */
const unitConvert = {
  lb_to_g: 453.6,
  g_to_lb: 1/453.6,
  cup_to_ml: 240,
  ml_to_cup: 1/240,
  each_to_each: 1, // no conversion
};

/* ---------------- Meal Plan ---------------- */

const mealPlan = {
  phases: [
    {
      name: "FAST",
      days: [
        { day: 1, goals: ["Hydrate", "Electrolytes", "Rest"], note: "" },
        { day: 2, goals: ["Hydrate", "Electrolytes", "Light walk"], note: "" },
        { day: 3, goals: ["Hydrate", "Electrolytes", "Stretch"], note: "" }
      ]
    },
    {
      name: "CLEANSE",
      days: [
        { day: 4, juices: ["Melon Mint Morning","Peachy Green Glow","Carrot Apple Ginger","Grape Romaine Cooler"], note: "" },
        { day: 5, juices: ["Melon Mint Morning","Peachy Green Glow","Carrot Apple Ginger","Grape Romaine Cooler"], note: "" },
        { day: 6, juices: ["Melon Mint Morning","Peachy Green Glow","Carrot Apple Ginger","Grape Romaine Cooler"], note: "" },
        { day: 7, juices: ["Melon Mint Morning","Peachy Green Glow","Carrot Apple Ginger","Grape Romaine Cooler"], note: "" }
      ]
    },
    {
      name: "REBUILD",
      days: [
        { day: 8, meals: ["Smoothie Breakfast","Steamed Veg Lunch","Lentil Soup Dinner"], note: "" },
        { day: 9, meals: ["Smoothie Breakfast","Steamed Veg Lunch","Lentil Soup Dinner"], note: "" },
        { day: 10, meals: ["Overnight Oats","Quinoa Salad","Salmon/Broccoli"], note: "" },
        { day: 11, meals: ["Overnight Oats","Quinoa Salad","Salmon/Broccoli"], note: "" }
      ]
    }
  ],

  recipes: {
    juices: {
      "Melon Mint Morning": { melon: 1, mint: "0.5 bunch", lime: 1 },
      "Peachy Green Glow": { peach: 6, cucumber: 4, spinach: "8 cups", lemon: 2 },
      "Carrot Apple Ginger": { carrot: "14 medium", apple: 2, lemon: 1, ginger: "1 inch" },
      "Grape Romaine Cooler": { grapes: "3 cups", romaine: "3 cups", cucumber: 2, lemon: 1 }
    },
    rebuild: {
      "Smoothie Breakfast": { spinach: "2 cups", almondMilk: "1 cup", chia: "1 tbsp" },
      "Steamed Veg Lunch": { zucchini: 1, carrot: 2, cucumber: 1, spinach: "1 cup", oliveOil: "1 tbsp", lemon: 0.5 },
      "Lentil Soup Dinner": { lentils: "0.25 lb", carrot: 2, celery: "0.25 bunch", parsley: "0.25 bunch", onion: 0.25 },
      "Overnight Oats": { oats: "0.25 lb", almondMilk: "1 cup", cinnamon: "0.5 tsp", yogurt: "0.5 cup" },
      "Quinoa Salad": { quinoa: "0.25 lb", cucumber: 1, tomato: 0.5, parsley: "0.25 bunch", oliveOil: "1 tbsp", lemon: 0.5 },
      "Salmon/Broccoli": { salmon: "0.375 lb", broccoli: 0.5 }
    }
  }
};

/* ---------------- Grocery List Generator ---------------- */
function generateGroceryList(plan, prices) {
  const totals = {};

  plan.phases.forEach(phase=>{
    phase.days.forEach(day=>{
      let mealKeys = [];

      if(day.juices) mealKeys = mealKeys.concat(day.juices);
      if(day.meals) mealKeys = mealKeys.concat(day.meals);

      mealKeys.forEach(meal=>{
        const recipe = plan.recipes.juices[meal] || plan.recipes.rebuild[meal];
        if(!recipe) return;

        for(const [item,qty] of Object.entries(recipe)){
          if(!totals[item]) totals[item] = 0;
          // crude number parse
          const num = parseFloat(String(qty));
          totals[item] += isNaN(num) ? 1 : num;
        }
      });
    });
  });

  // Map to price info
  return Object.entries(totals).map(([name, qty])=>{
    const priceInfo = prices[name] || {};
    const estCost = priceInfo.price ? (priceInfo.price * qty).toFixed(2) : null;
    return { name, qty, unit: priceInfo.unit || "each", estCost };
  });
}
