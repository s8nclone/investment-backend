import { createServer } from "@/app";

const app = createServer();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API: http://localhost:${port}/api`);
  console.log(`Swagger Docs: http://localhost:${port}/api/docs`);
  console.log(`Health Check: http://localhost:${port}/api/health`);
});
