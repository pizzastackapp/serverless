import { Handler } from '@netlify/functions';
import { api } from '../common/api';
import { verifyHasura } from '../common/verifyHasura';
import { config } from '../core/config';
import { HasuraEventBody, HasuraEvents } from '../dto/hasura-event-body.dto';
import { createNewCustomer } from '../hasura/create-new-customer';
import { sendNotificationToAdmin } from '../hasura/send-notifcation-to-admin';

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

  if (triggerName === HasuraEvents.ORDER_CREATED) {
    await Promise.all([createNewCustomer(body), sendNotificationToAdmin(body)]);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
    }),
  };
};

export { handler };
