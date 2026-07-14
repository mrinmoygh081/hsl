const path = require("path");

exports.checkTypeArr = (data) => {
  return data && Array.isArray(data) && data.length > 0;
};

exports.generateUnique = () => {
  return new Date().getTime();
};

exports.isZipFile = (filePath) => {
  const ext = path.extname(filePath);
  return ext === ".zip";
};

