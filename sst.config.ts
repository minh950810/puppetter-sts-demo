import { SSTConfig } from "sst";
import { ApiStack } from "./stacks/MyStack";

export default {
  config(_input) {
    return {
      name: "puppeteer-sst-demo",
      region: "us-east-1",
    };
  },
  async stacks(app) {
    await app.stack(ApiStack);
  }
} satisfies SSTConfig;
