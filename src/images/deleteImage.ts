import { HttpResponse, HttpResponseBody } from '../types'
import S3 from 'aws-sdk/clients/s3'
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

function deleteImgFromS3(key: string) {
  const s3 = new S3()
  const params = {  
    Bucket: process.env.BUCKET_NAME!,
    Key: key 
  }
  
  return s3.deleteObject(params).promise()
}

export async function handler(event: any): HttpResponse {
  try {
    const body: { key: string } = JSON.parse(event.body)
    const { key } = body
    const userId: string = event.requestContext.authorizer.claims.email
    
    if (!key) {
      const responseBody: HttpResponseBody = {
        success: false,
        error: 'You must specify key'
      } 
      return response(400, responseBody)
    }

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

    if (!tableExists) {
      await client.query(`
        CREATE TABLE public.images (
          id SERIAL, userId TEXT NOT NULL, key TEXT NOT NULL, src TEXT NOT NULL, FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        );
      `)
    }

    const result = await client.query(`DELETE FROM public.images WHERE userId = '${userId}' AND key = '${key}' RETURNING *;`)
    await client.end()

    await deleteImgFromS3(key) 

    const responseBody: HttpResponseBody = {
      success: true,
      data: { deleted: result.rows }
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
