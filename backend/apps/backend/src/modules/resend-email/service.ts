import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { renderEmail } from "../../lib/emails"

type Options = {
  /** Resend API key; without one, emails are rendered to files instead of sent */
  apiKey?: string
  /** e.g. "Photobooth City <orders@photoboothcity.com>" (domain verified in Resend) */
  from: string
  replyTo?: string
}

/**
 * Sends store emails through Resend (https://resend.com). Templates are
 * rendered in code (src/lib/emails). With no API key the rendered email is
 * logged and written to <tmp>/pbc-emails/ so it can be previewed.
 */
class ResendEmailService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected logger_: Logger
  protected options_: Options

  constructor({ logger }: { logger: Logger }, options: Options) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.from) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Resend email provider needs a `from` address")
    }
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const email = renderEmail(notification.template, notification.data ?? {})

    if (!this.options_.apiKey) {
      const dir = path.join(os.tmpdir(), "pbc-emails")
      fs.mkdirSync(dir, { recursive: true })
      const file = path.join(dir, `${Date.now()}-${notification.template}.html`)
      fs.writeFileSync(file, email.html)
      this.logger_.info(`Email (not sent, no RESEND_API_KEY) to ${notification.to}: "${email.subject}" -> ${file}`)
      return { id: `preview_${path.basename(file)}` }
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options_.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: notification.from || this.options_.from,
        to: [notification.to],
        reply_to: this.options_.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    })
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend rejected "${email.subject}" to ${notification.to}: ${body.message ?? res.status}`
      )
    }
    this.logger_.info(`Email sent to ${notification.to}: "${email.subject}" (${body.id})`)
    return { id: body.id }
  }
}

export default ResendEmailService
