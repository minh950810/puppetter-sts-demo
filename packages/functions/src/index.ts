import { Handler } from 'aws-lambda';
import aws from 'aws-sdk';
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';
import axios from 'axios';

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const dynamoDB = new aws.DynamoDB.DocumentClient();

async function getBrowser() {
  let browser = null;

  try {
    const executablePath = await chromium.executablePath;

    // Launch Puppeteer with headless Chrome
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    return browser;
  } catch (error) {
    console.log('Browser error: ', error);
    return browser;
  } finally {
    return browser;
  }
}

async function setFingerAndCookie() {
  const browser = await getBrowser();

  if (browser == null) return null;

  try {
    const page = await browser.newPage();

    const myAgentDomain = 'example.com';
    const myCookieDomain = '.fast.com';

    // Performing few user agents
    await page.setUserAgent(myAgentDomain);
    await page.setViewport({ width: 1366, height: 768 });

    // Set custom cookies
    const cookies = [
        { name: 'myCustomCookie1', value: 'testCookieValue1', domain: myCookieDomain },
        { name: 'myCustomCookie2', value: 'testCookieValue2', domain: myCookieDomain },
    ];
    await page.setCookie(...cookies);

    // Perform scraping operations...
    await page.goto('https://fast.com');

    // Get Cookie Data
    const cookiesData = await page.cookies();
    console.log('Cookies:', cookiesData);

    // Get the user agent from the page
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log('User Agent:', userAgent);

    // Get the view port size
    const viewportSize = page.viewport();
    console.log('Viewport Size:', viewportSize);

    await browser.close();

    return {
      cookies: cookiesData,
      agent: userAgent,
      viewport: viewportSize
    };
  } catch (error) {
    console.log('Set finger and cookie error: ', error);
    return null;
  }
}

async function solveCaptcha() {
  const browser = await getBrowser();

  if (browser == null) return null;

  const page = await browser.newPage();

  const captchaUrl = 'https://2captcha.com/demo/normal';
  // Go to demo captcha page
  await page.goto(captchaUrl);
  // Taking screenshot of the screen
  const screenshot = await page.screenshot();
  const captchaImage = new Buffer(screenshot as Buffer).toString('base64');

  try {
    /*  Needs to store this AWS_SECRETS  */
    const apiKey = '0ab6e4c4d830ed632f27df2206ddf14b';

    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('method', 'base64');
    formData.append('body', captchaImage);

    // Initial captcha post request
    const captchaIdResponse = await axios.post('http://2captcha.com/in.php', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const captchaId = captchaIdResponse.data.split('|')[1];
    console.log('CAPTCHA ID:', captchaId);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Solving captcha request
    const solutionResponse = await axios.get('https://2captcha.com/res.php', {
      params: {
        key: apiKey,
        action: 'get',
        id: captchaId,
        json: 1,
      },
    });

    await browser.close();

    if (solutionResponse.data.status === 1) {
      console.log('CAPTCHA solved:', solutionResponse.data.request);

      return {
        captcha: solutionResponse.data.request
      };
    } else {
      console.log('CAPTCHA solution not available yet.');

      return {
        captcha: 'captcha not available'
      };
    }
  } catch (error) {
    console.log('Error: ', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {

  const fingerAndCookies = await setFingerAndCookie();
  const captCha = await solveCaptcha();

  if (fingerAndCookies && captCha) {

    // Save scrapped datas to dynamodb
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      Item: {
        id: context.awsRequestId,
        finger: JSON.stringify(fingerAndCookies),
        captcha: captCha,
      },
    };
  
    try {
      // Put the item into DynamoDB
      const result = await dynamoDB.put(params as aws.DynamoDB.DocumentClient.PutItemInput).promise();
      console.log('Item inserted successfully:', result);
      
      const response = {
        statusCode: 200,
        body: JSON.stringify('Item inserted successfully'),
      };
      
      return response;
    } catch (error) {
      console.error('Error inserting item:', error);
  
      const response = {
        statusCode: 500,
        body: JSON.stringify('Error inserting item'),
      };
  
      return response;
    }
  }

  return {
    statusCode: 400,
    body: 'Execution Failed',
  };  
};
