const { AwsCdkTypeScriptApp } = require("projen");
const project = new AwsCdkTypeScriptApp({
  cdkVersion: "1.95.2",
  defaultReleaseBranch: "main",
  name: "ecs-anywhere-cdk",
  cdkDependencies: [
    "@aws-cdk/core",
    "@aws-cdk/aws-cloudwatch",
    "@aws-cdk/aws-ecs",
    "@aws-cdk/aws-ecs-patterns",
    "@aws-cdk/aws-ec2",
    "@aws-cdk/aws-ssm",
    "@aws-cdk/aws-iam",
    "@aws-cdk/aws-autoscaling",
    "@aws-cdk/aws-kms",
    "@aws-cdk/aws-s3",
    "@aws-cdk/aws-logs",
  ],
  gitignore: ["cdk.context.json"],
});
project.synth();
