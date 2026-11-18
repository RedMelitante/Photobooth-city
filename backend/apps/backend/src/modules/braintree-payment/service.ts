import braintree from "braintree"
import { AbstractPaymentProvider, BigNumber, MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
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
  merchantId: string
  publicKey: string
  privateKey: string
  /** "sandbox" (default) or "production" */
  environment?: string
  /** Braintree merchant account for USD, if the gateway has several */
  merchantAccountId?: string
}

/** What the store needs from Braintree's SDK (narrowed so tests can stand in for it). */
export interface BraintreeLike {
  clientToken: { generate(req: Record<string, unknown>): Promise<{ success: boolean; clientToken: string; message?: string }> }
  transaction: {
    sale(req: Record<string, unknown>): Promise<BraintreeResult>
    submitForSettlement(id: string, amount?: string): Promise<BraintreeResult>
    void(id: string): Promise<BraintreeResult>
    refund(id: string, amount?: string): Promise<BraintreeResult>
    find(id: string): Promise<BraintreeTransaction>
  }
}
type BraintreeTransaction = { id: string; status: string; amount?: string; paymentInstrumentType?: string }
type BraintreeResult = { success: boolean; message?: string; transaction?: BraintreeTransaction }

/** Data kept on the Medusa payment session / payment. Never holds keys. */
type SessionData = {
  client_token?: string
  payment_method_nonce?: string
  device_data?: string
  amount?: string
  currency_code?: string
  session_id?: string
  transaction_id?: string
  status?: string
  instrument?: string
  refund_ids?: string[]
}

const SETTLING = ["submitted_for_settlement", "settling", "settlement_pending", "settled", "settlement_confirmed"]

/**
 * Braintree (cards + PayPal through Braintree's Drop-in UI).
 *
 * initiatePayment returns a client token for the Drop-in. The storefront collects
 * a one-time payment method nonce and re-creates the session with it
 * (data.payment_method_nonce), then completes the cart: authorizePayment runs a
 * sale without settlement (authorize only). Capture from the Medusa admin submits
 * it for settlement, like Stripe here. Refunds before settlement void instead.
 */
class BraintreePaymentService extends AbstractPaymentProvider<Options> {
  static identifier = "braintree"

  protected readonly options_: Options
  protected readonly logger_: Logger
  protected gateway_: BraintreeLike

