
// src/app/api/admin/questions/[questionId]/answer/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const firebaseAdminSdkConfigString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

// SMTP Environment Variables
const smtpHost = process.env.SMTP_HOST;
const smtpPortStr = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFromEmail = process.env.SMTP_FROM_EMAIL;
const smtpSecure = process.env.SMTP_SECURE === 'true';

let firebaseAdminApp: admin.app.App;

const emailTexts = {
  subject: "Response to your Question (رد على سؤالك)",
  bodyPart1: "As-salāmu ʿalaykum wa raḥmatullāhi wa barakātuh,",
  bodyPart2: "السلام عليكم ورحمة الله وبركاته",
  bodyAnswered: "Your question has been answered. Please watch the response here:",
  bodyAnsweredAr: "تم الإجابة على سؤالك. يمكنك مشاهدة الرد هنا:",
  signature: "Jazakallah Khair (جزاك الله خيرًا)",
  shaykhName: "Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Saʿd (الشيخ عبد الله بن عبد الرحمن السعد)",
  noReplyNotice: "Please do not reply to this email as this inbox is not monitored.",
  noReplyNoticeAr: "يرجى عدم الرد على هذا البريد الإلكتروني لأن هذا الصندوق غير مراقب.",
};

async function sendEmailNotification(recipientEmail: string, subject: string, htmlBody: string, textBody: string) {
  const requiredSmtpVars = { smtpHost, smtpPortStr, smtpUser, smtpPass, smtpFromEmail };
  const missingVars = Object.entries(requiredSmtpVars).filter(([_, value]) => !value);

  if (missingVars.length > 0) {
    const missingVarNames = missingVars.map(([key]) => key).join(', ');
    console.error(`API Route (answer/email): SMTP configuration incomplete. Missing: ${missingVarNames}. Please check your .env.local file for SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL.`);
    console.log("--------------------------------------------------");
    console.log("SMTP NOT FULLY CONFIGURED. SIMULATING EMAIL LOGGING (actual email not sent):");
    console.log(`To: ${recipientEmail}`);
    console.log(`Subject: ${subject}`);
    console.log("Text Body (first 100 chars):\n", textBody.substring(0,100) + "...");
    console.log("--------------------------------------------------");
    return { success: false, message: `SMTP environment variables not fully configured. Missing: ${missingVarNames}` };
  }

  const port = parseInt(smtpPortStr!, 10);
  if (isNaN(port)) {
    console.error('API Route (answer/email): Invalid SMTP_PORT configured. Must be a number.');
    return { success: false, message: 'Invalid SMTP_PORT configured.' };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: port,
    secure: smtpSecure, // true for 465 (SSL), false for other ports (like 587 with STARTTLS)
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Consider adding a timeout if needed, e.g., connectionTimeout: 5000 (5s)
  });

  const mailOptions = {
    from: `"${emailTexts.shaykhName}" <${smtpFromEmail}>`,
    to: recipientEmail,
    replyTo: smtpFromEmail,
    subject: subject,
    text: textBody,
    html: htmlBody,
  };

  try {
    console.log(`API Route (answer/email): Attempting to send email via SMTP to ${recipientEmail} from ${smtpFromEmail} using host ${smtpHost}:${port}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`API Route (answer/email): Email sent successfully via SMTP. Message ID: ${info.messageId}`);
    return { success: true, message: "Email sent successfully via SMTP." };
  } catch (error: any) {
    console.error('API Route (answer/email): Nodemailer SMTP Error sending email:', error.message);
    console.error('API Route (answer/email): Nodemailer SMTP Full Error Object:', error);
    return { success: false, message: `Failed to send email via SMTP: ${error.message}` };
  }
}


function initializeFirebaseAdmin() {
  const appName = 'adminAppAnswerQuestionApi';
  if (admin.apps.some(app => app?.name === appName)) {
    firebaseAdminApp = admin.app(appName);
    return;
  }
  if (firebaseAdminSdkConfigString) {
    try {
      const serviceAccount = JSON.parse(firebaseAdminSdkConfigString) as ServiceAccount;
      firebaseAdminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, appName);
    } catch (e: any) {
      console.error(`API Route (${appName}): CRITICAL - Firebase Admin SDK initialization error:`, e.message);
    }
  } else {
    console.error(`API Route (${appName}): CRITICAL - FIREBASE_ADMIN_SDK_CONFIG missing.`);
  }
}

initializeFirebaseAdmin();

const answerPayloadSchema = z.object({
  youtubeLink: z.string().url({ message: "Invalid YouTube link format." }).min(1, { message: "YouTube link cannot be empty." }),
  questionEmail: z.string().email(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { questionId } = params;
  console.log(`API Route (answer): PATCH request received for questionId: ${questionId}`);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('API Route (answer): CRITICAL - Supabase URL or Service Role Key missing.');
    return NextResponse.json({ error: 'Server configuration error (Supabase).' }, { status: 500 });
  }
  if (!firebaseAdminApp) {
    console.error('API Route (answer): CRITICAL - Firebase Admin SDK not initialized.');
    return NextResponse.json({ error: 'Server configuration error (Firebase Admin).' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('API Route (answer): Unauthorized - Missing or invalid Bearer token.');
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    console.log("API Route (answer): Verifying Firebase ID token...");
    const decodedToken = await firebaseAdminApp.auth().verifyIdToken(idToken);
    console.log(`API Route (answer): Token verified for UID: ${decodedToken.uid}`);

    const rawBody = await request.json();
    const parseResult = answerPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      console.warn("API Route (answer): Invalid request payload:", parseResult.error.flatten());
      return NextResponse.json({ error: "Invalid request payload.", issues: parseResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const { youtubeLink, questionEmail } = parseResult.data;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const currentAnsweredAt = new Date().toISOString();

    console.log(`API Route (answer): Updating question ${questionId} in Supabase...`);
    const { data: updatedQuestionData, error: supabaseUpdateError } = await supabaseAdmin
      .from('questions')
      .update({
        status: 'answered',
        answer_youtube_link: youtubeLink,
        answered_at: currentAnsweredAt,
      })
      .eq('id', questionId)
      .select()
      .single();

    if (supabaseUpdateError) {
      console.error('API Route (answer): Supabase update error:', supabaseUpdateError);
      return NextResponse.json({ error: supabaseUpdateError.message || 'Failed to update question.' }, { status: 500 });
    }
    if (!updatedQuestionData) {
      console.warn(`API Route (answer): Question with ID ${questionId} not found for update.`);
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }
    console.log(`API Route (answer): Question ${questionId} updated successfully in Supabase.`);

    // Construct and send email
    const emailSubject = emailTexts.subject;
    const textEmailBody = `${emailTexts.bodyPart1}\n${emailTexts.bodyPart2}\n\n${emailTexts.bodyAnsweredAr}\n${youtubeLink}\n\n${emailTexts.bodyAnswered}\n${youtubeLink}\n\n${emailTexts.signature}\n${emailTexts.shaykhName}\n\n---\n${emailTexts.noReplyNoticeAr}\n${emailTexts.noReplyNotice}`;
    const htmlEmailBody = `<div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
<p>${emailTexts.bodyPart2}</p>
<p>${emailTexts.bodyAnsweredAr}<br/><a href="${youtubeLink}">${youtubeLink}</a></p>
<hr/>
<div dir="ltr" style="text-align: left;">
<p>${emailTexts.bodyPart1}</p>
<p>${emailTexts.bodyAnswered}<br/><a href="${youtubeLink}">${youtubeLink}</a></p>
</div>
<br/>
<p>${emailTexts.signature}</p>
<p>${emailTexts.shaykhName}</p>
<hr style="margin-top: 20px; margin-bottom: 10px;">
<p style="font-size: 0.9em; color: #777; text-align: center;">${emailTexts.noReplyNoticeAr}<br/>${emailTexts.noReplyNotice}</p>
</div>`;

    const emailResult = await sendEmailNotification(questionEmail, emailSubject, htmlEmailBody, textEmailBody);
    if (!emailResult.success) {
      console.warn(`API Route (answer): Email notification to ${questionEmail} might have failed or was simulated due to missing config. DB update was successful. Message: ${emailResult.message}`);
    }

    return NextResponse.json(updatedQuestionData);

  } catch (error: any) {
    console.error('API Route (answer): General error in PATCH handler:', error);
    if (error.code && error.code.startsWith('auth/')) {
      return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error processing request.', details: error.message }, { status: 500 });
  }
}

    