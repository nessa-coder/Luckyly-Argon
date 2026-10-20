/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc, collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase.ts';
import { EmailEvent, EmailType } from '../types/luckyly.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { recordAuditEvent } from './auditService.ts';

import { trackEvent } from './analyticsService.ts';

export async function sendAutomatedEmail(params: {
  userId: string;
  recipientEmail: string;
  type: EmailType;
  subject: string;
  bodyHtml: string;
  metadata?: Record<string, any>;
}): Promise<EmailEvent> {
  const emailId = 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const emailEvent: EmailEvent = {
    id: emailId,
    userId: params.userId,
    recipientEmail: params.recipientEmail,
    type: params.type,
    subject: params.subject,
    bodyHtml: params.bodyHtml,
    sentAt: now,
    status: 'delivered',
    metadata: params.metadata || {},
  };

  try {
    await setDoc(doc(db, 'email_events', emailId), cleanFirestoreData(emailEvent));

    await recordAuditEvent({
      eventType: 'EMAIL_SENT',
      actorId: 'SYSTEM',
      actorType: 'SYSTEM',
      userId: params.userId,
      reason: `Automated transactional email (${params.type}) dispatched to ${params.recipientEmail}`,
      metadata: {
        emailId,
        type: params.type,
        subject: params.subject,
      },
    });

    // Required Funnel Tracking Event (Section 13)
    trackEvent('email_sent', {
      userId: params.userId,
      status: 'success',
      metadata: { emailId, type: params.type },
    });

    return emailEvent;
  } catch (error) {
    trackEvent('email_delivery_failed', {
      userId: params.userId,
      status: 'failure',
      metadata: { type: params.type },
    });
    handleFirestoreError(error, OperationType.CREATE, `email_events/${emailId}`);
  }
}

export function subscribeToUserEmails(
  userId: string,
  onUpdate: (emails: EmailEvent[]) => void
) {
  const q = query(
    collection(db, 'email_events'),
    where('userId', '==', userId),
    orderBy('sentAt', 'desc')
  );
  return onSnapshot(
    q,
    snapshot => {
      const list = snapshot.docs.map(doc => doc.data() as EmailEvent);
      onUpdate(list);
    },
    error => {
      handleFirestoreError(error, OperationType.GET, 'email_events');
    }
  );
}

// Pre-built email templates with clean, luxury branding
export function createWelcomeEmail(displayName: string, cohortName: string, coinsAwarded: number): { subject: string; bodyHtml: string } {
  const name = displayName || 'Luckyly Founding Member';
  return {
    subject: `Welcome to the Luckyly Waitlist, ${name}! (1,500 Coins Entitlement Reserved)`,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; color: #f1f5f9; background: #07080a; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.3);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 30px; font-weight: 800; color: #D4AF37; letter-spacing: 1px; font-family: Georgia, serif;">Luckyly</span>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.1em; text-transform: uppercase;">Be there from the beginning • October 16, 2026</div>
        </div>
        <div style="background: linear-gradient(135deg, #161822 0%, #0d0e14 100%); color: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; text-align: center; border: 1px solid rgba(212, 175, 55, 0.25);">
          <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #ffffff;">Welcome to the Luckyly Waitlist, ${name}!</h2>
          <p style="margin: 0; color: #cbd5e1; font-size: 14px;">Membership Tier: <strong style="color: #D4AF37;">${cohortName}</strong></p>
          <div style="margin-top: 16px; display: inline-block; background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.4); padding: 8px 22px; border-radius: 9999px; font-size: 16px; font-weight: 700; color: #F5D77F;">
            🪙 ${coinsAwarded.toLocaleString()} Luckyly Coins Entitlement Reserved
          </div>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          You have successfully joined the official Phase 1 Luckyly waitlist. Your base early allocation of <strong>${coinsAwarded.toLocaleString()} Coins</strong> is securely recorded in your transparent account ledger for upcoming distribution as we build toward our October 16, 2026 launch.
        </p>
        <div style="background: #0f1118; border-left: 4px solid #D4AF37; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #ffffff;">Help Shape Our Future Rewards</h4>
          <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
            Take 60 seconds to answer our onboarding questions about your favorite reward categories and earn an additional <strong>+100 Coins</strong> for your feedback.
          </p>
        </div>
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
          <div>Luckyly • Phase 1 Free Waitlist • No Purchase Necessary</div>
          <div style="margin-top: 6px;">
            You received this because you joined the Luckyly waitlist. 
            <a href="#unsubscribe" style="color: #94a3b8; text-decoration: underline; margin-left: 4px;">Unsubscribe from updates</a>
          </div>
        </div>
      </div>
    `,
  };
}

export function createQuestionnaireRewardEmail(displayName: string, coinsAwarded: number): { subject: string; bodyHtml: string } {
  const name = displayName || 'Luckyly Member';
  return {
    subject: `✨ Questionnaire Completed! +${coinsAwarded} Luckyly Coins credited`,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; color: #f1f5f9; background: #07080a; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.3);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 30px; font-weight: 800; color: #D4AF37; letter-spacing: 1px; font-family: Georgia, serif;">Luckyly</span>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.1em; text-transform: uppercase;">Market Research Insights</div>
        </div>
        <div style="background: linear-gradient(135deg, #161822 0%, #0d0e14 100%); color: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; text-align: center; border: 1px solid rgba(212, 175, 55, 0.25);">
          <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 18px;">Questionnaire Completed</h3>
          <p style="margin: 0; color: #cbd5e1; font-size: 14px;">Thank you for your valuable feedback, <strong style="color: #D4AF37;">${name}</strong>!</p>
          <div style="margin-top: 16px; display: inline-block; background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.4); padding: 8px 22px; border-radius: 9999px; font-size: 16px; font-weight: 700; color: #F5D77F;">
            🪙 +${coinsAwarded} Luckyly Coins Added to Ledger
          </div>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Your market research responses have been securely and anonymously recorded. These preferences help our founding team decide the exact rewards and gift card brands for upcoming community draws.
        </p>
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
          <div>Luckyly • Phase 1 Free Waitlist • No Purchase Necessary</div>
        </div>
      </div>
    `,
  };
}

