import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Stripe is enabled when STRIPE_API_KEY is set, Braintree when the three
// BRAINTREE_* keys are, PayPal when PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are. Without them the store runs on Medusa's system
// payment provider, which authorizes every payment (dev only).
const paymentProviders: { resolve: string; id: string; options: Record<string, unknown> }[] = []
if (process.env.STRIPE_API_KEY) {
  paymentProviders.push({
    resolve: "@medusajs/medusa/payment-stripe",
    id: "stripe",
    options: {
      apiKey: process.env.STRIPE_API_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      automaticPaymentMethods: true,
      capture: false,
    },
  })
}
// Braintree, cards + PayPal (src/modules/braintree-payment): sandbox unless BRAINTREE_ENVIRONMENT=production.
if (process.env.BRAINTREE_MERCHANT_ID && process.env.BRAINTREE_PUBLIC_KEY && process.env.BRAINTREE_PRIVATE_KEY) {
  paymentProviders.push({
    resolve: "./src/modules/braintree-payment",
    id: "braintree",
    options: {
      merchantId: process.env.BRAINTREE_MERCHANT_ID,
      publicKey: process.env.BRAINTREE_PUBLIC_KEY,
      privateKey: process.env.BRAINTREE_PRIVATE_KEY,
      environment: process.env.BRAINTREE_ENVIRONMENT === "production" ? "production" : "sandbox",
      ...(process.env.BRAINTREE_MERCHANT_ACCOUNT_ID ? { merchantAccountId: process.env.BRAINTREE_MERCHANT_ACCOUNT_ID } : {}),
    },
  })
}
// PayPal Checkout (src/modules/paypal-payment): sandbox unless PAYPAL_ENVIRONMENT=live.
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  paymentProviders.push({
    resolve: "./src/modules/paypal-payment",
    id: "paypal",
    options: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      environment: process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox",
      ...(process.env.PAYPAL_API_BASE ? { apiBase: process.env.PAYPAL_API_BASE } : {}),
    },
  })
}

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
