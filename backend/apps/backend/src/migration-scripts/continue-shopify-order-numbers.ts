import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SHOPIFY_LAST_ORDER_NUMBER } from "../lib/store-config"

/**
 * New orders continue Shopify's numbering (#PBC2212 onwards). Medusa has no
 * setting for the starting display id, so this moves the order module's
 * sequence once. It never moves it backwards.
 */
export default async function continueShopifyOrderNumbers({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const result = await pg.raw(
    `select setval('order_display_id_seq', greatest(?, (select coalesce(max(display_id), 0) from "order"))) as last`,
    [SHOPIFY_LAST_ORDER_NUMBER]
  )
  logger.info(`Order numbers continue after #PBC${result.rows[0].last}`)
}
