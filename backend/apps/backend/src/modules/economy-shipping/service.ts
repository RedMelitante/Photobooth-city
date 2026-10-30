import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  FulfillmentOption,
} from "@medusajs/framework/types"
import { economyRate } from "../../lib/store-config"

/**
 * Economy shipping (5–8 business days) priced like Shopify's price-based
 * rates: on the order's item subtotal before tax. Flat-rate price rules can
 * only match `item_total`, which includes sales tax and would push
 * California orders into the next tier.
 */
class EconomyShippingService extends AbstractFulfillmentProviderService {
  static identifier = "economy"

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: "economy" }]
  }

  async canCalculate(): Promise<boolean> {
    return true
  }

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const subtotal = (context.items ?? []).reduce(
      (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
      0
    )
    return {
      calculated_amount: economyRate(subtotal),
      is_calculated_price_tax_inclusive: false,
    }
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return data
  }

  async validateOption(): Promise<boolean> {
    return true
  }

  async createFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  async cancelFulfillment(): Promise<Record<string, unknown>> {
    return {}
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }
}

export default EconomyShippingService
