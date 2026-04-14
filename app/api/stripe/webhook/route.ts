import { NextRequest, NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { findUserByEmail, createUser, generateInitialPassword } from '@/lib/auth';
import { updateUser, grantReferralReward, recordStripeWebhookEvent, markStripeWebhookEventProcessed, markStripeWebhookEventFailed } from '@/lib/supabase';
import { sendCancellationEmail, sendWelcomeEmail } from '@/lib/resend';
import { notifyError } from '@/lib/slack';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const stripe = requireStripe();
  
  let event: Stripe.Event;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'STRIPE_WEBHOOK_SECRET is not set' },
        { status: 500 }
      );
    }

    // Webhook署名を検証
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const record = await recordStripeWebhookEvent({
    eventId: event.id,
    eventType: event.type,
    stripeCreatedAt: event.created ? new Date(event.created * 1000).toISOString() : undefined,
  });

  if (!record.created) {
    console.log(`Duplicate webhook event ignored: ${event.id}`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    let handled = true;
    // イベントタイプに応じて処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        handled = false;
        console.log(`Unhandled event type: ${event.type}`);
    }

    await markStripeWebhookEventProcessed(event.id, handled ? 'processed' : 'ignored');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    await markStripeWebhookEventFailed(event.id, error instanceof Error ? error.message : String(error));
    await notifyError('/api/stripe/webhook', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Checkout完了時の処理
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const customerEmail = session.customer_email || session.customer_details?.email;
  const plan = session.metadata?.plan as 'monthly' | 'yearly' | undefined;
  const type = session.metadata?.type;

  if (!customerEmail) {
    console.error('No customer email in checkout session');
    return;
  }

  // 追加課金（addon）の場合
  if (type === 'addon') {
    const dailyLimit = parseInt(session.metadata?.daily_limit || '50', 10);
    const userId = session.metadata?.user_id;

    if (userId) {
      await updateUser(userId, {
        daily_usage_limit: dailyLimit,
        stripe_customer_id: customerId,
      });
      console.log('Addon checkout completed:', { email: customerEmail, dailyLimit, userId });
    } else {
      // user_idがない場合はemailで検索
      const user = await findUserByEmail(customerEmail);
      if (user) {
        await updateUser(user.id, {
          daily_usage_limit: dailyLimit,
          stripe_customer_id: customerId,
        });
        console.log('Addon checkout completed (by email):', { email: customerEmail, dailyLimit });
      } else {
        console.error('User not found for addon checkout:', customerEmail);
      }
    }
    return;
  }

  // 通常の新規サブスクリプション
  let user = await findUserByEmail(customerEmail);
  let initialPassword: string | undefined;

  if (!user) {
    initialPassword = generateInitialPassword();
    user = await createUser(customerEmail, initialPassword);
  }

  // Stripe Customer IDを保存
  await updateUser(user.id, {
    stripe_customer_id: customerId,
    is_subscribed: true,
    subscription_type: plan || 'monthly',
    daily_usage_limit: 50,
  });

  // ウェルカムメール送信（ログイン情報付き）
  try {
    await sendWelcomeEmail(customerEmail, plan || 'monthly', initialPassword);
    console.log('Welcome email sent:', customerEmail);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  // 紹介報酬を付与（紹介経由で登録したユーザーが有料転換した場合）
  try {
    await grantReferralReward(customerEmail);
  } catch (error) {
    console.error('Failed to grant referral reward:', error);
  }

  console.log('Checkout completed:', {
    email: customerEmail,
    plan,
    userId: user.id,
    isNewUser: !!initialPassword,
  });
}

// サブスクリプション更新時の処理
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const plan = subscription.metadata?.plan as 'monthly' | 'yearly' | undefined;

  // Customerからemailを取得
  const stripe = requireStripe();
  const customer = await stripe.customers.retrieve(customerId);
  
  if (customer.deleted || !('email' in customer) || !customer.email) {
    console.error('Customer not found or has no email');
    return;
  }

  const user = await findUserByEmail(customer.email);
  if (!user) {
    console.error('User not found:', customer.email);
    return;
  }

  // サブスクリプション状態を更新（active と trialing の両方を有効とする）
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  await updateUser(user.id, {
    is_subscribed: isActive,
    subscription_type: plan || 'monthly',
  });

  console.log('Subscription updated:', {
    email: customer.email,
    plan,
    status: subscription.status,
  });
}

// サブスクリプション解約時の処理
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Customerからemailを取得
  const stripe = requireStripe();
  const customer = await stripe.customers.retrieve(customerId);
  
  if (customer.deleted || !('email' in customer) || !customer.email) {
    console.error('Customer not found or has no email');
    return;
  }

  const user = await findUserByEmail(customer.email);
  if (!user) {
    console.error('User not found:', customer.email);
    return;
  }

  // サブスクリプションを無効化
  await updateUser(user.id, {
    is_subscribed: false,
  });

  await sendCancellationEmail(customer.email);

  console.log('Subscription deleted:', {
    email: customer.email,
    userId: user.id,
  });
}
