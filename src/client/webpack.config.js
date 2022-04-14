const path = require("path");

module.exports = {
  devtool: false,
  resolve: {
    extensions: [".js", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules|service_worker/,
        loader: "ts-loader",
      },
    ],
  },
  entry: {
    background_page: path.resolve(__dirname, "background_page.ts"),
    service_worker: path.resolve(__dirname, "service_worker.ts"),
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "../../dist"),
  },
};
