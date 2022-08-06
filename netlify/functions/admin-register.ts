import { Handler } from '@netlify/functions';
import { GraphQLClient } from 'graphql-request';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getSdk } from '../common/sdk';

interface AdminRegsiterInput {
  username: string;
  password: string;
}

const handler: Handler = async (event, context) => {
  const { body, headers } = event;
  console.log(
    '🚀 ~ file: admin-register.ts ~ line 14 ~ consthandler:Handler= ~ headers',
    headers
  );

  if (
    !headers['x-pizzastack-secret-key'] ||
    headers['x-pizzastack-secret-key'] !== 'mypizzastacksecretkey'
  ) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        message: "'x-pizzastack-secret-key' is missing or value is invalid",
      }),
    };
  }
  const input: AdminRegsiterInput = JSON.parse(body!).input.admin;
  const sdk = getSdk(new GraphQLClient('http://localhost:8080/v1/graphql'));

  const password = crypto
    .pbkdf2Sync(input.password, 'mygreatsaltsecret', 1000, 64, 'sha512')
    .toString('hex');

  const data = await sdk.InsertAdmin({
    username: input.username,
    password,
  });

  const accessToken = jwt.sign(
    {
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['admin'],
        'x-hasura-default-role': 'admin',
        'x-hasura-user-id': data.insert_admin_one?.id,
      },
    },
    'mygreatjwtsecret'
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ accessToken: accessToken }),
  };
};

export { handler };
