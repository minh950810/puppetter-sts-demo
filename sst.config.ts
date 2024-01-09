import { SSTConfig } from "sst";
import { ApiStack } from "./stacks/MyStack";

export default {
  config(_input) {
    return {
      name: "puppeteer-sst-demo",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(ApiStack);
  }
} satisfies SSTConfig;
