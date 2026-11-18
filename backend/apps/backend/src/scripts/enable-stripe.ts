import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Adds the configured payment providers to every region: Stripe once
 * STRIPE_API_KEY is set, PayPal once PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET
 * are. Idempotent; runs on each deploy (`medusa exec`), so adding the keys in
 * Railway and redeploying is all it takes. (File name kept for the deploy command.)
 */
export default async function enablePaymentProviders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const wanted = [
    process.env.STRIPE_API_KEY ? "pp_stripe_stripe" : null,
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? "pp_paypal_paypal" : null,
  ].filter((p): p is string => !!p)
  if (!wanted.length) {
    logger.info("Payments: no Stripe or PayPal keys set, skipping")
    return
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })
  for (const region of regions) {
    const current = (region.payment_providers ?? []).map((p) => p!.id)
    const missing = wanted.filter((p) => !current.includes(p))
    if (!missing.length) {
      continue
    }
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: [...current, ...missing] },
      },
    })
    logger.info(`Payments: enabled ${missing.join(", ")} for region "${region.name}"`)
  }
}
