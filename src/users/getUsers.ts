import { HttpResponse, HttpResponseBody } from '../types'
import { Client } from 'pg'

function response(responseCode: number, body: object) {
  return {
    statusCode: responseCode,
    body: JSON.stringify(body,
      null,
      2,
    )
  }
}

export async function handler(): HttpResponse {
  try {
    const client = new Client({
      host: process.env.DB_HOSTNAME,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT!, 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    })

    await client.connect()

    const tableExists = await client
      .query('SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = \'public\' AND tablename  = \'users\');')
      .then((result) => result.rows[0].exists)

    if (tableExists) {
      const result = await client.query('SELECT public.users.id FROM public.users;')
      await client.end()

      const responseBody: HttpResponseBody = {
        success: true,
        data: { 
          users: result.rows 
        }
      }
      return response(200, responseBody)
    }

    await client.query(`CREATE TABLE public.users (id TEXT PRIMARY KEY, password TEXT NOT NULL);`)
    await client.end()

    const responseBody: HttpResponseBody = {
      success: true,
      data: { 
        users: [] 
      }
    }

    return response(200, responseBody)
  } catch (e) {
    const responseBody: HttpResponseBody = {
      success: false,
      error: e.message
    }
    return response(e.statusCode, responseBody)
  }
}

