import { createServer } from "../src/app.js";
import serverless from "serverless-http";

const app = createServer();

export default serverless(app);
