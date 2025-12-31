import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const type = formData.get('type') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string || 'לא צוין';
    const description = formData.get('description') as string;
    const screenshot = formData.get('screenshot') as File | null;

    // Validate required fields
    if (!name || !email || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Prepare email subject
    const subject = type === 'bug'
      ? `[באג] דיווח חדש מ-${name}`
      : `[הצעת שיפור] פנייה חדשה מ-${name}`;

    // Prepare email body
    const htmlContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${type === 'bug' ? '#dc2626' : '#ca8a04'}; border-bottom: 2px solid ${type === 'bug' ? '#dc2626' : '#ca8a04'}; padding-bottom: 10px;">
          ${type === 'bug' ? '🐛 דיווח באג' : '💡 הצעת שיפור'}
        </h2>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">פרטי הפונה</h3>
          <p><strong>שם:</strong> ${name}</p>
          <p><strong>אימייל:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>טלפון:</strong> ${phone}</p>
        </div>

        <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #374151;">${type === 'bug' ? 'תיאור הבעיה' : 'תיאור ההצעה'}</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${description}</p>
        </div>

        ${screenshot ? '<p style="color: #6b7280; font-size: 14px; margin-top: 20px;">📎 צילום מסך מצורף</p>' : ''}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          נשלח מטופס הדיווח במערכת ועד בית
        </p>
      </div>
    `;

    // Prepare attachments
    const attachments: { filename: string; content: Buffer }[] = [];
    if (screenshot) {
      const buffer = Buffer.from(await screenshot.arrayBuffer());
      attachments.push({
        filename: screenshot.name || 'screenshot.png',
        content: buffer,
      });
    }

    // Send email
    await transporter.sendMail({
      from: `"ועד בית - תמיכה" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to self
      replyTo: email, // So you can reply directly to the user
      subject,
      html: htmlContent,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending bug report:', error);
    return NextResponse.json(
      { error: 'Failed to send report' },
      { status: 500 }
    );
  }
}
