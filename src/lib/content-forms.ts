// Form submit hooks for the content pages. There is no backend yet: each
// function resolves after a short delay so the UI can show its success state.
// Wire these to Medusa / a mail service / the Shopify blog API later.

export interface ContactMessage {
  name: string;
  email: string;
  phone: string;
  topic: string;
  comment: string;
}

export interface BlogComment {
  articleSlug: string;
  name: string;
  email: string;
  body: string;
}

const pretend = () => new Promise<void>((resolve) => setTimeout(resolve, 400));

/** Contact page form ("Send us a message"). TODO: POST to the real endpoint. */
export async function submitContactMessage(message: ContactMessage): Promise<void> {
  void message;
  await pretend();
}

/** Blog newsletter band ("Get new guides by email"). TODO: subscribe via the email provider. */
export async function subscribeNewsletter(email: string): Promise<void> {
  void email;
  await pretend();
}

/** Blog article "Leave a comment" form. Comments are moderated before they appear. */
export async function submitBlogComment(comment: BlogComment): Promise<void> {
  void comment;
  await pretend();
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
