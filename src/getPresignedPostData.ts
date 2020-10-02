import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import S3 from 'aws-sdk/clients/s3'
import uniqid from 'uniqid'
import mime from 'mime'

type HttpEventRequest<T = null> = Omit<APIGatewayProxyEvent, 'pathParameters'> & {
    pathParameters: T
}

export async function handler(event: HttpEventRequest<{ fileName: string }>): Promise<APIGatewayProxyResult> { 
  try {
    const s3 = new S3()
    const { fileName } = event.pathParameters

    const key = `${uniqid()}_${fileName}`
    const contentType = mime.getType(fileName) 

    const params = {
      Expires: 600,
      Bucket: process.env.BUCKET_NAME,
      Conditions: [
        ['content-length-range', 100, 10000000],  // 100Byte - 10MB
        {'acl': 'public-read'}
      ],
      Fields: {
        'Content-Type': contentType,
        'acl': 'public-read',
        key
      }
    }

    const presignedPostData = s3.createPresignedPost(params)

    return response(200, { data: presignedPostData })
  } catch (e) {
    return response(500, { error: e.message })
  }
}

const response = (responseCode: number, body: object) => ({
  statusCode: responseCode,
  body: JSON.stringify(
      body,
    null,
    2,
  ),
})
