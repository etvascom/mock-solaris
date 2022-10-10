import moment from "moment";
import { $ } from "zx/core";

$.verbose = false;

const ENV = process.env.ENV;

if (!ENV) {
  console.error("ENV environment variable was not specified");
  process.exit(1);
}

console.log("Packaging build...");
await $`npm run build`;
await $`zip -r -q app.zip .`;

console.log("Uploading artifacts to S3...");
const S3_BUCKET = "ess-solaris-versions";
const S3_FILE_NAME = `${Date.now()}-app.zip`;
const S3_KEY = `${S3_BUCKET}/${S3_FILE_NAME}`;

await $`aws s3 cp app.zip s3://${S3_KEY} --profile=etvas_demo`;
const APP_VERSION_LABEL = `test-solaris-${moment().format("YYYYMMDD-hhmm")}`;
await $`rm app.zip`;

console.log(`Creating application version ${APP_VERSION_LABEL}...`);
await $`aws elasticbeanstalk create-application-version --application-name Test_Solaris --version-label ${APP_VERSION_LABEL} --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${S3_FILE_NAME}" --profile=etvas_demo`;

console.log(`Updating environment...`);
await $`aws elasticbeanstalk update-environment --application-name Test_Solaris --environment-name Testsolaris-dev --version-label ${APP_VERSION_LABEL} --profile=etvas_demo`;

await $`aws elasticbeanstalk wait environment-updated --application-name Test_Solaris --environment-name Testsolaris-${ENV.toLowerCase()} --version-label ${APP_VERSION_LABEL} --profile=etvas_demo`;

console.log(`Setting up webhooks...`);
await fetch(`https://ebank-api-${ENV}.etvas-automat.com/reset`);

console.log(`Deployment finished`);
