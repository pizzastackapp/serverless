import { Handler } from '@netlify/functions';
import { api } from '../common/api';
import { verifyHasura } from '../common/verifyHasura';
import { config } from '../core/config';
import { HasuraEventBody, HasuraEvents } from '../dto/hasura-event-body.dto';

const handler: Handler = async (event, context) => {
  const { headers, body: bodyRaw } = event;

  try {
    verifyHasura(headers);
  } catch (error) {
    return JSON.parse(error.message);
  }

  const body = JSON.parse(bodyRaw) as HasuraEventBody;

  const {
    trigger: { name: triggerName },
  } = body;

  if (triggerName === HasuraEvents.CREATE_USER_AFTER_ORDER_SUBMITED) {
    const {
      event: {
        data: { new: order },
      },
    } = body;

    await api.CreateNewCustomer(
      {
        phone: order.client_phone,
        name: order.client_name,
        address: order.client_address,
      },
      {
        'x-hasura-admin-secret': config.hasuraAdminSecret,
      }
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
    }),
  };
};

export { handler };
