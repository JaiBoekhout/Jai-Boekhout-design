"use server";

import { getSession } from "@/lib/auth";
import { saveEnquiry, deleteEnquiry, clearEnquiries, type Enquiry } from "@/lib/enquiries";
export type { Enquiry } from "@/lib/enquiries";

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
      await resend.emails.send({
        from: `Portfolio Enquiry <${fromEmail}>`,
        to: toEmail,
        subject: `New enquiry from ${name}`,
        text: `New enquiry from your portfolio:\n\nName: ${name}\nEmail: ${email}\n\n${message}`,
        html: `
          <p><strong>New enquiry from your portfolio</strong></p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap">${message}</p>
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
