import type { AppLocale } from '../utils/locale.js';

type EmailCopy = {
  subject: string;
  headline: string;
  body: string;
  footer?: string;
  cta?: string;
};

const otpCopy: Record<AppLocale, (otp: string, ttlMinutes: number) => EmailCopy> = {
  en: (otp, ttlMinutes) => ({
    subject: 'Your TrafficMENA verification code',
    headline: 'TrafficMENA Verification Code',
    body: `Use the code below to access your account. This code expires in ${ttlMinutes} minutes.`,
    footer: "If you didn't request this code, you can safely ignore this email.",
    cta: otp,
  }),
  ar: (otp, ttlMinutes) => ({
    subject: 'رمز التحقق من TrafficMENA',
    headline: 'رمز التحقق من TrafficMENA',
    body: `استخدم الرمز أدناه للوصول إلى حسابك. ينتهي صلاحية هذا الرمز خلال ${ttlMinutes} دقيقة.`,
    footer: 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.',
    cta: otp,
  }),
};

export function getOtpEmailCopy(locale: AppLocale, otp: string, ttlMinutes: number): EmailCopy {
  return otpCopy[locale](otp, ttlMinutes);
}

type EmailChangeCopy = {
  subject: string;
  headline: string;
  body: string;
  footer: string;
};

const emailChangeRequested: Record<AppLocale, (maskedNewEmail: string) => EmailChangeCopy> = {
  en: (masked) => ({
    subject: 'Security alert: a change to your TrafficMENA email was requested',
    headline: 'Email change requested',
    body: `We received a request to change your TrafficMENA email to ${masked}. If this wasn't you, do not share any code and contact support immediately — your account may be targeted.`,
    footer: 'This is an automated security notice from TrafficMENA.',
  }),
  ar: (masked) => ({
    subject: 'تنبيه أمني: تم طلب تغيير بريد TrafficMENA الإلكتروني',
    headline: 'تم طلب تغيير البريد الإلكتروني',
    body: `تلقينا طلبًا لتغيير بريدك الإلكتروني في TrafficMENA إلى ${masked}. إذا لم تكن أنت من طلب ذلك، لا تشارك أي رمز وتواصل مع الدعم فورًا — قد يكون حسابك مستهدفًا.`,
    footer: 'هذا إشعار أمني تلقائي من TrafficMENA.',
  }),
};

const emailChangeCompleted: Record<AppLocale, (maskedNewEmail: string) => EmailChangeCopy> = {
  en: (masked) => ({
    subject: 'Your TrafficMENA email address was changed',
    headline: 'Email address changed',
    body: `Your TrafficMENA email was changed to ${masked}. If you did not make this change, contact support immediately.`,
    footer: 'This is an automated security notice from TrafficMENA.',
  }),
  ar: (masked) => ({
    subject: 'تم تغيير بريدك الإلكتروني في TrafficMENA',
    headline: 'تم تغيير البريد الإلكتروني',
    body: `تم تغيير بريدك الإلكتروني في TrafficMENA إلى ${masked}. إذا لم تقم بهذا التغيير، تواصل مع الدعم فورًا.`,
    footer: 'هذا إشعار أمني تلقائي من TrafficMENA.',
  }),
};

export function getEmailChangeCopy(
  locale: AppLocale,
  status: 'requested' | 'completed',
  maskedNewEmail: string,
): EmailChangeCopy {
  return status === 'requested'
    ? emailChangeRequested[locale](maskedNewEmail)
    : emailChangeCompleted[locale](maskedNewEmail);
}

type InvitationCopy = {
  subject: string;
  headline: string;
  greeting: string;
  intro: string;
  cta: string;
  expiryLabel: string;
  linkFallback: string;
  footer: string;
};

