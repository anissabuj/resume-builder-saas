# ResumeLite

A Next.js resume builder with a one-time $2 WooCommerce payment before PDF download.

## Current features

- Editable resume fields and live preview
- Resume content saved in the visitor's browser local storage
- One-time WooCommerce checkout using the store's enabled payment gateways
- WooCommerce product is created automatically on the first checkout (hidden, virtual, $2 USD, SKU `resumelite-pdf-download`)
- Server-side order verification before every PDF download
- Server-generated PDF (the browser cannot unlock a download by changing client-side state)

## Environment variables

Set these in the Hostinger Node.js application environment. Do not put the WooCommerce credentials in client-side code or commit them to GitHub.

```env
NEXT_PUBLIC_APP_URL=https://resume.howlark.com
WOOCOMMERCE_URL=https://howlark.com
WOOCOMMERCE_CONSUMER_KEY=ck_replace_with_your_key
WOOCOMMERCE_CONSUMER_SECRET=cs_replace_with_your_secret
RESUMELITE_EXPECTED_CURRENCY=USD
```

Create the WooCommerce REST API key in **Howlark WordPress Admin → WooCommerce → Settings → Advanced → REST API → Add key**. Set the user to an administrator/store manager with **Read/Write** permissions. Copy the key and secret into Hostinger environment variables only. If you regenerate the secret, update the Hostinger variable and redeploy/restart the app.

The WooCommerce store currency must be USD. The integration refuses checkout/verification if the store currency is not USD. The ResumeLite product is set to virtual and non-taxable so its intended price remains $2.00; confirm your tax obligations with your accountant before selling.

## Required WooCommerce return redirect

The app sends the customer to the normal WooCommerce checkout page so all enabled gateways and billing fields are available. To save the ResumeLite return URL to the order and return the customer to the app after the gateway reports success, add the following PHP snippet to the WordPress site at `https://howlark.com` using a trusted snippets plugin (for example, Code Snippets). Run it on the front end:

```php
add_action('woocommerce_checkout_create_order', function ($order, $data) {
    if (!function_exists('WC') || !WC()->cart) {
        return;
    }

    foreach (WC()->cart->get_cart() as $cart_item) {
        $product = $cart_item['data'] ?? null;
        if ($product instanceof WC_Product && $product->get_sku() === 'resumelite-pdf-download') {
            $order->update_meta_data('resumelite_return_url', 'https://resume.howlark.com/?payment=return');
            break;
        }
    }
}, 10, 2);

add_filter('woocommerce_get_return_url', function ($return_url, $order) {
    if (!($order instanceof WC_Order)) {
        return $return_url;
    }

    $target = $order->get_meta('resumelite_return_url');
    if (!$target) {
        return $return_url;
    }

    $parts = wp_parse_url($target);
    if (
        ($parts['scheme'] ?? '') !== 'https' ||
        ($parts['host'] ?? '') !== 'resume.howlark.com'
    ) {
        return $return_url;
    }

    // Keep the order key in the URL fragment: browsers do not send fragments to web servers.
    return 'https://resume.howlark.com/?payment=return#order_id='
        . absint($order->get_id())
        . '&order_key=' . rawurlencode($order->get_order_key());
}, 10, 2);
```

This redirect is limited to the ResumeLite return URL saved on that order and checks the exact HTTPS hostname. Test this on the store before launch; some payment gateways may use their own return handling.

## Payment flow

1. The customer edits their resume and selects **Pay $2 & Download PDF**.
2. The server creates/finds the hidden virtual product and sends the customer to normal WooCommerce checkout.
3. The customer enters checkout details and pays through any enabled payment gateway.
4. The WordPress snippet saves the ResumeLite return marker to the order and redirects back after payment, placing the order key in the URL fragment (not in the HTTP request).
5. ResumeLite checks the order key, currency, exact $2 total, product ID, quantity, paid status, and payment date against WooCommerce's authenticated REST API.
6. The download endpoint repeats the server-side check and only then generates and returns the PDF.

The order ID and order key are stored in the visitor's local browser storage along with their resume. Do not remove local browser storage between checkout and returning to the app.

## Local development

```bash
npm install
npm run dev
```

## Hostinger deployment

- Build command: `npm run build`
- Start command: `npm run start`
- Use a supported Node.js LTS release (Node 20 or newer).
- Add all environment variables above before building/restarting.
- Deploy the `feature/woocommerce-paid-pdf` branch to a preview first, then merge it to `main` after build and checkout tests pass.

## Pre-launch test checklist

- Confirm WooCommerce REST API key is Read/Write and all secrets are only on the server.
- Confirm `https://howlark.com` uses USD.
- Confirm the product `resumelite-pdf-download` appears as published, virtual, hidden, $2.00, and non-taxable.
- Add the return-redirect snippet and test each enabled gateway with a test payment if supported.
- Verify an unpaid order cannot download a PDF.
- Verify a paid $2 order can download a PDF.
- Verify changing the order ID/key or using a different order does not unlock a PDF.
- Confirm the production domain and HTTPS work after redeployment.

This MVP has no customer accounts or server-side resume database. Resume data stays in the browser and is sent to the server only when requesting the paid PDF.
