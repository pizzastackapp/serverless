import { Handler } from '@netlify/functions';
import axios from 'axios';
import crypto from 'crypto';
import { api } from '../common/api';
import {
  CreateOrderInput,
  Payment_Status_Enum,
  Payment_Types_Enum,
} from '../common/sdk';
import { verifyHasura } from '../common/verifyHasura';
import { config } from '../core/config';
import { FondyCheckoutUrlResponse } from '../dto/fondy-checkout-url-response.dto';

const handler: Handler = async (event, context) => {
  const { headers, body } = event;

  try {
    verifyHasura(headers);
  } catch (error) {
    return JSON.parse(error.message);
  }

  const input: CreateOrderInput = JSON.parse(body!).input.order;
  const paymentType = input.payment_type as Payment_Types_Enum;

  const order = await api.CreateOrder({
    client_address: input.client_address,
    client_name: input.client_name,
    client_phone: input.client_phone,
    comment: input.comment,
    payment_type: paymentType,
    payment_status:
      paymentType === Payment_Types_Enum.Online
        ? Payment_Status_Enum.Processing
        : null,
  });

  const menuItems = input.items.split(',').map((orderItem) => {
    const [menu_id, amount] = orderItem.split('_');

    return {
      order_id: order.insert_orders_one.id,
      menu_id,
      amount,
    };
  });

  await api.AddItemsToOrder({
    objects: menuItems,
  });

  let checkoutUrl = null;

  if (input.payment_type === Payment_Types_Enum.Online) {
    const items = input.items.split(',').reduce((acc, item) => {
      const [menu_id, amount] = item.split('_');

      return {
        ...acc,
        [menu_id]: amount,
      };
    }, {});

    const menuItemsDescriptions = await api.GetMenuItemsById({
      ids: Object.keys(items),
    });

    const orderDescription = menuItemsDescriptions.menu
      .map((item) => `${item.title} x${items[item.id]}`)
      .join(',');

    const orderPrice = menuItemsDescriptions.menu.reduce(
      (acc, item) => acc + item.price * items[item.id],
      0
    );

    // TODO: Talk with support if possible to set response redirect url for test merchant
    const orderBody = {
      order_id: order.insert_orders_one.id,
      merchant_id: config.fondyMerchantId,
      order_desc: orderDescription,
      amount: orderPrice * 100,
      currency: 'UAH',
      response_url: `${config.serverlessUrl}/redirect?url=${config.clientFrontendUrl}/checkout/thank-you`,
      server_callback_url: `${config.serverlessUrl}/fondy`,
    };

    const orderedKeys = Object.keys(orderBody).sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });

    const signatureRaw = orderedKeys.map((v) => orderBody[v]).join('|');
    const signature = crypto.createHash('sha1');
    signature.update(`${config.fondyMerchantPassword}|${signatureRaw}`);

    let data;
    try {
      const fondyRepsonse = await axios.post<FondyCheckoutUrlResponse>(
        'https://pay.fondy.eu/api/checkout/url/',
        {
          request: {
            ...orderBody,
            signature: signature.digest('hex'),
          },
        }
      );

      data = fondyRepsonse.data;
      console.log(
        '🚀 ~ file: create-order.ts ~ line 109 ~ consthandler:Handler= ~ data',
        data
      );
    } catch (e) {
      await api.DeleteOrderById({ id: order.insert_orders_one.id });

      return {
        statusCode: 418,
        body: JSON.stringify({
          message:
            'Упс, щось трапилось з платіжним сервісом. Спробуйте будь-ласка пізніше або оберіть інший вид оплати',
        }),
      };
    }

    await api.UpdateOrderPaymentId({
      id: order.insert_orders_one.id,
      payment_id: Number(data.response.payment_id),
    });

    checkoutUrl = data.response.checkout_url;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: order.insert_orders_one.id,
      checkout_url: checkoutUrl,
    }),
  };
};

export { handler };
