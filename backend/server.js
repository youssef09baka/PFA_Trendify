require("dotenv").config();

const app = require("./app");
const { PORT } = require("./config/config");

app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
});