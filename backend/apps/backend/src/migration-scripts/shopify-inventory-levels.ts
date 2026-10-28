import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  updateInventoryLevelsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
import inventory from "../data/shopify-inventory.json"

/**
 * Stock levels from Shopify (Products > Inventory at Mira Loma), replacing
 * the seed's placeholder quantities:
 *  - `levels`: available quantity per variant (negatives clamped to 0)
 *  - `backorder`: variants Shopify kept selling at 0 or below
 *  - `untracked_products`: products Shopify doesn't track; Medusa stops
 *    tracking them too, so they stay purchasable
 * Keys are `<product handle>::<variant title>`. Variants with no Shopify row
 * keep their current quantity.
 */
export default async function shopifyInventoryLevels({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "product.handle",
      "inventory_items.inventory.location_levels.id",
      "inventory_items.inventory.location_levels.location_id",
      "inventory_items.inventory_item_id",
    ],
  })

  const levels = inventory.levels as Record<string, number>
  const backorder = new Set(inventory.backorder)
  const untracked = new Set(inventory.untracked_products)

  const updates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
  const variantUpdates: { id: string; manage_inventory?: boolean; allow_backorder?: boolean }[] = []

  for (const v of variants) {
    const handle = v.product?.handle ?? ""
    const key = `${handle}::${v.title}`
    if (untracked.has(handle)) {
      variantUpdates.push({ id: v.id, manage_inventory: false })
      continue
    }
    if (backorder.has(key)) {
      variantUpdates.push({ id: v.id, allow_backorder: true })
    }
    const qty = levels[key]
    if (qty === undefined) {
      continue
    }
    for (const item of v.inventory_items ?? []) {
      for (const level of item?.inventory?.location_levels ?? []) {
        updates.push({
          inventory_item_id: item!.inventory_item_id,
          location_id: level!.location_id,
          stocked_quantity: qty,
        })
      }
    }
  }

  if (updates.length) {
    await updateInventoryLevelsWorkflow(container).run({ input: { updates } })
  }
  if (variantUpdates.length) {
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: variantUpdates },
    })
  }
  logger.info(
    `Shopify inventory: ${updates.length} stock levels set, ${variantUpdates.length} variants updated (${untracked.size} untracked products, ${backorder.size} backorder variants)`
  )
}
