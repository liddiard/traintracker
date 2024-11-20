import express from "express";
import fetch from "node-fetch";

const app = express();
const port = 3001;

const apiResponse = {
  res: null,
  lastRetrieved: null,
  cacheSec: 60,
};

app.get("/v3/trains", async (req, res) => {
  const { lastRetrieved, cacheSec } = apiResponse;
  // cache miss or stale cache; retrieve new data
  if (
    !apiResponse.res ||
    !lastRetrieved ||
    Date.now() - lastRetrieved > cacheSec * 1000
  ) {
    const response = await fetch("https://api-v3.amtraker.com/v3/trains");
    // avoid parsing to and from json for performance
    apiResponse.res = await response.text();
    apiResponse.lastRetrieved = Date.now();
  }
  res.type("application/json").send(apiResponse.res);
});

app.listen(port, () => {
  console.log(`App listening on port: ${port}`);
});
