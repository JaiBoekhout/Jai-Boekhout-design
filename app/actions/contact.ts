"use server";

import { getSession } from "@/lib/auth";
import { saveEnquiry, deleteEnquiry, clearEnquiries, type Enquiry } from "@/lib/enquiries";
export type { Enquiry } from "@/lib/enquiries";

// Enquiry fields are whatever a stranger typed into a public form, and they get dropped into an
// HTML email body. Without escaping, a submitted "<a href=...>" renders as real markup in the
// inbox — a convincing phishing link inside a message that genuinely came from the portfolio.
// The plain-text part needs no escaping; only the HTML one does.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function submitEnquiry(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!name || !email || !message) {
    return { ok: false, error: "All fields are required." };
  }

  const enquiry: Enquiry = {
    id: Date.now().toString(),
    name,
    email,
    message,
    timestamp: new Date().toISOString(),
  };

  await saveEnquiry(enquiry);

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL ?? "jai_boekhout@hotmail.nl";
  const fromEmail = process.env.FROM_EMAIL ?? "portfolio@jaiboekhout.nl";

  if (apiKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      await resend.emails.send({
        from: `Portfolio Enquiry <${fromEmail}>`,
        to: toEmail,
        // The From address is a no-reply sender on the sending subdomain, so without this, hitting
        // Reply would go nowhere useful and the enquirer's address would have to be copied by hand.
        replyTo: email,
        subject: `New enquiry from ${name}`,
        text: `New enquiry from your portfolio:\n\nName: ${name}\nEmail: ${email}\n\n${message}`,
        html: `
          <p><strong>New enquiry from your portfolio</strong></p>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        `,
      });
    } catch (err) {
      console.error("Failed to send email notification:", err);
    }
  }

  return { ok: true };
}

export async function deleteEnquiryAction(id: string): Promise<void> {
  if (!(await getSession())) return;
  await deleteEnquiry(id);
}

export async function clearEnquiriesAction(): Promise<void> {
  if (!(await getSession())) return;
  await clearEnquiries();
}