export function getInvitationEmailCopy(
  locale: AppLocale,
  args: {
    firstName?: string | null;
    inviterName?: string | null;
    expiresAt: Date;
  },
): InvitationCopy {
  const greetingName = args.firstName?.trim() ? args.firstName.trim() : locale === 'ar' ? 'صديقي' : 'there';
  const inviter = args.inviterName?.trim() || (locale === 'ar' ? 'أحد منظمي TrafficMENA' : 'A TrafficMENA host');
  const friendlyExpiry = args.expiresAt.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  });

  if (locale === 'ar') {
    return {
      subject: `${inviter} دعاك للانضمام إلى TrafficMENA`,
      headline: 'أنت مدعو إلى TrafficMENA',
      greeting: `مرحبًا ${greetingName}،`,
      intro: `${inviter} يرحب بك في مجتمع TrafficMENA. انقر أدناه لتأكيد حسابك والوصول إلى الفعاليات ومكتبة المعرفة.`,
      cta: 'قبول الدعوة',
      expiryLabel: `تنتهي صلاحية هذه الدعوة في ${friendlyExpiry}. إذا لم يعمل الزر، انسخ الرابط التالي:`,
      linkFallback: '',
      footer: 'إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها بأمان.',
    };
  }

  return {
    subject: `${inviter} invited you to TrafficMENA`,
    headline: "You're invited to TrafficMENA",
    greeting: `Hi ${greetingName},`,
    intro: `${inviter} would like you to join the TrafficMENA community. Click below to confirm your account and access upcoming events and the knowledge library.`,
    cta: 'Accept invitation',
    expiryLabel: `This invitation expires on ${friendlyExpiry}. If the button does not work, copy and paste this link into your browser:`,
    linkFallback: '',
    footer: "If you didn't expect this email, you can safely ignore it.",
  };
}

type RegistrationConfirmationCopy = {
  subject: string;
  headline: string;
  intro: string;
  googleCalendar: string;
  viewConfirmation: string;
  icsNote: string;
  footer: string;
};

export function getEventRegistrationEmailCopy(
  locale: AppLocale,
  eventTitle: string,
): RegistrationConfirmationCopy {
  if (locale === 'ar') {
    return {
      subject: `تم تسجيلك: ${eventTitle}`,
      headline: 'تم تأكيد تسجيلك!',
      intro: `تم تأكيد تسجيلك في ${eventTitle}.`,
      googleCalendar: 'إضافة إلى Google Calendar',
      viewConfirmation: 'عرض صفحة التأكيد',
      icsNote:
        'أرفقنا ملف تقويم (.ics) لـ Apple Calendar و Outlook. الجلسات عبر الإنترنت ترتبط بصفحة الفعالية — وليس برابط الاجتماع المباشر.',
      footer: 'TrafficMENA',
    };
  }
  return {
    subject: `You're registered: ${eventTitle}`,
    headline: "You're registered!",
    intro: `Your registration for ${eventTitle} is confirmed.`,
    googleCalendar: 'Add to Google Calendar',
    viewConfirmation: 'View confirmation page',
    icsNote:
      'We attached a calendar file (.ics) for Apple Calendar and Outlook. Online sessions link to your TrafficMENA event page — not the raw meeting link.',
    footer: 'TrafficMENA',
  };
}

export function getTrackRegistrationEmailCopy(
  locale: AppLocale,
  trackTitle: string,
  sessionCount: number,
): RegistrationConfirmationCopy {
  if (locale === 'ar') {
    return {
      subject: `تم تأكيد حجز المسار: ${trackTitle}`,
      headline: 'تم تأكيد حجز المسار',
      intro: `تم تأكيد حجزك لـ ${trackTitle}. أضف جميع الجلسات (${sessionCount}) إلى تقويمك.`,
      googleCalendar: 'إضافة إلى Google Calendar',
      viewConfirmation: 'عرض صفحة التأكيد',
      icsNote:
        'أرفقنا ملف تقويم (.ics) يتضمن جميع الجلسات. الجلسات عبر الإنترنت ترتبط بصفحة الفعالية — وليس برابط الاجتماع المباشر.',
      footer: 'TrafficMENA',
    };
  }
  return {
    subject: `Track booking confirmed: ${trackTitle}`,
    headline: 'Track booking confirmed',
    intro: `Your booking for ${trackTitle} is confirmed. Add all ${sessionCount} session(s) to your calendar.`,
    googleCalendar: 'Add to Google Calendar',
    viewConfirmation: 'View confirmation page',
    icsNote:
      'We attached a calendar file (.ics) with all sessions. Online sessions link to your TrafficMENA event page — not the raw meeting link.',
    footer: 'TrafficMENA',
  };
}

export function emailHtmlDir(locale: AppLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function emailHtmlLang(locale: AppLocale): string {
  return locale;
}
