import { NextRequest, NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { findUserByEmail, createUser } from '@/lib/auth';
import { updateUser } from '@/lib/supabase';
import { grantReferralReward } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';

// UTAGE フォームURL
const UTAGE_FORM_URLS = {
  monthly: 'https://utage-system.com/r/QMRGq4WA1pZW/store',
  yearly: 'https://utage-system.com/r/eqdgSFrcTKs9/store',
};

// UTAGEにユーザーを登録
async function registerToUtage(email: string, name: string, plan: 'monthly' | 'yearly') {
  const formUrl = UTAGE_FORM_URLS[plan];
  
  try {
    const formData = new URLSearchParams();
    formData.append('mail', email);
    formData.append('name', name || email.split('@')[0]); // 名前がない場合はメールアドレスの@前を使用
    
    const response = await fetch(formUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    console.log('UTAGE registration result:', {
      email,
      plan,
      status: response.status,
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to register to UTAGE:', error);
    return false;
  }
}

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

  try {
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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
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
  const customerName = session.customer_details?.name || '';
  const plan = session.metadata?.plan as 'monthly' | 'yearly' | undefined;

  if (!customerEmail) {
    console.error('No customer email in checkout session');
    return;
  }

  // ユーザーを検索または作成
  let user = await findUserByEmail(customerEmail);
  
  if (!user) {
    // 新規ユーザー作成
    user = await createUser(customerEmail);
  }

  // Stripe Customer IDを保存
  await updateUser(user.id, {
    stripe_customer_id: customerId,
    is_subscribed: true,
    subscription_type: plan || 'monthly',
    daily_usage_limit: 50, // デフォルトの使用回数制限
  });

  // UTAGEに登録（ウェルカムメール・ステップメール配信用）
  try {
    await registerToUtage(customerEmail, customerName, plan || 'monthly');
    console.log('UTAGE registration successful:', customerEmail);
  } catch (error) {
    console.error('Failed to register to UTAGE:', error);
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

  // サブスクリプション状態を更新
  const isActive = subscription.status === 'active';
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

  // TODO: Resend準備完了後に解約メール送信を有効化
  // try {
  //   await sendCancellationEmail(customer.email);
  // } catch (error) {
  //   console.error('Failed to send cancellation email:', error);
  // }

  console.log('Subscription deleted:', {
    email: customer.email,
    userId: user.id,
  });
}
