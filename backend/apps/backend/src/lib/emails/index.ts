import { MedusaError } from "@medusajs/framework/utils"
import { STORE_DETAILS } from "../store-config"

export type OrderEmailItem = {
  title: string
  variant: string
  sku: string
  quantity: number
  unit_price: number
  total: number
  image: string
  lead_time: string
}

export type OrderEmailData = {
  number: string
  placed_at: string
  email: string
  first_name: string
  phone: string
  items: OrderEmailItem[]
  subtotal: number
  discount: number
  promo_codes: string[]
  shipping: number
  shipping_method: string
  tax: number
  total: number
  address: string[]
  storefront_url: string
  admin_url: string
}

export type RenderedEmail = { subject: string; html: string; text: string }

const C = {
  ink950: "#0B1020",
  ink900: "#141B2D",
  ink700: "#394257",
  ink500: "#5B6376",
  line: "#E4E6EB",
  canvas: "#F6F6F3",
  brand: "#1F3FD1",
  success: "#0F7A4A",
  flash: "#FFD23F",
}
const FONT = "Manrope, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export const money = (n: number) =>
  "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })

/** Shared shell: dark header with the logo, white card, contact footer. */
function layout(storefront: string, preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(preheader)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
<tr><td style="background:${C.ink950};border-radius:16px 16px 0 0;padding:20px 28px;">
<a href="${esc(storefront)}" style="display:inline-block;background:#FFFFFF;border-radius:12px;padding:6px 12px;"><img src="${esc(storefront)}/images/logo.png" alt="Photobooth City" height="44" style="display:block;height:44px;width:auto;border:0;"></a>
</td></tr>
<tr><td style="background:#FFFFFF;padding:32px 28px;font-family:${FONT};color:${C.ink900};">${body}</td></tr>
<tr><td style="background:#FFFFFF;border-top:1px solid ${C.line};border-radius:0 0 16px 16px;padding:20px 28px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.ink500};">
Questions? Call <a href="tel:18883124449" style="color:${C.brand};font-weight:700;text-decoration:none;">${esc(STORE_DETAILS.support_phone)}</a> (${esc(STORE_DETAILS.support_hours)}) or reply to this email.<br>
Photobooth City · ${esc(STORE_DETAILS.address)}<br>
<a href="${esc(storefront)}/policies/refund-policy" style="color:${C.ink500};">Refund policy</a> · <a href="${esc(storefront)}/policies/shipping-policy" style="color:${C.ink500};">Shipping policy</a>
</td></tr>
</table></td></tr></table></body></html>`
}

function itemRows(d: OrderEmailData): string {
  return d.items
    .map(
      (i) => `<tr>
<td width="72" valign="top" style="padding:14px 0;border-bottom:1px solid ${C.line};">${
        i.image
          ? `<img src="${esc(i.image)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;background:${C.canvas};border-radius:10px;border:0;">`
          : ""
      }</td>
<td valign="top" style="padding:14px 12px;border-bottom:1px solid ${C.line};font-size:14px;line-height:20px;">
<strong style="color:${C.ink900};">${esc(i.title)}</strong>${i.variant ? `<br><span style="color:${C.ink500};">${esc(i.variant)}</span>` : ""}
<br><span style="color:${C.ink500};">Qty ${i.quantity} × ${money(i.unit_price)}</span>${
        i.lead_time ? `<br><span style="color:${C.success};font-weight:700;">${esc(i.lead_time)}</span>` : ""
      }</td>
<td valign="top" align="right" style="padding:14px 0;border-bottom:1px solid ${C.line};font-size:14px;font-weight:800;white-space:nowrap;">${money(i.total)}</td>
</tr>`
    )
    .join("")
}

function totals(d: OrderEmailData): string {
  const row = (label: string, value: string, color = C.ink700, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:${strong ? 16 : 14}px;color:${color};${strong ? "font-weight:800;" : ""}">${label}</td><td align="right" style="padding:4px 0;font-size:${strong ? 18 : 14}px;color:${strong ? C.ink900 : color};font-weight:${strong ? 800 : 600};">${value}</td></tr>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
${row("Subtotal", money(d.subtotal))}
${d.discount > 0 ? row(`Discount${d.promo_codes.length ? ` (${esc(d.promo_codes.join(", "))})` : ""}`, "−" + money(d.discount), C.success) : ""}
${row(`Shipping${d.shipping_method ? ` · ${esc(d.shipping_method)}` : ""}`, money(d.shipping))}
${row("Tax", money(d.tax))}
<tr><td colspan="2" style="border-top:1px solid ${C.line};padding-top:8px;"></td></tr>
${row("Total", money(d.total) + " USD", C.ink900, true)}
</table>`
}

