import {
  App,
  Construct,
  Stack,
  StackProps,
  RemovalPolicy,
  CfnOutput,
} from "@aws-cdk/core";

import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as kms from "@aws-cdk/aws-kms";
import * as logs from "@aws-cdk/aws-logs";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

export class ECSAnywhereDemo extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, "DemoVPC");

    const execKmsKey = new kms.Key(this, "ExecKMS");

    const execBucket = new s3.Bucket(this, "ExecBucketLogs", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const execLogGroup = new logs.LogGroup(this, "ExecLogGrp", {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const ecsCluster = new ecs.Cluster(this, "DemoECSCluster", {
      vpc: vpc,
      executeCommandConfiguration: {
        kmsKey: execKmsKey,
        logConfiguration: {
          cloudWatchLogGroup: execLogGroup,
          s3Bucket: execBucket,
          s3KeyPrefix: "exec_logs",
        },
        logging: ecs.ExecuteCommandLogging.OVERRIDE,
      },
      clusterName: "EcsAnywhereCDKDemo",
    });

    // External task definition is for ECS Anywhere related tasks/services
    const demoAnywhereTaskDef = new ecs.ExternalTaskDefinition(
      this,
      "ExternalTaskDef"
    );

    demoAnywhereTaskDef.addContainer("NginxExternal", {
      image: ecs.ContainerImage.fromRegistry(
        "public.ecr.aws/nginx/nginx:latest"
      ),
      memoryReservationMiB: 256,
      cpu: 100,
    });

    new ecs.ExternalService(this, "AnywhereService", {
      cluster: ecsCluster,
      taskDefinition: demoAnywhereTaskDef,
      desiredCount: 0,
      serviceName: "ECSAnywhereCDKDemo",
    });

    const register_instance_role = new iam.Role(
      this,
      "ECSExternalRegistrationRole",
      {
        roleName: "ECSAnywhereRegistration",
        assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromManagedPolicyArn(
            this,
            "SSMCore",
            "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
          ),
          iam.ManagedPolicy.fromManagedPolicyArn(
            this,
            "EC2ECSPolicy",
            "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
          ),
        ],
      }
    );

    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere-registration.html
    new CfnOutput(this, "RegisterSSMInstanceCommand", {
      value: `aws ssm create-activation --iam-role ${register_instance_role.roleName}`,
      exportName: "Step1",
    });

    new CfnOutput(this, "DownloadSetupScript", {
      value:
        'curl --proto "https" -o "/tmp/ecs-anywhere-install.sh" "https://amazon-ecs-agent.s3.amazonaws.com/ecs-anywhere-install-latest.sh"',
      exportName: "Step2",
    });

    new CfnOutput(this, "RunScript", {
      value:
        "sudo bash /tmp/ecs-anywhere-install.sh --region $REGION --cluster $CLUSTER_NAME --activation-id $ACTIVATION_ID --activation-code $ACTIVATION_CODE",
      exportName: "Step3",
    });
    // git clone git@github.com:jasonumiker/ecsanywhere-dind.git
    // `aws ssm create-activation --iam-role ${register_instance_role.roleName} | tee ssm-activation.json`
    // ACTIVATION_ID=$(cat ssm-activation.json| jq -r .ActivationId)
    // ACTIVATION_CODE=$(cat ssm-activation.json| jq -r .ActivationCode)
    // cd ecsanywhere-dind && docker build -t ecsanywhere-dind .
    // docker run -d --privileged --rm -e ACTIVATION_ID=$ACTIVATION_ID -e ACTIVATION_CODE=$ACTIVATION_CODE -e CLUSTER_NAME=EcsAnywhereCDKDemo --name ecsanywhere -p 8080-8090:8080-8090 ecsanywhere-dind:latest
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();
new ECSAnywhereDemo(app, "demo", { env: devEnv });
app.synth();
