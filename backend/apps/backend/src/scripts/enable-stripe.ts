import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

const STRIPE = "pp_stripe_stripe"

/**
 * Adds Stripe to every region's payment providers once STRIPE_API_KEY is set.
 * Idempotent; runs on each deploy (`medusa exec`), so adding the key in
 * Railway and redeploying is all it takes.
 */
export default async function enableStripe({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (!process.env.STRIPE_API_KEY) {
    logger.info("Stripe: STRIPE_API_KEY not set, skipping")
    return
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })
  for (const region of regions) {
    const current = (region.payment_providers ?? []).map((p) => p!.id)
    if (current.includes(STRIPE)) {
      continue
    }
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: [...current, STRIPE] },
      },
    })
    logger.info(`Stripe: enabled for region "${region.name}"`)
  }
}
