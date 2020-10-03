import { HttpEventRequest, HttpResponse, HttpResponseBody } from './types'
import S3 from 'aws-sdk/clients/s3'
import uniqid from 'uniqid'
import mime from 'mime'

function response(responseCode: number, body: object) {
  return {
    statusCode: responseCode,
    body: JSON.stringify(body,
      null,
      2,
    )
  }
}

export async function handler(event: HttpEventRequest<{ fileName: string }>): HttpResponse { 
  try {
    const s3 = new S3()
    const { fileName } = event.pathParameters

    const key = `${uniqid()}_${fileName}`
    const contentType = mime.getType(fileName) 

    const params = {
      Expires: 600,
      Bucket: process.env.BUCKET_NAME,
      Conditions: [
        ['content-length-range', 100, 10000000],
        {'acl': 'public-read'}
      ],
      Fields: {
        'Content-Type': contentType,
        'acl': 'public-read',
        key
      }
    }

    const presignedPostData = s3.createPresignedPost(params)

    const responseBody: HttpResponseBody = {
      success: true,
      data: presignedPostData
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