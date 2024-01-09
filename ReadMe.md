# Minh AWS STS, Puppeteer scrapping demo

- Stack: AWS Serverless Stack(STS)
- Scrapping library: Puppeteer
- Scrapping content: Simple fingerprint, Cookie modification, Captcha Solving
- Database: AWS dynamodb
- Lambda Layer: 3rd node_modules


### Running in dev mode

- Run `npm run dev` to build and deploy app as a dev mode.
- Run `npm run build` to compile typescript and other files into .ssh folder.
- Run `npm run deploy` to deploy sst app to the aws (check cloudformation)

### Cloud formation
![alt text](https://github.com/minh950810/puppetter-sts-demo/blob/main/1.png)