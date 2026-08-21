import { createServer } from "../src/app";
import serverless from "serverless-http";

const app = createServer();

export default serverless(app);
