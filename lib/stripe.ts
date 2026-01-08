import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

export async function checkSubscriptionStatus(customerId: string): Promise<{
  isActive: boolean;
  subscription?: Stripe.Subscription;
}> {
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
