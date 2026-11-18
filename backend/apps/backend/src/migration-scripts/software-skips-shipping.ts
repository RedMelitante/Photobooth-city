import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import products from "../data/extra-products.json"

/**
 * Products that aren't shipped (the Darkroom software license) lose their
 * shipping profile, so Medusa marks their cart lines requires_shipping: false:
 * a software-only cart completes without a shipping method, and the economy
 * provider leaves them out of the shipping tier. The storefront reads
 * metadata.requires_shipping to skip its shipping step.
 */
export default async function softwareSkipsShipping({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const handles = products.filter((p) => !p.requiresShipping).map((p) => p.handle)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata", "shipping_profile.id"],
    filters: { handle: handles },
  })

  for (const p of data) {
    const profileId = (p as { shipping_profile?: { id: string } | null }).shipping_profile?.id
    if (profileId) {
      await link.dismiss({
        [Modules.PRODUCT]: { product_id: p.id },
        [Modules.FULFILLMENT]: { shipping_profile_id: profileId },
      })
    }
    if (p.metadata?.requires_shipping !== false) {
      await updateProductsWorkflow(container).run({
        input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata ?? {}), requires_shipping: false } } },
      })
    }
    logger.info(`${p.handle}: no shipping required`)
  }
}
