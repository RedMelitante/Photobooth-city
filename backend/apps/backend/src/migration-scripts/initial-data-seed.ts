import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createPromotionsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRatesWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { DEFAULT_REGION_STORE_POLICIES } from "../lib/region-store-policies"
import {
  CA_TAX_RATE,
  CONTIGUOUS_STATES,
  FLASH_SALE,
  STOCK_PER_AVAILABLE_VARIANT,
  STORE_DETAILS,
} from "../lib/store-config"
import catalog from "../data/catalog.json"

type CatalogVariant = (typeof catalog.products)[number]["variants"][number]

/**
 * Photobooth City store setup, copied from the Shopify store (Oct 27, 2026):
 * US + Puerto Rico region in USD, California-only sales tax, the Mira Loma
 * warehouse, Economy shipping priced by order value, the FLASHSALE2026 code,
 * and the full catalog (src/data/catalog.json, built by the storefront's
 * scripts/build-catalog.mjs).
 *
 * Runs once, as part of `medusa db:migrate`.
 */
export default async function initialDataSeed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  logger.info("Seeding Photobooth City store...")

  // Sales channel + publishable key ---------------------------------------
  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        { name: "Online Store", description: "photoboothcity.com" },
      ],
    },
  })

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        { title: "Storefront", type: "publishable", created_by: "" },
      ],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [salesChannel.id] },
  })

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: STORE_DETAILS.name,
          supported_currencies: [{ currency_code: "usd", is_default: true }],
          default_sales_channel_id: salesChannel.id,
          metadata: { ...STORE_DETAILS },
        },
      ],
    },
  })

  // Region: US only (all 50 states + DC + Puerto Rico) ----------------------
  const paymentProviders = ["pp_system_default"]
  if (process.env.STRIPE_API_KEY) {
    paymentProviders.push("pp_stripe_stripe")
  }

  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: "usd",
          countries: ["us", "pr"],
          payment_providers: paymentProviders,
          automatic_taxes: true,
          metadata: DEFAULT_REGION_STORE_POLICIES,
        },
      ],
    },
  })

  // Tax: collected in California only ---------------------------------------
  const { result: taxRegions } = await createTaxRegionsWorkflow(container).run({
    input: [
      { country_code: "us", provider_id: "tp_system" },
      { country_code: "pr", provider_id: "tp_system" },
    ],
  })
  const usTaxRegion = taxRegions.find((t) => t.country_code === "us")!
  const {
    result: [caTaxRegion],
  } = await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "us",
        province_code: "us-ca",
        parent_id: usTaxRegion.id,
        default_tax_rate: {
          rate: CA_TAX_RATE,
          code: "CA",
          name: "California sales tax",
        },
      },
    ],
  })

  // Warehouse ----------------------------------------------------------------
  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "Mira Loma",
          address: {
            address_1: "3827 Wacker Dr.",
            city: "Mira Loma",
            province: "us-ca",
            postal_code: "91752",
            country_code: "US",
          },
        },
      ],
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "economy_economy" },
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  })

  // Shipping -------------------------------------------------------------------
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Mira Loma shipping",
    type: "shipping",
    service_zones: [
      {
        name: "Contiguous US",
        geo_zones: CONTIGUOUS_STATES.map((state) => ({
          type: "province" as const,
          country_code: "us",
          province_code: `us-${state.toLowerCase()}`,
        })),
      },
      {
        name: "Hawaii, Alaska and Puerto Rico",
        geo_zones: [
          { type: "province" as const, country_code: "us", province_code: "us-hi" },
          { type: "province" as const, country_code: "us", province_code: "us-ak" },
          { type: "country" as const, country_code: "pr" },
        ],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  const contiguous = fulfillmentSet.service_zones.find(
    (z) => z.name === "Contiguous US"
  )!
  const remote = fulfillmentSet.service_zones.find(
    (z) => z.name !== "Contiguous US"
  )!
  const storeRules = (enabled: boolean) => [
    { attribute: "enabled_in_store", value: enabled ? "true" : "false", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ]

  const { result: shippingOptions } = await createShippingOptionsWorkflow(
    container
  ).run({
    input: [
      {
        name: "Economy",
        // Priced on the item subtotal before tax by the economy provider
        // (src/modules/economy-shipping), as Shopify's price-based rates.
        price_type: "calculated",
        provider_id: "economy_economy",
        data: { id: "economy" },
        service_zone_id: contiguous.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Economy",
          description: "5–8 business days",
          code: "economy",
        },
        rules: storeRules(true),
      },
      {
        // Shopify quotes UPS/USPS live for these addresses. Enable this once
        // a carrier-rate fulfillment provider (ShipStation, EasyPost, Shippo)
        // is installed and the option is switched to its calculated price.
        name: "UPS + USPS (Hawaii, Alaska, Puerto Rico)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: remote.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "UPS + USPS",
          description: "Carrier rate for Hawaii, Alaska and Puerto Rico",
          code: "ups-usps-remote",
        },
        prices: [{ currency_code: "usd", amount: 0 }],
        rules: storeRules(false),
      },
    ],
  })

  // California doesn't tax separately stated shipping: 0% on shipping options.
  await createTaxRatesWorkflow(container).run({
    input: [
      {
        tax_region_id: caTaxRegion.id,
        name: "California shipping (not taxable)",
        code: "CA-SHIPPING",
        rate: 0,
        rules: shippingOptions.map((o) => ({
          reference: "shipping_option",
          reference_id: o.id,
        })),
      },
    ],
  })

  // Categories (the storefront's collections) -------------------------------
  const { result: categories } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: catalog.collections.map((c, i) => ({
        name: c.title,
        handle: c.handle,
        description: c.intro,
        is_active: true,
        is_internal: false,
        rank: i,
        metadata: {
          // merchandised order; categories don't order their products
          product_order: c.products,
          related: c.related,
          more_heading: c.moreHeading,
          more: c.more,
        },
      })),
    },
  })
  const categoryIdsFor = (handle: string) =>
    catalog.collections
      .filter((c) => c.products.includes(handle))
      .map((c) => categories.find((x) => x.handle === c.handle)!.id)

  // Products -------------------------------------------------------------------
  const seenSkus = new Set<string>()
  const variantSku = (v: CatalogVariant) => {
    if (!v.sku || seenSkus.has(v.sku)) {
      return null
    }
    seenSkus.add(v.sku)
    return v.sku
  }
  const describe = (body: { type: string; text: string }[]) =>
    body.filter((b) => b.type !== "heading").map((b) => b.text).join("\n")

  const BATCH = 10
  for (let i = 0; i < catalog.products.length; i += BATCH) {
    const batch = catalog.products.slice(i, i + BATCH)
    await createProductsWorkflow(container).run({
      input: {
        products: batch.map((p) => ({
          title: p.title,
          handle: p.handle,
          subtitle: p.kind,
          description: describe(p.body),
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: p.images[0]?.url,
          images: p.images.map((img) => ({ url: img.url })),
          category_ids: categoryIdsFor(p.handle),
          options: p.options.map((o) => ({ title: o.name, values: o.values })),
          variants: p.variants.map((v) => ({
            title: v.title,
            sku: variantSku(v),
            options: v.options,
            manage_inventory: true,
            allow_backorder: false,
            weight: v.weightGrams ?? undefined,
            // Base price is the compare-at price when there is one; the
            // "Storefront sale prices" price list carries the selling price.
            prices: [
              {
                currency_code: "usd",
                amount: (v.compareAtPrice ?? v.price) / 100,
              },
            ],
            metadata: {
              shopify_variant_id: v.id.replace("variant_", ""),
              shopify_sku: v.sku,
            },
          })),
          sales_channels: [{ id: salesChannel.id }],
          metadata: {
            shopify_product_id: p.id.replace("prod_", ""),
            primary_category: p.collection,
            lead: p.lead,
            lead_time: p.leadTime,
            note: p.note,
            body: p.body,
            faq: p.faq,
          },
        })),
      },
    })
    logger.info(
      `Seeded products ${i + 1}–${Math.min(i + BATCH, catalog.products.length)} of ${catalog.products.length}`
    )
  }

  // Sale prices + inventory ---------------------------------------------------
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "product.handle",
      "inventory_items.inventory_item_id",
    ],
  })
  const catalogVariant = new Map(
    catalog.products.flatMap((p) =>
      p.variants.map((v) => [`${p.handle}::${v.title}`, v] as const)
    )
  )
  const lookup = (v: (typeof variants)[number]) =>
    catalogVariant.get(`${v.product?.handle}::${v.title}`)

  const salePrices = variants.flatMap((v) => {
    const c = lookup(v)
    return c?.compareAtPrice
      ? [{ variant_id: v.id, currency_code: "usd", amount: c.price / 100 }]
      : []
  })
  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          title: "Storefront sale prices",
          description:
            "Selling prices for items shown with a compare-at price (from Shopify).",
          status: "active",
          prices: salePrices,
        },
      ],
    },
  })
  logger.info(`Added ${salePrices.length} sale prices.`)

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: variants.flatMap((v) =>
        (v.inventory_items ?? []).map((ii) => ({
          location_id: stockLocation.id,
          inventory_item_id: ii!.inventory_item_id,
          stocked_quantity: lookup(v)?.available ? STOCK_PER_AVAILABLE_VARIANT : 0,
        }))
      ),
    },
  })

  // Promotion ------------------------------------------------------------------
  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: FLASH_SALE.code,
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "across",
            value: FLASH_SALE.percent,
            currency_code: "usd",
          },
          rules: [
            {
              attribute: "item_subtotal",
              operator: "gte",
              values: [String(FLASH_SALE.minSubtotal)],
            },
          ],
        },
      ],
    },
  })

  logger.info(
    `Photobooth City seeded: region ${region.id}, ${catalog.products.length} products, ${categories.length} categories.`
  )
  logger.info(`Publishable API key: ${publishableApiKey.token}`)
}
