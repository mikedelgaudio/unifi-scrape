import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const TARGET_URL = process.env.TARGET_URL || "";
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || "";
const MIN_INTERVAL_IN_SECONDS = parseInt(
  process.env.MIN_INTERVAL_IN_SECONDS || "60",
  10
); // Minimum interval (seconds)
const MAX_INTERVAL_IN_SECONDS = parseInt(
  process.env.MAX_INTERVAL_IN_SECONDS || "300",
  10
); // Maximum interval (seconds)

if (!TARGET_URL || !DISCORD_WEBHOOK) {
  console.error("❌ Missing TARGET_URL or DISCORD_WEBHOOK in .env file");
  process.exit(1);
}

let currentInterval = MIN_INTERVAL_IN_SECONDS;
let isProductInStock = false;

// Function to generate a random number between `min` and `max`
function getRandomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function notifyDiscord(message: string) {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message,
      }),
    });
    console.log("✅ Notification sent!");
  } catch (error) {
    console.error("❌ Error sending Discord notification:", error);
    process.exit(1);
  }
}

async function checkStock() {
  try {
    console.log(`🔍 Checking stock (Interval: ${currentInterval}s)...`);

    const response = await fetch(TARGET_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    const addToCartButton = $('button[label="Add to Cart"]');

    if (addToCartButton.length > 0) {
      if (!isProductInStock) {
        console.log("🚀 Product is in stock for the first time!");
        await notifyDiscord(
          `@everyone 🚀 Product is in stock! [Buy Now](${TARGET_URL})`
        );
      } else {
        console.log("✅ Product is still in stock.");
        await notifyDiscord(
          `✅ Product is still in stock. [Buy Now](${TARGET_URL})`
        );
      }

      // Set in-stock flag
      isProductInStock = true;

      // Exponential backoff: Double the interval, up to a max of 1 hour
      currentInterval = Math.min(currentInterval * 2, 3600);
    } else {
      if (isProductInStock) {
        console.log("❌ Product is out of stock. Resetting backoff.");
        await notifyDiscord("❌ Product went out of stock.");

        // Reset if it goes out of stock
        isProductInStock = false;
        currentInterval = MIN_INTERVAL_IN_SECONDS;
      } else {
        const timestamp = new Date().toLocaleTimeString();
        const interval = getRandomInterval(
          MIN_INTERVAL_IN_SECONDS,
          MAX_INTERVAL_IN_SECONDS
        );
        console.log(
          `[${timestamp}] - ❌ Still out of stock. Next check in ${interval}s`
        );
        currentInterval = interval;
      }
    }
  } catch (error) {
    console.error("❌ Error scraping:", error);
    await notifyDiscord(
      "@everyone ❌ Error scraping website. Process exiting."
    );
    process.exit(1);
  }

  setTimeout(checkStock, currentInterval * 1000);
}

checkStock();
