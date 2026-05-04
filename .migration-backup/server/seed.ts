import { storage } from "./storage";
import { authStorage } from "./replit_integrations/auth/storage";

async function seed() {
  const events = await storage.getEvents();
  if (events.length === 0) {
    console.log("Seeding events...");
    
    // Create a dummy user
    let user = await authStorage.getUser("seed-user");
    if (!user) {
      user = await authStorage.upsertUser({
        id: "seed-user",
        email: "vendor@example.com",
        firstName: "Demo",
        lastName: "Vendor",
      });
    }

    const e1 = await storage.createEvent({
      title: "Spring Artisan Market",
      description: "A wonderful outdoor market featuring local artisans, food trucks, and live music. Come support local businesses!",
      location: "Downtown City Park",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      createdBy: user.id,
    });

    const e2 = await storage.createEvent({
      title: "Summer Craft Fair",
      description: "Indoor craft fair with over 50 vendors selling handmade goods, jewelry, and art.",
      location: "Community Center",
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
      createdBy: user.id,
    });

    await storage.createVendorPost({
      eventId: e1.id,
      vendorId: user.id,
      itemsDescription: "I'll be bringing my handmade soy candles and new summer scent diffusers! Can't wait to see everyone.",
    });

    await storage.createMessage({
      senderId: user.id,
      content: "Hello everyone! Is anyone else bringing a pop-up tent to the Spring Artisan Market? Wondering what size is best.",
    });

    console.log("Seeding complete.");
  } else {
    console.log("Database already has data.");
  }
}

seed().catch(console.error).finally(() => process.exit(0));
