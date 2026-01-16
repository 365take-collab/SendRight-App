import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUserFromUtage } from '@/lib/auth'
import { grantReferralReward } from '@/lib/supabase'
import crypto from 'crypto'

// 定数時間比較（タイミングアタック対策）
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Utageからの決済完了Webhookを受け取るAPI
// UtageのWebhook設定: https://help.utage-system.com/archives/6789

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Webhookのシークレットキーで認証
    // 本番環境では必須、開発環境ではオプション
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true'
    const webhookSecret = process.env.UTAGE_WEBHOOK_SECRET
    const signature = request.headers.get('x-utage-signature')
    
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex')
      
      // 定数時間比較（タイミングアタック対策）
      const isValid = constantTimeEquals(signature, expectedSignature)
      if (!isValid) {
        console.error('Utage Webhook signature verification failed')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else if (!isDevelopment) {
      // 本番環境では署名検証が必須
      console.error('Utage Webhook signature verification is required in production')
      return NextResponse.json(
        { error: 'Webhook signature is required' },
        { status: 401 }
      )
    }

    console.log('Utage Webhook received:', JSON.stringify(body, null, 2))

    // Utageからのデータを取得
    // 注意: Utageの実際のWebhookペイロード形式に合わせて調整が必要
    // UtageのWebhook形式: https://help.utage-system.com/archives/6789
    const {
      email,
      name,
      product_name,
      product_id,
      order_id,
      payment_status,
      subscription_type, // 'monthly' or 'yearly'
      utage_customer_id,
      // Utageの実際のWebhook形式に合わせて追加
      status, // 'completed', 'canceled', 'refunded' など
      amount,
      currency,
      customer_email,
      customer_name,
      // UnivaPay関連の情報
      subscription_id, // UnivaPayのサブスクリプションID
      stripe_subscription_id, // StripeのサブスクリプションID（UnivaPay経由の場合）
      univapay_subscription_id, // UnivaPayのサブスクリプションID
      payment_provider, // 'stripe', 'univapay' など
    } = body

    // メールアドレスの取得（複数の形式に対応）
    const userEmail = email || customer_email
    const userName = name || customer_name

    // 決済状況を確認
    // UtageのWebhook形式に合わせて、status または payment_status を確認
    const isCompleted = 
      payment_status === 'completed' || 
      payment_status === 'succeeded' ||
      status === 'completed' ||
      status === 'succeeded'
    
    const isCanceled = 
      payment_status === 'canceled' || 
      payment_status === 'cancelled' ||
      status === 'canceled' ||
      status === 'cancelled'
    
    const isRefunded = 
      payment_status === 'refunded' ||
      status === 'refunded'

    // キャンセルまたは返金の場合の処理
    if (isCanceled || isRefunded) {
      console.log('Payment canceled or refunded, deactivating subscription:', { 
        payment_status, 
        status, 
        email: userEmail 
      })

      // SendRightのインメモリDBからユーザーを検索して更新
      // 注意: SendRightはインメモリDBを使用しているため、実際の実装では
      // ユーザーのサブスクリプション状態を無効化する処理が必要
      // 現時点では、createOrUpdateUserFromUtageでisSubscribed=falseとして更新
      try {
        await createOrUpdateUserFromUtage(
          userEmail,
          `utage_${utage_customer_id || order_id || Date.now()}`,
          false // サブスクリプションを無効化
        )
        console.log('Subscription deactivated via Utage:', {
          email: userEmail,
          reason: isCanceled ? 'canceled' : 'refunded',
        })
        return NextResponse.json({
          received: true,
          action: 'subscription_deactivated',
          reason: isCanceled ? 'canceled' : 'refunded',
        })
      } catch (error) {
        console.error('Error deactivating subscription:', error)
        return NextResponse.json({ received: true, action: 'skipped', reason: 'error' })
      }
    }

    // 決済完了以外の場合はスキップ
    if (!isCompleted) {
      console.log('Payment not completed, skipping:', { payment_status, status })
      return NextResponse.json({ received: true, action: 'skipped' })
    }

    // メールアドレスが必須
    if (!userEmail) {
      console.error('Email is required', { body })
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Utage顧客IDを生成（Stripe顧客IDの代わりに使用）
    // 注意: SendRightはStripeベースだが、Utage経由の場合はUtage顧客IDを使用
    const utageCustomerId = `utage_${utage_customer_id || order_id || Date.now()}`

    // 追加課金商品の判定（商品IDまたは商品名から使用回数制限を判定）
    const { updateDailyUsageLimit } = await import('@/lib/auth')
    const { findUserByEmail } = await import('@/lib/auth')
    
    // 商品IDと使用回数制限のマッピング（月額プラン用）
    const productIdToLimitMonthly: Record<string, number> = {
      [process.env.UTAGE_PRODUCT_ID_100_MONTHLY || process.env.UTAGE_PRODUCT_ID_100 || '']: 100,
      [process.env.UTAGE_PRODUCT_ID_150_MONTHLY || process.env.UTAGE_PRODUCT_ID_150 || '']: 150,
      [process.env.UTAGE_PRODUCT_ID_200_MONTHLY || process.env.UTAGE_PRODUCT_ID_200 || '']: 200,
      [process.env.UTAGE_PRODUCT_ID_250_MONTHLY || process.env.UTAGE_PRODUCT_ID_250 || '']: 250,
    };

    // 商品IDと使用回数制限のマッピング（年額プラン用）
    const productIdToLimitYearly: Record<string, number> = {
      [process.env.UTAGE_PRODUCT_ID_100_YEARLY || '']: 100,
      [process.env.UTAGE_PRODUCT_ID_150_YEARLY || '']: 150,
      [process.env.UTAGE_PRODUCT_ID_200_YEARLY || '']: 200,
      [process.env.UTAGE_PRODUCT_ID_250_YEARLY || '']: 250,
    };

    // 商品名から使用回数制限を判定（フォールバック）
    const productNameToLimit: Record<string, number> = {
      'SendRight 100回/日プラン': 100,
      'SendRight 150回/日プラン': 150,
      'SendRight 200回/日プラン': 200,
      'SendRight 250回/日プラン': 250,
      'SendRight 100回/日プラン（年額）': 100,
      'SendRight 150回/日プラン（年額）': 150,
      'SendRight 200回/日プラン（年額）': 200,
      'SendRight 250回/日プラン（年額）': 250,
    };

    // プラン種別を判定（subscription_typeまたは商品名から）
    const isYearly = subscription_type === 'yearly' || 
                     (product_name && product_name.includes('年額'));
    
    // 商品IDから使用回数制限を判定
    let newLimit: number | null = null;
    const productIdToLimit = isYearly ? productIdToLimitYearly : productIdToLimitMonthly;
    
    if (product_id && productIdToLimit[product_id]) {
      newLimit = productIdToLimit[product_id];
    } else if (product_name && productNameToLimit[product_name]) {
      newLimit = productNameToLimit[product_name];
    }

    // ユーザーを作成または更新（サブスクリプションを有効化）
    try {
      // プラン種別を判定（subscription_typeまたは商品名から）
      const subscriptionType: 'monthly' | 'yearly' = 
        subscription_type === 'yearly' || (product_name && product_name.includes('年額'))
          ? 'yearly'
          : 'monthly';
      
      const user = await createOrUpdateUserFromUtage(
        userEmail,
        utageCustomerId,
        true, // サブスクリプションを有効化
        subscriptionType // プラン種別を渡す
      )
      
          // 追加課金商品の場合は使用回数制限を更新
          if (newLimit) {
            updateDailyUsageLimit(user.id, newLimit);
            console.log('Daily usage limit updated via Utage:', {
              email: userEmail,
              newLimit,
              productId: product_id,
              productName: product_name,
            });

            // 150回/日プラン以降の場合、基本プラン（¥6,980/月）のサブスクリプションを解除
            if (newLimit >= 150) {
              try {
                // 決済プロバイダーを判定（UnivaPayまたはStripe）
                const provider = payment_provider || 'stripe'; // デフォルトはStripe
                
                if (provider === 'univapay' || univapay_subscription_id) {
                  // UnivaPayを使用している場合
                  // 注意: UnivaPay APIの実装が必要な場合があります
                  // UtageのWebhookからUnivaPayのサブスクリプションIDが送られてくる場合、
                  // UnivaPay APIを使ってサブスクリプションを解除する必要があります
                  
                  console.log('UnivaPay subscription cancellation:', {
                    email: userEmail,
                    univapaySubscriptionId: univapay_subscription_id || subscription_id,
                    newLimit,
                    note: 'UnivaPay APIの実装が必要な場合があります。UtageのWebhookペイロードを確認してください。',
                  });
                  
                  // TODO: UnivaPay APIを使ってサブスクリプションを解除
                  // UnivaPay APIの実装が必要な場合は、以下のように実装してください：
                  // const univapayApiKey = process.env.UNIVAPAY_API_KEY;
                  // const storeId = process.env.UNIVAPAY_STORE_ID;
                  // const subscriptionId = univapay_subscription_id || subscription_id;
                  // await fetch(`https://api.univapay.com/stores/${storeId}/subscriptions/${subscriptionId}`, {
                  //   method: 'DELETE',
                  //   headers: {
                  //     'Authorization': `Bearer ${univapayApiKey}`,
                  //   },
                  // });
                } else if (user.stripeCustomerId) {
                  // Stripeを使用している場合（UnivaPay経由でもStripe APIが使える場合）
                  const { stripe } = await import('@/lib/stripe');
                  
                  // Stripeが設定されていない場合はスキップ
                  if (!stripe) {
                    console.log('Stripe is not configured, skipping subscription cancellation');
                  } else {
                    // ユーザーのアクティブなサブスクリプションを取得
                    const subscriptions = await stripe.subscriptions.list({
                      customer: user.stripeCustomerId,
                      status: 'active',
                    });

                    // 基本プラン（¥6,980/月）のサブスクリプションを検索
                    // 月額プランの場合: ¥6,980 = 698000（Stripeは金額をセント単位で保存）
                    // 年額プランの場合: ¥59,800 = 5980000
                    const basicPlanSubscription = subscriptions.data.find((sub) => {
                      const price = sub.items.data[0]?.price;
                      if (!price) return false;
                      
                      // 月額¥6,980または年額¥59,800のサブスクリプションを検索
                      const amount = price.unit_amount || 0;
                      return amount === 698000 || amount === 5980000;
                    });

                    if (basicPlanSubscription) {
                      // 基本プランのサブスクリプションを解除
                      await stripe.subscriptions.cancel(basicPlanSubscription.id);
                      console.log('Basic plan subscription cancelled (Stripe):', {
                        email: userEmail,
                        subscriptionId: basicPlanSubscription.id,
                        newLimit,
                      });
                    } else {
                      console.log('Basic plan subscription not found (Stripe):', {
                        email: userEmail,
                        customerId: user.stripeCustomerId,
                        activeSubscriptions: subscriptions.data.length,
                      });
                    }
                  }
                } else {
                  console.log('No payment provider information available:', {
                    email: userEmail,
                    newLimit,
                    paymentProvider: provider,
                  });
                }
              } catch (error) {
                console.error('Error cancelling basic plan subscription:', error);
                // エラーが発生しても、新しいプランの使用回数制限は更新済みなので続行
              }
            }
          }
      
      console.log('User created or updated via Utage:', user.id, {
        email: userEmail,
        isSubscribed: user.isSubscribed,
        dailyUsageLimit: user.dailyUsageLimit,
      })

      // 紹介報酬を付与（紹介経由で登録したユーザーが有料転換した場合）
      let referralReward = null;
      try {
        const rewardResult = await grantReferralReward(userEmail);
        if (rewardResult.success) {
          referralReward = rewardResult.reward;
          console.log('Referral reward granted:', {
            referredEmail: userEmail,
            rewardPercent: referralReward,
          });
        }
      } catch (refError) {
        console.error('Error granting referral reward:', refError);
        // エラーが発生しても続行
      }

      return NextResponse.json({
        received: true,
        action: 'user_created_or_upgraded',
        userId: user.id,
        isSubscribed: user.isSubscribed,
        dailyUsageLimit: user.dailyUsageLimit,
        limitUpdated: !!newLimit,
        referralReward,
      })
    } catch (error) {
      console.error('Error creating or updating user:', error)
      return NextResponse.json(
        { error: 'Failed to create or update user', details: String(error) },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Utage Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: String(error) },
      { status: 500 }
    )
  }
}

// Webhookの検証用（GET）
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Utage Webhook endpoint is ready',
    endpoint: '/api/webhooks/utage',
  })
}
