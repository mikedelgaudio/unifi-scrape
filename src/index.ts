import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const TARGET_URL = process.env.TARGET_URL || "";
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || "";
const BASE_INTERVAL = Number(process.env.CHECK_INTERVAL) || 60;

if (!TARGET_URL || !DISCORD_WEBHOOK) {
  console.error("❌ Missing TARGET_URL or DISCORD_WEBHOOK in .env file");
  process.exit(1);
}

let currentInterval = BASE_INTERVAL;
let isProductInStock = false;

const notifyDiscord = async () => {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `@everyone 🚀 Product is in stock! [Buy Now](${TARGET_URL})`,
      }),
    });
    console.log("✅ Notification sent!");
  } catch (error) {
    console.error("❌ Error sending Discord notification:", error);
  }
};

const checkStock = async () => {
  try {
    console.log(`🔍 Checking stock (Interval: ${currentInterval}s)...`);

    const response = await fetch(TARGET_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    const addToCartButton = $('button[label="Add to Cart"]');

    if (addToCartButton.length > 0) {
      if (!isProductInStock) {
        console.log("🚀 Product is in stock for the first time!");
        await notifyDiscord();
      } else {
        console.log("✅ Product is still in stock.");
      }

      // Set in-stock flag
      isProductInStock = true;

      // Exponential backoff: Double the interval, up to a max of 1 hour
      currentInterval = Math.min(currentInterval * 2, 3600);
    } else {
      if (isProductInStock) {
        console.log("❌ Product is out of stock. Resetting backoff.");
      } else {
        console.log("❌ Still out of stock.");
      }

      // Reset if it goes out of stock
      isProductInStock = false;
      currentInterval = BASE_INTERVAL;
    }
  } catch (error) {
    console.error("❌ Error scraping:", error);
  }

  setTimeout(checkStock, currentInterval * 1000);
};

checkStock();