function orderPlaced(d: OrderEmailData): RenderedEmail {
  const subject = `Order ${d.number} confirmed`
  const hi = d.first_name ? `Thanks, ${esc(d.first_name)}!` : "Thanks for your order!"
  const body = `
<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${C.ink500};">Order ${esc(d.number)} · ${esc(dateLabel(d.placed_at))}</p>
<h1 style="margin:0 0 12px;font-size:28px;line-height:32px;font-weight:800;letter-spacing:-0.02em;">${hi}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${C.ink700};">Your order is confirmed. We'll email you tracking as soon as it ships from our Mira Loma, CA warehouse. Lead times are listed under each item.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(d)}</table>
${totals(d)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:${C.canvas};border-radius:12px;">
<tr><td style="padding:16px 18px;font-size:14px;line-height:21px;">
<strong>Shipping to</strong><br><span style="color:${C.ink700};">${d.address.map(esc).join("<br>")}</span>
</td></tr></table>
<p style="margin:24px 0 0;"><a href="${esc(d.storefront_url)}/account" style="display:inline-block;background:${C.brand};color:#FFFFFF;font-weight:800;font-size:15px;text-decoration:none;border-radius:12px;padding:14px 22px;">View your account</a></p>`
  const text = [
    `${d.first_name ? `Thanks, ${d.first_name}!` : "Thanks for your order!"} Order ${d.number} is confirmed.`,
    "",
    ...d.items.map((i) => `${i.quantity} × ${i.title}${i.variant ? ` (${i.variant})` : ""}: ${money(i.total)}${i.lead_time ? ` · ${i.lead_time}` : ""}`),
    "",
    `Subtotal ${money(d.subtotal)}`,
    ...(d.discount > 0 ? [`Discount -${money(d.discount)}`] : []),
    `Shipping ${money(d.shipping)}`,
    `Tax ${money(d.tax)}`,
    `Total ${money(d.total)} USD`,
    "",
    "Shipping to:",
    ...d.address,
    "",
    `Questions? Call ${STORE_DETAILS.support_phone} or reply to this email.`,
  ].join("\n")
  return { subject, html: layout(d.storefront_url, `${subject} · ${money(d.total)}`, body), text }
}

function orderPlacedStore(d: OrderEmailData): RenderedEmail {
  const count = d.items.reduce((a, i) => a + i.quantity, 0)
  const subject = `New order ${d.number} · ${money(d.total)} · ${count} item${count === 1 ? "" : "s"}`
  const body = `
<h1 style="margin:0 0 16px;font-size:22px;line-height:28px;font-weight:800;">New order ${esc(d.number)}</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:21px;color:${C.ink700};">
<strong style="color:${C.ink900};">${esc(d.email)}</strong>${d.phone ? ` · ${esc(d.phone)}` : ""}<br>${d.address.map(esc).join(", ")}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(d)}</table>
${totals(d)}
<p style="margin:24px 0 0;"><a href="${esc(d.admin_url)}" style="display:inline-block;background:${C.ink900};color:#FFFFFF;font-weight:800;font-size:14px;text-decoration:none;border-radius:10px;padding:12px 18px;">Open in admin</a></p>`
  const text = [subject, d.email, d.phone, d.address.join(", "), "", ...d.items.map((i) => `${i.quantity} × ${i.title} ${i.variant} [${i.sku}]`), "", d.admin_url].join("\n")
  return { subject, html: layout(d.storefront_url, subject, body), text }
}

const TEMPLATES: Record<string, (d: OrderEmailData) => RenderedEmail> = {
  "order-placed": orderPlaced,
  "order-placed-store": orderPlacedStore,
}

export function renderEmail(template: string, data: Record<string, unknown>): RenderedEmail {
  const render = TEMPLATES[template]
  if (!render) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Unknown email template "${template}"`)
  }
  return render(data as unknown as OrderEmailData)
}
