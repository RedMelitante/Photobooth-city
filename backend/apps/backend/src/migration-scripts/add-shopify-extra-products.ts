import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import products from "../data/extra-products.json"

/**
 * Three products that are live on Shopify but weren't in the original catalog
 * snapshot (Nov 2026): Darkroom single-activation software, the Height
 * Adjustable Roamer Stand and the Side mount Printer Shelf. Copied from
 * photoboothcity.com/products/<handle>.json. Stock is not tracked
 * (manage_inventory: false), so they can always be ordered.
 */
export default async function addShopifyExtraProducts({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: products.map((p) => p.handle) },
  })
  const have = new Set(existing.map((p) => p.handle))
  const todo = products.filter((p) => !have.has(p.handle))
  if (!todo.length) {
    logger.info("Extra Shopify products already present.")
    return
  }

  const [{ data: channels }, { data: profiles }] = await Promise.all([
    query.graph({ entity: "sales_channel", fields: ["id", "name"] }),
    query.graph({ entity: "shipping_profile", fields: ["id"] }),
  ])
  const salesChannel = channels.find((c) => c.name === "Online Store") ?? channels[0]
  const categories = await productModule.listProductCategories(
    { handle: [...new Set(todo.flatMap((p) => p.categories))] },
    { select: ["id", "handle"] }
  )
  const categoryId = new Map(categories.map((c) => [c.handle, c.id]))

  await createProductsWorkflow(container).run({
    input: {
      products: todo.map((p) => ({
        title: p.title,
        handle: p.handle,
        subtitle: p.kind,
        description: p.body.filter((b) => b.type !== "heading").map((b) => b.text).join("\n"),
        status: ProductStatus.PUBLISHED,
        // Software isn't shipped: no shipping profile, so its cart lines don't require shipping
        ...(p.requiresShipping ? { shipping_profile_id: profiles[0].id } : {}),
        thumbnail: p.images[0],
        images: p.images.map((url) => ({ url })),
        category_ids: p.categories.map((h) => categoryId.get(h)).filter((id): id is string => !!id),
        options: p.options.map((o) => ({ title: o.name, values: o.values })),
        variants: p.variants.map((v) => ({
          title: v.title,
          sku: v.sku ?? undefined,
          options: v.options as Record<string, string>,
          manage_inventory: false,
          allow_backorder: false,
          weight: v.grams ?? undefined,
          prices: [{ currency_code: "usd", amount: v.compare_at ?? v.price }],
          metadata: { shopify_variant_id: String(v.shopify_id), shopify_sku: v.sku },
        })),
        sales_channels: [{ id: salesChannel.id }],
        metadata: {
          shopify_product_id: String(p.shopify_id),
          primary_category: p.collection,
          lead: p.lead,
          lead_time: p.leadTime,
          note: p.note,
          body: p.body,
          faq: null,
          ...(p.requiresShipping ? {} : { requires_shipping: false }),
        },
      })),
    },
  })
  logger.info(`Added ${todo.length} products from Shopify: ${todo.map((p) => p.handle).join(", ")}`)
}
