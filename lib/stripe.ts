import Stripe from 'stripe';

// Updated: 2026-02-03 - Testing Codex auto-review hook v5 (fixed codex command)
// Stripe設定（必須）
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe features will be disabled.');
}

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey)
  : null;

// Stripeが設定されていない場合のヘルパー
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not set. Stripe features are disabled.');
  }
  return stripe;
}

export async function checkSubscriptionStatus(customerId: string): Promise<{
  isActive: boolean;
  subscription?: Stripe.Subscription;
}> {
// Stripeが設定されていない場合はスキップ
  if (!stripe) {
    console.log('Stripe is not configured, skipping subscription check');
    return { isActive: false };
  }
  
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const hasActiveSubscription = subscriptions.data.length > 0;
    const subscription = hasActiveSubscription ? subscriptions.data[0] : undefined;

    return {
      isActive: hasActiveSubscription,
      subscription,
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      isActive: false,
    };
  }
}

export async function getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  // Stripeが設定されていない場合はスキップ
  if (!stripe) {
    console.log('Stripe is not configured, skipping customer lookup');
    return null;
  }
  
  try {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    return customers.data[0] || null;
  } catch (error) {
    console.error('Error getting customer by email:', error);
    return null;
  }
}
