import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

type Options = {
  clientId: string
  clientSecret: string
  /** "sandbox" (default) or "live" */
  environment?: string
  brandName?: string
  /** tests only: point at a stand-in PayPal API */
  apiBase?: string
}

type PayPalOrder = {
  id: string
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED"
  purchase_units?: {
    payments?: {
      authorizations?: { id: string; status: string }[]
      captures?: { id: string; status: string }[]
    }
  }[]
}

/** Data kept on the Medusa payment session / payment. */
type SessionData = {
  id?: string
  status?: string
  authorization_id?: string
  capture_id?: string
  amount?: string
  currency_code?: string
  session_id?: string
}

/**
 * PayPal Checkout through PayPal's Orders v2 REST API.
 *
 * initiatePayment creates a PayPal order (intent AUTHORIZE) for the cart total; the
 * storefront renders PayPal's buttons for that order id. When the buyer approves,
 * the storefront completes the cart and authorizePayment authorizes the order.
 * The payment is captured from the Medusa admin (Capture), like Stripe here.
 * Authorizations stay valid for 29 days (PayPal honors the full amount for 3).
 */
class PayPalPaymentService extends AbstractPaymentProvider<Options> {
  static identifier = "paypal"

  protected readonly options_: Options
  protected readonly logger_: Logger
  private token_: { value: string; expires: number } | null = null

  static validateOptions(options: Record<string, unknown>) {
    if (!options.clientId || !options.clientSecret) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "PayPal needs clientId and clientSecret")
    }
  }

  constructor(container: { logger: Logger }, options: Options) {
    super(container, options)
    this.options_ = options
    this.logger_ = container.logger
  }

  private get base() {
    if (this.options_.apiBase) return this.options_.apiBase.replace(/\/$/, "")
    return this.options_.environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"
  }

  private async token(): Promise<string> {
    if (this.token_ && this.token_.expires > Date.now() + 60_000) return this.token_.value
    const basic = Buffer.from(`${this.options_.clientId}:${this.options_.clientSecret}`).toString("base64")
    const res = await fetch(`${this.base}/v1/oauth2/token`, {
      method: "POST",
      headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    })
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string }
    if (!res.ok || !body.access_token) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `PayPal sign-in failed: ${body.error_description ?? res.status}`)
    }
    this.token_ = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 300) * 1000 }
    return body.access_token
  }

  private async api<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${await this.token()}`,
      "content-type": "application/json",
      prefer: "return=representation",
    }
    if (init.idempotencyKey) headers["paypal-request-id"] = init.idempotencyKey
    const res = await fetch(`${this.base}${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    if (!res.ok) {
      const detail = body?.details?.[0]?.description ?? body?.message ?? res.statusText
      this.logger_.warn(`PayPal ${init.method ?? "GET"} ${path} -> ${res.status}: ${detail}`)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `PayPal: ${detail}`)
    }
    return body as T
  }

  private money(amount: unknown) {
    return new BigNumber(amount as number).numeric.toFixed(2)
  }

  private async createOrder(amount: unknown, currency: string, sessionId?: string, idempotencyKey?: string) {
    const value = this.money(amount)
    const currency_code = currency.toUpperCase()
    const order = await this.api<PayPalOrder>("/v2/checkout/orders", {
      idempotencyKey,
      body: {
        intent: "AUTHORIZE",
        purchase_units: [{ amount: { currency_code, value }, ...(sessionId ? { custom_id: sessionId } : {}) }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: this.options_.brandName ?? "Photobooth City",
              // The address was collected in checkout; PayPal doesn't ask again.
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
            },
          },
        },
      },
    })
    return { id: order.id, status: order.status, amount: value, currency_code, session_id: sessionId } satisfies SessionData
  }

  private sessionStatus(order: PayPalOrder): PaymentSessionStatus {
    switch (order.status) {
      case "COMPLETED": {
        const payments = order.purchase_units?.[0]?.payments
        if (payments?.captures?.some((c) => c.status === "COMPLETED")) return PaymentSessionStatus.CAPTURED
        if (payments?.authorizations?.some((a) => a.status === "VOIDED")) return PaymentSessionStatus.CANCELED
        return PaymentSessionStatus.AUTHORIZED
      }
      case "VOIDED":
        return PaymentSessionStatus.CANCELED
      case "APPROVED":
      case "PAYER_ACTION_REQUIRED":
        return PaymentSessionStatus.REQUIRES_MORE
      default:
        return PaymentSessionStatus.PENDING
    }
  }

  private orderId(data?: Record<string, unknown>) {
    const id = (data as SessionData | undefined)?.id
    if (!id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "PayPal order id missing from the payment session")
    return id
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = (input.data as SessionData | undefined)?.session_id
    const data = await this.createOrder(input.amount, input.currency_code, sessionId, input.context?.idempotency_key)
    return { id: data.id, data, status: PaymentSessionStatus.PENDING }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const current = (input.data ?? {}) as SessionData
    const value = this.money(input.amount)
    if (current.id && current.amount === value && current.currency_code === input.currency_code.toUpperCase()) {
      return { data: current }
    }
    // Totals changed (cart edited): a fresh order keeps the buyer's approval tied to the right amount.
    const data = await this.createOrder(input.amount, input.currency_code, current.session_id)
    return { data, status: PaymentSessionStatus.PENDING }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const id = this.orderId(input.data)
    let order = await this.api<PayPalOrder>(`/v2/checkout/orders/${id}`)
    if (order.status === "APPROVED") {
      order = await this.api<PayPalOrder>(`/v2/checkout/orders/${id}/authorize`, {
        body: {},
        idempotencyKey: `authorize-${id}`,
      })
    }
    const authorization = order.purchase_units?.[0]?.payments?.authorizations?.[0]
    const status = this.sessionStatus(order)
    return {
      status: status === PaymentSessionStatus.REQUIRES_MORE ? PaymentSessionStatus.PENDING : status,
      data: { ...(input.data as SessionData), status: order.status, authorization_id: authorization?.id },
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (data.capture_id) return { data }
    if (!data.authorization_id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "PayPal payment isn't authorized yet")
    }
    const capture = await this.api<{ id: string; status: string }>(
      `/v2/payments/authorizations/${data.authorization_id}/capture`,
      { body: { final_capture: true }, idempotencyKey: `capture-${data.authorization_id}` }
    )
    return { data: { ...data, capture_id: capture.id, status: capture.status } }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.capture_id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Only captured PayPal payments can be refunded")
    }
    const refund = await this.api<{ id: string; status: string }>(`/v2/payments/captures/${data.capture_id}/refund`, {
      body: { amount: { value: this.money(input.amount), currency_code: data.currency_code ?? "USD" } },
    })
    return { data: { ...data, last_refund_id: refund.id } }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (data.authorization_id && !data.capture_id) {
      await this.api(`/v2/payments/authorizations/${data.authorization_id}/void`, { body: {} })
      return { data: { ...data, status: "VOIDED" } }
    }
    return { data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    // Unapproved PayPal orders simply expire.
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const order = await this.api<PayPalOrder>(`/v2/checkout/orders/${this.orderId(input.data)}`)
    return { status: this.sessionStatus(order), data: input.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const order = await this.api<PayPalOrder>(`/v2/checkout/orders/${this.orderId(input.data)}`)
    return { data: { ...(input.data as SessionData), status: order.status } }
  }

  async getWebhookActionAndData(_payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    // Authorization happens synchronously when the cart completes; no webhooks needed yet.
    return { action: "not_supported" }
  }
}

export default PayPalPaymentService
