import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  deleteShippingOptionsWorkflow,
  updateTaxRatesWorkflow,
} from "@medusajs/medusa/core-flows"

const PROVIDER = "economy_economy"

/**
 * Databases seeded before the economy provider existed priced Economy with
 * flat-rate rules on `item_total`, which includes sales tax. This swaps that
 * option for one priced by the economy provider on the pre-tax subtotal, and
 * keeps California's "shipping isn't taxed" rate pointing at it.
 */
export default async function replaceFlatEconomyShipping({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "price_type",
      "service_zone_id",
      "shipping_profile_id",
      "service_zone.fulfillment_set.location.id",
      "type.code",
    ],
  })
  const flat = options.find((o) => o.type?.code === "economy" && o.price_type === "flat")
  if (!flat) {
    logger.info("Economy shipping already uses the economy provider")
    return
  }

  const locationId = flat.service_zone?.fulfillment_set?.location?.id
  if (locationId) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: locationId },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: PROVIDER },
      })
    } catch {
      // already linked
    }
  }

  const {
    result: [economy],
  } = await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Economy",
        price_type: "calculated",
        provider_id: PROVIDER,
        data: { id: "economy" },
        service_zone_id: flat.service_zone_id,
        shipping_profile_id: flat.shipping_profile_id,
        type: { label: "Economy", description: "5–8 business days", code: "economy" },
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })
  await deleteShippingOptionsWorkflow(container).run({ input: { ids: [flat.id] } })

  const { data: rates } = await query.graph({
    entity: "tax_rate",
    fields: ["id", "code"],
    filters: { code: "CA-SHIPPING" },
  })
  const shippingOptionIds = options.filter((o) => o.id !== flat.id).map((o) => o.id).concat(economy.id)
  for (const rate of rates) {
    await updateTaxRatesWorkflow(container).run({
      input: {
        selector: { id: rate.id },
        update: {
          rules: shippingOptionIds.map((id) => ({ reference: "shipping_option", reference_id: id })),
        },
      },
    })
  }
  logger.info(`Economy shipping now priced on the pre-tax subtotal (${economy.id})`)
}