  static validateOptions(options: Record<string, unknown>) {
    if (!options.merchantId || !options.publicKey || !options.privateKey) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Braintree needs merchantId, publicKey and privateKey")
    }
  }

  constructor(container: { logger: Logger }, options: Options) {
    super(container, options)
    this.options_ = options
    this.logger_ = container.logger
    this.gateway_ = this.createGateway()
  }

  protected createGateway(): BraintreeLike {
    return new braintree.BraintreeGateway({
      environment: this.options_.environment === "production" ? braintree.Environment.Production : braintree.Environment.Sandbox,
      merchantId: this.options_.merchantId,
      publicKey: this.options_.publicKey,
      privateKey: this.options_.privateKey,
    }) as unknown as BraintreeLike
  }

  private money(amount: unknown) {
    return new BigNumber(amount as number).numeric.toFixed(2)
  }

  private fail(what: string, r: { message?: string }): never {
    this.logger_.warn(`Braintree ${what} failed: ${r.message ?? "unknown error"}`)
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, r.message ?? `Braintree ${what} failed`)
  }

  private status(t: BraintreeTransaction): PaymentSessionStatus {
    if (t.status === "authorized" || t.status === "authorizing") return PaymentSessionStatus.AUTHORIZED
    if (SETTLING.includes(t.status)) return PaymentSessionStatus.CAPTURED
    if (t.status === "voided" || t.status === "authorization_expired") return PaymentSessionStatus.CANCELED
    return PaymentSessionStatus.ERROR
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const given = (input.data ?? {}) as SessionData
    const token = await this.gateway_.clientToken.generate(
      this.options_.merchantAccountId ? { merchantAccountId: this.options_.merchantAccountId } : {}
    )
    if (!token.success) this.fail("client token", token)
    const data: SessionData = {
      client_token: token.clientToken,
      amount: this.money(input.amount),
      currency_code: input.currency_code.toUpperCase(),
      session_id: given.session_id,
      // Set when the storefront re-creates the session with the Drop-in's nonce.
      ...(typeof given.payment_method_nonce === "string" ? { payment_method_nonce: given.payment_method_nonce } : {}),
      ...(typeof given.device_data === "string" ? { device_data: given.device_data } : {}),
    }
    return { id: given.session_id ?? `bt_${Date.now()}`, data, status: PaymentSessionStatus.PENDING }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // The nonce isn't tied to an amount; keep it and record the new total.
    const data = { ...((input.data ?? {}) as SessionData), amount: this.money(input.amount), currency_code: input.currency_code.toUpperCase() }
    return { data, status: PaymentSessionStatus.PENDING }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (data.transaction_id) {
      const t = await this.gateway_.transaction.find(data.transaction_id)
      return { status: this.status(t), data: { ...data, status: t.status } }
    }
    if (!data.payment_method_nonce) {
      // No card / PayPal details yet: the buyer hasn't submitted the Drop-in.
      return { status: PaymentSessionStatus.REQUIRES_MORE, data }
    }
    const r = await this.gateway_.transaction.sale({
      amount: data.amount,
      paymentMethodNonce: data.payment_method_nonce,
      ...(data.device_data ? { deviceData: data.device_data } : {}),
      ...(this.options_.merchantAccountId ? { merchantAccountId: this.options_.merchantAccountId } : {}),
      ...(data.session_id ? { orderId: data.session_id } : {}),
      options: { submitForSettlement: false },
    })
    if (!r.success || !r.transaction) {
      // Declined: the nonce is spent, so the buyer re-enters their details.
      return { status: PaymentSessionStatus.ERROR, data: { ...data, payment_method_nonce: undefined, status: r.message } }
    }
    const { payment_method_nonce: _used, client_token: _token, ...rest } = data
    return {
      status: this.status(r.transaction),
      data: { ...rest, transaction_id: r.transaction.id, status: r.transaction.status, instrument: r.transaction.paymentInstrumentType },
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.transaction_id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Braintree payment isn't authorized yet")
    const t = await this.gateway_.transaction.find(data.transaction_id)
    if (SETTLING.includes(t.status)) return { data: { ...data, status: t.status } }
    const r = await this.gateway_.transaction.submitForSettlement(data.transaction_id)
    if (!r.success) this.fail("capture", r)
    return { data: { ...data, status: r.transaction?.status } }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.transaction_id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No Braintree transaction to refund")
    const amount = this.money(input.amount)
    const t = await this.gateway_.transaction.find(data.transaction_id)
    if (t.status === "submitted_for_settlement" || t.status === "authorized") {
      // Not settled yet: Braintree only allows voiding the whole transaction.
      if (t.amount && Number(amount) < Number(t.amount)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Braintree hasn't settled this payment yet (usually within 24 hours). Partial refunds are possible after settlement; a full refund now voids it."
        )
      }
      const r = await this.gateway_.transaction.void(data.transaction_id)
      if (!r.success) this.fail("void", r)
      return { data: { ...data, status: "voided" } }
    }
    const r = await this.gateway_.transaction.refund(data.transaction_id, amount)
    if (!r.success || !r.transaction) this.fail("refund", r)
    return { data: { ...data, refund_ids: [...(data.refund_ids ?? []), r.transaction!.id] } }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.transaction_id) return { data }
    const t = await this.gateway_.transaction.find(data.transaction_id)
    if (t.status === "authorized" || t.status === "submitted_for_settlement") {
      const r = await this.gateway_.transaction.void(data.transaction_id)
      if (!r.success) this.fail("void", r)
      return { data: { ...data, status: "voided" } }
    }
    return { data: { ...data, status: t.status } }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.transaction_id) return { status: PaymentSessionStatus.PENDING, data }
    return { status: this.status(await this.gateway_.transaction.find(data.transaction_id)), data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.transaction_id) return { data }
    const t = await this.gateway_.transaction.find(data.transaction_id)
    return { data: { ...data, status: t.status } }
  }

  async getWebhookActionAndData(_payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    // Authorization happens synchronously when the cart completes; no webhooks needed yet.
    return { action: "not_supported" }
  }
}

export default BraintreePaymentService
