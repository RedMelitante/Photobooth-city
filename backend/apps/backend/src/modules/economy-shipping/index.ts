import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import EconomyShippingService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [EconomyShippingService],
})