export function createDrawEnteredEmail(
  displayName: string,
  drawTitle: string,
  selectedRegion: string,
  minParticipants: number,
  deadline: string
): { subject: string; bodyHtml: string } {
  return {
    subject: `🎟️ Entry Confirmed: ${drawTitle} (${selectedRegion})`,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 26px; font-weight: 800; color: #0284c7;">Luckyly</span>
        </div>
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Your Draw Entry is Confirmed!</h2>
        <p style="font-size: 14px; color: #475569;">
          You have officially joined the draw for: <strong>${drawTitle}</strong>.
        </p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px;">
          <div style="margin-bottom: 8px;"><strong>Designated Prize Region:</strong> ${selectedRegion} (Amazon gift card)</div>
          <div style="margin-bottom: 8px;"><strong>Minimum Required Participants:</strong> ${minParticipants.toLocaleString()}</div>
          <div><strong>Draw Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</div>
        </div>
        <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
          Transparent Rule Reminder: If the minimum participant threshold is not reached by the deadline, the draw does not execute and you automatically receive alternative Luckyly Coin compensation directly into your ledger.
        </p>
      </div>
    `,
  };
}

export function createDrawResultEmail(
  displayName: string,
  drawTitle: string,
  isWinner: boolean,
  winnerName: string,
  selectedRegion: string
): { subject: string; bodyHtml: string } {
  return {
    subject: isWinner
      ? `🏆 CONGRATULATIONS! You won the ${drawTitle}!`
      : `📢 Draw Results Announced: ${drawTitle}`,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 26px; font-weight: 800; color: #0284c7;">Luckyly</span>
        </div>
        ${
          isWinner
            ? `
            <div style="background: #fefce8; border: 1px solid #fde047; padding: 20px; border-radius: 12px; text-align: center;">
              <h2 style="color: #854d0e; margin: 0 0 8px 0;">🎉 You Are The Winner!</h2>
              <p style="color: #a16207; font-size: 15px; margin: 0;">Prize: <strong>${drawTitle}</strong></p>
              <p style="color: #713f12; font-size: 13px; margin-top: 12px;">Region: ${selectedRegion} Amazon Marketplace. Our fulfillment team will securely issue your Amazon gift voucher code to your registered email.</p>
            </div>
            `
            : `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
              <h3 style="margin: 0 0 8px 0; color: #0f172a;">Draw Concluded</h3>
              <p style="margin: 0; font-size: 14px; color: #475569;">
                The draw for <strong>${drawTitle}</strong> has concluded. The winning entry selected by the transparent draw engine is: <strong>${winnerName}</strong> (${selectedRegion}).
              </p>
              <p style="margin-top: 12px; font-size: 13px; color: #64748b;">
                Thank you for participating! Check out other active regional campaigns on Luckyly.
              </p>
            </div>
            `
        }
      </div>
    `,
  };
}

export function createFailedDrawCompensationEmail(
  displayName: string,
  drawTitle: string,
  compensationCoins: number,
  participantsCount: number,
  minRequired: number
): { subject: string; bodyHtml: string } {
  return {
    subject: `🛡️ Draw Compensation: +${compensationCoins} Coins credited (${drawTitle})`,
    bodyHtml: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 26px; font-weight: 800; color: #0284c7;">Luckyly</span>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 12px; text-align: center;">
          <h3 style="margin: 0 0 8px 0; color: #1e40af;">Minimum Threshold Not Met</h3>
          <p style="margin: 0; font-size: 13px; color: #1e3a8a;">
            The draw for <strong>${drawTitle}</strong> reached ${participantsCount} participants out of the required ${minRequired}.
          </p>
          <div style="margin-top: 16px; display: inline-block; background: #2563eb; color: white; padding: 8px 18px; border-radius: 9999px; font-weight: 700; font-size: 15px;">
            💰 Alternative Reward: +${compensationCoins} Luckyly Coins
          </div>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 16px;">
          Per Luckyly's transparent campaign rules, when a draw does not meet its threshold, participants are immediately protected with guaranteed Coin compensation in their ledger.
        </p>
      </div>
    `,
  };
}
