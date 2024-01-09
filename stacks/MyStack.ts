import { StackContext } from 'sst/constructs';
import aws from 'aws-sdk';
import fs from 'fs';

import { 
  aws_lambda as lambda,
  aws_apigateway as apigateway 
} from 'aws-cdk-lib';

export async function ApiStack({ stack }: StackContext) {

  const s3 = new aws.S3();
  const bucketName = 'demobucket0109';
  const objectKey = 'layer.zip';
  const localModulePath = '/tmp/layer.zip'; 

  const downloadModule = async () => {
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };

    const file = fs.createWriteStream(localModulePath);
    const stream = s3.getObject(params).createReadStream();

    await new Promise((resolve, reject) => {
      stream.pipe(file);
      stream.on('error', reject);
      file.on('finish', resolve);
    });
  };

  // await downloadModule();
  
  const myLayer = new lambda.LayerVersion(stack, 'MyLayer', {
    code: lambda.Code.fromAsset(localModulePath),
    compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
    description: 'My Lambda Layer'
  });

  const myLambda = new lambda.Function(stack, 'MyLambda', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset('packages/functions/src'),
  });

  myLambda.addLayers(myLayer);

  const api = new apigateway.LambdaRestApi(stack, 'MyLambdaRestApi', {
    handler: myLambda,
    proxy: false,
  });
  const resource = api.root.addResource('exec');
  resource.addMethod('GET', new apigateway.LambdaIntegration(myLambda), {
    authorizationType: apigateway.AuthorizationType.NONE,
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
