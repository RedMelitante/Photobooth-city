import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ResendEmailService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendEmailService],
})
