import { Handler } from '@netlify/functions';
const handler: Handler = async (event, context) => {
  const { headers, body } = event;

  try {
    const jso = JSON.parse(body);
    console.log(jso);
  } catch (e) {
    console.log(e);
    console.log(body);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      headers,
    }),
  };
};

export { handler };
