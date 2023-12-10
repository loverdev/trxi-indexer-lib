const logsBref = {
  LogOutput: function (text) {
    const date = new Date().toISOString();
    const OutPutText = `${date}:: Logs => ${text}`;
    console.log(OutPutText);
  },
  ErrorLogs: function (text) {
    const date = new Date().toISOString();
    const Error = `${date}:: Error => ${text}`;
    console.log(Error);
  },
};

module.exports = logsBref;
