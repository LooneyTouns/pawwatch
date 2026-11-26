// supabase/functions/create-payment-intent/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const { montant, garde_id, description } = await req.json();

    if (!montant || montant <= 0) {
      return new Response(JSON.stringify({ error: 'Montant invalide' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(Number(montant) * 100), // € → centimes
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: { garde_id: garde_id ?? '' },
      description: description ?? 'Garde PawWatch',
    });

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
