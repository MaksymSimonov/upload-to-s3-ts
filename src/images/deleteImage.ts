import { APIGatewayProxyResult } from 'aws-lambda'
import S3 from 'aws-sdk/clients/s3'
import { Client } from 'pg'

const deleteImgFromS3 = (key: string) => {
  const s3 = new S3()
  const params = {  
    Bucket: process.env.BUCKET_NAME!,
    Key: key 
  }
  
  return s3.deleteObject(params).promise()
}

export async function handler(event: any): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body!)
    const { key } = body
    const userId = event.requestContext.authorizer!.claims.email
    
    if (!key) {
      return response(400, { error: 'You must specify key' })
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

    const result = await client.query(`
      DELETE FROM public.images WHERE userId = '${userId}' AND key = '${key}' RETURNING *;
    `)
 
    await client.end()

    await deleteImgFromS3(key) 

    return response(200, { deleted: result.rows })
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