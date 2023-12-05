const { createServer } = require("http");
const { parse } = require("url");
const { configs } = require("./configs");
const mysql = require("mysql");
const winston = require("winston");
const { combine, timestamp, printf, colorize } = winston.format;

const logger = winston.createLogger({
  level: "silly",
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A",
    }),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [new winston.transports.Console()],
});

const contentType = { json: { "Content-Type": "application/json" } };
const notFoundMsg = { method: "method not allowed", path: "path not found" };

function dbConnect() {
  return mysql.createConnection(configs.dbLocal);
}

function jsonResponse(res, data) {
  res.writeHead(200, contentType.json);
  res.end(JSON.stringify({ ...{ code: 200 }, ...{ data: data } }));
}

function errorResponse(res, type, message, code) {
  if (message) {
    res.writeHead(code ? code : 500, contentType.json);
    res.end(JSON.stringify({ code: 500, message: message }));
  } else {
    res.writeHead(404, ct.json);
    res.end(JSON.stringify({ code: 404, message: msgErr[type] }));
  }
}

let app = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);

  let q = parse(req.url, true);
  let dbConn = dbConnect();

  switch (q.pathname) {
    case configs.baseUrl + "/staff":
      if (req.method === "GET") {
        dbConn.connect((err) => {
          if (err) {
            dbConn.end();
            errorResponse(res, "", "Can't connect to database.");
            return false;
          }
          dbConn.query(
            "SELECT staff_id, username, password, first_name, last_name, email FROM staff",
            (err, results, fields) => {
              if (err) {
                dbConn.end();
                errorResponse(
                  res,
                  "",
                  "Internal server error when querying data."
                );
                return false;
              }
              if (results) {
                jsonResponse(res, results);
              }
              dbConn.end();
            }
          );
        });
      }
      break;
  }
});

logger.info("Starting the application");
app.listen(configs.appPort, () => {
  logger.info(`Server running on port ${configs.appPort}`);
});
