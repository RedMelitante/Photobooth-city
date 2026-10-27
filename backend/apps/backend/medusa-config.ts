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
      resolve: "@medusajs/medusa/payment",
      options: { providers: paymentProviders },
    },
  ],
})
