import { NextResponse } from 'next/server'
import { PutBucketCorsCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@/lib/r2'

export async function GET() {
  await r2.send(new PutBucketCorsCommand({
    Bucket: R2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }))

  return NextResponse.json({ ok: true, message: 'CORS configured on R2 bucket' })
}
