import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { OrderEmailData } from "../lib/emails"
import { STORE_DETAILS } from "../lib/store-config"

const num = (v: unknown) => Number(v ?? 0)

/**
 * Order confirmation to the customer and a "new order" alert to the store,
 * sent once per order (idempotency keys) through the email provider
 * (src/modules/resend-email).
 */
export default async function orderPlacedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notifications = container.resolve(Modules.NOTIFICATION)

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "created_at",
      "item_subtotal",
      "discount_total",
      "shipping_total",
      "tax_total",
      "total",
      "items.*",
      "items.adjustments.code",
      "items.variant.product.metadata",
      "shipping_address.*",
      "shipping_methods.name",
    ],
    filters: { id: data.id },
  })
  if (!order) {
    logger.warn(`order.placed: order ${data.id} not found`)
    return
  }

  const a = order.shipping_address
  const storefront = (process.env.STOREFRONT_URL ?? STORE_DETAILS.storefront_url).replace(/\/$/, "")
  const backend = (process.env.MEDUSA_BACKEND_URL ?? "").replace(/\/$/, "")
  const codes = new Set<string>()
  const emailData: OrderEmailData = {
    number: `${STORE_DETAILS.order_prefix}${order.display_id}`,
    placed_at: String(order.created_at),
    email: order.email ?? "",
    first_name: a?.first_name ?? "",
    phone: a?.phone ?? "",
    items: (order.items ?? []).map((i) => {
      for (const adj of i?.adjustments ?? []) if (adj?.code) codes.add(adj.code)
      const meta = (i?.variant?.product?.metadata ?? {}) as Record<string, unknown>
      const lead = String(meta.lead_time ?? "").replace(/\s+/g, " ").trim()
      return {
        title: i!.product_title ?? i!.title,
        variant: i!.variant_title && i!.variant_title !== "Default Title" ? i!.variant_title : "",
        sku: i!.variant_sku ?? "",
        quantity: num(i!.quantity),
        unit_price: num(i!.unit_price),
        total: num(i!.unit_price) * num(i!.quantity),
        image: i!.thumbnail ?? "",
        lead_time: /\d/.test(lead) ? lead.charAt(0).toUpperCase() + lead.slice(1) : "",
      }
    }),
    subtotal: num(order.item_subtotal),
    discount: num(order.discount_total),
    promo_codes: [],
    shipping: num(order.shipping_total),
    shipping_method: order.shipping_methods?.[0]?.name ?? "",
    tax: num(order.tax_total),
    total: num(order.total),
    address: [
      [a?.first_name, a?.last_name].filter(Boolean).join(" "),
      a?.company ?? "",
      [a?.address_1, a?.address_2].filter(Boolean).join(", "),
      `${a?.city ?? ""}, ${(a?.province ?? "").replace(/^us-/i, "").toUpperCase()} ${a?.postal_code ?? ""}`.trim(),
      a?.country_code === "pr" ? "Puerto Rico" : "United States",
    ].filter((l) => l && l !== ","),
    storefront_url: storefront,
    admin_url: `${backend}/app/orders/${order.id}`,
  }
  emailData.promo_codes = [...codes]

  const sends = [
    { to: order.email, template: "order-placed", key: `order-placed-${order.id}` },
    { to: process.env.ORDER_ALERT_EMAIL ?? STORE_DETAILS.support_email, template: "order-placed-store", key: `order-placed-store-${order.id}` },
  ]
  for (const s of sends) {
    if (!s.to) continue
    try {
      await notifications.createNotifications({
        to: s.to,
        channel: "email",
        template: s.template,
        data: emailData as unknown as Record<string, unknown>,
        idempotency_key: s.key,
        resource_id: order.id,
        resource_type: "order",
      })
    } catch (e) {
      logger.error(`order.placed: ${s.template} email for ${emailData.number} failed: ${(e as Error).message}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
