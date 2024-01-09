import { StackContext, Api } from 'sst/constructs';
import aws from 'aws-sdk';
import fs from 'fs';

import { 
  aws_lambda as lambda,
  aws_dynamodb as dynamodb,
} from 'aws-cdk-lib';

export async function ApiStack({ stack }: StackContext) {

  const s3 = new aws.S3();
  const bucketName = 'demobucket0109';
  const objectKey = 'modules.zip';
  const localModulePath = '/tmp/modules.zip';

  // Download puppeteer and axios node_modules for lambda layer
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

  if (!fs.existsSync(localModulePath)) {
    await downloadModule();
  }

  // Create dynamodb table for storing scrapped Datas
  const myDynamoDBTable = new dynamodb.Table(stack, 'PuppeteerStoreTable', {
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  });


  // Create new layer from downloaded node_modules assets
  const myLayer = new lambda.LayerVersion(stack, 'MyLayer', {
    code: lambda.Code.fromAsset(localModulePath),
    compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
    description: 'My Lambda Layer'
  });

  // Apply lambda layer to the lambda function
  const myLambda = new lambda.Function(stack, 'MyLambda', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset('packages/functions/src'),
    environment: {
      'DYNAMODB_TABLE_NAME': myDynamoDBTable.tableName,
    }
  });

  myLambda.addLayers(myLayer);

  stack.addOutputs({
    'Table ARN: ': myDynamoDBTable.tableArn,
  });
}
