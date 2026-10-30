import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Stripe (cards, Apple Pay, Google Pay, Affirm, Klarna via the Payment
// Element) is enabled when STRIPE_API_KEY is set. Without it the store runs on
// Medusa's system payment provider, which authorizes every payment (dev only).
const paymentProviders = process.env.STRIPE_API_KEY
  ? [
      {
        resolve: "@medusajs/medusa/payment-stripe",
        id: "stripe",
        options: {
          apiKey: process.env.STRIPE_API_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          automaticPaymentMethods: true,
          capture: false,
        },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          { resolve: "@medusajs/medusa/fulfillment-manual", id: "manual" },
          // Economy rates on the pre-tax subtotal (src/modules/economy-shipping)
          { resolve: "./src/modules/economy-shipping", id: "economy" },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          // Admin notifications feed (keeps Medusa's default)
          { resolve: "@medusajs/medusa/notification-local", id: "local", options: { channels: ["feed"] } },
          // Store emails through Resend; rendered to files when RESEND_API_KEY is unset
          {
            resolve: "./src/modules/resend-email",
            id: "resend",
            options: {
              channels: ["email"],
              apiKey: process.env.RESEND_API_KEY,
              from: process.env.EMAIL_FROM ?? "Photobooth City <orders@photoboothcity.com>",
              replyTo: process.env.EMAIL_REPLY_TO ?? "info@photoboothcity.com",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: { providers: paymentProviders },
    },
  ],
})
