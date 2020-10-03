import { APIGatewayProxyResult } from 'aws-lambda'
import { Client } from 'pg'

export async function handler(event: any): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.requestContext.authorizer!.claims.email

    const client = new Client({
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT!, 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    })

    await client.connect()

    const tableExists = await client
      .query('SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = \'public\' AND tablename  = \'images\');')
      .then((result) => result.rows[0].exists)

    if (tableExists) {
      const result = await client.query(`
        SELECT * FROM public.images WHERE userId = '${userId}';
      `)
      await client.end()
      return response(200, { images: result.rows })
    }

    await client.query(` 
      CREATE TABLE public.images (
        id SERIAL, userId TEXT NOT NULL, key TEXT NOT NULL, src TEXT NOT NULL, FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      );
    `)

    await client.end()

    return response(200, { images: [] })
  } catch (e) {
    return response(500, { error: e.message })
  }
}

function response(responseCode: number, body: object) {
  return {
    statusCode: responseCode,
    body: JSON.stringify(body,
      null,
      2,
    )
  }
}
